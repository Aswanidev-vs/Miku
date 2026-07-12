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

// icon key -> SVG path data (stroke-based, 24x24 viewBox)
const ICONS: Record<string, string> = {
  anime: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4',
  episodes: 'M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z',
  time: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  score: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z',
  manga: 'M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15H6a2 2 0 0 0-2 2zM8 3v14M12 3v14',
  chapters: 'M4 4h16v4H4zM4 12h16v8H4zM7 16h6',
  volumes: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4',
}

function iconPath(key: string): string {
  return ICONS[key] ?? ICONS.anime
}

const animeStats = [
  { key: 'count', icon: 'anime', label: 'Anime' },
  { key: 'episodesWatched', icon: 'episodes', label: 'Episodes' },
  { key: 'minutesWatched', icon: 'time', label: 'Time', format: 'time' },
  { key: 'meanScore', icon: 'score', label: 'Mean Score' },
]

const mangaStats = [
  { key: 'count', icon: 'manga', label: 'Manga' },
  { key: 'chaptersRead', icon: 'chapters', label: 'Chapters' },
  { key: 'volumesRead', icon: 'volumes', label: 'Volumes' },
  { key: 'meanScore', icon: 'score', label: 'Mean Score' },
]
</script>

<template>
  <div class="stats-section">
    <div class="stats-group">
      <h3 class="stats-group-title">Anime</h3>
      <div class="stats-grid">
        <div v-for="stat in animeStats" :key="stat.key" class="stat-card">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path :d="iconPath(stat.icon)" />
            </svg>
          </span>
          <div class="stat-content">
            <span class="stat-value">
              <template v-if="stat.format === 'time'">
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
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path :d="iconPath(stat.icon)" />
            </svg>
          </span>
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
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.stats-group-title {
  font-family: var(--font-heading);
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
  border: 1px solid transparent;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--border-default);
  background: var(--bg-hover);
}

.stat-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary-subtle);
  color: var(--color-primary-light);
}

.stat-icon svg {
  width: 18px;
  height: 18px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-family: var(--font-body);
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
