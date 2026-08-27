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
        genres(limit: 8, sort: COUNT_DESC) {
          genre
          count
        }
        tags(limit: 8, sort: COUNT_DESC) {
          tag {
            name
          }
          count
        }
        studios(limit: 8, sort: COUNT_DESC) {
          studio {
            name
          }
          count
        }
        staff(limit: 8, sort: COUNT_DESC) {
          staff {
            name {
              full
            }
          }
          count
        }
        voiceActors(limit: 8, sort: COUNT_DESC) {
          voiceActor {
            name {
              full
            }
          }
          count
        }
      }
      manga {
        count
        meanScore
        chaptersRead
        volumesRead
        genres(limit: 8, sort: COUNT_DESC) {
          genre
          count
        }
        tags(limit: 8, sort: COUNT_DESC) {
          tag {
            name
          }
          count
        }
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
      characters(page: 1, perPage: 10) {
        nodes {
          id
          name {
            full
          }
          image {
            medium
          }
        }
      }
      staff(page: 1, perPage: 10) {
        nodes {
          id
          name {
            full
          }
          image {
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
    text(asHtml: true)
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

// Full user objects that `userId` follows — for the profile Social section
const FOLLOWING_QUERY = `
query ($userId: Int!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    following(userId: $userId) {
      id
      name
      avatar {
        medium
      }
    }
  }
}
`

const FOLLOWERS_QUERY = `
query ($userId: Int!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    followers(userId: $userId) {
      id
      name
      avatar {
        medium
      }
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
    text(asHtml: true)
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
  const heatmapActivities = ref<(TextActivity | ListActivity)[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activityPageInfo = ref<{
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    hasNextPage: boolean
  } | null>(null)
  const followingUsers = ref<User[]>([])
  const followerUsers = ref<User[]>([])

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

  async function fetchActivities(userId: number, page = 1, perPage = 20, append = false) {
    loading.value = true
    error.value = null
    try {
      const response = await gqlQuery(ACTIVITY_FEED_QUERY, {
        userId,
        page,
        perPage,
      })
      if (response?.data?.Page) {
        const items = (response.data.Page.activities ?? []) as (TextActivity | ListActivity)[]
        if (append) {
          const seen = new Set(activities.value.map((a) => a.id))
          activities.value = [...activities.value, ...items.filter((a) => !seen.has(a.id))]
        } else {
          activities.value = items
        }
        activityPageInfo.value = response.data.Page.pageInfo
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch activities'
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch one page of a single user's activity history without touching the
   * shared `activities` state — the feed owns that. Used by the profile's
   * independent "Recent Activity" list.
   */
  async function fetchUserActivityPage(userId: number, page = 1, perPage = 20): Promise<{
    items: (TextActivity | ListActivity)[]
    pageInfo: NonNullable<typeof activityPageInfo.value> | null
  }> {
    const response = await gqlQuery(ACTIVITY_FEED_QUERY, { userId, page, perPage })
    return {
      items: (response?.data?.Page?.activities ?? []) as (TextActivity | ListActivity)[],
      pageInfo: response?.data?.Page?.pageInfo ?? null,
    }
  }

  // Fetch all activities for the heatmap (past year)
  async function fetchAllActivitiesForHeatmap(userId: number) {
    const allActivities: any[] = []
    let page = 1
    const perPage = 50
    const oneYearAgo = Date.now() / 1000 - 365 * 24 * 60 * 60

    try {
      while (page <= 20) { // Max 20 pages = 1000 activities
        const response = await gqlQuery(ACTIVITY_FEED_QUERY, {
          userId,
          page,
          perPage,
        })
        const items = response?.data?.Page?.activities ?? []
        if (items.length === 0) break

        for (const item of items) {
          if (item.createdAt >= oneYearAgo) {
            allActivities.push(item)
          } else {
            // Reached activities older than 1 year
            page = 999 // break outer loop
            break
          }
        }
        page++
      }
    } catch {
      // Ignore errors, use what we have
    }

    heatmapActivities.value = allActivities
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

  async function fetchFollowing(userId: number, page = 1, perPage = 25) {
    try {
      const response = await gqlQuery(FOLLOWING_QUERY, { userId, page, perPage })
      followingUsers.value = response?.data?.Page?.following ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch following'
    }
  }

  async function fetchFollowers(userId: number, page = 1, perPage = 25) {
    try {
      const response = await gqlQuery(FOLLOWERS_QUERY, { userId, page, perPage })
      followerUsers.value = response?.data?.Page?.followers ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch followers'
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
    heatmapActivities,
    loading,
    error,
    activityPageInfo,
    followingUsers,
    followerUsers,
    fetchProfile,
    fetchActivities,
    fetchUserActivityPage,
    fetchFollowingActivities,
    fetchAllActivitiesForHeatmap,
    fetchFollowing,
    fetchFollowers,
    postActivity,
    deleteActivity,
    clearProfile,
    clearActivities,
  }
})
