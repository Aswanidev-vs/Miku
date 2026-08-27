import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'

// jsdom has no matchMedia; install one before the settings singleton imports,
// since it registers its OS-theme listener at module scope.
const systemTheme = vi.hoisted(() => {
  const state = { matches: true, listeners: new Set<(e: { matches: boolean }) => void>() }
  ;(globalThis as Record<string, unknown>).matchMedia = vi.fn(() => ({
    get matches() {
      return state.matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
      state.listeners.add(cb)
    },
    removeEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
      state.listeners.delete(cb)
    },
  }))
  return state
})

import { useSettings, resolveTheme, accentStyleVars } from './useSettings'

describe('resolveTheme', () => {
  it('maps system to dark when the OS prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark')
  })

  it('maps system to light when the OS prefers light', () => {
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('passes explicit themes through regardless of OS preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('black', false)).toBe('black')
    expect(resolveTheme('black', true)).toBe('black')
  })
})

describe('accentStyleVars', () => {
  it('returns the five primary overrides for a valid 6-digit hex', () => {
    expect(accentStyleVars('#6aa9e2')).toEqual({
      '--color-primary': '#6aa9e2',
      '--color-primary-light': 'color-mix(in srgb, #6aa9e2 70%, white)',
      '--color-primary-dark': 'color-mix(in srgb, #6aa9e2 82%, black)',
      '--color-primary-glow': 'color-mix(in srgb, #6aa9e2 18%, transparent)',
      '--color-primary-subtle': 'color-mix(in srgb, #6aa9e2 8%, transparent)',
    })
  })

  it('accepts short 3-digit hex', () => {
    const vars = accentStyleVars('#abc')
    expect(vars?.['--color-primary']).toBe('#abc')
    expect(vars?.['--color-primary-light']).toContain('color-mix(in srgb, #abc 70%')
  })

  it('returns null for null or invalid input', () => {
    expect(accentStyleVars(null)).toBeNull()
    expect(accentStyleVars('')).toBeNull()
    expect(accentStyleVars('red')).toBeNull()
    expect(accentStyleVars('zzz')).toBeNull()
    expect(accentStyleVars('#12345')).toBeNull()
    expect(accentStyleVars('ff6f91')).toBeNull()
  })
})

describe('useSettings theme application', () => {
  const { set } = useSettings()
  const root = document.documentElement

  beforeEach(() => {
    systemTheme.matches = true
    set('theme', 'dark')
    set('accentColor', null)
  })

  afterEach(() => {
    set('theme', 'dark')
    set('accentColor', null)
  })

  it('registers exactly one OS matchMedia listener at module scope', () => {
    expect(systemTheme.listeners.size).toBe(1)
  })

  it('applies an explicit theme to data-theme', async () => {
    set('theme', 'light')
    await nextTick()
    expect(root.getAttribute('data-theme')).toBe('light')

    set('theme', 'black')
    await nextTick()
    expect(root.getAttribute('data-theme')).toBe('black')
  })

  it('re-applies data-theme when the OS theme flips under system', async () => {
    set('theme', 'system')
    await nextTick()
    expect(root.getAttribute('data-theme')).toBe('dark') // systemTheme.matches = true

    systemTheme.matches = false
    systemTheme.listeners.forEach((cb) => cb({ matches: false }))
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  it('ignores OS flips when an explicit theme is chosen', async () => {
    set('theme', 'black')
    await nextTick()

    systemTheme.matches = false
    systemTheme.listeners.forEach((cb) => cb({ matches: false }))
    expect(root.getAttribute('data-theme')).toBe('black')
  })

  it('sets the five accent vars inline and removes them on reset', async () => {
    set('accentColor', '#9d8df1')
    await nextTick()
    expect(root.style.getPropertyValue('--color-primary')).toBe('#9d8df1')
    expect(root.style.getPropertyValue('--color-primary-glow'))
      .toBe('color-mix(in srgb, #9d8df1 18%, transparent)')

    set('accentColor', null)
    await nextTick()
    expect(root.style.getPropertyValue('--color-primary')).toBe('')
    expect(root.style.getPropertyValue('--color-primary-subtle')).toBe('')
  })
})
