import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Browser } from '@wailsio/runtime'
import * as OAuth2Service from '../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service'
import { clearAuthTokenCache, clearGqlCache } from '../api/graphql'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const showCallbackInput = ref(false)
  const authFlowInProgress = ref(false)

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)

  let callbackInFlight: Promise<void> | null = null
  let lastCallbackValue = ''
  let lastCallbackAt = 0

  async function login() {
    loading.value = true
    authFlowInProgress.value = true
    error.value = null
    try {
      // Register DOM event listener as backup for Android Chrome Custom Tab deep link
      // Java's handleDeepLink dispatches 'oauth-callback' CustomEvent via window
      const domHandler = (e: Event) => {
        const detail = (e as CustomEvent).detail
        if (detail) {
          console.log('[Miku Auth] DOM oauth-callback received, length:', detail.length)
          handleCallback(detail).catch(() => {})
        }
        window.removeEventListener('oauth-callback', domHandler)
      }
      window.addEventListener('oauth-callback', domHandler)

      // Start localhost callback server before generating the URL
      await OAuth2Service.StartCallbackServer()

      const url = await OAuth2Service.GetAuthorizationURL()

      if (!url || !url.includes('client_id=')) {
        throw new Error('Failed to generate authorization URL. Please check that ANILIST_CLIENT_ID is configured.')
      }

      // Open URL via Wails runtime (opens system browser / Chrome Custom Tab on Android)
      try {
        await Browser.OpenURL(url)
      } catch {
        // Fallback for desktop if OpenURL fails
        window.open(url, '_blank')
      }

      // Clean up DOM listener after 120s if it never fires
      setTimeout(() => window.removeEventListener('oauth-callback', domHandler), 120_000)
    } catch (e) {
      authFlowInProgress.value = false
      const errorMessage = e instanceof Error ? e.message : 'Login failed'
      error.value = errorMessage
      console.error('Login error:', errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function handleCallback(tokenOrCode: string) {
    const now = Date.now()
    if (callbackInFlight) return callbackInFlight
    if (tokenOrCode === lastCallbackValue && now - lastCallbackAt < 15_000) return
    lastCallbackValue = tokenOrCode
    lastCallbackAt = now

    callbackInFlight = doHandleCallback(tokenOrCode)
    try {
      await callbackInFlight
    } finally {
      callbackInFlight = null
    }
  }

  async function doHandleCallback(tokenOrCode: string) {
    loading.value = true
    error.value = null
    try {
      // Always exchange the authorization code for a token via the backend.
      // AniList auth codes can be hundreds of chars, so length-based heuristics fail.
      await OAuth2Service.HandleCallback(tokenOrCode)
      // Clear the pending code after successful exchange so it can't be reused
      await OAuth2Service.ConsumePendingCode()
      clearAuthTokenCache()
      clearGqlCache()
      isAuthenticated.value = true
      showCallbackInput.value = false
      await fetchUser()
      authFlowInProgress.value = false
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authentication failed'
      console.error('[Miku] handleCallback error:', msg)
      error.value = msg
      authFlowInProgress.value = false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
      // NOTE: GraphQLClient is not bound as a Wails service.
      // For now, use the AniList GraphQL API directly from frontend via fetch.
      const token = await OAuth2Service.GetToken()
      if (!token) {
        throw new Error('No auth token available')
      }

      const query = `
        query {
          Viewer {
            id
            name
            about(asHtml: false)
            avatar {
              large
              medium
            }
            bannerImage
            statistics {
              anime {
                count
                meanScore
                minutesWatched
                episodesWatched
              }
              manga {
                count
                meanScore
                chaptersRead
                volumesRead
              }
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

  async function logout() {
    loading.value = true
    error.value = null
    try {
      await OAuth2Service.Logout()
      clearAuthTokenCache()
      clearGqlCache()
      lastCallbackValue = ''
      lastCallbackAt = 0
      user.value = null
      isAuthenticated.value = false
      authFlowInProgress.value = false
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Logout failed'
    } finally {
      loading.value = false
    }
  }

  async function checkAuth() {
    loading.value = true
    error.value = null
    try {
      const authenticated = await OAuth2Service.IsAuthenticated()
      isAuthenticated.value = authenticated
      if (authenticated) {
        await fetchUser()
      } else {
        clearAuthTokenCache()
        clearGqlCache()
        user.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Auth check failed'
      isAuthenticated.value = false
      authFlowInProgress.value = false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    authFlowInProgress,
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
