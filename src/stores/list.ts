import { defineStore } from 'pinia'
import { listRepository, type ListEntry } from '@/data/repositories/listRepository'
import { useAuthStore } from './auth'
import { useUiStore } from './ui'
import type { MediaListStatus } from '@/types/anilist'

interface State {
  entries: Record<number, ListEntry>
  order: number[]
  loading: boolean
}

export const useListStore = defineStore('list', {
  state: (): State => ({ entries: {}, order: [], loading: false }),
  getters: {
    all: (s) => s.order.map((id) => s.entries[id]).filter(Boolean) as ListEntry[],
    byMedia: (s) => (mediaId: number) =>
      Object.values(s.entries).find((e) => e.mediaId === mediaId) as ListEntry | undefined,
  },
  actions: {
    async load() {
      const auth = useAuthStore()
      if (!auth.userId) return
      this.loading = true
      try {
        const list = await listRepository.getList(auth.userId)
        this.entries = {}
        this.order = []
        list.forEach((e) => {
          this.entries[e.id] = e
          this.order.push(e.id)
        })
      } finally {
        this.loading = false
      }
    },
    /** Optimistic progress edit with rollback on failure. */
    async setProgress(mediaId: number, progress: number) {
      const entry = this.byMedia(mediaId)
      if (!entry) return
      const prev = entry.progress
      entry.progress = progress
      try {
        await listRepository.save({ mediaId, status: entry.status, score: entry.score, progress })
      } catch (e) {
        entry.progress = prev
        useUiStore().showToast('Could not save progress')
      }
    },
    async setScore(mediaId: number, score: number) {
      const entry = this.byMedia(mediaId)
      if (!entry) return
      const prev = entry.score
      entry.score = score
      try {
        await listRepository.save({ mediaId, status: entry.status, score, progress: entry.progress })
      } catch {
        entry.score = prev
        useUiStore().showToast('Could not save score')
      }
    },
    async setStatus(mediaId: number, status: MediaListStatus) {
      const entry = this.byMedia(mediaId)
      if (!entry) return
      const prev = entry.status
      entry.status = status
      try {
        await listRepository.save({ mediaId, status, score: entry.score, progress: entry.progress })
      } catch {
        entry.status = prev
      }
    },
  },
})
