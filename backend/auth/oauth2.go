package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	AniListAuthURL        = "https://anilist.co/api/v2/oauth/authorize"
	AniListTokenURL       = "https://anilist.co/api/v2/oauth/token"
	DefaultCallbackPort   = 43219
	DefaultCallbackHost   = "localhost"
)

type OAuth2Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type OAuth2Service struct {
	config       OAuth2Config
	tokenStore   *TokenStore
	httpClient   *http.Client
	mu           sync.Mutex
	pendingCode  string
	callbackSrv  *http.Server
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

func NewOAuth2Service(config OAuth2Config) (*OAuth2Service, error) {
	tokenStore, err := NewTokenStore()
	if err != nil {
		return nil, fmt.Errorf("failed to create token store: %w", err)
	}

	return &OAuth2Service{
		config:     config,
		tokenStore: tokenStore,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// CallbackURL returns the redirect URI for the given port.
func CallbackURL(port int) string {
	return fmt.Sprintf("http://%s:%d/callback", DefaultCallbackHost, port)
}

func (s *OAuth2Service) GetAuthorizationURL() string {
	params := url.Values{}
	params.Set("client_id", s.config.ClientID)
	params.Set("redirect_uri", s.config.RedirectURI)
	params.Set("response_type", "code")

	return fmt.Sprintf("%s?%s", AniListAuthURL, params.Encode())
}

// SaveToken saves an access token directly (for implicit grant flow)
func (s *OAuth2Service) SaveToken(accessToken string) error {
	tokenData := &TokenData{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresAt:   time.Now().Add(365 * 24 * time.Hour).Unix(), // 1 year
	}
	return s.tokenStore.Save(tokenData)
}

func (s *OAuth2Service) HandleCallback(code string) (*TokenData, error) {
	log.Printf("[OAuth] HandleCallback called with code length: %d", len(code))
	if s.config.ClientID == "" || s.config.ClientSecret == "" {
		log.Printf("[OAuth] ERROR: credentials not configured")
		return nil, fmt.Errorf("AniList OAuth credentials are not configured")
	}

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", s.config.ClientID)
	data.Set("client_secret", s.config.ClientSecret)
	data.Set("redirect_uri", s.config.RedirectURI)
	data.Set("code", code)

	log.Printf("[OAuth] Exchanging code with client_id=%s redirect_uri=%s", s.config.ClientID, s.config.RedirectURI)

	req, err := http.NewRequest("POST", AniListTokenURL, bytes.NewBufferString(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("[OAuth] HTTP request failed: %v", err)
		return nil, fmt.Errorf("failed to exchange token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	log.Printf("[OAuth] AniList response status=%d body=%s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	tokenData := &TokenData{
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
		TokenType:    tokenResp.TokenType,
		ExpiresAt:    time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second).Unix(),
	}

	if err := s.tokenStore.Save(tokenData); err != nil {
		return nil, fmt.Errorf("failed to save token: %w", err)
	}

	return tokenData, nil
}

func (s *OAuth2Service) GetToken() *TokenData {
	return s.tokenStore.Get()
}

func (s *OAuth2Service) Logout() error {
	return s.tokenStore.Clear()
}

func (s *OAuth2Service) IsAuthenticated() bool {
	token := s.tokenStore.Get()
	return token != nil && !s.tokenStore.IsExpired()
}

// SetPendingCode stores an authorization code for later retrieval by the frontend.
func (s *OAuth2Service) SetPendingCode(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pendingCode = code
	log.Printf("[OAuth] SetPendingCode: stored code length %d", len(code))
}

// GetPendingCode returns and clears any pending authorization code.
func (s *OAuth2Service) GetPendingCode() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	code := s.pendingCode
	s.pendingCode = ""
	if code != "" {
		log.Printf("[OAuth] GetPendingCode: returning code length %d", len(code))
	}
	return code
}

// StartCallbackServer starts a temporary HTTP server to receive the OAuth callback.
// It tries the configured port first, then falls back to nearby ports.
func (s *OAuth2Service) StartCallbackServer() error {
	s.StopCallbackServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/callback", s.handleHTTPCallback)

	// Try to bind a listener on available ports
	var ln net.Listener
	var redirectURI string
	for i := 0; i < 10; i++ {
		port := DefaultCallbackPort + i
		addr := fmt.Sprintf(":%d", port)
		var err error
		ln, err = net.Listen("tcp", addr)
		if err == nil {
			redirectURI = CallbackURL(port)
			break
		}
		log.Printf("[OAuth] Port %d unavailable: %v", port, err)
	}
	if ln == nil {
		return fmt.Errorf("all ports %d-%d are in use", DefaultCallbackPort, DefaultCallbackPort+9)
	}

	s.config.RedirectURI = redirectURI
	log.Printf("[OAuth] Starting callback server on %s", redirectURI)

	s.callbackSrv = &http.Server{
		Handler: mux,
	}

	// Serve on the pre-bound listener (no race condition)
	go func() {
		if err := s.callbackSrv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("[OAuth] Callback server error: %v", err)
		}
	}()

	return nil
}

// StopCallbackServer shuts down the callback server.
func (s *OAuth2Service) StopCallbackServer() {
	if s.callbackSrv != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		s.callbackSrv.Shutdown(ctx)
		s.callbackSrv = nil
		log.Printf("[OAuth] Callback server stopped")
	}
}

// handleHTTPCallback handles the OAuth redirect from the browser.
func (s *OAuth2Service) handleHTTPCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	log.Printf("[OAuth] Received authorization code via localhost callback, length: %d", len(code))
	s.SetPendingCode(code)

	// Emit event to frontend so it can pick up the code immediately
	app := application.Get()
	if app != nil {
		app.Event.Emit("oauth:callback", map[string]interface{}{
			"code": code,
		})
		log.Printf("[OAuth] Emitted oauth:callback event to frontend")
	}

	// Show a user-friendly page
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, `<!DOCTYPE html>
<html><head><title>Miku - Authorized</title><style>
body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a12;color:#fff}
.box{text-align:center;padding:3rem}
h1{font-size:1.5rem;margin-bottom:0.5rem}
p{color:#a0a0b0;font-size:0.9rem}
</style></head><body>
<div class="box">
<h1>&#10003; Authorized</h1>
<p>You can close this tab and return to Miku.</p>
</div></body></html>`)

	// Shut down server after responding
	go s.StopCallbackServer()
}
