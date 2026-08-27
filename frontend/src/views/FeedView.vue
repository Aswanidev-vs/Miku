<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { Browser } from '@wailsio/runtime'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import ActivityComposer from '../components/feed/ActivityComposer.vue'
import ActivityItem from '../components/feed/ActivityItem.vue'
import type { TextActivity, ListActivity } from '../types'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.currentUser)
const activities = computed(() => userStore.activities)
const loading = computed(() => userStore.loading)

// Lazy loading: show 10 initially, load more on scroll
const visibleCount = ref(10)
const loadingMore = ref(false)
const BATCH_SIZE = 10
const PAGE_SIZE = 30

const visibleActivities = computed(() => activities.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < activities.value.length)

// Sentinel + observer for infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  // Simulate progressive load — items are already fetched, just reveal more
  setTimeout(() => {
    visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, activities.value.length)
    loadingMore.value = false
  }, 200)
}

function setupObserver() {
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value) {
        loadMore()
      }
    },
    { rootMargin: '300px' }
  )
  observer.observe(sentinelRef.value)
}

// Pull-to-refresh: reset pagination, drop the GQL cache and refetch page 1
async function refreshFeed() {
  if (!isLoggedIn.value || !user.value) return
  visibleCount.value = 10
  clearGqlCache()
  await userStore.fetchFollowingActivities(user.value.id, 1, PAGE_SIZE)
}

async function handlePost(text: string) {
  try {
    await userStore.postActivity(text)
  } catch {
    /* store sets error */
  }
}

const { pullingDown, refreshing, showRefreshBtn, manualRefresh, setupListeners, removeListeners } = usePullToRefresh(refreshFeed)
const viewRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (isLoggedIn.value && user.value) {
    userStore.fetchFollowingActivities(user.value.id, 1, PAGE_SIZE)
  }
  if (viewRef.value) setupListeners(viewRef.value)
  setupObserver()
})

onUnmounted(() => {
  if (viewRef.value) removeListeners(viewRef.value)
  observer?.disconnect()
})

function goToMedia(id?: number) {
  if (id) {
    router.push({ name: 'media-detail', params: { id } })
  }
}

// Tap a user's avatar: your own goes to the in-app profile, friends open their
// AniList profile in the system browser (no per-user profile route exists yet).
function goToUser(activity: TextActivity | ListActivity) {
  const u = activity.user
  if (!u?.name) return
  if (user.value && u.id === user.value.id) {
    router.push({ name: 'profile' })
  } else {
    const url = `https://anilist.co/user/${encodeURIComponent(u.name)}`
    Browser.OpenURL(url).catch(() => window.open(url, '_blank'))
  }
}
</script>

<template>
  <PullToRefresh :pulling-down="pullingDown" :refreshing="refreshing" :show-refresh-btn="showRefreshBtn" @refresh="manualRefresh">
  <div ref="viewRef" class="feed-view">
    <header class="feed-header safe-area-top">
      <h1 class="feed-title">Feed</h1>
      <p class="feed-subtitle">Your activity and your friends'</p>
    </header>

    <ActivityComposer
      v-if="isLoggedIn"
      :avatar="user?.avatar?.medium"
      :name="user?.name"
      :disabled="loading"
      @post="handlePost"
    />

    <!-- Not logged in -->
    <template v-if="!isLoggedIn">
      <div class="empty-state">
        <p class="empty-title">Sign in to see your feed</p>
        <p class="empty-subtitle">Connect your AniList account to see activity</p>
      </div>
    </template>

    <!-- Logged in -->
    <template v-else>
      <!-- Loading -->
      <div v-if="loading && activities.length === 0" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Activities -->
      <div v-else-if="visibleActivities.length > 0" class="activity-list">
        <ActivityItem
          v-for="activity in visibleActivities"
          :key="activity.id"
          :activity="activity"
          @open-media="goToMedia"
          @open-user="goToUser"
        />

        <!-- Load more sentinel -->
        <div ref="sentinelRef" class="load-more-sentinel">
          <div v-if="loadingMore" class="loading-more">
            <div class="spinner"></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state">
        <p class="empty-title">No activity yet</p>
        <p class="empty-subtitle">Your anime updates will appear here</p>
      </div>
    </template>
  </div>
  </PullToRefresh>
</template>

<style scoped>
.feed-view {
  min-height: 100%;
}

.feed-header {
  padding: var(--space-xl) 0 var(--space-lg);
}

.feed-title {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.feed-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.activity-list {
  padding: 0;
}

.load-more-sentinel {
  display: flex;
  justify-content: center;
  padding: var(--space-lg);
}

.loading-more {
  display: flex;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bg-surface);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: var(--space-xl);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.empty-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--space-2xl);
}
</style>
