import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Media, MediaListCollection, PageInfo } from '../types'
import { gqlQuery, gqlMutate } from '../api/graphql'

const TRENDING_MANGA_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: MANGA) {
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
      chapters
      volumes
      averageScore
      popularity
      trending
      genres
      description(asHtml: false)
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

const SEARCH_MANGA_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
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
      chapters
      volumes
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

const USER_MANGA_LIST_QUERY = `
query ($userId: Int, $status: MediaListStatus) {
  MediaListCollection(userId: $userId, type: MANGA, status: $status) {
    lists {
      name
      status
      entries {
        id
        mediaId
        status
        score
        progress
        progressVolumes
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
          chapters
          volumes
          status
        }
      }
    }
  }
}
`

const MEDIA_DETAILS_QUERY = `
query ($id: Int) {
  Media(id: $id, type: MANGA) {
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
    chapters
    volumes
    averageScore
    meanScore
    popularity
    trending
    favourites
    genres
    tags {
      id
      name
      description
      category
      rank
      isGeneralSpoiler
      isMediaSpoiler
      isAdult
    }
    description(asHtml: false)
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    relations {
      edges {
        id
        relationType
        node {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
          format
        }
      }
    }
    recommendations {
      edges {
        node {
          id
          userRating
          media {
            id
            title {
              romaji
            }
            coverImage {
              medium
            }
          }
        }
      }
    }
    characters {
      edges {
        id
        role
        node {
          id
          name {
            full
          }
          image {
            medium
            large
          }
        }
      }
    }
  }
}
`

const SAVE_MEDIA_LIST_ENTRY_MUTATION = `
mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int, $progressVolumes: Int, $repeat: Int) {
  SaveMediaListEntry(
    mediaId: $mediaId
    status: $status
    score: $score
    progress: $progress
    progressVolumes: $progressVolumes
    repeat: $repeat
  ) {
    id
    mediaId
    status
    score
    progress
    progressVolumes
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

export const useMangaStore = defineStore('manga', () => {
  const trending = ref<Media[]>([])
  const searchResults = ref<Media[]>([])
  const myList = ref<MediaListCollection | null>(null)
  const currentMedia = ref<Media | null>(null)
  const pageInfo = ref<PageInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTrending(page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(TRENDING_MANGA_QUERY, {
        page,
        perPage,
      })
      if (response?.data?.Page) {
        trending.value = response.data.Page.media
        pageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch trending manga'
    } finally {
      loading.value = false
    }
  }

  async function search(query: string, page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(SEARCH_MANGA_QUERY, {
        search: query,
        page,
        perPage,
      })
      if (response?.data?.Page) {
        searchResults.value = response.data.Page.media
        pageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to search manga'
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
      const response = await gqlQuery(USER_MANGA_LIST_QUERY, variables)
      if (response?.data?.MediaListCollection) {
        myList.value = response.data.MediaListCollection
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch manga list'
    } finally {
      loading.value = false
    }
  }

  async function updateEntry(
    mediaId: number,
    status?: string,
    score?: number,
    progress?: number,
    progressVolumes?: number,
    repeat?: number
  ) {
    loading.value = true
    error.value = null
    try {
      const variables: Record<string, any> = { mediaId }
      if (status) variables.status = status
      if (score !== undefined) variables.score = score
      if (progress !== undefined) variables.progress = progress
      if (progressVolumes !== undefined) variables.progressVolumes = progressVolumes
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
      const response = await gqlQuery(MEDIA_DETAILS_QUERY, { id })
      if (response?.data?.Media) {
        currentMedia.value = response.data.Media
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch manga details'
    } finally {
      loading.value = false
    }
  }

  function clearSearch() {
    searchResults.value = []
    pageInfo.value = null
  }

  function clearCurrentMedia() {
    currentMedia.value = null
  }

  return {
    trending,
    searchResults,
    myList,
    currentMedia,
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
  }
})
