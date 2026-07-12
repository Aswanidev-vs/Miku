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
	// On Android, these must be embedded at build time via ldflags
	clientID := os.Getenv("ANILIST_CLIENT_ID")
	clientSecret := os.Getenv("ANILIST_CLIENT_SECRET")

	// Log warning if credentials are missing
	if clientID == "" {
		log.Println("WARNING: ANILIST_CLIENT_ID environment variable not set. OAuth2 authentication will not work.")
		log.Println("Set ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET to enable AniList sign-in.")
	}

	oauthConfig := auth.OAuth2Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  auth.CallbackURL,
	}

	// Create OAuth2 service - always register it even if credentials are missing
	// This ensures window.go.main.OAuth2Service is available in the frontend
	oauthService, err := auth.NewOAuth2Service(oauthConfig)
	if err != nil {
		log.Printf("Failed to create OAuth2 service: %v", err)
		// Still create a service instance to prevent frontend errors
		// The service methods will fail gracefully when called
		oauthService, _ = auth.NewOAuth2Service(auth.OAuth2Config{})
	}

	services := []application.Service{}
	services = append(services, application.NewService(oauthService))

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
