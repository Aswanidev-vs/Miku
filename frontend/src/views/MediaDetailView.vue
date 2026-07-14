
<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAnimeStore } from '../stores/anime'
import { useAuthStore } from '../stores/auth'
import type { ListStatus } from '../types'

const route = useRoute()
const router = useRouter()
const animeStore = useAnimeStore()
const authStore = useAuthStore()

const media = computed(() => animeStore.currentMedia)
const loading = computed(() => animeStore.loading)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const loaded = ref(false)

// Characters
const showAllCharacters = ref(false)
const visibleCharacters = computed(() => {
  if (!media.value?.characters?.edges) return []
  return showAllCharacters.value
    ? media.value.characters.edges
    : media.value.characters.edges.slice(0, 12)
})
const hasMoreCharacters = computed(() => {
  return (media.value?.characters?.edges?.length || 0) > 12
})

// Recommendations - native recs + genre-based supplements, deduped & self-excluded
const uniqueRecommendations = computed(() => {
  const currentId = media.value?.id
  const seen = new Set<number>()
  const items: { id: number; title: any; coverImage: any }[] = []

  // Native AniList recommendations
  for (const edge of media.value?.recommendations?.edges ?? []) {
    const node = edge.node?.media
    const id = node?.id
    if (id && id !== currentId && !seen.has(id)) {
      seen.add(id)
      items.push({ id, title: node.title, coverImage: node.coverImage })
    }
  }

  // Genre-based supplements (only when native recs are sparse)
  if (items.length < 4) {
    for (const item of animeStore.genreRecommendations) {
      if (item.id && item.id !== currentId && !seen.has(item.id)) {
        seen.add(item.id)
        items.push({ id: item.id, title: item.title, coverImage: item.coverImage })
      }
    }
  }

  return items.slice(0, 8)
})

// List management state
const listStatus = ref<ListStatus | null>(null)
const listProgress = ref(0)
const listScore = ref(0)
const saving = ref(false)
const showStatusMenu = ref(false)
const showScoreMenu = ref(false)
const showProgressMenu = ref(false)

