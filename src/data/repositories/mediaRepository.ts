import { gql } from '@/data/graphql/client'
import { POPULAR_ANIME, TRENDING_ANIME, SEARCH_ANIME, MEDIA_DETAIL } from '@/data/graphql/documents'
import { coalesce } from '@/data/cache/coalescer'
import { normalizedCache } from '@/data/cache/normalizedCache'
import type { Media, Page } from '@/types/anilist'

const STALE_MS = 5 * 60 * 1000

async function cachedPage(
  key: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<Page<Media>> {
  return coalesce(key, async () => {
    const cached = await normalizedCache.get<{ data: Page<Media>; ts: number }>(key)
    if (cached && Date.now() - cached.ts < STALE_MS) return cached.data
    const data = await gql<{ Page: Page<Media> }>(query, variables)
    await normalizedCache.set(key, { data: data.Page, ts: Date.now() })
    return data.Page
  })
}

export const mediaRepository = {
  getPopular(page = 1, perPage = 20) {
    return cachedPage(`popular:${page}:${perPage}`, POPULAR_ANIME, { page, perPage })
  },
  getTrending(page = 1, perPage = 20) {
    return cachedPage(`trending:${page}:${perPage}`, TRENDING_ANIME, { page, perPage })
  },
  search(term: string, page = 1, perPage = 20) {
    const key = `search:${term}:${page}:${perPage}`
    return coalesce(key, () =>
      gql<{ Page: Page<Media> }>(SEARCH_ANIME, { search: term, page, perPage }).then((d) => d.Page),
    )
  },
  async getDetail(id: number) {
    const key = `media:${id}`
    const cached = await normalizedCache.get<Media>(key)
    if (cached) return cached
    const data = await gql<{ Media: Media }>(MEDIA_DETAIL, { id })
    await normalizedCache.set(key, data.Media)
    return data.Media
  },
}
