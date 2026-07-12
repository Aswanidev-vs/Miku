package platform

import (
	"runtime"
)

type PlatformInfo struct {
	OS           string `json:"os"`           // "windows", "darwin", "linux", "android", "ios"
	Arch         string `json:"arch"`         // "amd64", "arm64", etc.
	IsDesktop    bool   `json:"isDesktop"`    // windows, macos, linux
	IsMobile     bool   `json:"isMobile"`     // android, ios
	IsTouch      bool   `json:"isTouch"`      // mobile or tablet
	HasHover     bool   `json:"hasHover"`     // true on desktop (mouse)
	HasKeyboard  bool   `json:"hasKeyboard"`  // true on desktop
	ScreenSmall  bool   `json:"screenSmall"`  // < 768px
	ScreenMedium bool   `json:"screenMedium"` // 768-1024px
	ScreenLarge  bool   `json:"screenLarge"`  // > 1024px
}

type PlatformService struct{}

func (s *PlatformService) Detect() PlatformInfo {
	os := runtime.GOOS
	isDesktop := os == "windows" || os == "darwin" || os == "linux"
	isMobile := os == "android" || os == "ios"

	return PlatformInfo{
		OS:          os,
		Arch:        runtime.GOARCH,
		IsDesktop:   isDesktop,
		IsMobile:    isMobile,
		IsTouch:     isMobile,
		HasHover:    isDesktop,
		HasKeyboard: isDesktop,
	}
}

func (s *PlatformService) GetOS() string {
	return runtime.GOOS
}

func (s *PlatformService) IsDesktop() bool {
	return runtime.GOOS == "windows" || runtime.GOOS == "darwin" || runtime.GOOS == "linux"
}

func (s *PlatformService) IsMobile() bool {
	return runtime.GOOS == "android" || runtime.GOOS == "ios"
}
