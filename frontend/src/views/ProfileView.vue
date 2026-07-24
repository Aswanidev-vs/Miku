<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useAuthStore } from '../stores'
import { useUserStore } from '../stores'
import { useAnimeStore } from '../stores/anime'
import { useSettings } from '../composables/useSettings'
import { useUpdate } from '../composables/useUpdate'
import { clearGqlCache } from '../api/graphql'
import StatsCard from '../components/profile/StatsCard.vue'
import FavoriteGenres from '../components/profile/FavoriteGenres.vue'
import HeatmapCalendar from '../components/profile/HeatmapCalendar.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const animeStore = useAnimeStore()
const { settings, toggle } = useSettings()
const {
  currentVersion, hasUpdate, latestVersion, checked, checking, updateInfo, error: updateError,
  checkForUpdate,
} = useUpdate()

onMounted(() => {
  if (isLoggedIn.value && user.value) {
    userStore.fetchAllActivitiesForHeatmap(user.value.id)
  }
})

const user = computed(() => authStore.currentUser)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const loading = computed(() => authStore.loading || authStore.authFlowInProgress || userStore.loading)

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

// Deferred loading: stats/heatmap/genres mount after settings section renders
const showStats = ref(false)
let statsTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  if (isLoggedIn.value && user.value) {
    userStore.fetchActivities(user.value.id, 1, 50)
    if (settings.value.autoSync) animeStore.startSync(user.value.id)
  }
  // Defer heavy stats section by 300ms so account + settings appear instantly
  statsTimer = setTimeout(() => { showStats.value = true }, 300)
})

onUnmounted(() => {
  if (statsTimer) clearTimeout(statsTimer)
})

async function handleLogin() {
  await authStore.login()
}

async function handleLogout() {
  animeStore.stopSync()
  clearGqlCache()
  await authStore.logout()
}

async function handleCheckForUpdates() {
  await checkForUpdate()
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

    <!-- Manual update status and trigger -->
    <button class="update-card" type="button" @click="handleCheckForUpdates" :disabled="checking">
      <span class="update-card-icon" :class="{ checking }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 11a8.1 8.1 0 0 0-14.9-4L3 9" />
          <path d="M3 4v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 14.9 4L21 15" />
          <path d="M21 20v-5h-5" />
        </svg>
      </span>
      <span class="update-card-copy">
        <span class="update-card-title">Check for Updates</span>
        <span class="update-card-status" v-if="checking">Checking for updates...</span>
        <span class="update-card-status update-available" v-else-if="hasUpdate && updateInfo">
          Update available · v{{ updateInfo.latestVersion.replace(/^v/, '') }}
        </span>
        <span class="update-card-status up-to-date" v-else-if="checked && updateInfo">
          App is up to date · v{{ updateInfo.currentVersion }}
        </span>
        <span class="update-card-status" v-else>Tap to check your installed version</span>
      </span>
      <span class="update-card-chevron">›</span>
    </button>
    <p v-if="updateError" class="inline-error update-error">{{ updateError }}</p>

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

    <!-- Profile (when signed in) — deferred: mounts 300ms after settings for faster initial paint -->
    <template v-if="isLoggedIn && user && showStats">
      <section v-if="user.statistics" class="settings-group">
        <h3 class="group-title">Your Stats</h3>
        <StatsCard :statistics="user.statistics" />
        <HeatmapCalendar :activities="userStore.heatmapActivities" />
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
        <span class="about-value">
          v{{ currentVersion }}
          <span v-if="hasUpdate" class="update-indicator">
            → v{{ latestVersion }} available
          </span>
        </span>
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

.update-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: calc(100% - (var(--space-lg) * 2));
  margin: 0 var(--space-lg) var(--space-md);
  padding: var(--space-md);
  text-align: left;
  color: inherit;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
}

.update-card:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
}

.update-card:active:not(:disabled) { transform: scale(0.99); }
.update-card:disabled { cursor: wait; opacity: 0.8; }

.update-card-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-radius: var(--radius-md);
}

.update-card-icon svg { width: 20px; height: 20px; }
.update-card-icon.checking svg { animation: spin 0.9s linear infinite; }
.update-card-copy { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.update-card-title { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.update-card-status { margin-top: 3px; color: var(--text-muted); font-size: var(--font-size-xs); overflow-wrap: anywhere; }
.update-card-status.update-available { color: var(--color-primary); }
.update-card-status.up-to-date { color: var(--status-watching); }
.update-card-chevron { color: var(--text-muted); font-size: 26px; line-height: 1; }

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
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.update-indicator {
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
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

/* Small Android screens: stack the action below the account details so the
   account name/status never gets squeezed into an unreadable column. */
@media (max-width: 420px) {
  .settings-header {
    padding-right: var(--space-md);
    padding-left: var(--space-md);
  }

  .account-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-sm) var(--space-md);
    margin-right: var(--space-md);
    margin-left: var(--space-md);
    padding: var(--space-sm);
  }

  .account-avatar,
  .account-logo {
    width: 44px;
    height: 44px;
  }

  .account-info {
    align-self: center;
  }

  .account-name,
  .account-status {
    overflow-wrap: anywhere;
  }

  .signin-btn,
  .signout-btn {
    grid-column: 1 / -1;
    width: 100%;
  }

  .inline-error {
    margin-right: var(--space-md);
    margin-left: var(--space-md);
  }

  .update-card {
    width: calc(100% - (var(--space-md) * 2));
    margin-right: var(--space-md);
    margin-left: var(--space-md);
  }

  .settings-group {
    margin-right: var(--space-md);
    margin-left: var(--space-md);
    padding-right: var(--space-sm);
    padding-left: var(--space-sm);
  }

  .setting-row {
    gap: var(--space-sm);
  }

  .about-row {
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .about-value {
    min-width: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }
}
</style>
