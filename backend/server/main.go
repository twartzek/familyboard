package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"time"

	"math/rand"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/monitor"
	"github.com/gofiber/fiber/v2/middleware/recover"
	koanfyaml "github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
	"gopkg.in/yaml.v3"
)

// Global koanf instance. Use "." as the key path delimiter. This can be "/" or any character.
var config = koanf.New(".")

// configFileName returns the backend config file name, overridable via
// FAMILYBOARD_CONFIG_FILE (e.g. to use backend-config.raspi.yaml on the Pi
// vs. backend-config.yaml for local development).
func configFileName() string {
	if name := os.Getenv("FAMILYBOARD_CONFIG_FILE"); name != "" {
		return name
	}
	return "backend-config.yaml"
}

type Recipes struct {
	Count    int     `json:"count"`
	Next     *string `json:"next,omitempty"`
	Previous string  `json:"previous"`
	Results  []struct {
		ID           int       `json:"id"`
		Name         string    `json:"name"`
		Description  string    `json:"description"`
		Image        string    `json:"image"`
		Keywords     []any     `json:"keywords"`
		WorkingTime  int       `json:"working_time"`
		WaitingTime  int       `json:"waiting_time"`
		CreatedBy    int       `json:"created_by"`
		CreatedAt    time.Time `json:"created_at"`
		UpdatedAt    time.Time `json:"updated_at"`
		Internal     bool      `json:"internal"`
		Servings     int       `json:"servings"`
		ServingsText string    `json:"servings_text"`
		Rating       any       `json:"rating"`
		LastCooked   any       `json:"last_cooked"`
		New          bool      `json:"new"`
	} `json:"results"`
}

type Config struct {
	Backenduser     string `json:"backenduser"`
	Uuid            string `json:"uuid"`
	Calendarsources []struct {
		DarkcolorContainer    string `json:"darkcolorcontainer"`
		DarkcolorMain         string `json:"darkcolormain"`
		DarkcolorOncontainer  string `json:"darkcoloroncontainer"`
		LightcolorContainer   string `json:"lightcolorcontainer"`
		LightcolorMain        string `json:"lightcolormain"`
		LightcolorOncontainer string `json:"lightcoloroncontainer"`
		Name                  string `json:"name"`
		Provider              string `json:"provider"`
		Type                  string `json:"type"`
		URL                   string `json:"url"`
	} `json:"calendarsources"`
	Calendarspath string `json:"calendarspath"`
	Eventspath    string `json:"eventspath"`
	Homeassistant struct {
		IP     string `json:"ip"`
		Port   string `json:"port"`
		User   string `json:"user"`
		Active bool   `json:"active"`
	} `json:"homeassistant"`
	Logpath   string `json:"logpath"`
	Mainpath  string `json:"mainpath"`
	Smbserver struct {
		Directory string `json:"directory"`
		IP        string `json:"ip"`
		Name      string `json:"name"`
		Password  string `json:"password"`
		User      string `json:"user"`
	} `json:"smbserver"`
	Tandoor struct {
		Bearertoken string `json:"bearertoken"`
		IP          string `json:"ip"`
		Port        string `json:"port"`
		Active      bool   `json:"active"`
	} `json:"tandoor"`
	Weather struct {
		Weatherwidgetio struct {
			Htmlcode string `json:"htmlcode"`
		} `json:"weatherwidgetio"`
		Windy struct {
			Htmlcode string `json:"htmlcode"`
		} `json:"windy"`
	} `json:"weather"`
}

func GetLocalSystemIP() (string, error) {
	var ips []net.IP
	addresses, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}

	for _, addr := range addresses {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				ips = append(ips, ipnet.IP)
			}
		}
	}
	return ips[0].String(), nil
}

