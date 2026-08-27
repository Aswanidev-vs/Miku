package auth

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestTokenStore(t *testing.T) *TokenStore {
	t.Helper()
	return &TokenStore{filePath: filepath.Join(t.TempDir(), "anilist_token.json")}
}

func TestTokenStoreSaveGetRoundtrip(t *testing.T) {
	ts := newTestTokenStore(t)
	token := &TokenData{
		AccessToken:  "access-abc",
		RefreshToken: "refresh-xyz",
		TokenType:    "Bearer",
		ExpiresAt:    time.Now().Add(time.Hour).Unix(),
	}

	require.NoError(t, ts.Save(token))
	assert.Equal(t, token, ts.Get())

	// The token is persisted to disk.
	raw, err := os.ReadFile(ts.filePath)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"access_token"`)
	assert.Contains(t, string(raw), "access-abc")

	// Token files must not be world-readable (permission bits are not
	// meaningful on Windows, so only assert on POSIX platforms).
	if runtime.GOOS != "windows" {
		info, err := os.Stat(ts.filePath)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0600), info.Mode().Perm())
	}
}

func TestTokenStoreGetFreshEmptyStore(t *testing.T) {
	ts := newTestTokenStore(t)
	assert.Nil(t, ts.Get())
}

func TestTokenStoreSaveEmptyAccessToken(t *testing.T) {
	ts := newTestTokenStore(t)
	require.NoError(t, ts.Save(&TokenData{TokenType: "Bearer", ExpiresAt: time.Now().Add(time.Hour).Unix()}))
	assert.Nil(t, ts.Get(), "a token with an empty access token is treated as absent")
}

func TestTokenStoreClear(t *testing.T) {
	ts := newTestTokenStore(t)
	require.NoError(t, ts.Save(&TokenData{AccessToken: "access-abc", TokenType: "Bearer", ExpiresAt: time.Now().Add(time.Hour).Unix()}))
	require.NotNil(t, ts.Get())

	require.NoError(t, ts.Clear())
	assert.Nil(t, ts.Get())

	_, err := os.Stat(ts.filePath)
	assert.True(t, os.IsNotExist(err), "token file should be removed after Clear")
}

func TestTokenStoreIsExpired(t *testing.T) {
	tests := []struct {
		name    string
		token   *TokenData
		expired bool
	}{
		{
			name:    "past expiry",
			token:   &TokenData{AccessToken: "tok", ExpiresAt: time.Now().Unix() - 100},
			expired: true,
		},
		{
			name:    "future expiry",
			token:   &TokenData{AccessToken: "tok", ExpiresAt: time.Now().Add(time.Hour).Unix()},
			expired: false,
		},
		{
			name:    "nil token",
			token:   nil,
			expired: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ts := newTestTokenStore(t)
			if tc.token != nil {
				require.NoError(t, ts.Save(tc.token))
			}
			assert.Equal(t, tc.expired, ts.IsExpired())
		})
	}
}

func TestTokenStoreLoadCorruptFiles(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
	}{
		{name: "garbage bytes", content: []byte{0xff, 0xfe, 0xfd, 0x01, 0x02}},
		{name: "partial JSON", content: []byte(`{"access_token`)},
		{name: "null bytes", content: []byte{0x00, 0x00, 0x00, 0x00}},
		{name: "large file", content: []byte(strings.Repeat("x", 1024*1024))},
		{name: "JSON null", content: []byte("null")},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "anilist_token.json")
			require.NoError(t, os.WriteFile(path, tc.content, 0600))

			ts := &TokenStore{filePath: path}
			assert.NotPanics(t, func() {
				ts.load()
			})
			assert.Nil(t, ts.Get(), "corrupt token file must yield no token")
		})
	}
}
