import { describe, expect, it } from 'vitest'
import { isAniListRateLimitError, isAniListTemporaryError } from './graphql'

describe('isAniListRateLimitError', () => {
  it.each([
    new Error('AniList rate limit exceeded (429). Please wait 12s and retry.'),
    'HTTP 429: Too Many Requests',
    'Request throttled by AniList',
  ])('recognizes %s', (error) => {
    expect(isAniListRateLimitError(error)).toBe(true)
  })

  it('does not classify ordinary GraphQL errors as rate limits', () => {
    expect(isAniListRateLimitError(new Error('Invalid token.'))).toBe(false)
    expect(isAniListRateLimitError(null)).toBe(false)
  })
})

describe('isAniListTemporaryError', () => {
  it('recognizes browser transport failures as recoverable', () => {
    expect(isAniListTemporaryError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isAniListTemporaryError(new Error('AniList is temporarily unavailable.'))).toBe(true)
  })

  it('does not classify unrelated errors as temporary AniList failures', () => {
    expect(isAniListTemporaryError(new Error('Invalid token.'))).toBe(false)
  })
})