func main() {

	f := file.Provider("../" + configFileName())
	if err := config.Load(f, koanfyaml.Parser()); err != nil {
		log.Fatalf("error loading config: %v", err)
	}
	// Watch the file and get a callback on change. The callback can do whatever,
	// like re-load the configuration.
	// File provider always returns a nil `event`.
	f.Watch(func(event interface{}, err error) {
		if err != nil {
			log.Printf("watch error: %v", err)
			return
		}

		// Throw away the old config and load a fresh copy.
		log.Println("config changed. Reloading ...")
		config = koanf.New(".")
		config.Load(f, koanfyaml.Parser())
		log.Println("config changed. Reloading done")

	})

	app := fiber.New()
	logger := logger.New()
	file, _ := os.OpenFile(config.String("logpath")+"server.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	iw := io.MultiWriter(os.Stdout, file)
	log.SetOutput(iw)
	log.Println("Server started")
	app.Use(logger) // middleware for logging HTTP requestsg
	app.Use(cors.New())
	app.Use(recover.New())
	app.Get("/metrics", monitor.New())
	api := app.Group("/api") // group routes under /api path
	v1 := api.Group("/v1")   // versioning of API

	// Test route for checking if API is work
	v1.Get("/hello", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World 👋!")
	})

	// Metrics route
	v1.Get("/metrics", monitor.New(monitor.Config{Title: "MyService Metrics Page"}))

	// Get current local system IP
	v1.Get("/localsystemdata", func(c *fiber.Ctx) error {

		ip, err := GetLocalSystemIP()
		if err != nil {
			return c.SendString(err.Error())
		}
		data := map[string]string{"ip": ip}
		jsonResp, err := json.Marshal(data)
		return c.SendString(string(jsonResp))

	})

	// Get random image
	v1.Get("/randimage", func(c *fiber.Ctx) error {

		user := User{
			serverName:   config.String("smbserver.name"),
			serverIP:     config.String("smbserver.ip"),
			userName:     config.String("smbserver.user"),
			userPassword: config.String("smbserver.password"),
		}

		session, conn, err := connectSMBserver(user) // get smb session
		if err != nil {
			c.SendString(err.Error())
			return c.SendStatus(401)
		}
		defer session.Logoff()
		defer conn.Close()

		mount := getMount(session, config.String("smbserver.directory")) // get share
		defer mount.Umount()

		imageNames := getAllImageNames(mount)

		randImageName := imageNames[rand.Intn(len(imageNames))]
		image := readFile(mount, randImageName)
		c.Set("Content-Type", "image/jpg, image/png, image/jpeg")
		// c.Set("Cache-Control", "max-age=2592000")
		return c.Send(image)

	})

	// Get mealplan
	v1.Get("/mealplan", func(c *fiber.Ctx) error {
		fromDate := c.Query("from_date")
		toDate := c.Query("to_date")
		url := "http://" + config.String("tandoor.ip") + ":" + config.String("tandoor.port") + "/api/meal-plan/?from_date=" + fromDate + "&to_date=" + toDate + "&meal_type=6"
		bearerToken := config.String("tandoor.bearertoken")
		jsonData, err := fetchJSONWithBearerToken(url, bearerToken)
		if err != nil {
			log.Println(err)
			return err
		}

		return c.SendString(string(jsonData))

	})

	// Get single recipe
	v1.Get("/recipe", func(c *fiber.Ctx) error {
		id := c.Query("id")
		url := "http://" + config.String("tandoor.ip") + ":" + config.String("tandoor.port") + "/api/recipe/" + id + "/?format=json"
		bearerToken := config.String("tandoor.bearertoken")
		jsonData, err := fetchJSONWithBearerToken(url, bearerToken)
		if err != nil {
			log.Println(err)
			return err
		}

		return c.SendString(string(jsonData))

	})

	// Get all recipes
	v1.Get("/allrecipes", func(c *fiber.Ctx) error {
		url := "http://" + config.String("tandoor.ip") + ":" + config.String("tandoor.port") + "/api/recipe/"
		bearerToken := config.String("tandoor.bearertoken")
		jsonString, err := fetchJSONWithBearerToken(url, bearerToken)
		if err != nil {
			log.Println(err)
			return err
		}

		var allRecipes Recipes
		var recipes Recipes
		json.Unmarshal([]byte(jsonString), &recipes)
		allRecipes.Results = append(allRecipes.Results, recipes.Results...)
		for true {
			if recipes.Next != nil {

				jsonString, err = fetchJSONWithBearerToken(*recipes.Next, bearerToken)
				if err != nil {
					log.Println(err)
					return err
				}
				json.Unmarshal([]byte(jsonString), &recipes)
				allRecipes.Results = append(allRecipes.Results, recipes.Results...)
			} else {
				break
			}
		}

		allRecipes.Count = len(allRecipes.Results)
		return c.JSON(allRecipes)

	})

	// Get all events for calendar
	v1.Get("/events", func(c *fiber.Ctx) error {
		events, err := os.ReadFile(config.String("eventspath"))
		if err != nil {
			log.Println(err)
			return err
		}
		return c.SendString(string(events))

	})

	// Get all events for calendar
	v1.Get("/calendars", func(c *fiber.Ctx) error {
		calendars, err := os.ReadFile(config.String("calendarspath"))
		if err != nil {
			log.Println(err)
			return err
		}
		return c.SendString(string(calendars))

	})

	// Get config
	v1.Get("/config", func(c *fiber.Ctx) error {
		configYaml, err := os.ReadFile(config.String("mainpath") + "backend/" + configFileName())
		if err != nil {
			log.Println(err)
			return err
		}

		// Parse YAML data into an interface{}
		var data interface{}
		err = yaml.Unmarshal(configYaml, &data)
		if err != nil {
			log.Println("Error parsing YAML:", err)
			return err
		}

		// Convert data to JSON
		jsonData, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			log.Println("Error converting to JSON:", err)
			return err
		}

		return c.SendString(string(jsonData))

	})

	// Config Post
	v1.Post("/config", func(c *fiber.Ctx) error {
		configData := new(Config)
		if err := c.BodyParser(configData); err != nil {
			return err
		}

		// Marshal instance back to yaml
		configYaml, err := yaml.Marshal(configData)

		if err != nil {

			log.Println(err)
			return err
		}

		err = os.WriteFile(config.String("mainpath")+"backend/"+configFileName(), configYaml, 0644)
		if err != nil {
			log.Println(err)
			return err
		}

		cmd := exec.Command("./buildCalendarConfigJson")
		cmd.Dir = config.String("mainpath") + "backend/utils/calendarConfig/"
		err = cmd.Run()

		if err != nil {
			log.Println(err.Error())
			return c.SendStatus(fiber.StatusInternalServerError)

		}

		cmd = exec.Command("./buildEventsJson")
		cmd.Dir = config.String("mainpath") + "backend/utils/calendarEvents/"
		err = cmd.Start()
		if err != nil {
			log.Println(err.Error())
			return c.SendStatus(fiber.StatusInternalServerError)

		}

		return c.SendStatus(fiber.StatusOK)
	})

	// Get dishwasher data
	v1.Get("/dishwasher", func(c *fiber.Ctx) error {
		dataPath := config.String("mainpath") + "backend/data/dishwasher.json"
		data, err := os.ReadFile(dataPath)
		if err != nil {
			if os.IsNotExist(err) {
				return c.JSON(fiber.Map{"entries": []interface{}{}})
			}
			log.Println(err)
			return err
		}
		return c.SendString(string(data))
	})

	// Post dishwasher data
	v1.Post("/dishwasher", func(c *fiber.Ctx) error {
		dataPath := config.String("mainpath") + "backend/data/dishwasher.json"
		err := os.WriteFile(dataPath, c.Body(), 0644)
		if err != nil {
			log.Println(err)
			return err
		}
		return c.SendStatus(fiber.StatusOK)
	})

	v1.Get("/homeassistantconfig", func(c *fiber.Ctx) error {
		url := "http://" + config.String("homeassistant.ip") + ":" + config.String("homeassistant.port")
		return c.JSON(fiber.Map{
			"url":  url,
			"user": config.String("homeassistant.user"),
		})
	})

	// start server
	app.Listen(":3006")
}

func fetchJSONWithBearerToken(url string, bearerToken string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+bearerToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}
