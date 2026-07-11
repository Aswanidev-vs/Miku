import { gql } from '@/data/graphql/client'
import { ACTIVITY_FEED } from '@/data/graphql/documents'
import { tokenStore } from '@/data/auth/tokenStore'
import { coalesce } from '@/data/cache/coalescer'
import type { Activity, Page } from '@/types/anilist'

export const socialRepository = {
  getFeed(page = 1, perPage = 20): Promise<Page<Activity>> {
    const key = `feed:${page}:${perPage}`
    return coalesce(key, () =>
      gql<{ Page: Page<Activity> }>(ACTIVITY_FEED, { page, perPage }, tokenStore.getToken()).then(
        (d) => d.Page,
      ),
    )
  },
}
