import { it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useListStore } from '@/stores/list'
import { useAuthStore } from '@/stores/auth'
import { listRepository } from '@/data/repositories/listRepository'
import type { ListEntry } from '@/data/repositories/listRepository'

function seed() {
  const list = useListStore()
  const entry: ListEntry = {
    id: 5,
    mediaId: 9,
    status: 'CURRENT',
    score: null,
    progress: 0,
    progressVolumes: null,
  }
  list.entries = { 5: entry }
  list.order = [5]
  return list
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
  useAuthStore().setSession('tok', 1)
})

it('applies optimistic progress on success', async () => {
  vi.spyOn(listRepository, 'save').mockResolvedValueOnce({} as never)
  const list = seed()
  await list.setProgress(9, 5)
  expect(list.entries[5].progress).toBe(5)
})

it('rolls back progress on failure', async () => {
  vi.spyOn(listRepository, 'save').mockRejectedValueOnce(new Error('x'))
  const list = seed()
  await list.setProgress(9, 5)
  expect(list.entries[5].progress).toBe(0)
})

it('rolls back score on failure', async () => {
  vi.spyOn(listRepository, 'save').mockRejectedValueOnce(new Error('x'))
  const list = seed()
  await list.setScore(9, 84)
  expect(list.entries[5].score).toBeNull()
})
