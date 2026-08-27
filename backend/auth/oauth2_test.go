package auth

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestService builds an OAuth2Service without touching the real user config
// directory — the test is in-package, so unexported fields are set directly.
func newTestOAuth2Service(t *testing.T, config OAuth2Config) *OAuth2Service {
	t.Helper()
	return &OAuth2Service{
		config:     config,
		tokenStore: &TokenStore{filePath: filepath.Join(t.TempDir(), "tok.json")},
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

func TestCallbackURL(t *testing.T) {
	assert.Equal(t, "http://localhost:43219/callback", CallbackURL(43219))
}

func TestOAuth2ServiceRedirectURI(t *testing.T) {
	svc := newTestOAuth2Service(t, OAuth2Config{RedirectURI: "http://localhost:43219/callback"})
	assert.Equal(t, "http://localhost:43219/callback", svc.RedirectURI())
}

func TestGetAuthorizationURL(t *testing.T) {
	svc := newTestOAuth2Service(t, OAuth2Config{
		ClientID:     "client-123",
		ClientSecret: "secret",
		RedirectURI:  "http://localhost:43219/callback",
	})

	authURL := svc.GetAuthorizationURL()

	u, err := url.Parse(authURL)
	require.NoError(t, err)
	assert.Equal(t, AniListAuthURL, u.Scheme+"://"+u.Host+u.Path)

	q := u.Query()
	assert.Equal(t, "client-123", q.Get("client_id"))
	assert.Equal(t, "http://localhost:43219/callback", q.Get("redirect_uri"))
	assert.Equal(t, "code", q.Get("response_type"))
	// The prompt param is intentionally absent so returning users keep their
	// AniList session instead of being forced through re-authentication.
	_, hasPrompt := q["prompt"]
	assert.False(t, hasPrompt, "authorization URL must not include a prompt param")
}

func TestPendingCodeLifecycle(t *testing.T) {
	svc := newTestOAuth2Service(t, OAuth2Config{})

	assert.Empty(t, svc.GetPendingCode())

	svc.SetPendingCode("code-abc")
	assert.Equal(t, "code-abc", svc.GetPendingCode())
	assert.Equal(t, "code-abc", svc.GetPendingCode(), "GetPendingCode must not clear the code")

	svc.ConsumePendingCode()
	assert.Empty(t, svc.GetPendingCode(), "ConsumePendingCode must clear the code")
}

func TestHandleCallbackSuccess(t *testing.T) {
	var gotForm url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseForm())
		gotForm = r.PostForm
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"access_token":"tok-123","refresh_token":"ref-456","token_type":"Bearer","expires_in":3600}`))
	}))
	defer server.Close()

	origTokenURL := AniListTokenURL
	AniListTokenURL = server.URL
	defer func() { AniListTokenURL = origTokenURL }()

	svc := newTestOAuth2Service(t, OAuth2Config{
		ClientID:     "client-123",
		ClientSecret: "secret",
		RedirectURI:  "http://localhost:43219/callback",
	})

	before := time.Now().Unix()
	tokenData, err := svc.HandleCallback("auth-code-1")
	require.NoError(t, err)

	assert.Equal(t, "tok-123", tokenData.AccessToken)
	assert.Equal(t, "ref-456", tokenData.RefreshToken)
	assert.Equal(t, "Bearer", tokenData.TokenType)
	assert.Greater(t, tokenData.ExpiresAt, before, "ExpiresAt should be in the future")

	// The token endpoint received the full grant form.
	assert.Equal(t, "authorization_code", gotForm.Get("grant_type"))
	assert.Equal(t, "client-123", gotForm.Get("client_id"))
	assert.Equal(t, "secret", gotForm.Get("client_secret"))
	assert.Equal(t, "http://localhost:43219/callback", gotForm.Get("redirect_uri"))
	assert.Equal(t, "auth-code-1", gotForm.Get("code"))

	// The token was persisted through the store.
	assert.Equal(t, tokenData, svc.tokenStore.Get())
}

func TestHandleCallbackNon200(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_grant","error_description":"bad code"}`))
	}))
	defer server.Close()

	origTokenURL := AniListTokenURL
	AniListTokenURL = server.URL
	defer func() { AniListTokenURL = origTokenURL }()

	svc := newTestOAuth2Service(t, OAuth2Config{
		ClientID:     "client-123",
		ClientSecret: "secret",
		RedirectURI:  "http://localhost:43219/callback",
	})

	tokenData, err := svc.HandleCallback("auth-code-1")
	assert.Nil(t, tokenData)
	require.Error(t, err)
	// Regression pin: the response body is surfaced in the error message.
	assert.Contains(t, err.Error(), "token exchange failed")
	assert.Contains(t, err.Error(), "invalid_grant")
}

func TestHandleCallbackMalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"access_token":`))
	}))
	defer server.Close()

	origTokenURL := AniListTokenURL
	AniListTokenURL = server.URL
	defer func() { AniListTokenURL = origTokenURL }()

	svc := newTestOAuth2Service(t, OAuth2Config{
		ClientID:     "client-123",
		ClientSecret: "secret",
		RedirectURI:  "http://localhost:43219/callback",
	})

	tokenData, err := svc.HandleCallback("auth-code-1")
	assert.Nil(t, tokenData)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse token response")
}

func TestHandleCallbackMissingCredentialsSkipsHTTP(t *testing.T) {
	var called atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called.Store(true)
		t.Error("token endpoint must not be called when credentials are missing")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	origTokenURL := AniListTokenURL
	AniListTokenURL = server.URL
	defer func() { AniListTokenURL = origTokenURL }()

	tests := []struct {
		name   string
		config OAuth2Config
	}{
		{
			name:   "empty client id",
			config: OAuth2Config{ClientID: "", ClientSecret: "secret"},
		},
		{
			name:   "empty client secret",
			config: OAuth2Config{ClientID: "client-123", ClientSecret: ""},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := newTestOAuth2Service(t, tc.config)

			tokenData, err := svc.HandleCallback("auth-code-1")
			assert.Nil(t, tokenData)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "credentials are not configured")
			assert.False(t, called.Load(), "no HTTP call should have been made")
		})
	}
}
