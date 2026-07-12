<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.currentUser)
const activities = computed(() => userStore.activities)
const loading = computed(() => userStore.loading)

onMounted(() => {
  if (isLoggedIn.value && user.value) {
    userStore.fetchActivities(user.value.id, 1, 30)
  }
})

function formatTime(unix: number): string {
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function statusLabel(status?: string): string {
  if (!status) return ''
  return status.replace(/_/g, ' ').toLowerCase()
}

function goToMedia(id?: number) {
  if (id) {
    router.push({ name: 'media-detail', params: { id } })
  }
}
</script>

<template>
  <div class="feed-view">
    <header class="feed-header safe-area-top">
      <h1 class="feed-title">Feed</h1>
      <p class="feed-subtitle">Your activity feed</p>
    </header>

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
      <div v-else-if="activities.length > 0" class="activity-list">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-item"
        >
          <!-- List Activity -->
          <template v-if="'media' in activity && activity.media">
            <div class="activity-avatar" @click="activity.user?.id && router.push({ name: 'profile' })">
              <img
                v-if="activity.user?.avatar"
                :src="activity.user.avatar.medium"
                :alt="activity.user.name"
              />
            </div>
            <div class="activity-body">
              <p class="activity-text">
                <span class="activity-user">{{ activity.user?.name }}</span>
                <span class="activity-action">{{ statusLabel(activity.status) }}</span>
                <span class="activity-media" @click="goToMedia(activity.media?.id)">
                  {{ activity.media?.title?.romaji }}
                </span>
                <span v-if="activity.progress" class="activity-progress">
                  {{ activity.progress }}
                </span>
              </p>
              <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
            </div>
            <img
              v-if="activity.media?.coverImage"
              :src="activity.media.coverImage.medium"
              :alt="activity.media.title?.romaji"
              class="activity-cover"
              @click="goToMedia(activity.media?.id)"
            />
          </template>

          <!-- Text Activity -->
          <template v-else-if="'text' in activity">
            <div class="activity-avatar">
              <img
                v-if="activity.user?.avatar"
                :src="activity.user.avatar.medium"
                :alt="activity.user.name"
              />
            </div>
            <div class="activity-body">
              <p class="activity-text">
                <span class="activity-user">{{ activity.user?.name }}</span>
              </p>
              <p class="activity-message">{{ activity.text }}</p>
              <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state">
        <p class="empty-title">No activity yet</p>
        <p class="empty-subtitle">Your anime updates will appear here</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.feed-view {
  min-height: 100%;
}

.feed-header {
  padding: var(--space-xl) 0 var(--space-lg);
}

.feed-title {
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

.activity-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--bg-surface);
  align-items: flex-start;
}

.activity-avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.activity-avatar img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.activity-body {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

.activity-user {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.activity-action {
  margin: 0 var(--space-xs);
}

.activity-media {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
  cursor: pointer;
}

.activity-media:hover {
  text-decoration: underline;
}

.activity-progress {
  margin-left: var(--space-xs);
  color: var(--text-muted);
}

.activity-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
  line-height: var(--line-height-normal);
}

.activity-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-xs);
  display: block;
}

.activity-cover {
  width: 48px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
  cursor: pointer;
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

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-surface);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
