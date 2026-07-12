import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Activity, TextActivity, ListActivity } from '../types'
import { gqlQuery, gqlMutate } from '../api/graphql'

const USER_PROFILE_QUERY = `
query ($name: String) {
  User(name: $name) {
    id
    name
    about(asHtml: false)
    avatar {
      large
      medium
    }
    bannerImage
    statistics {
      anime {
        count
        meanScore
        minutesWatched
        episodesWatched
      }
      manga {
        count
        meanScore
        chaptersRead
        volumesRead
      }
    }
    favourites {
      anime {
        nodes {
          id
          title {
            romaji
          }
          coverImage {
            medium
          }
        }
      }
      manga {
        nodes {
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
    options {
      titleLanguage
      adultContent
      scoreFormat
      rowOrder
      displayCharacters
    }
  }
}
`

const ACTIVITY_FEED_QUERY = `
query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, sort: ID_DESC) {
      ... on ListActivity {
        id
        type
        status
        progress
        createdAt
        user {
          id
          name
          avatar {
            medium
          }
        }
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
      ... on TextActivity {
        id
        type
        text
        createdAt
        user {
          id
          name
          avatar {
            medium
          }
        }
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

const CREATE_TEXT_ACTIVITY_MUTATION = `
mutation ($text: String) {
  CreateTextActivity(text: $text) {
    id
    type
    text
    createdAt
    user {
      id
      name
      avatar {
        medium
      }
    }
  }
}
`

const DELETE_ACTIVITY_MUTATION = `
mutation ($id: Int) {
  DeleteActivity(id: $id) {
    deleted
  }
}
`

export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)
  const activities = ref<(TextActivity | ListActivity)[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activityPageInfo = ref<{
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    hasNextPage: boolean
  } | null>(null)

  async function fetchProfile(name: string) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(USER_PROFILE_QUERY, { name })
      if (response?.data?.User) {
        profile.value = response.data.User
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch user profile'
    } finally {
      loading.value = false
    }
  }

  async function fetchActivities(userId: number, page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(ACTIVITY_FEED_QUERY, {
        userId,
        page,
        perPage,
      })
      if (response?.data?.Page) {
        activities.value = response.data.Page.activities
        activityPageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch activities'
    } finally {
      loading.value = false
    }
  }

  async function postActivity(text: string) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlMutate(CREATE_TEXT_ACTIVITY_MUTATION, {
        text,
      })
      if (response?.data?.CreateTextActivity) {
        const newActivity = response.data.CreateTextActivity as TextActivity
        activities.value.unshift(newActivity)
        return newActivity
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to post activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteActivity(activityId: number) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlMutate(DELETE_ACTIVITY_MUTATION, {
        id: activityId,
      })
      if (response?.data?.DeleteActivity?.deleted) {
        activities.value = activities.value.filter((a) => a.id !== activityId)
        return true
      }
      return false
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearProfile() {
    profile.value = null
  }

  function clearActivities() {
    activities.value = []
    activityPageInfo.value = null
  }

  return {
    profile,
    activities,
    loading,
    error,
    activityPageInfo,
    fetchProfile,
    fetchActivities,
    postActivity,
    deleteActivity,
    clearProfile,
    clearActivities,
  }
})
