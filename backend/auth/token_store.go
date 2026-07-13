package auth

import (
	"encoding/json"
	"log"
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

	switch runtime.GOOS {
	case "android":
		// Try multiple paths to find the app's writable storage
		candidates := []string{
			"/data/data/com.wails.app/files",
			"/sdcard/Android/data/com.wails.app/files",
			"/data/local/tmp",
			os.TempDir(),
		}
		for _, dir := range candidates {
			testPath := filepath.Join(dir, "miku_test")
			if f, writeErr := os.Create(testPath); writeErr == nil {
				f.Close()
				os.Remove(testPath)
				configDir = dir
				break
			}
		}
		if configDir == "" {
			configDir = os.TempDir()
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
			configDir = os.TempDir()
		}
	}

	appDir := filepath.Join(configDir, "miku")
	if mkdirErr := os.MkdirAll(appDir, 0700); mkdirErr != nil {
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

	if err := os.WriteFile(ts.filePath, data, 0600); err != nil {
		// On Android, try alternate writable paths
		if runtime.GOOS == "android" {
			altPaths := []string{
				"/data/local/tmp/miku",
				filepath.Join(os.TempDir(), "miku"),
			}
			for _, dir := range altPaths {
				os.MkdirAll(dir, 0700)
				altPath := filepath.Join(dir, tokenFileName)
				if writeErr := os.WriteFile(altPath, data, 0600); writeErr == nil {
					ts.filePath = altPath // Update path for future loads
					return nil
				}
			}
		}
		log.Printf("[TokenStore] Warning: could not persist token to disk: %v", err)
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
