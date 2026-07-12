package main

import (
	"embed"
	"log"
	"os"
	"strings"

	"github.com/Aswanidev-vs/Miku/backend/auth"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed .env
var envContent string

func main() {
	// Parse embedded .env
	envContentClean := strings.TrimPrefix(envContent, "\xef\xbb\xbf") // Strip UTF-8 BOM if present
	envContentClean = strings.ReplaceAll(envContentClean, "\r\n", "\n")
	env := make(map[string]string)
	for _, line := range strings.Split(envContentClean, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			env[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}

	clientID := env["ANILIST_CLIENT_ID"]
	clientSecret := env["ANILIST_CLIENT_SECRET"]

	// Fallback to OS environment
	if clientID == "" {
		clientID = os.Getenv("ANILIST_CLIENT_ID")
	}
	if clientSecret == "" {
		clientSecret = os.Getenv("ANILIST_CLIENT_SECRET")
	}

	// Log warning if credentials are missing
	if clientID == "" {
		log.Println("WARNING: ANILIST_CLIENT_ID not set. OAuth2 will not work.")
	}

	// Default redirect URI — will be updated by StartCallbackServer to the actual port
	redirectURI := auth.CallbackURL(auth.CallbackPort)

	oauthConfig := auth.OAuth2Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
	}

	// Create OAuth2 service - handle errors gracefully
	oauthService, err := auth.NewOAuth2Service(oauthConfig)
	if err != nil {
		log.Printf("OAuth2 service error (non-fatal): %v", err)
	}

	services := []application.Service{}
	if oauthService != nil {
		services = append(services, application.NewService(oauthService))
	}

	var mainWindow *application.WebviewWindow

	var app *application.App

	app = application.New(application.Options{
		Name:        "Miku",
		Description: "AniList Client",
		Services:    services,
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "com.aswanidev.miku",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				log.Printf("Second instance launched, focusing main window")
				if mainWindow != nil {
					mainWindow.Focus()
				}
			},
		},
	})

	mainWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Miku",
		Width:            1000,
		Height:           618,
		BackgroundColour: application.NewRGB(10, 10, 18),
		URL:              "/",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})

	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
