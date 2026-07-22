<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUpdate } from '../../composables/useUpdate'
import { usePlatform } from '../../composables/usePlatform'

const {
  checking, downloading, downloadProgress,
  hasUpdate, updateInfo, downloadedApkPath,
  error, checked,
  checkForUpdate, downloadUpdate, installUpdate, dismissUpdate,
  wasDismissedForCurrent, cleanupOldApks,
} = useUpdate()

const { isMobile } = usePlatform()

const showPanel = ref(false)
const showBadge = ref(false)

const displayLatestVersion = computed(() => {
  if (!updateInfo.value?.latestVersion) return ''
  return updateInfo.value.latestVersion.replace(/^v/, '')
})

onMounted(async () => {
  await checkForUpdate()
  if (hasUpdate.value && !wasDismissedForCurrent()) {
    showBadge.value = true
  }
})

watch(hasUpdate, (available) => {
  if (available && !wasDismissedForCurrent()) {
    showBadge.value = true
  } else {
    showBadge.value = false
  }
})

function togglePanel() {
  showPanel.value = !showPanel.value
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
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}
</script>

<template>
  <div class="update-trigger" @click="togglePanel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" class="bell-icon">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span v-if="showBadge" class="update-badge">1</span>
  </div>

  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="showPanel" class="update-panel" @click.self="showPanel = false">
        <div class="update-card" :class="{ 'mobile-sheet': isMobile }">
          <div class="card-header">
            <h3>{{ hasUpdate ? 'Update Available' : 'App Status' }}</h3>
            <button class="close-btn" @click="showPanel = false" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="card-body">
            <!-- Update available -->
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
                <span class="progress-text">{{ downloadProgress }}%</span>
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
              </div>
            </template>

            <!-- Up to date -->
            <template v-else-if="checked && updateInfo">
              <div class="up-to-date">
                <div class="check-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <p class="up-to-date-title">App is up to date</p>
                <p class="up-to-date-version">v{{ updateInfo.currentVersion }}</p>
                <p class="up-to-date-sub">You're running the latest version</p>
                <button class="btn btn-ghost btn-check" @click="checkForUpdate" :disabled="checking">
                  {{ checking ? 'Checking...' : 'Check for updates' }}
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
  right: calc(var(--space-2xl) + 52px);
  z-index: var(--z-sticky);
  width: 40px;
  height: 40px;
  display: none;
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
  display: flex;
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
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-active);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 200ms var(--ease-out);
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  min-width: 36px;
  text-align: right;
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
  align-items: flex-end;
  padding: 0;
}

.is-mobile .update-card {
  width: 100%;
  max-width: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
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
