import { defineStore } from 'pinia'
import { mediaRepository } from '@/data/repositories/mediaRepository'
import type { Media } from '@/types/anilist'

interface State {
  entities: Record<number, Media>
  popularIds: number[]
  trendingIds: number[]
  detailId: number | null
  popularPage: number
  loading: boolean
  error: string | null
}

export const useMediaStore = defineStore('media', {
  state: (): State => ({
    entities: {},
    popularIds: [],
    trendingIds: [],
    detailId: null,
    popularPage: 0,
    loading: false,
    error: null,
  }),
  getters: {
    popular: (s) => s.popularIds.map((id) => s.entities[id]).filter(Boolean) as Media[],
    trending: (s) => s.trendingIds.map((id) => s.entities[id]).filter(Boolean) as Media[],
    detail: (s) => (s.detailId != null ? s.entities[s.detailId] : null) as Media | null,
    byId: (s) => (id: number) => s.entities[id] as Media | undefined,
  },
  actions: {
    async loadPopular(reset = false) {
      if (reset) {
        this.popularIds = []
        this.popularPage = 0
      }
      if (this.loading) return
      this.loading = true
      try {
        const page = await mediaRepository.getPopular(this.popularPage + 1)
        page.media?.forEach((m) => {
          this.entities[m.id] = m
          if (!this.popularIds.includes(m.id)) this.popularIds.push(m.id)
        })
        this.popularPage++
        this.evictStale()
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    async loadTrending() {
      const page = await mediaRepository.getTrending(1)
      page.media?.forEach((m) => {
        this.entities[m.id] = m
        if (!this.trendingIds.includes(m.id)) this.trendingIds.push(m.id)
      })
      this.evictStale()
    },
    async loadDetail(id: number) {
      this.detailId = id
      this.entities[id] = await mediaRepository.getDetail(id)
    },
    async search(term: string) {
      const page = await mediaRepository.search(term)
      page.media?.forEach((m) => (this.entities[m.id] = m))
      this.evictStale()
      return page.media ?? []
    },
    /** Evict entities not referenced by any list to bound memory on long sessions. */
    evictStale() {
      const keep = new Set([...this.popularIds, ...this.trendingIds])
      if (this.detailId != null) keep.add(this.detailId)
      if (Object.keys(this.entities).length <= 500) return
      for (const id of Object.keys(this.entities).map(Number)) {
        if (!keep.has(id)) delete this.entities[id]
      }
    },
  },
})
