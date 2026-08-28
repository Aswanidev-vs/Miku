//go:build windows

package main

import "github.com/wailsapp/wails/v3/pkg/w32"

// windowsIconInterceptor assigns both native icon sizes. Wails v3 sets only
// ICON_BIG, so Windows can otherwise keep the default Wails icon in the taskbar.
func windowsIconInterceptor() func(uintptr, uint32, uintptr, uintptr) (uintptr, bool) {
	return func(hwnd uintptr, msg uint32, _, _ uintptr) (uintptr, bool) {
		if msg != w32.WM_CREATE {
			return 0, false
		}

		// wails3 generate syso stores the application icon as resource 3.
		icon := w32.LoadIconWithResourceID(w32.GetModuleHandle(""), 3)
		if icon == 0 {
			return 0, false
		}

		window := w32.HWND(hwnd)
		w32.SendMessage(window, w32.WM_SETICON, w32.ICON_SMALL, uintptr(icon))
		w32.SendMessage(window, w32.WM_SETICON, w32.ICON_SMALL2, uintptr(icon))
		w32.SendMessage(window, w32.WM_SETICON, w32.ICON_BIG, uintptr(icon))
		w32.SetApplicationIcon(hwnd, icon)

		return 0, false
	}
}
