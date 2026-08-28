import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Media, MediaListCollection, PageInfo, CharacterEdge } from '../types'
import { gqlQuery, gqlMutate } from '../api/graphql'
import { useAuthStore } from './auth'
import { useSettings } from '../composables/useSettings'
import { effectiveIsAdult } from '../utils/mediaDisplay'

const TRENDING_ANIME_QUERY = `
query ($page: Int, $perPage: Int, $adult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: $adult) {
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
query ($search: String, $page: Int, $perPage: Int, $adult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: $adult) {
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
query ($genre: String, $page: Int, $perPage: Int, $adult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    media(genre: $genre, type: ANIME, sort: POPULARITY_DESC, isAdult: $adult) {
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
            native
            userPreferred
          }
          coverImage {
            large
            medium
          }
          format
          episodes
          status
          nextAiringEpisode { episode airingAt timeUntilAiring }
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
    isFavourite
    genres
    description(asHtml: false)
    startDate { year month day }
    endDate { year month day }
    season seasonYear
    nextAiringEpisode { id episode airingAt timeUntilAiring }
    mediaListEntry {
      id
      mediaId
      status
      score
      progress
      repeat
      priority
      private
      notes
      hiddenFromStatusLists
      customLists
      startedAt { year month day }
      completedAt { year month day }
      updatedAt
      createdAt
    }
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
        node { id title { romaji english native userPreferred } coverImage { medium } format }
      }
    }
    recommendations {
      edges {
        node { id userRating media { id title { romaji english native userPreferred } coverImage { medium } } }
      }
    }
    characters(perPage: 50, sort: ROLE) {
      pageInfo { currentPage hasNextPage }
      edges {
        id role
        node { id name { full } image { medium large } }
        voiceActors(language: JAPANESE) { id name { full } image { medium } }
      }
    }
  }
}
`

