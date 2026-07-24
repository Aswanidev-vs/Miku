<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUpdate } from '../../composables/useUpdate'
import { usePlatform } from '../../composables/usePlatform'
import { useAuthStore } from '../../stores/auth'
import { useAnimeStore } from '../../stores/anime'

const {
  checking, downloading, downloadProgress,
  downloaded, downloadTotal, downloadSpeed,
  hasUpdate, updateInfo, downloadedApkPath,
  error, checked,
  checkForUpdate, downloadUpdate, installUpdate, dismissUpdate,
  wasDismissedForCurrent, cleanupOldApks,
} = useUpdate()

const { isMobile } = usePlatform()
const authStore = useAuthStore()
const animeStore = useAnimeStore()

const showPanel = ref(false)
const showBadge = ref(false)
const episodeNoticeRevision = ref(0)

const episodeNotices = computed(() => {
  episodeNoticeRevision.value
  const watching = animeStore.myList?.lists?.find((list) => list.status === 'CURRENT')?.entries ?? []
  return watching
    .map((entry: any) => {
      const media = entry.media
      // For a releasing show, `episodes` can be the planned total. The next
      // airing episode is the reliable boundary for what is already out.
      const releasedEpisode = media?.status === 'RELEASING' && media.nextAiringEpisode
        ? media.nextAiringEpisode.episode - 1
        : media?.episodes
      return {
        id: media?.id,
        title: media?.title?.userPreferred || media?.title?.romaji || 'Anime',
        episode: releasedEpisode,
        progress: entry.progress ?? 0,
      }
    })
    .filter((notice: any) => notice.id && notice.episode && notice.episode > notice.progress)
    .filter((notice: any) => {
      const seen = Number(localStorage.getItem(`miku-episode-notice-${notice.id}`) || 0)
      return notice.episode > seen
    })
})

const hasEpisodeNotice = computed(() => episodeNotices.value.length > 0)

const displayLatestVersion = computed(() => {
  if (!updateInfo.value?.latestVersion) return ''
  return updateInfo.value.latestVersion.replace(/^v/, '')
})

onMounted(async () => {
  await checkForUpdate()
  if (authStore.isLoggedIn && authStore.currentUser) {
    await animeStore.fetchMyList(authStore.currentUser.id)
  }
  if (hasUpdate.value && !wasDismissedForCurrent()) {
    showBadge.value = true
  }
  if (hasEpisodeNotice.value) showBadge.value = true
})

watch(hasUpdate, (available) => {
  if (available && !wasDismissedForCurrent()) {
    showBadge.value = true
  } else {
    showBadge.value = false
  }
})

watch(hasEpisodeNotice, (available) => {
  if (available) showBadge.value = true
})

watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (loggedIn && authStore.currentUser) {
    await animeStore.fetchMyList(authStore.currentUser.id)
  }
})

function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) {
    return
  }
  acknowledgeEpisodes()
}

function closePanel() {
  showPanel.value = false
  acknowledgeEpisodes()
}

function acknowledgeEpisodes() {
  for (const notice of episodeNotices.value) {
    localStorage.setItem(`miku-episode-notice-${notice.id}`, String(notice.episode))
  }
  showBadge.value = hasUpdate.value && !wasDismissedForCurrent()
}

function markAllAsRead() {
  acknowledgeEpisodes()
  if (hasUpdate.value) dismissUpdate()
  showBadge.value = false
}

function markEpisodeAsRead(id: number, episode: number) {
  localStorage.setItem(`miku-episode-notice-${id}`, String(episode))
  episodeNoticeRevision.value++
  showBadge.value = hasUpdate.value && !wasDismissedForCurrent()
}

function dismiss() {
  dismissUpdate()
  showBadge.value = false
  showPanel.value = false
}

async function handleDownload() {
  await cleanupOldApks()
  await downloadUpdate()
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return ''
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}
</script>

