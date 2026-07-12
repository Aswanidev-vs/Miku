import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Media, MediaListCollection, PageInfo } from '../types'
import { gqlQuery, gqlMutate } from '../api/graphql'

const TRENDING_ANIME_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
        native
        userPreferred
      }
      coverImage {
        large
        medium
        color
      }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      trending
      genres
      description(asHtml: false)
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
  }
}
`

const SEARCH_ANIME_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
        userPreferred
      }
      coverImage {
        large
        medium
        color
      }
      format
      status
      episodes
      averageScore
      genres
    }
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
  }
}
`

// Genre-based recommendations — used to supplement sparse native AniList recs.
const GENRE_RECS_QUERY = `
query ($genre: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
        native
        userPreferred
      }
      coverImage {
        large
        medium
        color
      }
      format
      status
      episodes
      averageScore
      genres
    }
  }
}
`

const USER_ANIME_LIST_QUERY = `
query ($userId: Int, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: ANIME, status: $status) {
    lists {
      name
      status
      entries {
        id
        mediaId
        status
        score
        progress
        repeat
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        media {
          id
          title {
            romaji
            english
            userPreferred
          }
          coverImage {
            large
            medium
          }
          format
          episodes
          status
        }
      }
    }
  }
}
`

// Fast query: banner, cover, title, meta, list entry — shown immediately
const MEDIA_DETAILS_FAST = `
query ($id: Int) {
  Media(id: $id) {
    id
    title { romaji english native userPreferred }
    coverImage { large medium color }
    bannerImage
    format status episodes chapters volumes duration
    averageScore meanScore popularity trending favourites
    genres
    description(asHtml: false)
    startDate { year month day }
    endDate { year month day }
    season seasonYear
    nextAiringEpisode { id episode airingAt timeUntilAiring }
    mediaListEntry { id status score progress repeat }
  }
}
`

// Slow query: characters, relations, recommendations — loaded after fast
const MEDIA_DETAILS_SLOW = `
query ($id: Int) {
  Media(id: $id) {
    id
    tags { id name description category rank isGeneralSpoiler isMediaSpoiler isAdult }
    relations {
      edges {
        id relationType
        node { id title { romaji } coverImage { medium } format }
      }
    }
    recommendations {
      edges {
        node { id userRating media { id title { romaji } coverImage { medium } } }
      }
    }
    characters(perPage: 50, sort: ROLE) {
      edges {
        id role
        node { id name { full } image { medium large } }
        voiceActors(language: JAPANESE) { id name { full } image { medium } }
      }
    }
  }
}
`

const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int, $repeat: Int) {
  SaveMediaListEntry(
    mediaId: $mediaId
    status: $status
    score: $score
    progress: $progress
    repeat: $repeat
  ) {
    id
    mediaId
    status
    score
    progress
    repeat
    media {
      id
      title {
        romaji
      }
    }
  }
}
`

const DELETE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}
`

