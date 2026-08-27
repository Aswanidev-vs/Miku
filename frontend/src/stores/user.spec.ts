import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// user.ts only depends on ../api/graphql (and types), which hides the Wails
// bindings — replacing the transport keeps the store safe under jsdom.
vi.mock('../api/graphql', () => ({
  gqlQuery: vi.fn(),
  gqlMutate: vi.fn(),
}))

import { gqlQuery, gqlMutate } from '../api/graphql'
import { useUserStore } from './user'
import type { TextActivity } from '../types'

const mockQuery = vi.mocked(gqlQuery)
const mockMutate = vi.mocked(gqlMutate)

function makeTextActivity(id: number): TextActivity {
  return {
    id,
    type: 'TEXT',
    text: `<p>status ${id}</p>`,
    createdAt: 1_700_000_000 + id,
    replyCount: 0,
    likeCount: 0,
  }
}

function makePageInfo(currentPage: number, hasNextPage: boolean) {
  return {
    total: 3,
    perPage: 20,
    currentPage,
    lastPage: hasNextPage ? currentPage + 1 : currentPage,
    hasNextPage,
  }
}

function pageResponse(activities: TextActivity[], hasNextPage: boolean, currentPage = 1) {
  return {
    data: {
      Page: {
        activities,
        pageInfo: makePageInfo(currentPage, hasNextPage),
      },
    },
  }
}

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('postActivity', () => {
    it('prepends the created activity and returns it', async () => {
      const store = useUserStore()
      const existing = makeTextActivity(1)
      store.activities = [existing]

      const created = makeTextActivity(42)
      mockMutate.mockResolvedValueOnce({ data: { CreateTextActivity: created } })

      const result = await store.postActivity('hello anilist')

      expect(result).toEqual(created)
      expect(store.activities[0]).toEqual(created)
      expect(store.activities).toHaveLength(2)
      expect(store.activities[1]).toEqual(existing)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)

      expect(mockMutate).toHaveBeenCalledTimes(1)
      expect(mockMutate.mock.calls[0][0]).toContain('CreateTextActivity')
      expect(mockMutate.mock.calls[0][1]).toEqual({ text: 'hello anilist' })
    })

    it('sets error and rethrows when the mutation rejects', async () => {
      const store = useUserStore()
      mockMutate.mockRejectedValueOnce(new Error('rate limited'))

      await expect(store.postActivity('boom')).rejects.toThrow('rate limited')

      expect(store.error).toBe('rate limited')
      expect(store.activities).toHaveLength(0)
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchActivities', () => {
    it('appends new pages while deduplicating by id', async () => {
      const store = useUserStore()
      const a1 = makeTextActivity(1)
      const a2 = makeTextActivity(2)
      const a3 = makeTextActivity(3)

      mockQuery.mockResolvedValueOnce(pageResponse([a1, a2], true, 1))
      await store.fetchActivities(7, 1, 20)

      expect(store.activities.map((a) => a.id)).toEqual([1, 2])
      expect(store.activityPageInfo?.hasNextPage).toBe(true)

      // Page 2 overlaps on id=2 — the duplicate must not be added again.
      mockQuery.mockResolvedValueOnce(pageResponse([a2, a3], false, 2))
      await store.fetchActivities(7, 2, 20, true)

      expect(store.activities.map((a) => a.id)).toEqual([1, 2, 3])
      expect(store.error).toBeNull()
      expect(store.activityPageInfo?.hasNextPage).toBe(false)
    })

    it('replaces activities when append is false', async () => {
      const store = useUserStore()
      store.activities = [makeTextActivity(99)]

      mockQuery.mockResolvedValueOnce(pageResponse([makeTextActivity(5)], false))
      await store.fetchActivities(7, 1, 20)

      expect(store.activities.map((a) => a.id)).toEqual([5])
    })
  })

  describe('fetchUserActivityPage', () => {
    it('returns items and pageInfo without mutating store.activities', async () => {
      const store = useUserStore()
      const sentinel = makeTextActivity(100)
      store.activities = [sentinel]

      const items = [makeTextActivity(10), makeTextActivity(11)]
      mockQuery.mockResolvedValueOnce(pageResponse(items, true, 3))

      const result = await store.fetchUserActivityPage(7, 3, 20)

      expect(result.items).toEqual(items)
      expect(result.pageInfo).toEqual(makePageInfo(3, true))
      // The shared feed state stays untouched.
      expect(store.activities).toEqual([sentinel])
      expect(store.activityPageInfo).toBeNull()

      expect(mockQuery.mock.calls[0][1]).toEqual({ userId: 7, page: 3, perPage: 20 })
    })
  })
})
