import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'

declare global {
  interface Window {
    wails: {
      openURL(url: string): void
    }
    go: {
      main: {
        OAuth2Service: {
          GetAuthorizationURL(): Promise<string>
          HandleCallback(code: string): Promise<{
            access_token: string
            refresh_token?: string
            token_type: string
            expires_at: number
          }>
          GetToken(): Promise<{
            access_token: string
            refresh_token?: string
            token_type: string
            expires_at: number
          } | null>
          Logout(): Promise<void>
          IsAuthenticated(): Promise<boolean>
        }
        GraphQLClient: {
          Query(query: string, variables?: Record<string, any>): Promise<any>
          Mutate(mutation: string, variables?: Record<string, any>): Promise<any>
        }
      }
    }
  }
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
      const url = await window.go.main.OAuth2Service.GetAuthorizationURL()
      // Always show manual code entry as fallback
      showCallbackInput.value = true
      // Use native Chrome Custom Tab on Android
      if (window.wails?.openURL) {
        window.wails.openURL(url)
      } else {
        // Fallback for desktop
        try {
          window.open(url, '_blank')
        } catch {
          // User can copy URL manually
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
    } finally {
      loading.value = false
    }
  }

  async function handleCallback(code: string) {
    loading.value = true
    error.value = null
    try {
      await window.go.main.OAuth2Service.HandleCallback(code)
      isAuthenticated.value = true
      showCallbackInput.value = false
      await fetchUser()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Callback handling failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
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
      const response = await window.go.main.GraphQLClient.Query(query)
      if (response?.data?.Viewer) {
        user.value = response.data.Viewer
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
      await window.go.main.OAuth2Service.Logout()
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
      const authenticated = await window.go.main.OAuth2Service.IsAuthenticated()
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
