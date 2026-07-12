<script setup lang="ts">
import { onMounted, computed } from 'vue'
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
</script>

<template>
  <div class="profile-view">
    <template v-if="loading">
      <div class="loading-state">
        <div class="spinner" />
        <span>Loading profile...</span>
      </div>
    </template>

    <template v-else-if="!isLoggedIn || !user">
      <div class="login-prompt">
        <h2>Welcome to Miku</h2>
        <p>Sign in to view your AniList profile</p>
        <button class="btn-primary" @click="authStore.login()">Sign In</button>
      </div>
    </template>

    <template v-else>
      <div class="profile-banner" :style="user.bannerImage ? { backgroundImage: `url(${user.bannerImage})` } : {}" />

      <div class="profile-header">
        <img
          :src="user.avatar.large"
          :alt="user.name"
          class="profile-avatar"
        />
        <div class="profile-info">
          <h1 class="profile-name">{{ user.name }}</h1>
          <p v-if="user.about" class="profile-bio">{{ user.about }}</p>
        </div>
        <button class="btn-logout" @click="authStore.logout()">Sign Out</button>
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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-md);
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-hover);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-md);
  text-align: center;
  padding: var(--space-3xl);
}

.login-prompt h2 {
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
}

.login-prompt p {
  color: var(--text-secondary);
}

.btn-primary {
  padding: var(--space-sm) var(--space-xl);
  background: var(--color-primary);
  color: var(--text-on-primary);
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-semibold);
  transition: background var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.profile-banner {
  height: 120px;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-accent-dark));
  background-size: cover;
  background-position: center;
}

.profile-header {
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
  padding: 0 var(--space-xl);
  margin-top: -32px;
  position: relative;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  border: 3px solid var(--bg-deepest);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-surface);
}

.profile-info {
  flex: 1;
  min-width: 0;
  padding-bottom: var(--space-sm);
}

.profile-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.profile-bio {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-logout {
  padding: var(--space-xs) var(--space-lg);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
  margin-bottom: var(--space-sm);
}

.btn-logout:hover {
  background: var(--color-error);
  color: var(--text-on-primary);
}

.profile-stats-bar {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-xl);
  overflow-x: auto;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  min-width: 72px;
  flex-shrink: 0;
}

.stat-num {
  font-size: var(--font-size-md);
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
</style>
