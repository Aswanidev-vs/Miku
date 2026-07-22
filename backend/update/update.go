package update

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type Config struct {
	CurrentVersion string
	RepoOwner      string
	RepoName       string
}

type UpdateService struct {
	config     Config
	httpClient *http.Client
}

type GitHubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	ContentType        string `json:"content_type"`
}

type GitHubRelease struct {
	TagName string        `json:"tag_name"`
	Name    string        `json:"name"`
	Assets  []GitHubAsset `json:"assets"`
}

type UpdateInfo struct {
	Available   bool   `json:"available"`
	CurrentVer  string `json:"currentVersion"`
	LatestVer   string `json:"latestVersion"`
	DownloadURL string `json:"downloadUrl"`
	AssetName   string `json:"assetName"`
	AssetSize   int64  `json:"assetSize"`
	ReleaseName string `json:"releaseName"`
}

func NewUpdateService(config Config) (*UpdateService, error) {
	return &UpdateService{
		config: config,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

func (s *UpdateService) GetCurrentVersion() string {
	return s.config.CurrentVersion
}

func (s *UpdateService) CheckForUpdate() (*UpdateInfo, error) {
	url := fmt.Sprintf(
		"https://api.github.com/repos/%s/%s/releases/latest",
		s.config.RepoOwner, s.config.RepoName,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return &UpdateInfo{
			Available:  false,
			CurrentVer: s.config.CurrentVersion,
		}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release: %w", err)
	}

	info := &UpdateInfo{
		Available:   false,
		CurrentVer:  s.config.CurrentVersion,
		LatestVer:   release.TagName,
		ReleaseName: release.Name,
	}

	if CompareVersions(release.TagName, s.config.CurrentVersion) > 0 {
		info.Available = true

		for _, asset := range release.Assets {
			name := strings.ToLower(asset.Name)
			if strings.HasSuffix(name, ".apk") && !strings.Contains(name, "unsigned") {
				info.DownloadURL = asset.BrowserDownloadURL
				info.AssetName = asset.Name
				info.AssetSize = asset.Size
				break
			}
		}
	}

	return info, nil
}

// CompareVersions returns > 0 if a > b, < 0 if a < b, 0 if equal.
// Strips leading "v" and compares major.minor.patch numerically.
func CompareVersions(a, b string) int {
	a = strings.TrimPrefix(a, "v")
	b = strings.TrimPrefix(b, "v")

	parse := func(s string) [3]int {
		var parts [3]int
		for i, p := range strings.SplitN(s, ".", 3) {
			fmt.Sscanf(p, "%d", &parts[i])
		}
		return parts
	}

	va, vb := parse(a), parse(b)
	for i := 0; i < 3; i++ {
		if va[i] != vb[i] {
			return va[i] - vb[i]
		}
	}
	return 0
}

func (s *UpdateService) DownloadUpdate(downloadURL string, progressCallback func(downloaded, total int64)) (string, error) {
	resp, err := s.httpClient.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	tmpDir := GetDownloadDir()
	os.MkdirAll(tmpDir, 0700)

	tmpFile, err := os.CreateTemp(tmpDir, "miku-update-*.apk")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}

	total := resp.ContentLength
	if total <= 0 {
		total = -1
	}

	buf := make([]byte, 32*1024)
	var downloaded int64

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := tmpFile.Write(buf[:n]); writeErr != nil {
				tmpFile.Close()
				os.Remove(tmpFile.Name())
				return "", fmt.Errorf("write failed: %w", writeErr)
			}
			downloaded += int64(n)
			if progressCallback != nil {
				progressCallback(downloaded, total)
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			tmpFile.Close()
			os.Remove(tmpFile.Name())
			return "", fmt.Errorf("read failed: %w", readErr)
		}
	}

	tmpFile.Close()
	return tmpFile.Name(), nil
}

func GetDownloadDir() string {
	switch runtime.GOOS {
	case "android":
		candidates := []string{
			"/data/data/com.wails.app/files/miku/updates",
			"/sdcard/Android/data/com.wails.app/files/miku/updates",
		}
		for _, c := range candidates {
			if err := os.MkdirAll(c, 0700); err == nil {
				return c
			}
		}
	case "windows":
		if dir, err := os.UserCacheDir(); err == nil {
			return filepath.Join(dir, "Miku", "updates")
		}
	default:
		if dir, err := os.UserCacheDir(); err == nil {
			return filepath.Join(dir, "Miku", "updates")
		}
	}
	return filepath.Join(os.TempDir(), "miku-updates")
}

func (s *UpdateService) CleanupDownloads() {
	dir := GetDownloadDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		os.Remove(filepath.Join(dir, e.Name()))
	}
}

func (s *UpdateService) InstallUpdate(apkPath string) error {
	switch runtime.GOOS {
	case "windows":
		return openFile(apkPath)
	case "darwin":
		return openFile(apkPath)
	case "linux":
		return openFile(apkPath)
	default:
		return fmt.Errorf("auto-install not supported on %s — please install manually", runtime.GOOS)
	}
}

func openFile(path string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start", "", path}
	case "darwin":
		cmd = "open"
		args = []string{path}
	default:
		cmd = "xdg-open"
		args = []string{path}
	}

	execCmd := exec.Command(cmd, args...)
	return execCmd.Start()
}
