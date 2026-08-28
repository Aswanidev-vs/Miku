import { ref, watch } from 'vue'

const STORAGE_KEY = 'miku-settings'

export type ThemeMode = 'system' | 'dark' | 'light' | 'black'
export type DefaultTab = '/' | '/search' | '/mylist' | '/feed' | '/profile'
export type TitleLanguagePref = 'ACCOUNT' | 'ROMAJI' | 'ENGLISH' | 'NATIVE'
export type ScoreFormatPref =
  | 'ACCOUNT'
  | 'POINT_100'
  | 'POINT_10_DECIMAL'
  | 'POINT_10'
  | 'POINT_5'
  | 'POINT_3'

export interface Settings {
  autoSync: boolean
  compact: boolean
  reduceMotion: boolean
  theme: ThemeMode
  accentColor: string | null
  defaultTab: DefaultTab
  titleLanguage: TitleLanguagePref
  scoreFormat: ScoreFormatPref
  adultContent: boolean | null
  showRecentActivity: boolean
}

const defaults: Settings = {
  autoSync: true,
  compact: false,
  reduceMotion: false,
  theme: 'dark', // preserves the original Sakura Noir look for existing users
  accentColor: null, // null = default sakura coral
  defaultTab: '/',
  titleLanguage: 'ACCOUNT', // ACCOUNT = follow the AniList account preference
  scoreFormat: 'ACCOUNT',
  adultContent: null, // null = follow the AniList account setting
  showRecentActivity: false, // Default is false (turned off)
}

/* ---------- Pure theme helpers (unit-tested, no DOM access) ---------- */

/** Map a theme setting to a concrete palette; 'system' defers to the OS. */
export function resolveTheme(theme: ThemeMode, prefersDark: boolean): 'dark' | 'light' | 'black' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Inline style-property overrides for a custom accent hex; null = use defaults. */
export function accentStyleVars(hex: string | null): Record<string, string> | null {
  if (!hex || !HEX_RE.test(hex.trim())) return null
  const h = hex.trim()
  return {
    '--color-primary': h,
    '--color-primary-light': `color-mix(in srgb, ${h} 70%, white)`,
    '--color-primary-dark': `color-mix(in srgb, ${h} 82%, black)`,
    '--color-primary-glow': `color-mix(in srgb, ${h} 18%, transparent)`,
    '--color-primary-subtle': `color-mix(in srgb, ${h} 8%, transparent)`,
  }
}

/* ---------- Shared singleton state across the app ---------- */

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...defaults }
}

const state = ref<Settings>(load())

const ACCENT_VAR_NAMES = Object.keys(accentStyleVars('#000') ?? {})

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', resolveTheme(state.value.theme, systemPrefersDark()))
  const vars = accentStyleVars(state.value.accentColor)
  for (const name of ACCENT_VAR_NAMES) {
    if (vars && name in vars) root.style.setProperty(name, vars[name])
    else root.style.removeProperty(name)
  }
}

watch(
  state,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {
      /* ignore */
    }
    const root = document.documentElement
    root.classList.toggle('compact-layout', val.compact)
    root.classList.toggle('reduce-motion', val.reduceMotion)
    applyTheme()
  },
  { deep: true }
)

// Apply persisted layout classes + theme on first load
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('compact-layout', state.value.compact)
  document.documentElement.classList.toggle('reduce-motion', state.value.reduceMotion)
  applyTheme()
}

// Follow OS dark/light flips while 'system' is selected. Registered once at
// module scope; the guard keeps non-browser test environments safe.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.value.theme === 'system') applyTheme()
  })
}

export function useSettings() {
  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    state.value[key] = value
  }

  function toggle(key: keyof Settings) {
    // Only boolean settings are toggled; cast the write target since the mixed
    // value types would otherwise widen to never under keyof indexing.
    ;(state.value as Record<keyof Settings, unknown>)[key] = !state.value[key]
  }

  return {
    settings: state,
    set,
    toggle,
  }
}
