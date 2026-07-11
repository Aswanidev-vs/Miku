import { it, expect, vi } from 'vitest'
import { coalesce } from '@/data/cache/coalescer'

it('coalesces identical in-flight requests into one call', async () => {
  let calls = 0
  const fn = () => {
    calls++
    return new Promise<string>((r) => setTimeout(() => r('x'), 10))
  }
  const [a, b] = await Promise.all([coalesce('k', fn), coalesce('k', fn)])
  expect(calls).toBe(1)
  expect(a).toBe(b)
})

it('does not coalesce different keys', async () => {
  let calls = 0
  const fn = () => {
    calls++
    return Promise.resolve('x')
  }
  await Promise.all([coalesce('a', fn), coalesce('b', fn)])
  expect(calls).toBe(2)
})

it('allows retry after the first settles', async () => {
  const fn = vi.fn().mockResolvedValue('x')
  await coalesce('k', fn)
  await coalesce('k', fn)
  expect(fn.mock.calls.length).toBe(2)
})
