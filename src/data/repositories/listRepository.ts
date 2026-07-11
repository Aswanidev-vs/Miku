import { gql } from '@/data/graphql/client'
import { USER_LIST, SAVE_LIST_ENTRY } from '@/data/graphql/documents'
import { tokenStore } from '@/data/auth/tokenStore'
import { SyncScheduler } from '@/data/sunc/SyncScheduler'
import type { MediaListEntry, MediaListStatus } from '@/types/anilist'

export interface ListEntry extends MediaListEntry {
  media?: { id: number; title: { romaji: string | null; english: string | null }; coverImage: { medium: string | null }; episodes: number | null }
}

export const listRepository = {
  async getList(userId: number): Promise<ListEntry[]> {
    const data = await gql<{
      MediaListCollection: { lists: { status: MediaListStatus; entries: ListEntry[] }[] } | null
    }>(USER_LIST, { userId }, tokenStore.getToken())
    const lists = data.MediaListCollection?.lists ?? []
    return lists.flatMap((l) => l.entries)
  },

  /** Optimistic-friendly: queue through the scheduler so bulk edits respect rate limits. */
  save(entry: { mediaId: number; status: MediaListStatus; score: number | null; progress: number }) {
    return SyncScheduler.enqueue(() =>
      gql<{ SaveMediaListEntry: MediaListEntry }>(
        SAVE_LIST_ENTRY,
        { mediaId: entry.mediaId, status: entry.status, score: entry.score ?? 0, progress: entry.progress },
        tokenStore.getToken(),
      ).then((d) => d.SaveMediaListEntry),
    )
  },
}
