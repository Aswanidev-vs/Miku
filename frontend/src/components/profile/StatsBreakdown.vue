<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  GenreStat,
  StaffStat,
  StudioStat,
  TagStat,
  UserStatistics,
  VoiceActorStat,
} from '../../types'

const props = defineProps<{
  statistics: UserStatistics
}>()

const activeTab = ref<'anime' | 'manga'>('anime')

interface BreakdownRow {
  name: string
  count: number
}

interface BreakdownSection {
  title: string
  rows: BreakdownRow[]
}

// AniList can return null list entries and null nested objects — filter both
function toRows<T extends { count?: number | null }>(
  list: (T | null | undefined)[] | null | undefined,
  pickName: (entry: T) => string | null | undefined
): BreakdownRow[] {
  if (!Array.isArray(list)) return []
  const rows: BreakdownRow[] = []
  for (const entry of list) {
    if (!entry) continue
    const name = pickName(entry)
    if (!name) continue
    rows.push({ name, count: entry.count ?? 0 })
  }
  return rows
}

function genreTagSections(media: {
  genres?: GenreStat[] | null
  tags?: TagStat[] | null
} | null | undefined): BreakdownSection[] {
  return [
    { title: 'Top Genres', rows: toRows(media?.genres, (entry) => entry.genre) },
    { title: 'Top Tags', rows: toRows(media?.tags, (entry) => entry.tag?.name) },
  ].filter((section) => section.rows.length > 0)
}

const animeSections = computed<BreakdownSection[]>(() => {
  const anime = props.statistics?.anime
  return [
    ...genreTagSections(anime),
    { title: 'Top Studios', rows: toRows(anime?.studios, (entry) => entry.studio?.name) },
    { title: 'Top Staff', rows: toRows(anime?.staff, (entry) => entry.staff?.name?.full) },
    { title: 'Top Voice Actors', rows: toRows(anime?.voiceActors, (entry) => entry.voiceActor?.name?.full) },
  ].filter((section) => section.rows.length > 0)
})

const mangaSections = computed<BreakdownSection[]>(() => genreTagSections(props.statistics?.manga))

const sections = computed(() =>
  activeTab.value === 'anime' ? animeSections.value : mangaSections.value
)

function barWidth(section: BreakdownSection, row: BreakdownRow): string {
  const max = section.rows.reduce((acc, item) => Math.max(acc, item.count), 0)
  if (max <= 0) return '0%'
  return `${(row.count / max) * 100}%`
}
</script>

<template>
  <div class="breakdown-card">
    <div class="breakdown-tabs">
      <button
        type="button"
        class="breakdown-tab"
        :class="{ active: activeTab === 'anime' }"
        @click="activeTab = 'anime'"
      >
        Anime
      </button>
      <button
        type="button"
        class="breakdown-tab"
        :class="{ active: activeTab === 'manga' }"
        @click="activeTab = 'manga'"
      >
        Manga
      </button>
    </div>

    <template v-if="sections.length > 0">
      <div v-for="section in sections" :key="section.title" class="breakdown-section">
        <h4 class="breakdown-section-title">{{ section.title }}</h4>
        <div
          v-for="row in section.rows"
          :key="`${section.title}-${row.name}`"
          class="breakdown-row"
        >
          <span class="breakdown-name">{{ row.name }}</span>
          <span class="breakdown-count">{{ row.count.toLocaleString() }}</span>
          <span class="breakdown-track">
            <span class="breakdown-bar" :style="{ width: barWidth(section, row) }" />
          </span>
        </div>
      </div>
    </template>
    <div v-else class="breakdown-empty">No data yet</div>
  </div>
</template>

<style scoped>
.breakdown-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.breakdown-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-lg);
}

.breakdown-tab {
  padding: var(--space-xs) var(--space-lg);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.breakdown-tab.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.breakdown-section + .breakdown-section {
  margin-top: var(--space-lg);
}

.breakdown-section-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.breakdown-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  column-gap: var(--space-md);
}

.breakdown-row + .breakdown-row {
  margin-top: var(--space-sm);
}

.breakdown-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breakdown-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.breakdown-track {
  grid-column: 1 / -1;
  height: 4px;
  margin-top: var(--space-xs);
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.breakdown-bar {
  display: block;
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.breakdown-empty {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
</style>
