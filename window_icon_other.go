//go:build !windows

package main

func windowsIconInterceptor() func(uintptr, uint32, uintptr, uintptr) (uintptr, bool) {
	return nil
}
