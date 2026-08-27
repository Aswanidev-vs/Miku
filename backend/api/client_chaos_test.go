package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChaosHTTPError(t *testing.T) {
	server := newCapturingServer(t, http.StatusInternalServerError, "boom", &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query { Viewer { id } }", nil, nil)

	require.Error(t, err)
	// Regression pin: exact error string format including the response body.
	assert.EqualError(t, err, "HTTP 500: boom")
}

func TestChaosGraphQLErrorsArray(t *testing.T) {
	server := newCapturingServer(t, http.StatusOK,
		`{"data":null,"errors":[{"message":"Invalid token."},{"message":"second"}]}`, &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query { Viewer { id } }", nil, nil)

	require.Error(t, err)
	gqlErrs, ok := err.(GraphQLErrors)
	require.True(t, ok, "expected GraphQLErrors, got %T", err)
	require.Len(t, gqlErrs, 2)
	// Regression pin: surface message matches the first GraphQL error.
	assert.EqualError(t, err, "graphql: Invalid token.")
}

func TestChaosMalformedJSONBody(t *testing.T) {
	server := newCapturingServer(t, http.StatusOK, `{"data": {"Media":`, &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query { Media { id } }", nil, nil)

	require.Error(t, err)
	// Regression pin: exact error prefix.
	assert.True(t, strings.HasPrefix(err.Error(), "failed to parse response: "),
		"want prefix 'failed to parse response: ', got %q", err.Error())
}

func TestChaosEmptyBody(t *testing.T) {
	server := newCapturingServer(t, http.StatusOK, "", &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query { Media { id } }", nil, nil)

	require.Error(t, err)
	// Regression pin: exact error prefix.
	assert.True(t, strings.HasPrefix(err.Error(), "failed to parse response: "),
		"want prefix 'failed to parse response: ', got %q", err.Error())
}

func TestChaosNilResultWithValidData(t *testing.T) {
	server := newCapturingServer(t, http.StatusOK, `{"data":{"Media":{"id":1}}}`, &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)

	assert.NotPanics(t, func() {
		err := client.Query("query { Media { id } }", nil, nil)
		assert.NoError(t, err)
	})
}

func TestChaosWrongTargetType(t *testing.T) {
	server := newCapturingServer(t, http.StatusOK, `{"data":{"Media":{"id":1}}}`, &capturedRequest{})
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	var result int
	err := client.Query("query { Media { id } }", nil, &result)

	require.Error(t, err)
	// Regression pin: exact error prefix.
	assert.True(t, strings.HasPrefix(err.Error(), "failed to unmarshal data: "),
		"want prefix 'failed to unmarshal data: ', got %q", err.Error())
}

func TestChaosConnectionClosedAbruptly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "hijack not supported", http.StatusInternalServerError)
			return
		}
		conn, _, err := hj.Hijack()
		if err != nil {
			return
		}
		conn.Close()
	}))
	defer server.Close()

	client := NewClientWithBaseURL(&fakeTokenProvider{}, server.URL)
	err := client.Query("query { Viewer { id } }", nil, nil)

	require.Error(t, err)
	// Regression pin: exact error prefix.
	assert.True(t, strings.HasPrefix(err.Error(), "request failed: "),
		"want prefix 'request failed: ', got %q", err.Error())
}
