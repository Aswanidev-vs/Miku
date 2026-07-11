import { defineStore } from 'pinia'
import { socialRepository } from '@/data/repositories/socialRepository'
import type { Activity } from '@/types/anilist'

export const useSocialStore = defineStore('social', {
  state: () => ({ activities: [] as Activity[], page: 0, loading: false, hasMore: true }),
  actions: {
    async loadFeed(reset = false) {
      if (reset) {
        this.activities = []
        this.page = 0
        this.hasMore = true
      }
      if (this.loading || !this.hasMore) return
      this.loading = true
      try {
        const next = this.page + 1
        const data = await socialRepository.getFeed(next)
        this.activities.push(...(data.activities ?? []))
        this.page = next
        this.hasMore = !!data.pageInfo?.hasNextPage
      } finally {
        this.loading = false
      }
    },
  },
})