export const useAnimeStore = defineStore('anime', () => {
  const trending = ref<Media[]>([])
  const searchResults = ref<Media[]>([])
  const myList = ref<MediaListCollection | null>(null)
  const currentMedia = ref<Media | null>(null)
  const genreRecommendations = ref<Media[]>([])
  const pageInfo = ref<PageInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTrending(page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(TRENDING_ANIME_QUERY, {
        page,
        perPage,
      })
      if (response?.data?.Page) {
        trending.value = response.data.Page.media
        pageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch trending anime'
    } finally {
      loading.value = false
    }
  }

  async function search(query: string, page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(SEARCH_ANIME_QUERY, {
        search: query,
        page,
        perPage,
      })
      if (response?.data?.Page) {
        searchResults.value = response.data.Page.media
        pageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to search anime'
    } finally {
      loading.value = false
    }
  }

  async function fetchMyList(userId: number, status?: string) {
    loading.value = true
    error.value = null
    try {
      const variables: Record<string, any> = { userId }
      if (status) {
        variables.status = status
      }
      const response = await gqlQuery(USER_ANIME_LIST_QUERY, variables)
      if (response?.data?.MediaListCollection) {
        myList.value = response.data.MediaListCollection
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch anime list'
    } finally {
      loading.value = false
    }
  }

  async function updateEntry(
    mediaId: number,
    status?: string,
    score?: number,
    progress?: number,
    repeat?: number
  ) {
    loading.value = true
    error.value = null
    try {
      const variables: Record<string, any> = { mediaId }
      if (status) variables.status = status
      if (score !== undefined) variables.score = score
      if (progress !== undefined) variables.progress = progress
      if (repeat !== undefined) variables.repeat = repeat

      const response = await gqlMutate(
        SAVE_MEDIA_LIST_ENTRY_MUTATION,
        variables
      )
      return response?.data?.SaveMediaListEntry
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update entry'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteEntry(entryId: number) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlMutate(
        DELETE_MEDIA_LIST_ENTRY_MUTATION,
        { id: entryId }
      )
      return response?.data?.DeleteMediaListEntry?.deleted
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete entry'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchDetails(id: number) {
    loading.value = true
    error.value = null
    try {
      // Phase 1: fast critical data — banner, cover, title, meta, list entry
      const fast = await gqlQuery(MEDIA_DETAILS_FAST, { id })
      if (fast?.data?.Media) {
        const media = fast.data.Media as Media
        currentMedia.value = media
        loading.value = false // content visible now
        // Phase 2: heavy data — characters, relations, recommendations (fire and forget)
        gqlQuery(MEDIA_DETAILS_SLOW, { id }).then((slow) => {
          if (slow?.data?.Media && currentMedia.value?.id === id) {
            const merged = { ...currentMedia.value, ...slow.data.Media } as Media
            currentMedia.value = merged
            supplementRecommendations(merged)
          }
        }).catch(() => {})
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch anime details'
    } finally {
      loading.value = false
    }
  }

  // When AniList's native recommendations are sparse, pull popular titles that
  // share the current media's top genres — ranked by shared-genre overlap.
  async function supplementRecommendations(media: Media) {
    genreRecommendations.value = []
    const nativeIds = new Set<number>()
    for (const edge of media.recommendations?.edges ?? []) {
      const rid = edge.node?.media?.id
      if (rid) nativeIds.add(rid)
    }

    const genres = (media.genres ?? []).slice(0, 3)
    if (genres.length === 0) return

    try {
      const results = await Promise.all(
        genres.map((g) =>
          gqlQuery(GENRE_RECS_QUERY, { genre: g, page: 1, perPage: 12 })
            .then((r) => r?.data?.Page?.media ?? [])
            .catch(() => [])
        )
      )

      const seen = new Set<number>([media.id, ...nativeIds])
      const merged: Media[] = []
      for (const list of results) {
        for (const item of list as Media[]) {
          if (item.id && !seen.has(item.id)) {
            seen.add(item.id)
            merged.push(item)
          }
        }
      }
      genreRecommendations.value = merged.slice(0, 12)
    } catch {
      genreRecommendations.value = []
    }
  }

  function clearSearch() {
    searchResults.value = []
    pageInfo.value = null
  }

  function clearCurrentMedia() {
    currentMedia.value = null
    genreRecommendations.value = []
  }

  // --- Auto-sync polling ---
  let syncTimer: ReturnType<typeof setInterval> | null = null
  let syncUserId: number | null = null

  function startSync(userId: number, intervalMs = 60000) {
    stopSync()
    syncUserId = userId
    // Immediately fetch fresh data
    fetchMyList(userId)
    // Then poll at interval
    syncTimer = setInterval(() => {
      fetchMyList(userId)
      fetchTrending(1, 20)
    }, intervalMs)
  }

  function stopSync() {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    syncUserId = null
  }

  return {
    trending,
    searchResults,
    myList,
    currentMedia,
    genreRecommendations,
    pageInfo,
    loading,
    error,
    fetchTrending,
    search,
    fetchMyList,
    updateEntry,
    deleteEntry,
    fetchDetails,
    clearSearch,
    clearCurrentMedia,
    startSync,
    stopSync,
  }
})
