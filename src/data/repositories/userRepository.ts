import { gql } from '@/data/graphql/client'
import { VIEWER } from '@/data/graphql/documents'
import { tokenStore } from '@/data/auth/tokenStore'
import { normalizedCache } from '@/data/cache/normalizedCache'
import type { User } from '@/types/anilist'

export const userRepository = {
  async getViewer(): Promise<User> {
    const cached = await normalizedCache.get<User>('viewer')
    if (cached) return cached
    const data = await gql<{ Viewer: User }>(VIEWER, undefined, tokenStore.getToken())
    tokenStore.setUserId(data.Viewer.id)
    await normalizedCache.set('viewer', data.Viewer)
    return data.Viewer
  },
}
