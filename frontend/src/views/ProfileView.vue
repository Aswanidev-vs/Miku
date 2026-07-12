<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useAuthStore } from '../stores'
import { useUserStore } from '../stores'
import { useAnimeStore } from '../stores/anime'
import { useSettings } from '../composables/useSettings'
import StatsCard from '../components/profile/StatsCard.vue'
import FavoriteGenres from '../components/profile/FavoriteGenres.vue'
import HeatmapCalendar from '../components/profile/HeatmapCalendar.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const animeStore = useAnimeStore()
const { settings, toggle } = useSettings()

const user = computed(() => authStore.currentUser)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const loading = computed(() => authStore.loading || userStore.loading)

// Auto-sync toggle -> start/stop the 60s polling loop
watch(
  () => settings.value.autoSync,
  (on) => {
    if (on && isLoggedIn.value && user.value) {
      animeStore.startSync(user.value.id)
    } else {
      animeStore.stopSync()
    }
  }
)

onMounted(async () => {
  if (isLoggedIn.value && user.value) {
    await userStore.fetchActivities(user.value.id, 1, 50)
    if (settings.value.autoSync) animeStore.startSync(user.value.id)
  }
})

async function handleLogin() {
  await authStore.login()
}

async function handleLogout() {
  animeStore.stopSync()
  await authStore.logout()
}
</script>

<template>
  <div class="profile-view">
    <header class="settings-header safe-area-top">
      <h1 class="settings-title">Settings</h1>
      <p class="settings-sub">Account &amp; preferences for Miku</p>
    </header>

    <!-- Account (top section) -->
    <section class="account-card">
      <template v-if="isLoggedIn && user">
        <img :src="user.avatar.large" :alt="user.name" class="account-avatar" />
        <div class="account-info">
          <span class="account-name">{{ user.name }}</span>
          <span class="account-status">
            <span class="status-dot" /> Connected to AniList
          </span>
        </div>
        <button class="btn btn-secondary signout-btn" @click="handleLogout" :disabled="loading">
          Sign Out
        </button>
      </template>

      <template v-else>
        <div class="account-logo">
          <img src="/logo.png" alt="Miku" width="56" height="56" />
        </div>
        <div class="account-info">
          <span class="account-name">Not signed in</span>
          <span class="account-status muted">Connect your AniList account to track anime</span>
        </div>
        <button class="btn btn-primary signin-btn" @click="handleLogin" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span v-else>Sign in with AniList</span>
        </button>
      </template>
    </section>

    <p v-if="authStore.error" class="inline-error">{{ authStore.error }}</p>

    <!-- Preferences -->
    <section class="settings-group">
      <h3 class="group-title">Preferences</h3>

      <div class="setting-row" :class="{ disabled: !isLoggedIn }">
        <div class="setting-text">
          <span class="setting-label">Auto-sync with AniList</span>
          <span class="setting-hint">Refresh your list every 60 seconds</span>
        </div>
        <button
          class="switch"
          :class="{ on: settings.autoSync }"
          role="switch"
          :aria-checked="settings.autoSync"
          :disabled="!isLoggedIn"
          @click="toggle('autoSync')"
        >
          <span class="switch-knob" />
        </button>
      </div>

      <div class="setting-row">
        <div class="setting-text">
          <span class="setting-label">Compact layout</span>
          <span class="setting-hint">Smaller cards &amp; denser grids</span>
        </div>
        <button
          class="switch"
          :class="{ on: settings.compact }"
          role="switch"
          :aria-checked="settings.compact"
          @click="toggle('compact')"
        >
          <span class="switch-knob" />
        </button>
      </div>

      <div class="setting-row">
        <div class="setting-text">
          <span class="setting-label">Reduce motion</span>
          <span class="setting-hint">Minimize animations &amp; transitions</span>
        </div>
        <button
          class="switch"
          :class="{ on: settings.reduceMotion }"
          role="switch"
          :aria-checked="settings.reduceMotion"
          @click="toggle('reduceMotion')"
        >
          <span class="switch-knob" />
        </button>
      </div>
    </section>

    <!-- Profile (when signed in) -->
    <template v-if="isLoggedIn && user">
      <section v-if="user.statistics" class="settings-group">
        <h3 class="group-title">Your Stats</h3>
        <StatsCard :statistics="user.statistics" />
        <HeatmapCalendar :activities="userStore.activities" />
        <FavoriteGenres v-if="user.favourites" :favorites="user.favourites" />
      </section>
    </template>

    <!-- About -->
    <section class="settings-group">
      <h3 class="group-title">About</h3>
      <div class="about-row">
        <span class="about-label">App</span>
        <span class="about-value">Miku · AniList Client</span>
      </div>
      <div class="about-row">
        <span class="about-label">Version</span>
        <span class="about-value">v0.1.0</span>
      </div>
      <div class="about-row">
        <span class="about-label">Data</span>
        <span class="about-value">Provided by AniList</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--bg-deepest);
  padding-bottom: var(--space-xl);
}

.settings-header {
  padding: var(--space-3xl) var(--space-lg) var(--space-lg);
}

.settings-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.05;
}

.settings-sub {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* Account */
.account-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin: 0 var(--space-lg) var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.account-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid var(--color-primary);
  flex-shrink: 0;
}

.account-logo {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  flex-shrink: 0;
}

.account-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.account-name {
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.account-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--status-watching);
  margin-top: 2px;
}

.account-status.muted {
  color: var(--text-muted);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--status-watching);
  box-shadow: 0 0 8px var(--status-watching);
}

.signin-btn,
.signout-btn {
  flex-shrink: 0;
  min-height: 42px;
}

.inline-error {
  margin: 0 var(--space-lg) var(--space-md);
  font-size: var(--font-size-xs);
  color: var(--status-dropped);
}

/* Settings groups */
.settings-group {
  margin: var(--space-lg) var(--space-lg) 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-md) var(--space-lg);
}

.group-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  padding-left: var(--space-xs);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast), opacity var(--transition-fast);
}

.setting-row + .setting-row {
  border-top: 1px solid var(--border-subtle);
}

.setting-row.disabled {
  opacity: 0.45;
}

.setting-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.setting-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: 1px;
}

/* Switch */
.switch {
  position: relative;
  width: 46px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.switch:disabled {
  cursor: not-allowed;
}

.switch.on {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-color: transparent;
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform var(--transition-fast);
}

.switch.on .switch-knob {
  transform: translateX(18px);
}

/* About */
.about-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-xs);
}

.about-row + .about-row {
  border-top: 1px solid var(--border-subtle);
}

.about-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.about-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

/* Spinner */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
