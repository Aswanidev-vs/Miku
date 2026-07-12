<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Media } from '../../types'

defineProps<{
  anime: Media
}>()

const router = useRouter()

function navigateToDetail(id: number) {
  router.push({ name: 'media-detail', params: { id } })
}

function formatLabel(format?: string): string {
  if (!format) return ''
  return format.replace('_', ' ')
}

function statusLabel(status?: string): string {
  if (!status) return ''
  return status.replace(/_/g, ' ').toLowerCase()
}

function statusClass(status?: string): string {
  switch (status) {
    case 'RELEASING': return 'status-airing'
    case 'FINISHED': return 'status-finished'
    case 'NOT_YET_RELEASED': return 'status-upcoming'
    case 'HIATUS': return 'status-hiatus'
    case 'CANCELLED': return 'status-cancelled'
    default: return ''
  }
}
</script>

<template>
  <div class="anime-card" @click="navigateToDetail(anime.id)">
    <div class="card-image">
      <img
        :src="anime.coverImage.large"
        :alt="anime.title.userPreferred || anime.title.romaji"
        loading="lazy"
      />
      <div v-if="anime.averageScore" class="score-badge">
        {{ anime.averageScore }}
      </div>
      <div v-if="anime.nextAiringEpisode" class="airing-badge">
        EP {{ anime.nextAiringEpisode.episode }}
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">{{ anime.title.userPreferred || anime.title.romaji }}</h3>
      <div class="card-meta">
        <span v-if="anime.format" class="meta-format">{{ formatLabel(anime.format) }}</span>
        <span class="meta-dot" v-if="anime.format && anime.status"></span>
        <span
          v-if="anime.status"
          class="meta-status"
          :class="statusClass(anime.status)"
        >
          {{ statusLabel(anime.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anime-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: transform 200ms var(--ease-out), border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
  cursor: pointer;
  position: relative;
}

.anime-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px transparent;
  transition: box-shadow var(--transition-fast);
}

.anime-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card);
}

.anime-card:hover::after {
  box-shadow: inset 0 0 0 1px var(--color-primary-glow);
}

.anime-card:active {
  transform: scale(0.975);
}

.card-image {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--bg-elevated);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 450ms var(--ease-out);
}

.anime-card:hover .card-image img {
  transform: scale(1.05);
}

.score-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  background: rgba(8, 7, 12, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-accent-light);
  font-family: var(--font-body);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-bold);
  padding: 3px 6px;
  border-radius: var(--radius-xs);
  line-height: 1.2;
  letter-spacing: 0.02em;
}

.airing-badge {
  position: absolute;
  bottom: 7px;
  left: 7px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--text-on-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-bold);
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  letter-spacing: var(--letter-spacing-wide);
}

.card-info {
  padding: 9px 9px 10px;
}

.card-title {
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.card-meta {
  display: flex;
  gap: 5px;
  align-items: center;
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.meta-format {
  font-size: var(--font-size-2xs);
  color: var(--text-muted);
  text-transform: capitalize;
}

.meta-status {
  font-size: var(--font-size-2xs);
  text-transform: capitalize;
}

.status-airing { color: var(--status-watching); }
.status-finished { color: var(--status-completed); }
.status-upcoming { color: var(--status-planning); }
.status-hiatus { color: var(--status-paused); }
.status-cancelled { color: var(--status-dropped); }
</style>
