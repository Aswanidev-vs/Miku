package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Aswanidev-vs/Miku/backend/auth"
)

const AniListGraphQLURL = "https://graphql.anilist.co"

type TokenProvider interface {
	GetToken() *auth.TokenData
}

type GraphQLClient struct {
	httpClient *http.Client
	tokenProv  TokenProvider
}

type GraphQLRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

type GraphQLResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []GraphQLError  `json:"errors,omitempty"`
}

type GraphQLError struct {
	Message    string         `json:"message"`
	Locations  []Location     `json:"locations,omitempty"`
	Path       []any          `json:"path,omitempty"`
	Extensions map[string]any `json:"extensions,omitempty"`
}

type Location struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

func (e GraphQLError) Error() string {
	return fmt.Sprintf("graphql: %s", e.Message)
}

type GraphQLErrors []GraphQLError

func (e GraphQLErrors) Error() string {
	if len(e) == 0 {
		return "graphql: unknown error"
	}
	return e[0].Error()
}

func NewClient(tokenProv TokenProvider) *GraphQLClient {
	return &GraphQLClient{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		tokenProv: tokenProv,
	}
}

func (c *GraphQLClient) Query(query string, variables map[string]any, result any) error {
	return c.doRequest(query, variables, result)
}

func (c *GraphQLClient) Mutate(mutation string, variables map[string]any, result any) error {
	return c.doRequest(mutation, variables, result)
}

func (c *GraphQLClient) doRequest(query string, variables map[string]any, result any) error {
	gqlReq := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}

	reqBody, err := json.Marshal(gqlReq)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", AniListGraphQLURL, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	if token := c.tokenProv.GetToken(); token != nil && token.AccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var gqlResp GraphQLResponse
	if err := json.Unmarshal(body, &gqlResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if len(gqlResp.Errors) > 0 {
		return GraphQLErrors(gqlResp.Errors)
	}

	if result != nil && len(gqlResp.Data) > 0 {
		if err := json.Unmarshal(gqlResp.Data, result); err != nil {
			return fmt.Errorf("failed to unmarshal data: %w", err)
		}
	}

	return nil
}
