import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'

// Lazy-load Wails runtime — avoids crash on Android when runtime isn't ready
let Browser: any = null
let Events: any = null
let OAuth2Service: any = null

async function ensureWails() {
  if (OAuth2Service) return
  try {
    const runtime = await import('@wailsio/runtime')
    Browser = runtime.Browser
    Events = runtime.Events
  } catch { /* desktop mode — not needed */ }
  try {
    OAuth2Service = await import('../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service')
  } catch { /* bindings not available */ }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const showCallbackInput = ref(false)

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)



  async function login() {
    loading.value = true
    error.value = null
    try {
      await ensureWails()

      // Register DOM event listener as backup for Android Chrome Custom Tab deep link
      const domHandler = (e: Event) => {
        const detail = (e as CustomEvent).detail
        if (detail) {
          console.log('[Miku Auth] DOM oauth-callback received, length:', detail.length)
          handleCallback(detail).catch(() => {})
        }
        window.removeEventListener('oauth-callback', domHandler)
      }
      window.addEventListener('oauth-callback', domHandler)

      await OAuth2Service.StartCallbackServer()

      const url = await OAuth2Service.GetAuthorizationURL()

      if (!url || !url.includes('client_id=')) {
        throw new Error('Failed to generate authorization URL.')
      }

      if (Browser) {
        try { await Browser.OpenURL(url) } catch { window.open(url, '_blank') }
      } else {
        window.open(url, '_blank')
      }

      setTimeout(() => window.removeEventListener('oauth-callback', domHandler), 120_000)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
    } finally {
      loading.value = false
    }
  }

  async function handleCallback(tokenOrCode: string) {
    loading.value = true
    error.value = null
    try {
      await ensureWails()
      await OAuth2Service.HandleCallback(tokenOrCode)
      // Set authenticated IMMEDIATELY — don't wait for fetchUser
      isAuthenticated.value = true
      showCallbackInput.value = false
      // Backup token to localStorage (survives Android app kill where file write may fail)
      backupTokenToStorage()
      // Fire fetchUser in background — UI updates instantly
      fetchUser().catch(() => {})
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Authentication failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
      await ensureWails()
      const token = await OAuth2Service.GetToken()
      if (!token) throw new Error('No auth token available')

      const query = `
        query {
          Viewer {
            id name about(asHtml: false)
            avatar { large medium }
            bannerImage
            statistics {
              anime { count meanScore minutesWatched episodesWatched }
              manga { count meanScore chaptersRead volumesRead }
            }
          }
        }
      `

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token.access_token}`,
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()
      if (data?.data?.Viewer) {
        user.value = data.data.Viewer
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch user'
    } finally {
      loading.value = false
    }
  }

const TOKEN_STORAGE_KEY = 'miku_anilist_token'

function backupTokenToStorage() {
  try {
    OAuth2Service.GetToken().then((token: any) => {
      if (token && token.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
      }
    }).catch(() => {})
  } catch { /* ignore */ }
}

function getCachedToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.access_token) return raw
    }
  } catch { /* ignore */ }
  return null
}

function clearTokenStorage() {
  try { localStorage.removeItem(TOKEN_STORAGE_KEY) } catch { /* ignore */ }
}

  async function checkAuth() {
    loading.value = true
    error.value = null
    try {
      await ensureWails()
      let authenticated = await OAuth2Service.IsAuthenticated()

      // On Android, file-based storage may fail. Try restoring from localStorage.
      if (!authenticated) {
        const cached = getCachedToken()
        if (cached) {
          try {
            const tokenData = JSON.parse(cached)
            await OAuth2Service.SaveToken(tokenData.access_token)
            authenticated = await OAuth2Service.IsAuthenticated()
          } catch { /* ignore */ }
        }
      }

      isAuthenticated.value = authenticated
      if (authenticated) {
        await fetchUser()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Auth check failed'
      isAuthenticated.value = false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null
    try {
      await ensureWails()
      await OAuth2Service.Logout()
      clearTokenStorage()
      user.value = null
      isAuthenticated.value = false
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Logout failed'
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    currentUser,
    isLoggedIn,
    showCallbackInput,
    login,
    handleCallback,
    fetchUser,
    logout,
    checkAuth,
  }
})
