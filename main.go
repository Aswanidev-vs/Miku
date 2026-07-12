package main

import (
	"embed"
	"log"
	"os"

	"github.com/Aswanidev-vs/Miku/backend/auth"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Initialize OAuth2 service with AniList credentials
	clientID := os.Getenv("ANILIST_CLIENT_ID")
	clientSecret := os.Getenv("ANILIST_CLIENT_SECRET")

	// Log warning if credentials are missing
	if clientID == "" {
		log.Println("WARNING: ANILIST_CLIENT_ID not set. OAuth2 will not work.")
	}

	oauthConfig := auth.OAuth2Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  auth.CallbackURL,
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

	app := application.New(application.Options{
		Name:        "Miku",
		Description: "AniList Client",
		Services:    services,
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
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
