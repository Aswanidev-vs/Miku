import { it, expect, beforeEach } from 'vitest'
import { NormalizedCache } from '@/data/cache/normalizedCache'

beforeEach(() => indexedDB.deleteDatabase('keyval-store'))

it('falls back to persisted store on a fresh instance', async () => {
  const a = new NormalizedCache()
  await a.set('media:1', { id: 1 })

  const b = new NormalizedCache()
  expect(await b.get('media:1')).toEqual({ id: 1 })
})

it('writes through to memory immediately', async () => {
  const c = new NormalizedCache()
  await c.set('k', 42)
  expect(c.has('k')).toBe(true)
  expect(await c.get('k')).toBe(42)
})

it('deletes from both tiers', async () => {
  const c = new NormalizedCache()
  await c.set('k', 1)
  await c.delete('k')
  expect(c.has('k')).toBe(false)
  expect(await new NormalizedCache().get('k')).toBeUndefined()
})