const statusOptions: { label: string; value: ListStatus }[] = [
  { label: 'Watching', value: 'CURRENT' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Dropped', value: 'DROPPED' },
  { label: 'Repeating', value: 'REPEATING' },
]

const scoreOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

onMounted(() => {
  const id = Number(route.params.id)
  if (id) {
    animeStore.fetchDetails(id).finally(() => { loaded.value = true })
  }
})

// Re-fetch when navigating between media (same component, different route)
watch(() => route.params.id, (newId) => {
  if (newId) {
    loaded.value = false
    showAllCharacters.value = false
    animeStore.fetchDetails(Number(newId)).finally(() => { loaded.value = true })
  }
})

// Sync list status from fetched mediaListEntry (AniList knows your status)
watch(media, (m) => {
  const entry = (m as any)?.mediaListEntry
  if (entry) {
    listStatus.value = entry.status as ListStatus
    listProgress.value = entry.progress ?? 0
    listScore.value = entry.score ?? 0
  } else if (m) {
    listStatus.value = null
    listProgress.value = 0
    listScore.value = 0
  }
}, { immediate: true })

onUnmounted(() => {
  animeStore.clearCurrentMedia()
})

function goBack() {
  router.back()
}

function goToCharacter(edge: { node?: { id?: number } }) {
  const id = edge?.node?.id
  if (id) router.push({ name: 'character', params: { id } })
}

function statusLabel(status?: string): string {
  if (!status) return ''
  return status.replace(/_/g, ' ').toLowerCase()
}

function formatLabel(format?: string): string {
  if (!format) return ''
  return format.replace('_', ' ')
}

function formatDate(date?: { year?: number; month?: number; day?: number }): string {
  if (!date?.year) return '?'
  const m = date.month ? String(date.month).padStart(2, '0') : '??'
  const d = date.day ? String(date.day).padStart(2, '0') : '??'
  return `${date.year}-${m}-${d}`
}

function cleanDescription(desc?: string): string {
  if (!desc) return ''
  return desc
    .replace(/<[^>]+>/g, '')
    .replace(/~!.*?!~/gs, '[spoiler]')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function addToWatching() {
  if (!media.value) return
  saving.value = true
  try {
    await animeStore.updateEntry(media.value.id, 'CURRENT', undefined, 0)
    listStatus.value = 'CURRENT'
    listProgress.value = 0
  } catch (e) {
    console.error('Failed to add to list:', e)
  } finally {
    saving.value = false
  }
}

async function setStatus(status: ListStatus) {
  if (!media.value) return
  saving.value = true
  showStatusMenu.value = false
  try {
    await animeStore.updateEntry(media.value.id, status, undefined, listProgress.value)
    listStatus.value = status
    if (status === 'COMPLETED') {
      listProgress.value = media.value.episodes || 0
    }
  } catch (e) {
    console.error('Failed to update status:', e)
  } finally {
    saving.value = false
  }
}

async function setScore(score: number) {
  if (!media.value) return
  saving.value = true
  showScoreMenu.value = false
  try {
    await animeStore.updateEntry(media.value.id, listStatus.value || undefined, score, listProgress.value)
    listScore.value = score
  } catch (e) {
    console.error('Failed to update score:', e)
  } finally {
    saving.value = false
  }
}

async function updateProgress(progress: number) {
  if (!media.value) return
  saving.value = true
  showProgressMenu.value = false
  try {
    await animeStore.updateEntry(media.value.id, listStatus.value || undefined, listScore.value, progress)
    listProgress.value = progress
    // Auto-complete if progress matches total episodes
    if (media.value.episodes && progress >= media.value.episodes && listStatus.value !== 'COMPLETED') {
      await animeStore.updateEntry(media.value.id, 'COMPLETED', listScore.value, progress)
      listStatus.value = 'COMPLETED'
    }
  } catch (e) {
    console.error('Failed to update progress:', e)
  } finally {
    saving.value = false
  }
}

function toggleStatusMenu() { showStatusMenu.value = !showStatusMenu.value; showScoreMenu.value = false; showProgressMenu.value = false }
function toggleScoreMenu() { showScoreMenu.value = !showScoreMenu.value; showStatusMenu.value = false; showProgressMenu.value = false }
function toggleProgressMenu() { showProgressMenu.value = !showProgressMenu.value; showStatusMenu.value = false; showScoreMenu.value = false }
function closeMenus() { showStatusMenu.value = false; showScoreMenu.value = false; showProgressMenu.value = false }
</script>

<template>
  <div class="detail-view" @click.self="closeMenus">
    <!-- Loading -->
    <template v-if="loading && !media">
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>
    </template>

    <!-- Content -->
    <template v-else-if="media">
      <!-- Banner -->
      <div class="detail-banner" :style="media.bannerImage ? { backgroundImage: `url(${media.bannerImage})` } : {}">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div class="detail-content">
        <!-- Header -->
        <div class="detail-header">
          <img
            :src="media.coverImage.large"
            :alt="media.title.userPreferred || media.title.romaji"
            class="detail-cover"
          />
          <div class="detail-info">
            <h1 class="detail-title">{{ media.title.userPreferred || media.title.romaji }}</h1>
            <p v-if="media.title.english && media.title.english !== media.title.romaji" class="detail-alt-title">
              {{ media.title.english }}
            </p>
            <div class="detail-meta">
              <span v-if="media.format" class="meta-badge">{{ formatLabel(media.format) }}</span>
              <span v-if="media.status" class="meta-badge" :class="'status-' + media.status?.toLowerCase()">{{ statusLabel(media.status) }}</span>
              <span v-if="media.episodes" class="meta-badge">{{ media.episodes }} eps</span>
              <span v-if="media.duration" class="meta-badge">{{ media.duration }}m</span>
            </div>
          </div>
        </div>

        <!-- List Management (logged in) -->
        <div v-if="isLoggedIn" class="list-controls">
          <div class="control-row">
            <!-- Status -->
            <div class="control-group">
              <button class="control-btn" @click="toggleStatusMenu" :disabled="saving">
                <span v-if="saving" class="btn-spinner"></span>
                <span v-else>{{ listStatus ? statusOptions.find(o => o.value === listStatus)?.label || 'Set Status' : 'Add to List' }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div v-if="showStatusMenu" class="dropdown-menu">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  class="dropdown-item"
                  :class="{ active: listStatus === opt.value }"
                  @click="setStatus(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Score -->
            <div class="control-group">
              <button class="control-btn score-btn" @click="toggleScoreMenu" :disabled="saving">
                {{ listScore > 0 ? `${listScore}/10` : 'Score' }}
              </button>
              <div v-if="showScoreMenu" class="dropdown-menu score-menu">
                <button
                  v-for="s in scoreOptions"
                  :key="s"
                  class="dropdown-item"
                  :class="{ active: listScore === s }"
                  @click="setScore(s)"
                >
                  {{ s === 0 ? 'None' : s }}
                </button>
              </div>
            </div>

            <!-- Progress -->
            <div class="control-group">
              <button class="control-btn progress-btn" @click="toggleProgressMenu" :disabled="saving">
                {{ listProgress }}{{ media.episodes ? `/${media.episodes}` : '' }}
              </button>
              <div v-if="showProgressMenu" class="dropdown-menu progress-menu">
                <div class="progress-actions">
                  <button class="progress-action-btn" @click="updateProgress(Math.max(0, listProgress - 1))" :disabled="listProgress <= 0">-1</button>
                  <span class="progress-display">{{ listProgress }}{{ media.episodes ? `/${media.episodes}` : '' }}</span>
                  <button class="progress-action-btn" @click="updateProgress(listProgress + 1)" :disabled="media.episodes ? listProgress >= media.episodes : false">+1</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Not logged in prompt -->
        <div v-else class="login-prompt-inline">
          <button class="btn btn-primary btn-sm" @click="router.push({ name: 'profile' })">Sign in to track</button>
        </div>

        <!-- Scores -->
        <div v-if="media.averageScore || media.meanScore || media.popularity" class="detail-scores">
          <div v-if="media.averageScore" class="score-item">
            <span class="score-value">{{ media.averageScore }}%</span>
            <span class="score-label">Score</span>
          </div>
          <div v-if="media.meanScore" class="score-item">
            <span class="score-value">{{ media.meanScore }}%</span>
            <span class="score-label">Mean</span>
          </div>
          <div v-if="media.popularity" class="score-item">
            <span class="score-value">#{{ media.popularity.toLocaleString() }}</span>
            <span class="score-label">Popular</span>
          </div>
          <div v-if="media.favourites" class="score-item">
            <span class="score-value">{{ media.favourites.toLocaleString() }}</span>
            <span class="score-label">Favs</span>
          </div>
        </div>

        <!-- Genres -->
        <div v-if="media.genres?.length" class="detail-genres">
          <span v-for="genre in media.genres" :key="genre" class="genre-tag">{{ genre }}</span>
        </div>

        <!-- Airing -->
        <div v-if="media.nextAiringEpisode" class="airing-info">
          <span class="airing-label">Next Episode</span>
          <span class="airing-value">EP {{ media.nextAiringEpisode.episode }}</span>
          <span class="airing-time">in {{ Math.floor(media.nextAiringEpisode.timeUntilAiring / 86400) }}d {{ Math.floor((media.nextAiringEpisode.timeUntilAiring % 86400) / 3600) }}h</span>
        </div>

        <!-- Description -->
        <div v-if="media.description" class="detail-section">
          <h3 class="section-title">Description</h3>
          <p class="description-text">{{ cleanDescription(media.description) }}</p>
        </div>

        <!-- Dates -->
        <div v-if="media.startDate?.year || media.endDate?.year" class="detail-section">
          <h3 class="section-title">Dates</h3>
          <div class="date-row">
            <span v-if="media.startDate?.year" class="date-item">
              <span class="date-label">Start</span>
              <span class="date-value">{{ formatDate(media.startDate) }}</span>
            </span>
            <span v-if="media.endDate?.year" class="date-item">
              <span class="date-label">End</span>
              <span class="date-value">{{ formatDate(media.endDate) }}</span>
            </span>
            <span v-if="media.season" class="date-item">
              <span class="date-label">Season</span>
              <span class="date-value">{{ media.season }} {{ media.seasonYear }}</span>
            </span>
          </div>
        </div>

        <!-- Characters -->
        <div v-if="media.characters?.edges?.length" class="detail-section">
          <h3 class="section-title clickable" @click="showAllCharacters = !showAllCharacters">
            Characters
            <span class="toggle-label">{{ showAllCharacters ? 'show less' : `show all (${media.characters.edges.length})` }}</span>
          </h3>
          <div class="character-list">
            <div v-for="edge in visibleCharacters" :key="edge.id" class="character-item" @click="goToCharacter(edge)">
              <img
                v-if="edge.node.image"
                :src="edge.node.image.large || edge.node.image.medium"
                :alt="edge.node.name.full"
                class="character-img"
              />
              <div class="character-info">
                <span class="character-name">{{ edge.node.name.full }}</span>
                <span class="character-role">{{ edge.role }}</span>
              </div>
              <div v-if="edge.voiceActors?.length" class="character-va" @click.stop="edge.voiceActors[0].id && router.push({ name: 'voice-actor', params: { id: edge.voiceActors[0].id } })">
                <img
                  :src="edge.voiceActors[0].image?.medium"
                  :alt="edge.voiceActors[0].name.full"
                  class="va-img"
                />
                <div class="va-info">
                  <span class="va-name">{{ edge.voiceActors[0].name.full }}</span>
                  <span class="va-label">VA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Relations -->
        <div v-if="media.relations?.edges?.length" class="detail-section">
          <h3 class="section-title">Relations</h3>
          <div class="relation-list">
            <div
              v-for="edge in media.relations.edges"
              :key="edge.id"
              class="relation-item"
              @click="edge.node.id && router.push({ name: 'media-detail', params: { id: edge.node.id } })"
            >
              <img
                v-if="edge.node.coverImage"
                :src="edge.node.coverImage.medium"
                :alt="edge.node.title.romaji"
                class="relation-img"
              />
              <div class="relation-info">
                <span class="relation-title">{{ edge.node.title.romaji }}</span>
                <span class="relation-type">{{ edge.relationType?.replace('_', ' ').toLowerCase() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="uniqueRecommendations.length > 0" class="detail-section">
          <h3 class="section-title">You Might Also Like</h3>
          <div class="recommendation-list">
            <div
              v-for="rec in uniqueRecommendations"
              :key="rec.id"
              class="recommendation-item"
              @click="router.push({ name: 'media-detail', params: { id: rec.id } })"
            >
              <div class="recommendation-poster">
                <img
                  v-if="rec.coverImage"
                  :src="rec.coverImage.medium || rec.coverImage.large"
                  :alt="rec.title?.romaji"
                  loading="lazy"
                />
              </div>
              <span class="recommendation-title">{{ rec.title?.userPreferred || rec.title?.romaji }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <template v-else-if="!loading && loaded">
      <div class="empty-state">
        <p>Media not found</p>
        <button class="btn btn-secondary" @click="goBack">Go Back</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-view {
  min-height: 100%;
  background: var(--bg-deepest);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: var(--space-md);
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-surface);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Banner */
.detail-banner {
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-accent-dark));
  background-size: cover;
  background-position: center top;
  position: relative;
  margin: 0;
}

.detail-banner::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 60px;
  background: linear-gradient(to bottom, transparent, var(--bg-deepest));
  pointer-events: none;
}

.back-btn {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  width: 36px; height: 36px;
  border-radius: var(--radius-full);
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.back-btn:hover { background: rgba(0,0,0,0.8); }
.back-btn svg { width: 20px; height: 20px; }

/* Content */
.detail-content { padding-top: 0; padding-bottom: var(--space-xl); }

/* Header */
.detail-header {
  display: flex; gap: var(--space-lg);
  margin-top: 0; margin-bottom: var(--space-lg);
  position: relative;
  z-index: 2;
}

.detail-cover {
  width: 110px; height: 155px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  border: 3px solid var(--bg-deepest);
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.detail-info { flex: 1; }

.detail-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: var(--line-height-tight);
  margin-bottom: var(--space-xs);
}

.detail-alt-title {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.detail-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); }

.meta-badge {
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  color: var(--text-secondary);
  text-transform: capitalize;
}

.status-releasing { color: var(--status-watching); background: rgba(0,230,118,0.1); }
.status-finished { color: var(--status-completed); background: rgba(33,150,243,0.1); }
.status-not_yet_released { color: var(--status-planning); background: rgba(171,71,188,0.1); }
.status-hiatus { color: var(--status-paused); background: rgba(255,152,0,0.1); }
.status-cancelled { color: var(--status-dropped); background: rgba(244,67,54,0.1); }

/* List Controls */
.list-controls {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
}

.control-row {
  display: flex;
  gap: var(--space-sm);
}

.control-group { position: relative; flex: 1; }

.control-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-hover);
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-body);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.control-btn:hover { border-color: var(--color-primary); }
.control-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid var(--bg-surface);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.dropdown-arrow { width: 14px; height: 14px; flex-shrink: 0; }

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  margin-top: var(--space-xs);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-hover);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.dropdown-item.active { color: var(--color-primary-light); font-weight: var(--font-weight-semibold); }

