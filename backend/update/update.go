package update

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
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

	// Download progress tracking
	downloadProgress int64
	downloadTotal    int64
	downloadActive   bool
	mu               sync.Mutex

	// Integrity tracking for the most recent update flow. expectedSHA256 is
	// populated by CheckForUpdate when a checksum sidecar is published;
	// downloadedSHA256 is computed during DownloadUpdate.
	expectedSHA256   string
	downloadedSHA256 string
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
	// SHA256 is the expected hex-encoded SHA-256 of the download asset, when
	// a checksum sidecar is published alongside it. Empty means "unverified".
	SHA256 string `json:"sha256"`
}

func NewUpdateService(config Config) (*UpdateService, error) {
	return &UpdateService{
		config: config,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}, nil
}

func (s *UpdateService) GetCurrentVersion() string {
	return s.config.CurrentVersion
}

func (s *UpdateService) GetDownloadProgress() (downloaded int64, total int64, active bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.downloadProgress, s.downloadTotal, s.downloadActive
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

		selectedAsset := selectUpdateAsset(release.Assets, runtime.GOOS)
		if selectedAsset != nil {
			info.DownloadURL = selectedAsset.BrowserDownloadURL
			info.AssetName = selectedAsset.Name
			info.AssetSize = selectedAsset.Size
		}

		// Best-effort: look for a published checksum sidecar and fetch the
		// expected SHA-256 for the selected asset. Missing sidecar keeps the
		// flow working (verification is skipped), so existing releases without
		// checksums are not broken.
		if selectedAsset != nil {
			if hash := s.fetchExpectedSHA256(release.Assets, selectedAsset.Name); hash != "" {
				info.SHA256 = hash
				s.mu.Lock()
				s.expectedSHA256 = hash
				s.mu.Unlock()
			}
		}
	}

	return info, nil
}

// updateFileExtension returns the distributable file extension supported by
// the current runtime. Releases can contain both Android and desktop assets,
// so the updater must never choose an asset for another platform.
func updateFileExtension(goos string) string {
	switch goos {
	case "android":
		return ".apk"
	case "windows":
		return ".exe"
	default:
		return ""
	}
}

func selectUpdateAsset(assets []GitHubAsset, goos string) *GitHubAsset {
	extension := updateFileExtension(goos)
	if extension == "" {
		return nil
	}

	for i := range assets {
		asset := &assets[i]
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, extension) && !strings.Contains(name, "unsigned") {
			return asset
		}
	}
	return nil
}

// fetchExpectedSHA256 looks for a checksum sidecar published alongside the
// release assets and returns the hex-encoded SHA-256 for assetName. It supports
// per-asset "<asset>.sha256" files as well as aggregate "SHA256SUMS"/
// "checksums.txt" files. Returns "" when no usable checksum is found.
func (s *UpdateService) fetchExpectedSHA256(assets []GitHubAsset, assetName string) string {
	lowerAsset := strings.ToLower(assetName)
	for _, a := range assets {
		name := strings.ToLower(a.Name)
		// Per-asset sidecar: "<asset>.sha256"
		if name == lowerAsset+".sha256" || name == lowerAsset+".sha256.txt" {
			if h := s.downloadText(a.BrowserDownloadURL); h != "" {
				return firstToken(h)
			}
		}
		// Aggregate checksum files.
		if name == "sha256sums" || name == "sha256sums.txt" ||
			name == "checksums.txt" || name == "sha256.txt" {
			content := s.downloadText(a.BrowserDownloadURL)
			for _, line := range strings.Split(content, "\n") {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					fname := strings.TrimPrefix(fields[1], "*")
					if strings.EqualFold(fname, assetName) {
						return fields[0]
					}
				}
			}
		}
	}
	return ""
}

func (s *UpdateService) downloadText(url string) string {
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}
	return string(b)
}

func firstToken(s string) string {
	fields := strings.Fields(s)
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}

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

