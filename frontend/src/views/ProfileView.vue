<script setup lang="ts">
import { onMounted, computed, ref, onUnmounted } from 'vue'
import { useAuthStore } from '../stores'
import { useUserStore } from '../stores'
import StatsCard from '../components/profile/StatsCard.vue'
import FavoriteGenres from '../components/profile/FavoriteGenres.vue'
import HeatmapCalendar from '../components/profile/HeatmapCalendar.vue'

const authStore = useAuthStore()
const userStore = useUserStore()

const user = computed(() => authStore.currentUser)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const loading = computed(() => authStore.loading || userStore.loading)

onMounted(async () => {
  if (isLoggedIn.value && user.value) {
    await userStore.fetchActivities(user.value.id, 1, 50)
  }
})

onUnmounted(() => {
  authStore.showCallbackInput = false
})

const stats = computed(() => {
  if (!user.value?.statistics) return null
  const s = user.value.statistics
  return {
    anime: s.anime.count,
    manga: s.manga.count,
    episodes: s.anime.episodesWatched,
    chapters: s.manga.chaptersRead,
  }
})

async function handleLogin() {
  await authStore.login()
}
</script>

<template>
  <div class="profile-view">
    <template v-if="loading && !user">
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>
    </template>

    <template v-else-if="!isLoggedIn || !user">
      <div class="login-prompt">
        <div class="login-logo">
          <img src="/logo.png" alt="Miku" width="80" height="80" />
        </div>
        <h1 class="login-title">Welcome to Miku</h1>
        <p class="login-subtitle">Sign in with your AniList account to track your anime and manga</p>

        <button class="btn btn-primary login-btn" @click="handleLogin" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Sign In with AniList</span>
        </button>

        <p v-if="authStore.error" class="login-error">{{ authStore.error }}</p>
        <p v-else class="login-hint">You'll be redirected to AniList to authorize the app</p>
      </div>
    </template>

    <template v-else>
      <div class="profile-banner" :style="user.bannerImage ? { backgroundImage: `url(${user.bannerImage})` } : {}" />

      <div class="profile-header">
        <img :src="user.avatar.large" :alt="user.name" class="profile-avatar" />
        <div class="profile-info">
          <h1 class="profile-name">{{ user.name }}</h1>
          <p v-if="user.about" class="profile-bio">{{ user.about }}</p>
        </div>
      </div>

      <div class="profile-stats-bar" v-if="stats">
        <div class="stat-pill">
          <span class="stat-num">{{ stats.anime }}</span>
          <span class="stat-lbl">Anime</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats.manga }}</span>
          <span class="stat-lbl">Manga</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats.episodes }}</span>
          <span class="stat-lbl">Episodes</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats.chapters }}</span>
          <span class="stat-lbl">Chapters</span>
        </div>
      </div>

      <div class="profile-content">
        <StatsCard :statistics="user.statistics" />
        <HeatmapCalendar :activities="userStore.activities" />
        <FavoriteGenres v-if="user.favourites" :favorites="user.favourites" />

        <button class="btn btn-secondary logout-btn" @click="authStore.logout()">
          Sign Out
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--bg-deepest);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-md);
  color: var(--text-secondary);
}

/* Login Prompt */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
}

.login-logo {
  margin-bottom: var(--space-xl);
}

.login-logo img {
  border-radius: var(--radius-xl);
}

.login-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-sm);
}

.login-subtitle {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-2xl);
  max-width: 280px;
}

.login-btn {
  width: 100%;
  max-width: 280px;
  padding: var(--space-lg) var(--space-xl);
  font-size: var(--font-size-md);
}

.login-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-md);
}

.login-error {
  font-size: var(--font-size-xs);
  color: var(--status-dropped);
  margin-top: var(--space-md);
  max-width: 280px;
}

/* Profile */
.profile-banner {
  height: 140px;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-accent-dark));
  background-size: cover;
  background-position: center;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 var(--space-xl);
  margin-top: -40px;
  text-align: center;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  border: 4px solid var(--bg-deepest);
  object-fit: cover;
  background: var(--bg-surface);
}

.profile-info {
  margin-top: var(--space-md);
}

.profile-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.profile-bio {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
  max-width: 280px;
}

.profile-stats-bar {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  padding: var(--space-xl);
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.stat-lbl {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: 0 var(--space-xl) var(--space-xl);
}

.logout-btn {
  width: 100%;
  margin-top: var(--space-lg);
}
</style>
