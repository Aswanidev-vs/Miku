package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Aswanidev-vs/Miku/backend/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// capturedRequest records what the test server observed.
type capturedRequest struct {
	method        string
	path          string
	contentType   string
	accept        string
	authorization string
	body          []byte
}

func newCapturingServer(t *testing.T, status int, responseBody string, captured *capturedRequest) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured.method = r.Method
		captured.path = r.URL.Path
		captured.contentType = r.Header.Get("Content-Type")
		captured.accept = r.Header.Get("Accept")
		captured.authorization = r.Header.Get("Authorization")
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		captured.body = body

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, err = w.Write([]byte(responseBody))
		require.NoError(t, err)
	}))
}

func TestQueryHappyPath(t *testing.T) {
	captured := &capturedRequest{}
	server := newCapturingServer(t, http.StatusOK, `{"data":{"Media":{"id":42,"type":"ANIME"}}}`, captured)
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{token: &auth.TokenData{AccessToken: "tok"}}, server.URL)

	var result struct {
		Media struct {
			ID   int    `json:"id"`
			Type string `json:"type"`
		} `json:"Media"`
	}
	err := client.Query(`query ($id: Int) { Media(id: $id) { id type } }`, map[string]any{"id": 42}, &result)

	require.NoError(t, err)
	assert.Equal(t, 42, result.Media.ID)
	assert.Equal(t, "ANIME", result.Media.Type)

	assert.Equal(t, http.MethodPost, captured.method)
	assert.Equal(t, "/", captured.path)
	assert.Equal(t, "application/json", captured.contentType)
	assert.Equal(t, "application/json", captured.accept)
}

func TestAuthorizationHeader(t *testing.T) {
	tests := []struct {
		name         string
		provider     TokenProvider
		expectedAuth string
	}{
		{
			name:         "token set",
			provider:     &fakeTokenProvider{token: &auth.TokenData{AccessToken: "tok", TokenType: "Bearer"}},
			expectedAuth: "Bearer tok",
		},
		{
			name:         "nil token",
			provider:     &fakeTokenProvider{token: nil},
			expectedAuth: "",
		},
		{
			name:         "empty token struct",
			provider:     &fakeTokenProvider{token: &auth.TokenData{}},
			expectedAuth: "",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			captured := &capturedRequest{}
			server := newCapturingServer(t, http.StatusOK, `{"data":{}}`, captured)
			defer server.Close()

			client := NewClientWithBaseURL(tc.provider, server.URL)
			err := client.Query("query { Viewer { id } }", nil, nil)

			require.NoError(t, err)
			assert.Equal(t, tc.expectedAuth, captured.authorization)
		})
	}
}

func TestMutateHitsSameEndpoint(t *testing.T) {
	captured := &capturedRequest{}
	server := newCapturingServer(t, http.StatusOK, `{"data":{"CreateTextActivity":{"id":7}}}`, captured)
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{token: &auth.TokenData{AccessToken: "tok"}}, server.URL)

	var result struct {
		CreateTextActivity struct {
			ID int `json:"id"`
		} `json:"CreateTextActivity"`
	}
	err := client.Mutate(`mutation ($text: String) { CreateTextActivity(text: $text) { id } }`, map[string]any{"text": "hello"}, &result)

	require.NoError(t, err)
	assert.Equal(t, 7, result.CreateTextActivity.ID)
	assert.Equal(t, http.MethodPost, captured.method)
	assert.Equal(t, "/", captured.path)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(captured.body, &decoded))
	query, ok := decoded["query"].(string)
	require.True(t, ok)
	assert.Contains(t, query, "mutation")
}

func TestVariablesForwardedInBody(t *testing.T) {
	captured := &capturedRequest{}
	server := newCapturingServer(t, http.StatusOK, `{"data":{}}`, captured)
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query ($id: Int, $page: Int) { Page(page: $page) { media(id: $id) { id } } }",
		map[string]any{"id": 21, "page": 3}, nil)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(captured.body, &decoded))

	vars, ok := decoded["variables"].(map[string]any)
	require.True(t, ok, "variables should be present in the request body")
	assert.Equal(t, float64(21), vars["id"])
	assert.Equal(t, float64(3), vars["page"])
}