// The slow detail query only fetches the first 50 characters; popular shows
// (e.g. Slime S4 has 500) need the remaining pages appended.
const MEDIA_CHARACTERS_PAGE_QUERY = `
query ($id: Int!, $page: Int, $perPage: Int) {
  Media(id: $id) {
    characters(page: $page, perPage: $perPage, sort: ROLE) {
      pageInfo { currentPage hasNextPage }
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
mutation (
  $id: Int
  $mediaId: Int
  $status: MediaListStatus
  $score: Float
  $progress: Int
  $repeat: Int
  $private: Boolean
  $notes: String
  $hiddenFromStatusLists: Boolean
  $customLists: [String]
  $startedAt: FuzzyDateInput
  $completedAt: FuzzyDateInput
) {
  SaveMediaListEntry(
    id: $id
    mediaId: $mediaId
    status: $status
    score: $score
    progress: $progress
    repeat: $repeat
    private: $private
    notes: $notes
    hiddenFromStatusLists: $hiddenFromStatusLists
    customLists: $customLists
    startedAt: $startedAt
    completedAt: $completedAt
  ) {
    id
    mediaId
    status
    score
    progress
    repeat
    private
    notes
    hiddenFromStatusLists
    customLists
    startedAt { year month day }
    completedAt { year month day }
    updatedAt
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

const TOGGLE_FAVOURITE_MUTATION = `
mutation ($animeId: Int) {
  ToggleFavourite(animeId: $animeId) {
    anime {
      nodes {
        id
      }
    }
  }
}
`

export const useAnimeStore = defineStore('anime', () => {
  const authStore = useAuthStore()
  const { settings } = useSettings()

  const trending = ref<Media[]>([])
  const searchResults = ref<Media[]>([])
  const myList = ref<MediaListCollection | null>(null)
  const currentMedia = ref<Media | null>(null)
  const genreRecommendations = ref<Media[]>([])
  const pageInfo = ref<PageInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Resolve the $adult query variable: an explicit app setting wins, null
  // defers to the AniList account option (false when signed out / unknown).
  function adultVar(): boolean {
    return effectiveIsAdult(settings.value.adultContent, authStore.currentUser?.options?.displayAdultContent)
  }

  async function fetchTrending(page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(TRENDING_ANIME_QUERY, {
        page,
        perPage,
        adult: adultVar(),
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
        adult: adultVar(),
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

  function clearMyList() {
    myList.value = null
  }

  async function updateEntry(
    mediaId: number,
    status?: string,
    score?: number,
    progress?: number,
    repeat?: number
  ) {
    return saveListEntry({
      mediaId,
      status,
      score,
      progress,
      repeat,
    })
  }

  async function saveListEntry(payload: {
    id?: number
    mediaId: number
    status?: string
    score?: number
    progress?: number
    repeat?: number
    private?: boolean
    notes?: string
    hiddenFromStatusLists?: boolean
    customLists?: string[]
    startedAt?: { year?: number; month?: number; day?: number }
    completedAt?: { year?: number; month?: number; day?: number }
  }) {
    loading.value = true
    error.value = null
    try {
      const variables: Record<string, any> = {
        mediaId: payload.mediaId,
      }
      if (payload.id) variables.id = payload.id
      if (payload.status) variables.status = payload.status
      if (payload.score !== undefined) variables.score = payload.score
      if (payload.progress !== undefined) variables.progress = payload.progress
      if (payload.repeat !== undefined) variables.repeat = payload.repeat
      if (payload.private !== undefined) variables.private = payload.private
      if (payload.notes !== undefined) variables.notes = payload.notes
      if (payload.hiddenFromStatusLists !== undefined) variables.hiddenFromStatusLists = payload.hiddenFromStatusLists
      if (payload.customLists !== undefined) variables.customLists = payload.customLists
      if (payload.startedAt) variables.startedAt = payload.startedAt
      if (payload.completedAt) variables.completedAt = payload.completedAt

      const response = await gqlMutate(
        SAVE_MEDIA_LIST_ENTRY_MUTATION,
        variables
      )
      const entry = response?.data?.SaveMediaListEntry
      if (entry && currentMedia.value && currentMedia.value.id === payload.mediaId) {
        currentMedia.value = {
          ...currentMedia.value,
          mediaListEntry: entry,
        }
      }
      return entry
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save list entry'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function toggleFavourite(animeId: number) {
    try {
      const response = await gqlMutate(TOGGLE_FAVOURITE_MUTATION, { animeId })
      if (currentMedia.value && currentMedia.value.id === animeId) {
        currentMedia.value = {
          ...currentMedia.value,
          isFavourite: !currentMedia.value.isFavourite,
        }
      }
      return response?.data?.ToggleFavourite
    } catch (e) {
      console.error('Failed to toggle favourite:', e)
      throw e
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
      if (currentMedia.value?.mediaListEntry?.id === entryId) {
        currentMedia.value = {
          ...currentMedia.value,
          mediaListEntry: undefined,
        }
      }
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
            fetchRemainingCharacters(id, merged).catch(() => {})
          }
        }).catch(() => {})
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch anime details'
    } finally {
      loading.value = false
    }
  }

  // Append character pages beyond the first 50 fetched by MEDIA_DETAILS_SLOW.
  async function fetchRemainingCharacters(id: number, media: Media) {
    if (!media.characters?.pageInfo?.hasNextPage) return
    const edges: CharacterEdge[] = [...(media.characters.edges ?? [])]
    const seen = new Set(edges.map((e) => e.id))
    let page = (media.characters.pageInfo.currentPage ?? 1) + 1
    const MAX_PAGES = 50 // hard cap (~2500 characters) to bound the request loop
    while (page <= MAX_PAGES) {
      const res = await gqlQuery(MEDIA_CHARACTERS_PAGE_QUERY, { id, page, perPage: 50 })
      const conn = res?.data?.Media?.characters
      const newEdges = (conn?.edges ?? []) as CharacterEdge[]
      if (!newEdges.length) break
      for (const e of newEdges) {
        if (!seen.has(e.id)) {
          seen.add(e.id)
          edges.push(e)
        }
      }
      if (!conn?.pageInfo?.hasNextPage) break
      page++
    }
    if (currentMedia.value?.id === id && currentMedia.value.characters) {
      currentMedia.value.characters = {
        ...currentMedia.value.characters,
        edges,
        pageInfo: { ...currentMedia.value.characters.pageInfo, hasNextPage: false },
      }
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
          gqlQuery(GENRE_RECS_QUERY, { genre: g, page: 1, perPage: 12, adult: adultVar() })
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
    clearMyList,
    updateEntry,
    saveListEntry,
    toggleFavourite,
    deleteEntry,
    fetchDetails,
    clearSearch,
    clearCurrentMedia,
    startSync,
    stopSync,
  }
})
