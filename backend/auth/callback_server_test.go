package auth

import (
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests bind real localhost ports (DefaultCallbackPort..+9) and issue
// real HTTP requests against the callback server.

func TestCallbackServerMissingCodeReturns400(t *testing.T) {
	svc := &OAuth2Service{}
	require.NoError(t, svc.StartCallbackServer())
	defer svc.StopCallbackServer()

	// Missing-code case runs FIRST on a fresh server: a successful callback
	// spawns its own shutdown goroutine, so the server may already be stopping
	// afterwards.
	resp, err := http.Get(svc.RedirectURI())
	require.NoError(t, err)
	defer resp.Body.Close()
	_, err = io.ReadAll(resp.Body)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	assert.Empty(t, svc.GetPendingCode())
}

func TestCallbackServerReceivesCode(t *testing.T) {
	svc := &OAuth2Service{}
	require.NoError(t, svc.StartCallbackServer())
	defer svc.StopCallbackServer()

	resp, err := http.Get(svc.RedirectURI() + "?code=integration-123")
	require.NoError(t, err)
	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, string(body), "Authorized")
	assert.Equal(t, "integration-123", svc.GetPendingCode())
}
