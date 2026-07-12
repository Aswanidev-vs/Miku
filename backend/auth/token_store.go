package auth

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	tokenFileName = "anilist_token.json"
)

type TokenData struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresAt    int64  `json:"expires_at"`
}

type TokenStore struct {
	mu       sync.RWMutex
	data     *TokenData
	filePath string
}

func NewTokenStore() (*TokenStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}

	appDir := filepath.Join(configDir, "miku")
	if err := os.MkdirAll(appDir, 0700); err != nil {
		return nil, err
	}

	ts := &TokenStore{
		filePath: filepath.Join(appDir, tokenFileName),
	}
	ts.load()

	return ts, nil
}

func (ts *TokenStore) load() {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	data, err := os.ReadFile(ts.filePath)
	if err != nil {
		ts.data = &TokenData{}
		return
	}

	var token TokenData
	if err := json.Unmarshal(data, &token); err != nil {
		ts.data = &TokenData{}
		return
	}

	ts.data = &token
}

func (ts *TokenStore) Get() *TokenData {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	if ts.data == nil {
		return nil
	}

	if ts.data.AccessToken == "" {
		return nil
	}

	return ts.data
}

func (ts *TokenStore) Save(token *TokenData) error {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	ts.data = token

	data, err := json.MarshalIndent(token, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(ts.filePath, data, 0600)
}

func (ts *TokenStore) Clear() error {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	ts.data = &TokenData{}

	return os.Remove(ts.filePath)
}

func (ts *TokenStore) IsExpired() bool {
	token := ts.Get()
	if token == nil {
		return true
	}

	return token.ExpiresAt <= time.Now().Unix()
}
