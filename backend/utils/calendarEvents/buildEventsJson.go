package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	ics "github.com/arran4/golang-ical"
	koanfyaml "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
	"github.com/teambition/rrule-go"
	"gopkg.in/yaml.v3"
)

// Global koanf instance. Use "." as the key path delimiter. This can be "/" or any character.
var config = koanf.New(".")

// configFilePath returns the path to the backend config file, overridable
// via FAMILYBOARD_CONFIG_FILE (e.g. to use backend-config.raspi.yaml on the
// Pi vs. backend-config.yaml for local development).
func configFilePath() string {
	name := os.Getenv("FAMILYBOARD_CONFIG_FILE")
	if name == "" {
		name = "backend-config.yaml"
	}
	return "../../" + name
}

// OUTPUT
type ScheduleXEvent struct {
	Id                       string `json:"id"`
	Start                    string `json:"start"`
	End                      string `json:"end"`
	Title                    string `json:"title"`
	Description              string `json:"description" default:""`
	Location                 string `json:"location"`
	CalendarId               string `json:"calendarId"`
	CustomContentTimeGrid    string `json:"_customContent.timeGrid"`
	CustomContentDateGrid    string `json:"_customContent.dateGrid"`
	CustomContentMonthGrid   string `json:"_customContent.monthGrid"`
	CustomContentMonthAgenda string `json:"_customContent.monthAgenda"`
}

// INPUT
type CalendarSource struct {
	Name                   string `yaml:"name"`
	Type                   string `yaml:"type"`
	Url                    string `yaml:"url"`
	Provider               string `yaml:"provider"`
	Lightcolor_main        string `yaml:"lightcolormain"`
	Lightcolor_container   string `yaml:"lightcolorcontainer"`
	Lightcolor_oncontainer string `yaml:"lightcoloroncontainer"`
	Darkcolor_main         string `yaml:"darkcolormain"`
	Darkcolor_container    string `yaml:"darkcolorcontainer"`
	Darkcolor_oncontainer  string `yaml:"darkcoloroncontainer"`
}

type CalendarSources struct {
	CalendarSources []CalendarSource `yaml:"calendarsources"`
}

func getProperties(event *ics.VEvent, name string) []ics.IANAProperty {
	var properties []ics.IANAProperty
	for _, prop := range event.Properties {
		if prop.IANAToken == name {
			properties = append(properties, prop)
		}
	}
	return properties
}

// Reads a yaml file
func getCalendarSourcesFromYamlFile(filename string) (*CalendarSources, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var calendarsources CalendarSources
	err = yaml.Unmarshal(data, &calendarsources)
	if err != nil {
		return nil, err
	}

	return &calendarsources, nil
}

