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
        {{ anime.averageScore }}%
      </div>
      <div v-if="anime.nextAiringEpisode" class="airing-badge">
        EP {{ anime.nextAiringEpisode.episode }}
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">{{ anime.title.userPreferred || anime.title.romaji }}</h3>
      <div class="card-meta">
        <span v-if="anime.format" class="meta-format">{{ formatLabel(anime.format) }}</span>
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
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
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
  transition: transform var(--transition-normal);
}

.anime-card:hover .card-image img {
  transform: scale(1.05);
}

.score-badge {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: var(--color-primary-light);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  line-height: 1.4;
}

.airing-badge {
  position: absolute;
  bottom: var(--space-sm);
  left: var(--space-sm);
  background: var(--color-primary);
  color: var(--text-on-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.card-info {
  padding: var(--space-sm) var(--space-md) var(--space-md);
}

.card-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.card-meta {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.meta-format {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: capitalize;
}

.meta-status {
  font-size: var(--font-size-xs);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  text-transform: capitalize;
}

.status-airing {
  color: var(--status-watching);
  background: rgba(0, 230, 118, 0.1);
}

.status-finished {
  color: var(--status-completed);
  background: rgba(33, 150, 243, 0.1);
}

.status-upcoming {
  color: var(--status-planning);
  background: rgba(171, 71, 188, 0.1);
}

.status-hiatus {
  color: var(--status-paused);
  background: rgba(255, 152, 0, 0.1);
}

.status-cancelled {
  color: var(--status-dropped);
  background: rgba(244, 67, 54, 0.1);
}
</style>
