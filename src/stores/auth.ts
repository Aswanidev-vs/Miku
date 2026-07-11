import { defineStore } from 'pinia'
import { tokenStore } from '@/data/auth/tokenStore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: (typeof localStorage !== 'undefined' ? tokenStore.getToken() : null) as string | null,
    userId: (typeof localStorage !== 'undefined' ? tokenStore.getUserId() : null) as number | null,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    setSession(token: string, userId: number) {
      this.token = token
      this.userId = userId
      tokenStore.setToken(token)
      tokenStore.setUserId(userId)
    },
    logout() {
      tokenStore.clearToken()
      this.token = null
      this.userId = null
    },
  },
})
