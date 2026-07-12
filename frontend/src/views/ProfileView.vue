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

const callbackCode = ref('')
const callbackError = ref('')
const authUrl = ref('')
const urlCopied = ref(false)

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
  // Get the auth URL to display
  try {
    authUrl.value = await window.go.main.OAuth2Service.GetAuthorizationURL()
  } catch {
    // ignore
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(authUrl.value)
    urlCopied.value = true
    setTimeout(() => urlCopied.value = false, 2000)
  } catch {
    // fallback
  }
}

async function submitCallback() {
  if (!callbackCode.value.trim()) {
    callbackError.value = 'Please enter the code'
    return
  }
  callbackError.value = ''
  try {
    await authStore.handleCallback(callbackCode.value.trim())
  } catch (e) {
    callbackError.value = 'Invalid code. Please try again.'
  }
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

        <p class="login-hint">You'll be redirected to AniList to authorize the app</p>

        <!-- Manual callback input for Android -->
        <div v-if="authStore.showCallbackInput" class="callback-section">
          <div class="divider">
            <span>Enter code from URL</span>
          </div>

          <div v-if="authUrl" class="url-display">
            <p class="url-label">1. Open this URL in your browser:</p>
            <div class="url-box">
              <code class="url-text">{{ authUrl }}</code>
              <button class="copy-btn" @click="copyUrl">
                {{ urlCopied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>

          <p class="callback-hint">2. After authorizing, copy the code from the URL and paste below</p>
          <div class="callback-input-group">
            <input
              v-model="callbackCode"
              type="text"
              class="input callback-input"
              placeholder="Paste authorization code"
              @keyup.enter="submitCallback"
            />
            <button class="btn btn-primary callback-btn" @click="submitCallback" :disabled="loading">
              Submit
            </button>
          </div>
          <p v-if="callbackError" class="callback-error">{{ callbackError }}</p>
        </div>
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

/* Callback Section */
.callback-section {
  width: 100%;
  max-width: 280px;
  margin-top: var(--space-2xl);
}

.divider {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bg-hover);
}

.divider span {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.callback-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--space-md);
}

.callback-input-group {
  display: flex;
  gap: var(--space-sm);
}

.callback-input {
  flex: 1;
  min-width: 0;
}

.callback-btn {
  flex-shrink: 0;
}

.callback-error {
  font-size: var(--font-size-xs);
  color: var(--status-dropped);
  margin-top: var(--space-sm);
}

/* URL Display */
.url-display {
  margin-bottom: var(--space-lg);
}

.url-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.url-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-hover);
}

.url-text {
  flex: 1;
  font-size: var(--font-size-xs);
  color: var(--color-primary-light);
  word-break: break-all;
  font-family: monospace;
}

.copy-btn {
  flex-shrink: 0;
  padding: var(--space-xs) var(--space-md);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.copy-btn:hover {
  background: var(--color-primary-dark);
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