.score-menu { right: 0; left: auto; min-width: 60px; }

.progress-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
}

.progress-action-btn {
  width: 32px; height: 32px;
  border: 1px solid var(--bg-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}

.progress-action-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.progress-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.progress-display {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.login-prompt-inline {
  margin-bottom: var(--space-lg);
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.btn-primary:hover { opacity: 0.9; }

.btn-sm { padding: var(--space-xs) var(--space-md); }

/* Scores */
.detail-scores {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md) 0;
  border-top: 1px solid var(--bg-surface);
  border-bottom: 1px solid var(--bg-surface);
  margin-bottom: var(--space-lg);
}

.score-item { display: flex; flex-direction: column; align-items: center; }
.score-value { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-primary-light); }
.score-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }

/* Genres */
.detail-genres { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-lg); }

.genre-tag {
  font-size: var(--font-size-xs);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--bg-hover);
}

/* Airing */
.airing-info {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
}

.airing-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
.airing-value { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-primary-light); }
.airing-time { font-size: var(--font-size-xs); color: var(--text-muted); margin-left: auto; }

/* Sections */
.detail-section { margin-bottom: var(--space-xl); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-md); }
.section-title.clickable { cursor: pointer; display: flex; align-items: center; gap: var(--space-sm); }
.section-title.clickable:hover { color: var(--color-primary-light); }
.toggle-label { font-size: var(--font-size-xs); color: var(--text-muted); font-weight: var(--font-weight-normal); }
.description-text { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: var(--line-height-relaxed); white-space: pre-line; }

