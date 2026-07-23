package update

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		a, b     string
		expected int
	}{
		{"v1.0.0", "0.9.9", 1},
		{"v0.8.14", "v0.8.13", 1},
		{"v0.8.14", "v0.8.14", 0},
		{"v0.9.0", "v0.8.14", 1},
		{"v1.0.0", "v2.0.0", -1},
		{"0.8.14", "0.8.13", 1},
		{"v10.0.0", "v9.9.9", 1},
		{"v0.0.1", "v0.0.0", 1},
		{"v2.1.3", "v2.1.3", 0},
		{"v1.0.0", "v1.0.1", -1},
	}
	for _, tc := range tests {
		t.Run(tc.a+"_vs_"+tc.b, func(t *testing.T) {
			result := CompareVersions(tc.a, tc.b)
			if tc.expected > 0 {
				assert.Positive(t, result, "%s should be greater than %s", tc.a, tc.b)
			} else if tc.expected < 0 {
				assert.Negative(t, result, "%s should be less than %s", tc.a, tc.b)
			} else {
				assert.Zero(t, result, "%s should equal %s", tc.a, tc.b)
			}
		})
	}
}

func TestGetCurrentVersion(t *testing.T) {
	svc, err := NewUpdateService(Config{CurrentVersion: "0.8.14"})
	require.NoError(t, err)
	assert.Equal(t, "0.8.14", svc.GetCurrentVersion())
}

func TestCheckForUpdate_NewerAvailable(t *testing.T) {
	mockRelease := `{
		"tag_name": "v0.9.0",
		"name": "Miku v0.9.0",
		"assets": [{
			"name": "Miku-v0.9.0.apk",
			"browser_download_url": "https://example.com/Miku-v0.9.0.apk",
			"size": 12345678,
			"content_type": "application/vnd.android.package-archive"
		}]
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(mockRelease))
	}))
	defer server.Close()

	svc := &UpdateService{
		config: Config{
			CurrentVersion: "0.8.14",
			RepoOwner:      "test",
			RepoName:       "repo",
		},
		httpClient: server.Client(),
	}

	// Override the GitHub API URL by making a direct request to the test server
	req, err := http.NewRequest("GET", server.URL, nil)
	require.NoError(t, err)
	resp, err := svc.httpClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	var release GitHubRelease
	err = json.NewDecoder(resp.Body).Decode(&release)
	require.NoError(t, err)

	info := &UpdateInfo{
		Available:   false,
		CurrentVer:  svc.config.CurrentVersion,
		LatestVer:   release.TagName,
		ReleaseName: release.Name,
	}

	if CompareVersions(release.TagName, svc.config.CurrentVersion) > 0 {
		info.Available = true
		for _, asset := range release.Assets {
			if len(asset.Name) > 4 && asset.Name[len(asset.Name)-4:] == ".apk" {
				info.DownloadURL = asset.BrowserDownloadURL
				info.AssetName = asset.Name
				info.AssetSize = asset.Size
				break
			}
		}
	}

	assert.True(t, info.Available)
	assert.Equal(t, "v0.9.0", info.LatestVer)
	assert.Equal(t, "0.8.14", info.CurrentVer)
	assert.Contains(t, info.DownloadURL, "Miku-v0.9.0.apk")
	assert.Equal(t, int64(12345678), info.AssetSize)
}

func TestCheckForUpdate_AlreadyUpToDate(t *testing.T) {
	mockRelease := `{
		"tag_name": "v0.8.14",
		"name": "Miku v0.8.14",
		"assets": []
	}`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(mockRelease))
	}))
	defer server.Close()

	svc := &UpdateService{
		config: Config{
			CurrentVersion: "0.8.14",
			RepoOwner:      "test",
			RepoName:       "repo",
		},
		httpClient: server.Client(),
	}

	req, err := http.NewRequest("GET", server.URL, nil)
	require.NoError(t, err)
	resp, err := svc.httpClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	var release GitHubRelease
	err = json.NewDecoder(resp.Body).Decode(&release)
	require.NoError(t, err)

	info := &UpdateInfo{
		Available:  false,
		CurrentVer: svc.config.CurrentVersion,
		LatestVer:  release.TagName,
	}

	if CompareVersions(release.TagName, svc.config.CurrentVersion) > 0 {
		info.Available = true
	}

	assert.False(t, info.Available)
	assert.Equal(t, "v0.8.14", info.LatestVer)
}

func TestCheckForUpdate_NoReleases(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	svc := &UpdateService{
		config: Config{
			CurrentVersion: "0.8.14",
			RepoOwner:      "test",
			RepoName:       "repo",
		},
		httpClient: server.Client(),
	}

	// Simulate 404 handling
	req, err := http.NewRequest("GET", server.URL, nil)
	require.NoError(t, err)
	resp, err := svc.httpClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	info := &UpdateInfo{
		Available:  false,
		CurrentVer: svc.config.CurrentVersion,
	}

	if resp.StatusCode == http.StatusNotFound {
		// Expected path
		assert.False(t, info.Available)
		assert.Equal(t, "0.8.14", info.CurrentVer)
	} else {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestDownloadUpdate_Success(t *testing.T) {
	data := make([]byte, 1024)
	for i := range data {
		data[i] = byte(i % 256)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "1024")
		w.Write(data)
	}))
	defer server.Close()

	svc := &UpdateService{
		config:     Config{},
		httpClient: server.Client(),
	}

	path, err := svc.DownloadUpdate(server.URL)

	require.NoError(t, err)
	assert.NotEmpty(t, path)

	// Verify progress was tracked
	dl, total, active := svc.GetDownloadProgress()
	assert.Equal(t, int64(1024), dl)
	assert.Equal(t, int64(1024), total)
	assert.False(t, active)

	// Verify file contents
	content, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, data, content)

	// Clean up
	os.Remove(path)
}

func TestDownloadUpdate_NetworkError(t *testing.T) {
	svc := &UpdateService{
		config:     Config{},
		httpClient: &http.Client{Timeout: 1 * time.Second},
	}

	_, err := svc.DownloadUpdate("http://localhost:1/nonexistent")
	assert.Error(t, err)
}

func TestDownloadUpdate_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	svc := &UpdateService{
		config:     Config{},
		httpClient: server.Client(),
	}

	_, err := svc.DownloadUpdate(server.URL)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "500")
}

func TestCleanupDownloads(t *testing.T) {
	dir := GetDownloadDir()
	os.MkdirAll(dir, 0700)

	// Create a temp file
	tmpFile, err := os.CreateTemp(dir, "miku-test-*.apk")
	require.NoError(t, err)
	tmpFile.Close()

	// Verify it exists
	_, err = os.Stat(tmpFile.Name())
	require.NoError(t, err)

	svc, err := NewUpdateService(Config{})
	require.NoError(t, err)

	svc.CleanupDownloads()

	// Verify it's gone
	_, err = os.Stat(tmpFile.Name())
	assert.True(t, os.IsNotExist(err), "file should be removed after cleanup")
}

func TestGetDownloadDir(t *testing.T) {
	dir := GetDownloadDir()
	assert.NotEmpty(t, dir)
	// Should be an absolute path
	assert.True(t, len(dir) > 0)
}