func getIcsDataFromUrl(url string) (icsData string, err error) {
	// Get the data
	// exchange webcal with http in case of webcal
	resp, err := http.Get(strings.Replace(url, "webcal", "http", -1))
	if err != nil {
		log.Println(err)
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

func transformIcs2Events(icsData string, calendarId string) []ScheduleXEvent {
	cal, err := ics.ParseCalendar(strings.NewReader(icsData))
	if err != nil {
		log.Println(err)
		return nil
	}

	events := cal.Events()
	scheduleXEvents := []ScheduleXEvent{}

	for _, event := range events {
		dtStartProp := event.GetProperty(ics.ComponentPropertyDtStart)
		if dtStartProp == nil {
			continue // Event hat keine Startzeit
		}

		start, err := event.GetStartAt()
		if err != nil {
			log.Printf("Fehler beim Abrufen der Startzeit für Event UID %s: %v", event.GetProperty(ics.ComponentPropertyUniqueId), err)
			continue
		}

		// Konvertiere in die lokale Zeitzone des Servers
		start = start.Local()

		// Prüfe, ob es sich um ein ganztägiges Ereignis handelt (nur Datum, keine Zeit)
		isAllDay := false
		if valueParam, ok := dtStartProp.ICalParameters[string(ics.ParameterValue)]; ok {
			if len(valueParam) > 0 && valueParam[0] == "DATE" {
				isAllDay = true
			}
		}

		summary := ""
		if event.GetProperty("SUMMARY") != nil {
			summary = event.GetProperty("SUMMARY").Value
		}

		id := event.GetProperty("UID").Value
		id = strings.Split(id, "@")[0]
		id = strings.ReplaceAll(id, "+", "_")
		id = strings.ReplaceAll(id, "=", "_")
		id = id + "_" + calendarId

		locationProp := event.GetProperty("LOCATION")
		location := ""
		if locationProp != nil {
			location = locationProp.Value
		}

		descriptionProp := event.GetProperty("DESCRIPTION")
		description := ""
		if descriptionProp != nil {
			description = descriptionProp.Value
		}

		dtStartTime, _ := event.GetStartAt() // Erneutes Abrufen für die Dauerberechnung
		dtEndTime, _ := event.GetEndAt()
		dtDiff := dtEndTime.Sub(dtStartTime) // Dauer des Events

		var startString, endString string
		if isAllDay {
			startString = start.Format("2006-01-02")
			// Für schedule-x werden Ganztagstermine mit einem inklusiven Enddatum angezeigt.
			// Die iCalendar-Spezifikation für DTEND bei VALUE=DATE ist exklusiv.
			// Daher ziehen wir einen Tag vom berechneten exklusiven Enddatum ab, um das inklusive Enddatum zu erhalten.
			endString = start.Add(dtDiff).AddDate(0, 0, -1).Format("2006-01-02")
		} else {
			startString = start.Format("2006-01-02 15:04")
			endString = start.Add(dtDiff).Format("2006-01-02 15:04")
		}
		// diffOnly1Day := false // Wird für wiederkehrende Events benötigt
		// if dtDiff.Seconds() == 86400 {
		// 	diffOnly1Day = true
		// }
		rruleData := event.GetProperty("RRULE")
		if rruleData != nil {
			// WICHTIG: Wir müssen sicherstellen, dass die rrule-Bibliothek die Startzeit
			// in der lokalen Zeitzone des Servers interpretiert, um Verschiebungen zu vermeiden.
			// Dazu holen wir die Startzeit als time.Time, konvertieren sie nach .Local()
			// und initialisieren damit das RRuleSet.
			dtStartOriginal, err := event.GetStartAt()
			if err != nil {
				log.Printf("Fehler beim Abrufen der DTSTART für RRULE Event UID %s: %v", event.GetProperty(ics.ComponentPropertyUniqueId), err)
				continue // Dieses Event überspringen, wenn DTSTART problematisch ist
			}

			// WICHTIG: Wir müssen sicherstellen, dass die rrule-Bibliothek die Startzeit
			// in der lokalen Zeitzone des Servers interpretiert. Dazu übergeben wir die Zeitzone
			// explizit als TZID-Parameter in der RRULE-Zeichenkette.
			localDtStart := dtStartOriginal.Local()
			tzid := localDtStart.Location().String() // z.B. "Europe/Berlin"
			dtStartString := localDtStart.Format("20060102T150405")

			rruleString := "DTSTART;TZID=" + tzid + ":" + dtStartString + "\nRRULE:" + rruleData.Value
			rruleSet, _ := rrule.StrToRRuleSet(rruleString)

			// Check if exdates exist. If so, add them to list as string YYYYMMDD
			exdates := getProperties(event, "EXDATE")
			listExdates := []string{}
			for _, exdate := range exdates {
				exdateTime, err := time.Parse("20060102", exdate.Value[0:8])
				if err != nil {
					continue
				}
				listExdates = append(listExdates, exdateTime.Format("20060102"))
			}

			// Cycle through all recurring events
			for _, occurrence := range rruleSet.All() {
				// Die 'occurrence' von rruleSet.All() ist bereits in der korrekten lokalen Zeitzone,
				// da die RRULE mit einer TZID initialisiert wurde.
				start := occurrence
				end := start.Add(dtDiff)

				// If there are EXDATEs, check if the current event date is in the list
				if exdates != nil {
					if slices.Contains(listExdates, start.Format("20060102")) {
						// fmt.Printf("Überspringen Sie das wiederkehrende Ereignis mit dem Datum %s aufgrund von EXDATE\n", start.Format("20060102"))
						continue
					}
				}

				if isAllDay {
					startString = start.Format("2006-01-02")
					// Logik für schedule-x bei ganztägigen Terminen
					// 'end' ist bereits start.Add(dtDiff), also das exklusive Enddatum der Wiederholung.
					// Wir ziehen einen Tag ab, um das inklusive Enddatum für schedule-x zu erhalten.
					endString = end.AddDate(0, 0, -1).Format("2006-01-02")
				} else {
					startString = start.Format("2006-01-02 15:04")
					// 'end' ist bereits start.Add(dtDiff), also die korrekte Endzeit der Wiederholung.
					endString = end.Format("2006-01-02 15:04")
				}
				i, _ := strconv.Atoi(endString[0:4])
				if i > time.Now().Year()-1 {
					scheduleXEvent := ScheduleXEvent{
						Id:          id + "_" + start.Format("20060102"), // Eindeutige ID pro Wiederholung
						Start:       startString,
						End:         endString,
						Title:       summary,
						Location:    location,
						Description: description,
						CalendarId:  strings.ToLower(calendarId),
					}
					scheduleXEvents = append(scheduleXEvents, scheduleXEvent)
				}

				year := start.Year() // Verwende 'start', da dies die lokalisierte Wiederholung ist
				yearToday := time.Now().Year()
				if year > yearToday+10 {
					break
				}
			}

		} else {
			// if onlyDate && diffOnly1Day {
			// 	startString = start.Format("2006-01-02")
			// 	endString = startString
			// }
			// if onlyDate && !diffOnly1Day {
			// 	startString = start.Format("2006-01-02")
			// 	endString = start.Add(dtDiff - 1).Format("2006-01-02")
			// }
			// if !onlyDate {
			// 	startString = start.Format("2006-01-02 15:04")
			// 	endString = start.Add(dtDiff).Format("2006-01-02 15:04")
			// }

			i, _ := strconv.Atoi(endString[0:4])
			if i > time.Now().Year()-1 {
				scheduleXEvent := ScheduleXEvent{
					Id:          id,
					Start:       startString,
					End:         endString,
					Title:       summary,
					Location:    location,
					Description: description,
					CalendarId:  strings.ToLower(calendarId),
					// CustomContentDateGrid:    "<b>and this is bold 1 text</b>",
					// CustomContentMonthGrid:   "<b>and this is bold 2 text</b>",
					// CustomContentTimeGrid:    "<b>and this is bold 3  text</b>",
					// CustomContentMonthAgenda: "<b>and this is bold 4 text</b>",
				}
				scheduleXEvents = append(scheduleXEvents, scheduleXEvent)
			}

		}

	}
	return scheduleXEvents
}
func storeEvents(events []ScheduleXEvent, outputpath string) {

	buf := new(bytes.Buffer)
	enc := json.NewEncoder(buf)
	enc.SetEscapeHTML(false)
	// jsonData, err := json.Marshal(events)
	if err := enc.Encode(&events); err != nil {
		log.Println(err)
	}
	err := os.WriteFile(outputpath, buf.Bytes(), 0644)
	if err != nil {
		log.Println(err)
		return
	}
}

func main() {

	if err := config.Load(file.Provider(configFilePath()), koanfyaml.Parser()); err != nil {
		log.Fatalf("error loading config: %v", err)
	}

	// If the file doesn't exist, create it or append to the file
	logfile, err := os.OpenFile(config.String("logpath")+"buildEventsJson.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		log.Fatal(err)
	}
	log.SetOutput(logfile)
	log.Println("is running...")

	// Open the Badger database located in the  directory.
	// It will be created if it doesn't exist.
	kv, err := NewDb("./iCalstore")
	if err != nil {
		log.Fatal(err)
		return
	}
	defer kv.Close()

	calendarSources, err := getCalendarSourcesFromYamlFile(configFilePath())
	if err != nil {
		log.Println(err)
		return
	}

	icsDataList := []string{}
	icsDataNamesList := []string{}
	newDataAvailable := false
	for i, source := range calendarSources.CalendarSources {
		if source.Type == "ical" {
			if source.Url == "" {
				continue
			}

			icsData, err := getIcsDataFromUrl(source.Url)
			if err != nil {
				log.Println(err)
				return
			}
			// Delete all DTSTAMP to check if file has changed
			re := regexp.MustCompile("(?m)[\r\n]+^.*DTSTAMP.*$")
			icsData = re.ReplaceAllString(icsData, "")
			icsDataList = append(icsDataList, icsData)
			icsDataNamesList = append(icsDataNamesList, source.Name)
			sha1 := sha1.Sum([]byte(icsData))

			key := "ics" + strconv.Itoa(i)
			newValue := hex.EncodeToString(sha1[:])
			exists, _ := kv.Exists(key)

			if !exists {
				newDataAvailable = true
				log.Println("exists = false, new data available in " + source.Name)
				_ = kv.Set("ics"+strconv.Itoa(i), newValue)
				continue
			}

			val, _ := kv.Get(key)
			if val != newValue {
				newDataAvailable = true
				log.Println("new data available in " + source.Name)
				_ = kv.Set("ics"+strconv.Itoa(i), newValue)
			}

		}
	}

	kv.Close()

	// only for development: newDataAvailable = true
	// check if not file exists or if new data is available --> then write new events.json
	_, err = os.OpenFile(config.String("eventspath"), os.O_RDONLY, 0666)
	if newDataAvailable || errors.Is(err, os.ErrNotExist) {
		log.Println("writing new events.json")
		scheduleXEvents := []ScheduleXEvent{}
		for i, icsData := range icsDataList {
			scheduleXEvents = append(transformIcs2Events(icsData, icsDataNamesList[i]), scheduleXEvents...)
		}
		storeEvents(scheduleXEvents, config.String("eventspath"))
	}

	log.Println("done")
}
