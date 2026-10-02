package main

import (
	"encoding/json"
	"log"
	"os"
	"strings"

	koanfyaml "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
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

type CalendarColors struct {
	Main        string `json:"main"`
	Container   string `json:"container"`
	OnContainer string `json:"onContainer"`
}

type CalendarDetails struct {
	ColorName   string         `json:"colorName"`
	LightColors CalendarColors `json:"lightColors"`
	DarkColors  CalendarColors `json:"darkColors"`
}

type ScheduleXCalendarConfig map[string]CalendarDetails

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

func createCalendarsConfig(calendarSources CalendarSources, outputpath string) {
	calendars := ScheduleXCalendarConfig{}
	lightColors := CalendarColors{}
	darkColors := CalendarColors{}
	calDetails := CalendarDetails{}

	for _, source := range calendarSources.CalendarSources {

		lightColors.Main = source.Lightcolor_main
		lightColors.Container = source.Lightcolor_container
		lightColors.OnContainer = source.Lightcolor_oncontainer

		darkColors.Main = source.Darkcolor_main
		darkColors.Container = source.Darkcolor_container
		darkColors.OnContainer = source.Darkcolor_oncontainer

		calDetails.ColorName = strings.ToLower(source.Name)
		calDetails.LightColors = lightColors
		calDetails.DarkColors = darkColors
		calendars[strings.ToLower(source.Name)] = calDetails
	}

	jsonData, err := json.Marshal(calendars)
	if err != nil {
		log.Println(err)
		return
	}
	err = os.WriteFile(outputpath, jsonData, 0644)
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
	logfile, err := os.OpenFile(config.String("logpath")+"buildCalendarConfigJson.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		log.Fatal(err)
	}
	log.SetOutput(logfile)
	log.Println("is running...")

	calendarSources, err := getCalendarSourcesFromYamlFile(configFilePath())
	if err != nil {
		log.Println(err)
		return
	}

	createCalendarsConfig(*calendarSources, config.String("calendarspath"))

	log.Println("done")
}
