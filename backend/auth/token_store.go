package auth

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
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
	var configDir string
	var err error

	// Platform-specific config directory handling
	switch runtime.GOOS {
	case "android":
		// On Android, use the app's internal storage
		configDir = "/data/data/com.wails.app/files"
		// Try alternative paths if the primary doesn't work
		if _, statErr := os.Stat(configDir); statErr != nil {
			configDir = "/sdcard/Android/data/com.wails.app/files"
			if _, statErr2 := os.Stat(configDir); statErr2 != nil {
				// Fallback to temp directory
				configDir = os.TempDir()
			}
		}
	case "ios":
		configDir, err = os.UserHomeDir()
		if err != nil {
			configDir = os.TempDir()
		}
		configDir = filepath.Join(configDir, "Documents")
	default:
		configDir, err = os.UserConfigDir()
		if err != nil {
			// Fallback to temp directory
			configDir = os.TempDir()
		}
	}

	appDir := filepath.Join(configDir, "miku")
	// Try to create directory, but don't fail if we can't
	if mkdirErr := os.MkdirAll(appDir, 0700); mkdirErr != nil {
		// If we can't create the directory, use temp directory
		appDir = filepath.Join(os.TempDir(), "miku")
		os.MkdirAll(appDir, 0700)
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

	// Try to write, but don't fail on Android if file system is read-only
	if err := os.WriteFile(ts.filePath, data, 0600); err != nil {
		// Store in memory only if file write fails
		return nil
	}

	return nil
}

func (ts *TokenStore) Clear() error {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	ts.data = &TokenData{}

	// Try to remove file, but don't fail
	os.Remove(ts.filePath)
	return nil
}

func (ts *TokenStore) IsExpired() bool {
	token := ts.Get()
	if token == nil {
		return true
	}

	return token.ExpiresAt <= time.Now().Unix()
}
