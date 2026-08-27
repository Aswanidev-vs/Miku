package platform

import (
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDetect(t *testing.T) {
	svc := &PlatformService{}
	info := svc.Detect()

	assert.Equal(t, runtime.GOOS, info.OS)
	assert.Equal(t, runtime.GOARCH, info.Arch)

	switch runtime.GOOS {
	case "windows", "darwin", "linux":
		assert.True(t, info.IsDesktop, "expected desktop platform")
		assert.False(t, info.IsMobile, "desktop must not be mobile")
	case "android", "ios":
		assert.True(t, info.IsMobile, "expected mobile platform")
		assert.False(t, info.IsDesktop, "mobile must not be desktop")
	}

	// Invariant consistency of the detected capabilities.
	assert.Equal(t, info.IsMobile, info.IsTouch, "IsTouch must mirror IsMobile")
	assert.Equal(t, info.IsDesktop, info.HasHover, "HasHover must mirror IsDesktop")
	assert.Equal(t, info.IsDesktop, info.HasKeyboard, "HasKeyboard must mirror IsDesktop")
}

func TestServiceHelpersMatchDetect(t *testing.T) {
	svc := &PlatformService{}
	info := svc.Detect()

	assert.Equal(t, info.OS, svc.GetOS())
	assert.Equal(t, info.IsDesktop, svc.IsDesktop())
	assert.Equal(t, info.IsMobile, svc.IsMobile())
	// Desktop and mobile are mutually exclusive on the current platform.
	assert.NotEqual(t, svc.IsDesktop(), svc.IsMobile())
}
