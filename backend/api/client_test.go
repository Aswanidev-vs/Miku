package api

import (
	"encoding/json"
	"testing"

	"github.com/Aswanidev-vs/Miku/backend/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeTokenProvider is a controllable TokenProvider for tests.
type fakeTokenProvider struct {
	token *auth.TokenData
}

func (f *fakeTokenProvider) GetToken() *auth.TokenData {
	return f.token
}

func TestGraphQLErrorMessage(t *testing.T) {
	err := GraphQLError{Message: "Not Found."}
	// Regression pin: exact error string format.
	assert.Equal(t, "graphql: Not Found.", err.Error())
}

func TestGraphQLErrorsMessage(t *testing.T) {
	tests := []struct {
		name     string
		errs     GraphQLErrors
		expected string
	}{
		{
			name:     "empty slice",
			errs:     GraphQLErrors{},
			expected: "graphql: unknown error",
		},
		{
			name:     "nil slice",
			errs:     nil,
			expected: "graphql: unknown error",
		},
		{
			name: "returns first error",
			errs: GraphQLErrors{
				{Message: "first"},
				{Message: "second"},
			},
			expected: "graphql: first",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Regression pin: exact error string formats.
			assert.Equal(t, tc.expected, tc.errs.Error())
		})
	}
}

func TestGraphQLRequestMarshal(t *testing.T) {
	t.Run("omits variables key when nil", func(t *testing.T) {
		raw, err := json.Marshal(GraphQLRequest{Query: "query { Viewer { name } }"})
		require.NoError(t, err)

		var decoded map[string]any
		require.NoError(t, json.Unmarshal(raw, &decoded))

		assert.Equal(t, "query { Viewer { name } }", decoded["query"])
		assert.NotContains(t, decoded, "variables")
	})

	t.Run("includes variables when set", func(t *testing.T) {
		raw, err := json.Marshal(GraphQLRequest{
			Query:     "query ($id: Int) { Media(id: $id) { id } }",
			Variables: map[string]any{"id": 21},
		})
		require.NoError(t, err)

		var decoded map[string]any
		require.NoError(t, json.Unmarshal(raw, &decoded))

		vars, ok := decoded["variables"].(map[string]any)
		require.True(t, ok, "variables key should be present")
		assert.Equal(t, float64(21), vars["id"])
	})
}
