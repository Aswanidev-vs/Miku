const TOKEN_KEY = 'miku.auth.token'
const VERIFIER_KEY = 'miku.auth.verifier'
const USER_KEY = 'miku.auth.userId'

/**
 * Persists the AniList session. Uses localStorage in the web/PWA build;
 * swapped for Capacitor SecureStorage in the native Android build (Task 1.7).
 */
export const tokenStore = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },
  getVerifier(): string | null {
    return localStorage.getItem(VERIFIER_KEY)
  },
  setVerifier(v: string): void {
    localStorage.setItem(VERIFIER_KEY, v)
  },
  clearVerifier(): void {
    localStorage.removeItem(VERIFIER_KEY)
  },
  getUserId(): number | null {
    const v = localStorage.getItem(USER_KEY)
    return v ? Number(v) : null
  },
  setUserId(id: number): void {
    localStorage.setItem(USER_KEY, String(id))
  },
}
