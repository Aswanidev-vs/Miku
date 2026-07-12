package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const (
	AniListAuthURL  = "https://anilist.co/api/v2/oauth/authorize"
	AniListTokenURL = "https://anilist.co/api/v2/oauth/token"
	CallbackURL     = "miku://callback"
	ClientID        = "" // Set via Configure
)

type OAuth2Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type OAuth2Service struct {
	config      OAuth2Config
	tokenStore  *TokenStore
	httpClient  *http.Client
	mu          sync.Mutex
	pendingCode string
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

// SetPendingCode stores an authorization code from a deep link for later retrieval by the frontend.
func (s *OAuth2Service) SetPendingCode(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pendingCode = code
	log.Printf("[OAuth] SetPendingCode: stored code length %d", len(code))
}

// GetPendingCode returns and clears any pending authorization code from a deep link.
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