<template>
  <div class="update-trigger" @click="togglePanel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" class="bell-icon">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span v-if="showBadge" class="update-badge">{{ (hasUpdate && !wasDismissedForCurrent() ? 1 : 0) + episodeNotices.length }}</span>
  </div>

  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="showPanel" class="update-panel" @click.self="closePanel">
        <div class="update-card" :class="{ 'mobile-sheet': isMobile }">
          <div class="card-header">
            <h3>{{ hasUpdate ? 'Update Available' : 'Notifications' }}</h3>
            <button class="close-btn" @click="closePanel" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="card-body">
            <div v-if="showBadge || episodeNotices.length || hasUpdate" class="notification-actions">
              <button class="mark-read-btn" type="button" @click="markAllAsRead">
                Mark all as read
              </button>
            </div>

            <div v-if="episodeNotices.length" class="episode-notices">
              <div class="notice-heading">New episodes</div>
              <div v-for="notice in episodeNotices" :key="notice.id" class="episode-notice">
                <span class="episode-dot" />
                <span class="episode-notice-copy"><strong>{{ notice.title }}</strong> has reached episode {{ notice.episode }}</span>
                <button class="notice-read-btn" type="button" @click="markEpisodeAsRead(notice.id, notice.episode)">
                  Mark read
                </button>
              </div>
            </div>

            <!-- Latest update only -->
            <template v-if="hasUpdate && updateInfo">
              <div class="version-info">
                <div class="version-row">
                  <span class="label">Current</span>
                  <span class="version">v{{ updateInfo.currentVersion }}</span>
                </div>
                <div class="version-row">
                  <span class="label">Latest</span>
                  <span class="version highlight">v{{ displayLatestVersion }}</span>
                </div>
                <div v-if="updateInfo.releaseName" class="release-name">
                  {{ updateInfo.releaseName }}
                </div>
                <div v-if="updateInfo.assetSize" class="asset-size">
                  {{ formatSize(updateInfo.assetSize) }}
                </div>
              </div>

              <div v-if="downloading" class="progress-section">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: downloadProgress + '%' }" />
                </div>
                <div class="progress-info">
                  <span class="progress-text">{{ downloadProgress }}%</span>
                  <span v-if="downloadSpeed > 0" class="progress-speed">{{ formatSpeed(downloadSpeed) }}</span>
                </div>
                <div v-if="downloadTotal > 0" class="progress-size">
                  {{ formatSize(downloaded) }} / {{ formatSize(downloadTotal) }}
                </div>
              </div>

              <div v-if="error" class="error-msg">{{ error }}</div>

              <div class="card-actions">
                <button v-if="!downloadedApkPath && !downloading"
                        class="btn btn-primary"
                        @click="handleDownload"
                        :disabled="checking || !updateInfo.downloadUrl">
                  {{ checking ? 'Checking...' : 'Download Update' }}
                </button>
                <button v-else-if="downloadedApkPath && !downloading"
                        class="btn btn-primary"
                        @click="installUpdate">
                  Install Update
                </button>
                <button class="btn btn-ghost" @click="dismiss">
                  Dismiss
                </button>
                <button class="btn btn-ghost" @click="dismiss">
                  Mark as read
                </button>
              </div>
            </template>

            <!-- Loading -->
            <template v-else-if="checking">
              <div class="checking-state">
                <div class="spinner"></div>
                <span>Checking for updates...</span>
              </div>
            </template>

            <!-- No bell notification; detailed status is available in Settings. -->
            <template v-else>
              <div class="empty-notifications">
                <p>No new notifications</p>
                <span>Update status is available in Settings.</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-trigger {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: var(--z-sticky);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: background var(--transition-fast);
  color: var(--text-secondary);
}

.is-desktop .update-trigger {
  right: calc(var(--space-2xl) + 52px);
}

.update-trigger:hover {
  background: var(--bg-hover);
}

.bell-icon {
  width: 20px;
  height: 20px;
}

.update-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--text-on-primary);
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.update-panel {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: calc(var(--space-4xl) + 48px) var(--space-lg) var(--space-lg);
}

.update-card {
  width: 320px;
  max-width: calc(100vw - 32px);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.update-card.mobile-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.card-body {
  padding: var(--space-lg);
}

.episode-notices {
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-md);
}

.mark-read-btn {
  padding: var(--space-xs) var(--space-sm);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.mark-read-btn:hover {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
}

.notice-heading {
  margin-bottom: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.episode-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.episode-notice + .episode-notice { margin-top: var(--space-xs); }
.episode-dot { width: 7px; height: 7px; margin-top: 5px; flex-shrink: 0; border-radius: 50%; background: var(--color-primary); }
.episode-notice-copy { flex: 1; min-width: 0; }

.notice-read-btn {
  flex-shrink: 0;
  padding: 2px 5px;
  color: var(--color-primary);
  background: transparent;
  border: 0;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.notice-read-btn:hover { text-decoration: underline; }

.version-info {
  margin-bottom: var(--space-lg);
}

.version-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
}

.version-row .label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.version-row .version {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.version-row .version.highlight {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.release-name {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-xs);
  font-style: italic;
}

.asset-size {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-2xs);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 100ms linear;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-weight: var(--font-weight-semibold);
}

.progress-speed {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.progress-size {
  font-size: var(--font-size-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  text-align: center;
}

.error-msg {
  color: var(--status-dropped);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-lg);
}

.card-actions {
  display: flex;
  gap: var(--space-sm);
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
  font-family: var(--font-body);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--text-on-primary);
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.btn-ghost:hover {
  color: var(--text-secondary);
  border-color: var(--border-default);
}

/* Transitions */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 200ms var(--ease-out);
}

.panel-fade-enter-active .update-card,
.panel-fade-leave-active .update-card {
  transition: transform 200ms var(--ease-out);
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-fade-enter-from .update-card,
.panel-fade-leave-to .update-card {
  transform: translateX(16px);
}

.is-mobile .update-panel {
  align-items: stretch;
  justify-content: flex-end;
  padding: 0;
}

.is-mobile .update-card {
  width: 100%;
  max-width: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  margin-bottom: 0;
  max-height: 80vh;
  overflow-y: auto;
}

/* Up to date state */
.up-to-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg) 0;
  text-align: center;
}

.check-icon {
  width: 48px;
  height: 48px;
  color: var(--status-watching);
  margin-bottom: var(--space-md);
}

.check-icon svg {
  width: 100%;
  height: 100%;
}

.up-to-date-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.up-to-date-version {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-family: var(--font-mono);
  margin: 0 0 var(--space-sm);
}

.up-to-date-sub {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin: 0 0 var(--space-lg);
}

.btn-check {
  font-size: var(--font-size-xs);
  padding: var(--space-xs) var(--space-md);
}

/* Checking state */
.checking-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl) 0;
  gap: var(--space-md);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bg-active);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