func (s *UpdateService) DownloadUpdate(downloadURL string, expectedSHA256 ...string) (string, error) {
	expected := ""
	if len(expectedSHA256) > 0 {
		expected = strings.TrimSpace(expectedSHA256[0])
	}
	if expected == "" {
		s.mu.Lock()
		expected = s.expectedSHA256
		s.mu.Unlock()
	}

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

	tmpFile, err := os.CreateTemp(tmpDir, "miku-update-*"+updateFileExtension(runtime.GOOS))
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}

	total := resp.ContentLength
	if total <= 0 {
		total = -1
	}

	// Track progress internally
	s.mu.Lock()
	s.downloadProgress = 0
	s.downloadTotal = total
	s.downloadActive = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.downloadActive = false
		s.mu.Unlock()
	}()

	buf := make([]byte, 64*1024) // 64KB buffer for better throughput
	var downloaded int64
	hasher := sha256.New()

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := tmpFile.Write(buf[:n]); writeErr != nil {
				tmpFile.Close()
				os.Remove(tmpFile.Name())
				return "", fmt.Errorf("write failed: %w", writeErr)
			}
			hasher.Write(buf[:n])
			downloaded += int64(n)
			s.mu.Lock()
			s.downloadProgress = downloaded
			s.mu.Unlock()
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
	computed := hex.EncodeToString(hasher.Sum(nil))

	s.mu.Lock()
	s.downloadedSHA256 = computed
	s.mu.Unlock()

	// Verify integrity when an expected hash is available. On mismatch the
	// downloaded file is removed and an error is returned, so a tampered
	// payload never reaches the installer.
	if expected != "" && !strings.EqualFold(expected, computed) {
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expected, computed)
	}

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

func (s *UpdateService) InstallUpdate(updatePath string, expectedSHA256 ...string) error {
	expected := ""
	if len(expectedSHA256) > 0 {
		expected = strings.TrimSpace(expectedSHA256[0])
	}
	if expected == "" {
		s.mu.Lock()
		expected = s.expectedSHA256
		s.mu.Unlock()
	}

	// Verify integrity of the artifact before handing it to the OS installer.
	// When an expected hash is known, enforce it; otherwise at least confirm
	// the file is non-empty and readable.
	if info, err := os.Stat(updatePath); err != nil || info.Size() == 0 {
		return fmt.Errorf("update file missing or empty: %w", err)
	}
	if expected != "" {
		computed, err := fileSHA256(updatePath)
		if err != nil {
			return fmt.Errorf("failed to hash update file: %w", err)
		}
		if !strings.EqualFold(expected, computed) {
			return fmt.Errorf("checksum mismatch before install: expected %s, got %s", expected, computed)
		}
	}

	switch runtime.GOOS {
	case "windows":
		return openFile(updatePath)
	case "darwin":
		return openFile(updatePath)
	case "linux":
		return openFile(updatePath)
	case "android":
		return installAndroidAPK(updatePath)
	default:
		return fmt.Errorf("auto-install not supported on %s — please install manually", runtime.GOOS)
	}
}

func openFile(path string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		// Packaged Wails apps may not inherit System32 in PATH, so invoking
		// `cmd /c start` can fail with "cmd executable not found". Explorer is
		// the native file opener and can be resolved independently of PATH.
		cmd = filepath.Join(os.Getenv("WINDIR"), "explorer.exe")
		if os.Getenv("WINDIR") == "" {
			cmd = `C:\Windows\explorer.exe`
		}
		args = []string{path}
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

// fileSHA256 returns the hex-encoded SHA-256 of the file at path.
func fileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func installAndroidAPK(apkPath string) error {
	// Try using Android's package installer via am start
	// This works on most Android devices
	cmd := exec.Command("am", "start",
		"-a", "android.intent.action.VIEW",
		"-d", "file://"+apkPath,
		"-t", "application/vnd.android.package-archive",
		"--grant-read-uri-permission",
	)
	err := cmd.Run()
	if err != nil {
		// Fallback: try opening with default file handler
		cmd2 := exec.Command("am", "start",
			"-a", "android.intent.action.VIEW",
			"-d", "file://"+apkPath,
		)
		return cmd2.Run()
	}
	return nil
}