/* Dates */
.date-row { display: flex; gap: var(--space-xl); }
.date-item { display: flex; flex-direction: column; }
.date-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
.date-value { font-size: var(--font-size-sm); color: var(--text-primary); }

/* Characters */
.character-list { display: flex; flex-direction: column; gap: var(--space-xs); }
.character-item {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface); border-radius: var(--radius-md);
}
.character-img { width: 40px; height: 40px; border-radius: var(--radius-full); object-fit: cover; flex-shrink: 0; }
.character-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.character-name { font-size: var(--font-size-sm); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.character-role { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: capitalize; }
.character-va {
  display: flex; align-items: center; gap: var(--space-xs);
  padding-left: var(--space-md);
  border-left: 1px solid var(--bg-hover);
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.character-va:hover { opacity: 0.8; }
.va-img { width: 32px; height: 32px; border-radius: var(--radius-full); object-fit: cover; }
.va-info { display: flex; flex-direction: column; }
.va-name { font-size: var(--font-size-xs); color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.va-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }

/* Relations */
.relation-list { display: flex; gap: var(--space-sm); overflow-x: auto; padding-bottom: var(--space-sm); }
.relation-item {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface); border-radius: var(--radius-md);
  cursor: pointer; flex-shrink: 0;
  transition: background var(--transition-fast);
}
.relation-item:hover { background: var(--bg-hover); }
.relation-img { width: 40px; height: 56px; border-radius: var(--radius-sm); object-fit: cover; }
.relation-info { display: flex; flex-direction: column; }
.relation-title { font-size: var(--font-size-xs); color: var(--text-primary); max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.relation-type { font-size: 10px; color: var(--text-muted); }

/* Recommendations */
.recommendation-list { display: flex; gap: var(--space-sm); overflow-x: auto; padding-bottom: var(--space-sm); -webkit-overflow-scrolling: touch; }
.recommendation-item {
  display: flex; flex-direction: column; gap: var(--space-xs);
  cursor: pointer; flex-shrink: 0; width: 96px;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}
.recommendation-item:hover { transform: translateY(-3px); opacity: 0.92; }
.recommendation-poster {
  width: 96px; height: 134px; border-radius: var(--radius-md); overflow: hidden;
  background: var(--bg-elevated); border: 1px solid var(--border-subtle);
}
.recommendation-poster img { width: 100%; height: 100%; object-fit: cover; }
.recommendation-title { font-size: 10.5px; color: var(--text-secondary); text-align: center; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; }

/* Empty */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: var(--space-lg); color: var(--text-muted);
}

.btn-secondary {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  border: 1px solid var(--bg-hover);
  background: var(--bg-surface);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.btn-secondary:hover { border-color: var(--color-primary); color: var(--text-primary); }
</style>
