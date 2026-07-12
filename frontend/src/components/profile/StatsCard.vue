<script setup lang="ts">
import type { UserStatistics } from '../../types'

defineProps<{
  statistics: UserStatistics
}>()

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  return `${hours}h ${minutes % 60}m`
}

const animeStats = [
  { key: 'count', label: 'Anime', icon: '📺' },
  { key: 'episodesWatched', label: 'Episodes', icon: '🎬' },
  { key: 'minutesWatched', label: 'Time', icon: '⏱', format: 'time' },
  { key: 'meanScore', label: 'Mean Score', icon: '⭐' },
] as const

const mangaStats = [
  { key: 'count', label: 'Manga', icon: '📚' },
  { key: 'chaptersRead', label: 'Chapters', icon: '📖' },
  { key: 'volumesRead', label: 'Volumes', icon: '📦' },
  { key: 'meanScore', label: 'Mean Score', icon: '⭐' },
] as const
</script>

<template>
  <div class="stats-section">
    <div class="stats-group">
      <h3 class="stats-group-title">Anime</h3>
      <div class="stats-grid">
        <div v-for="stat in animeStats" :key="stat.key" class="stat-card">
          <span class="stat-icon">{{ stat.icon }}</span>
          <div class="stat-content">
            <span class="stat-value">
              <template v-if="'format' in stat && stat.format === 'time'">
                {{ formatMinutes(statistics.anime[stat.key] as number) }}
              </template>
              <template v-else-if="stat.key === 'meanScore'">
                {{ (statistics.anime[stat.key] as number / 10).toFixed(1) }}
              </template>
              <template v-else>
                {{ (statistics.anime[stat.key] as number).toLocaleString() }}
              </template>
            </span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="stats-group">
      <h3 class="stats-group-title">Manga</h3>
      <div class="stats-grid">
        <div v-for="stat in mangaStats" :key="stat.key" class="stat-card">
          <span class="stat-icon">{{ stat.icon }}</span>
          <div class="stat-content">
            <span class="stat-value">
              <template v-if="stat.key === 'meanScore'">
                {{ (statistics.manga[stat.key] as number / 10).toFixed(1) }}
              </template>
              <template v-else>
                {{ (statistics.manga[stat.key] as number).toLocaleString() }}
              </template>
            </span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.stats-group {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.stats-group-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
}

.stat-icon {
  font-size: var(--font-size-lg);
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
