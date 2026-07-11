import { defineStore } from 'pinia'
import { userRepository } from '@/data/repositories/userRepository'
import { useAuthStore } from './auth'
import type { User } from '@/types/anilist'

export const useUserStore = defineStore('user', {
  state: () => ({ viewer: null as User | null, loading: false }),
  getters: { name: (s) => s.viewer?.name ?? '' },
  actions: {
    async loadViewer() {
      const auth = useAuthStore()
      if (!auth.isAuthed) return
      this.loading = true
      try {
        this.viewer = await userRepository.getViewer()
        if (this.viewer) auth.setSession(auth.token!, this.viewer.id)
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.viewer = null
      useAuthStore().logout()
    },
  },
})
