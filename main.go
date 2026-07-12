package main

import (
	"embed"
	"log"
	"net/url"
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

	var mainWindow *application.WebviewWindow

	// Helper to extract token from miku:// URL fragment and dispatch it to frontend
	handleDeepLink := func(urlStr string) {
		log.Printf("Raw deep link received: %s", urlStr)
		if !strings.HasPrefix(urlStr, "miku://") {
			return
		}
		u, err := url.Parse(urlStr)
		if err != nil {
			log.Printf("Failed to parse deep link URL: %v", err)
			return
		}

		// Implicit grant returns parameters in the fragment (hash): miku://callback#access_token=xxx&token_type=Bearer
		var token string
		fragment := u.Fragment
		if fragment != "" {
			params, err := url.ParseQuery(fragment)
			if err == nil {
				token = params.Get("access_token")
			}
		}

		// Fallback to query params just in case
		if token == "" {
			token = u.Query().Get("access_token")
		}
		if token == "" {
			token = u.Query().Get("code") // Keep fallback for code
		}

		if token == "" {
			log.Printf("No token found in deep link URL")
			return
		}

		log.Printf("Received token/code from deep link: %s", token)

		// Store code via OAuth2Service binding so frontend can retrieve it
		if oauthService != nil {
			oauthService.SetPendingCode(token)
		}

		// Also emit event as a fast path (may or may not reach frontend)
		if app != nil {
			app.Event.Emit("oauth:callback", map[string]interface{}{
				"code": token,
			})
			log.Printf("[Miku] Emitted oauth:callback event")
		} else {
			log.Printf("[Miku] WARNING: app is nil, event not emitted (code stored in pendingCode)")
		}
	}

	var app *application.App
	var pendingDeepLink string

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
				log.Printf("Second instance launched with args: %v", data.Args)
				if len(data.Args) > 1 {
					handleDeepLink(data.Args[1])
				}
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

	// Listen for frontend ready signal to deliver pending cold-start deep link
	app.Event.On("frontend:ready", func(e *application.CustomEvent) {
		if pendingDeepLink != "" {
			log.Printf("Frontend ready, delivering pending deep link: %s", pendingDeepLink)
			handleDeepLink(pendingDeepLink)
			pendingDeepLink = ""
		}
	})

	// Check if started directly with deep link in arguments (cold start)
	if len(os.Args) > 1 {
		pendingDeepLink = os.Args[1]
		log.Printf("Cold start deep link stored for later delivery: %s", pendingDeepLink)
	}

	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
