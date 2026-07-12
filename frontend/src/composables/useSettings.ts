import { ref, watch } from 'vue'

const STORAGE_KEY = 'miku-settings'

interface Settings {
  autoSync: boolean
  compact: boolean
  reduceMotion: boolean
}

const defaults: Settings = {
  autoSync: true,
  compact: false,
  reduceMotion: false,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...defaults }
}

// Shared singleton state across the app
const state = ref<Settings>(load())

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
  },
  { deep: true }
)

// Apply persisted layout classes on first load
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('compact-layout', state.value.compact)
  document.documentElement.classList.toggle('reduce-motion', state.value.reduceMotion)
}

export function useSettings() {
  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    state.value[key] = value
  }

  function toggle(key: keyof Settings) {
    state.value[key] = !state.value[key] as any
  }

  return {
    settings: state,
    set,
    toggle,
  }
}
