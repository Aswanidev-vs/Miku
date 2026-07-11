import { it, expect, vi, beforeEach } from 'vitest'
import { gql } from '@/data/graphql/client'
import { RateLimitError, GraphQLError } from '@/data/graphql/errors'

beforeEach(() => vi.restoreAllMocks())

it('returns data on 200', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: { hello: 'world' } }),
    }),
  )
  const res = await gql<{ hello: string }>('query{}')
  expect(res.hello).toBe('world')
})

it('throws RateLimitError on 429', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ status: 429, json: async () => ({}) }),
  )
  await expect(gql('query{}')).rejects.toBeInstanceOf(RateLimitError)
})

it('throws GraphQLError on schema errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ errors: [{ message: 'bad' }] }),
    }),
  )
  await expect(gql('query{}')).rejects.toBeInstanceOf(GraphQLError)
})

it('sends Authorization header when token provided', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ data: {} }),
  })
  vi.stubGlobal('fetch', fetchMock)
  await gql('query{}', undefined, 'abc')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc')
})
