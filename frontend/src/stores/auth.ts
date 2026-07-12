import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Browser, Events } from '@wailsio/runtime'
import * as OAuth2Service from '../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service'
import type { User } from '../types'

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
      // Start localhost callback server before generating the URL
      // (this updates the redirect URI to match the actual port)
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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Login failed'
      error.value = errorMessage
      console.error('Login error:', errorMessage)
    } finally {
      loading.value = false
    }
  }

  async function handleCallback(tokenOrCode: string) {
    loading.value = true
    error.value = null
    try {
      // Always exchange the authorization code for a token via the backend.
      // AniList auth codes can be hundreds of chars, so length-based heuristics fail.
      await OAuth2Service.HandleCallback(tokenOrCode)
      isAuthenticated.value = true
      showCallbackInput.value = false
      await fetchUser()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authentication failed'
      console.error('[Miku] handleCallback error:', msg)
      error.value = msg
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
      user.value = null
      isAuthenticated.value = false
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
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Auth check failed'
      isAuthenticated.value = false
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
