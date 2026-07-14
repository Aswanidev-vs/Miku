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

// Shared activity node selection — reused by both the single-user and the
// following feed queries so the two never drift apart.
const ACTIVITY_NODE_FIELDS = `
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
`

const ACTIVITY_FEED_QUERY = `
query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, sort: ID_DESC) {
      ${ACTIVITY_NODE_FIELDS}
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

// User IDs that `userId` follows — used to build the "Following" feed
const FOLLOWING_IDS_QUERY = `
query ($userId: Int!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    following(userId: $userId) {
      id
    }
  }
}
`

// Combined feed: the user's own activity plus everyone they follow (AniList
// "Following" feed style), sorted globally by recency.
const ACTIVITY_FEED_FOLLOWING_QUERY = `
query ($userIds: [Int], $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId_in: $userIds, sort: ID_DESC) {
      ${ACTIVITY_NODE_FIELDS}
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

/**
 * Collect the AniList user IDs that `userId` follows. Capped so the resulting
 * `userId_in` filter stays a sane size even for accounts following thousands
 * of people.
 */
async function fetchFollowingIds(userId: number, cap = 200): Promise<number[]> {
  const ids: number[] = []
  let page = 1
  const perPage = 100
  while (ids.length < cap) {
    const response = await gqlQuery(FOLLOWING_IDS_QUERY, { userId, page, perPage })
    const following = response?.data?.Page?.following ?? []
    for (const f of following) {
      if (f?.id && !ids.includes(f.id)) ids.push(f.id)
    }
    if (!response?.data?.Page?.pageInfo?.hasNextPage || following.length === 0) break
    page++
  }
  return ids.slice(0, cap)
}

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

  async function fetchFollowingActivities(userId: number, page = 1, perPage = 20) {
    loading.value = true
    error.value = null
    try {
      const followingIds = await fetchFollowingIds(userId)
      const ids = Array.from(new Set([userId, ...followingIds]))
      const response = await gqlQuery(ACTIVITY_FEED_FOLLOWING_QUERY, {
        userIds: ids,
        page,
        perPage,
      })
      if (response?.data?.Page) {
        activities.value = response.data.Page.activities
        activityPageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch feed'
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
    fetchFollowingActivities,
    postActivity,
    deleteActivity,
    clearProfile,
    clearActivities,
  }
})
