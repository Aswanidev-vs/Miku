<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlatform } from '../../composables/usePlatform'
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

const { isMobile } = usePlatform()
const activeTab = ref<'anime' | 'manga'>('anime')

export interface StatItem {
  name: string
  count: number
}

// Clean helper to extract and sort valid entries
function extractItems<T extends { count?: number | null }>(
  list: (T | null | undefined)[] | null | undefined,
  pickName: (entry: T) => string | null | undefined
): StatItem[] {
  if (!Array.isArray(list)) return []
  const items: StatItem[] = []
  for (const entry of list) {
    if (!entry) continue
    const name = pickName(entry)
    if (!name) continue
    items.push({ name, count: entry.count ?? 0 })
  }
  return items.filter((item) => item.count > 0)
}

// Color palette for multi-bar and stacked progress
const paletteColors = [
  '#00d2c4', // Miku teal
  '#7b61ff', // Electric purple
  '#ff5376', // Coral red
  '#ffb86c', // Warm amber
  '#50fa7b', // Mint green
  '#38bdf8', // Sky blue
  '#f472b6', // Pink
  '#a78bfa', // Lavender
]

function getColor(index: number): string {
  return paletteColors[index % paletteColors.length]
}

// Anime breakdowns
const animeGenres = computed(() =>
  extractItems(props.statistics?.anime?.genres, (e) => e.genre)
)
const animeTags = computed(() =>
  extractItems(props.statistics?.anime?.tags, (e) => e.tag?.name)
)
const animeStudios = computed(() =>
  extractItems(props.statistics?.anime?.studios, (e) => e.studio?.name)
)
const animeStaff = computed(() =>
  extractItems(props.statistics?.anime?.staff, (e) => e.staff?.name?.full)
)
const animeVoiceActors = computed(() =>
  extractItems(props.statistics?.anime?.voiceActors, (e) => e.voiceActor?.name?.full)
)

// Manga breakdowns
const mangaGenres = computed(() =>
  extractItems(props.statistics?.manga?.genres, (e) => e.genre)
)
const mangaTags = computed(() =>
  extractItems(props.statistics?.manga?.tags, (e) => e.tag?.name)
)

// Active lists based on tab
const currentGenres = computed(() =>
  activeTab.value === 'anime' ? animeGenres.value : mangaGenres.value
)
const currentTags = computed(() =>
  activeTab.value === 'anime' ? animeTags.value : mangaTags.value
)
const currentStudios = computed(() =>
  activeTab.value === 'anime' ? animeStudios.value : []
)
const currentStaff = computed(() =>
  activeTab.value === 'anime' ? animeStaff.value : []
)
const currentVoiceActors = computed(() =>
  activeTab.value === 'anime' ? animeVoiceActors.value : []
)

const hasAnyData = computed(() => {
  if (activeTab.value === 'anime') {
    return (
      currentGenres.value.length > 0 ||
      currentTags.value.length > 0 ||
      currentStudios.value.length > 0 ||
      currentStaff.value.length > 0 ||
      currentVoiceActors.value.length > 0
    )
  }
  return currentGenres.value.length > 0 || currentTags.value.length > 0
})

const openSections = ref<Record<string, boolean>>({
  genres: true,
  tags: true,
  studios: true,
  staff: true,
  voiceActors: true,
})

function isSectionOpen(key: string): boolean {
  if (!isMobile.value) return true
  return openSections.value[key] !== false
}

function toggleSection(key: string) {
  if (!isMobile.value) return
  openSections.value[key] = !isSectionOpen(key)
}

// Calculations for relative bars
function getBarWidth(items: StatItem[], count: number): string {
  const max = items.reduce((acc, curr) => Math.max(acc, curr.count), 0)
  if (max <= 0) return '0%'
  return `${(count / max) * 100}%`
}

function getStudioPercent(count: number): number {
  const total = currentStudios.value.reduce((acc, s) => acc + s.count, 0)
  if (total <= 0) return 0
  return (count / total) * 100
}
</script>

<template>
  <div class="breakdown-card">
    <!-- Tab Switcher -->
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

    <div v-if="hasAnyData" class="breakdown-content">
      <!-- 1. Top Genres: Responsive interlocking multi bar grid -->
      <section v-if="currentGenres.length" class="breakdown-section">
        <component
          :is="isMobile ? 'button' : 'div'"
          :type="isMobile ? 'button' : undefined"
          class="section-header"
          :class="{ 'mobile-toggle': isMobile, 'is-open': isSectionOpen('genres') }"
          :aria-expanded="isMobile ? isSectionOpen('genres') : undefined"
          @click="toggleSection('genres')"
        >
          <div class="section-header-left">
            <h4 class="breakdown-section-title">Top Genres</h4>
            <span class="section-badge">{{ currentGenres.length }} genres</span>
          </div>
          <svg
            v-if="isMobile"
            class="section-chevron"
            :class="{ rotated: isSectionOpen('genres') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </component>
        <div v-show="isSectionOpen('genres')" class="section-dropdown-body">
          <div class="genre-grid">
            <div
              v-for="(genre, idx) in currentGenres"
              :key="genre.name"
              class="genre-cell"
              :style="{ '--accent-color': getColor(idx) }"
            >
              <div class="genre-info">
                <span class="genre-rank">#{{ idx + 1 }}</span>
                <span class="genre-name" :title="genre.name">{{ genre.name }}</span>
                <span class="genre-count">{{ genre.count.toLocaleString() }}</span>
              </div>
              <div class="genre-track">
                <div
                  class="genre-bar breakdown-bar"
                  :style="{
                    width: getBarWidth(currentGenres, genre.count),
                    background: getColor(idx),
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Top Tags: Inline wrap-around chips -->
      <section v-if="currentTags.length" class="breakdown-section">
        <component
          :is="isMobile ? 'button' : 'div'"
          :type="isMobile ? 'button' : undefined"
          class="section-header"
          :class="{ 'mobile-toggle': isMobile, 'is-open': isSectionOpen('tags') }"
          :aria-expanded="isMobile ? isSectionOpen('tags') : undefined"
          @click="toggleSection('tags')"
        >
          <div class="section-header-left">
            <h4 class="breakdown-section-title">Top Tags</h4>
            <span class="section-badge">{{ currentTags.length }} tags</span>
          </div>
          <svg
            v-if="isMobile"
            class="section-chevron"
            :class="{ rotated: isSectionOpen('tags') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </component>
        <div v-show="isSectionOpen('tags')" class="section-dropdown-body">
          <div class="tags-chips-wrap">
            <span
              v-for="(tag, idx) in currentTags"
              :key="tag.name"
              class="tag-chip"
              :style="{ '--chip-color': getColor(idx) }"
            >
              <span class="tag-chip-name">{{ tag.name }}</span>
              <span class="tag-chip-count">{{ tag.count }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 3. Top Studios: Stacked progress bar (Anime only) -->
      <section v-if="currentStudios.length" class="breakdown-section">
        <component
          :is="isMobile ? 'button' : 'div'"
          :type="isMobile ? 'button' : undefined"
          class="section-header"
          :class="{ 'mobile-toggle': isMobile, 'is-open': isSectionOpen('studios') }"
          :aria-expanded="isMobile ? isSectionOpen('studios') : undefined"
          @click="toggleSection('studios')"
        >
          <div class="section-header-left">
            <h4 class="breakdown-section-title">Top Studios</h4>
            <span class="section-badge">{{ currentStudios.length }} studios</span>
          </div>
          <svg
            v-if="isMobile"
            class="section-chevron"
            :class="{ rotated: isSectionOpen('studios') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </component>
        <div v-show="isSectionOpen('studios')" class="section-dropdown-body">
          <!-- Stacked Segment Bar -->
          <div class="stacked-bar-container">
            <div
              v-for="(studio, idx) in currentStudios"
              :key="studio.name"
              class="stacked-bar-segment"
              :style="{
                width: `${getStudioPercent(studio.count)}%`,
                backgroundColor: getColor(idx),
              }"
              :title="`${studio.name}: ${studio.count} (${getStudioPercent(studio.count).toFixed(1)}%)`"
            />
          </div>
          <!-- Studio Legend / Grid -->
          <div class="studio-legend-grid">
            <div
              v-for="(studio, idx) in currentStudios"
              :key="studio.name"
              class="studio-legend-item"
            >
              <span class="legend-dot" :style="{ backgroundColor: getColor(idx) }" />
              <span class="legend-name" :title="studio.name">{{ studio.name }}</span>
              <span class="legend-count">{{ studio.count }}</span>
              <span class="legend-pct">{{ getStudioPercent(studio.count).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Top Staff: Ranked responsive cards (Anime only) -->
      <section v-if="currentStaff.length" class="breakdown-section">
        <component
          :is="isMobile ? 'button' : 'div'"
          :type="isMobile ? 'button' : undefined"
          class="section-header"
          :class="{ 'mobile-toggle': isMobile, 'is-open': isSectionOpen('staff') }"
          :aria-expanded="isMobile ? isSectionOpen('staff') : undefined"
          @click="toggleSection('staff')"
        >
          <div class="section-header-left">
            <h4 class="breakdown-section-title">Top Staff</h4>
            <span class="section-badge">{{ currentStaff.length }} staff</span>
          </div>
          <svg
            v-if="isMobile"
            class="section-chevron"
            :class="{ rotated: isSectionOpen('staff') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </component>
        <div v-show="isSectionOpen('staff')" class="section-dropdown-body">
          <div class="people-grid">
            <div
              v-for="(person, idx) in currentStaff"
              :key="person.name"
              class="people-card"
            >
              <div class="people-rank-badge">{{ idx + 1 }}</div>
              <div class="people-details">
                <span class="people-name" :title="person.name">{{ person.name }}</span>
                <div class="people-sub">
                  <span class="people-count">{{ person.count }} {{ person.count === 1 ? 'entry' : 'entries' }}</span>
                </div>
                <div class="people-track">
                  <div
                    class="people-bar"
                    :style="{
                      width: getBarWidth(currentStaff, person.count),
                      background: getColor(idx + 1),
                    }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Top Voice Actors: Ranked responsive cards (Anime only) -->
      <section v-if="currentVoiceActors.length" class="breakdown-section">
        <component
          :is="isMobile ? 'button' : 'div'"
          :type="isMobile ? 'button' : undefined"
          class="section-header"
          :class="{ 'mobile-toggle': isMobile, 'is-open': isSectionOpen('voiceActors') }"
          :aria-expanded="isMobile ? isSectionOpen('voiceActors') : undefined"
          @click="toggleSection('voiceActors')"
        >
          <div class="section-header-left">
            <h4 class="breakdown-section-title">Top Voice Actors</h4>
            <span class="section-badge">{{ currentVoiceActors.length }} actors</span>
          </div>
          <svg
            v-if="isMobile"
            class="section-chevron"
            :class="{ rotated: isSectionOpen('voiceActors') }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </component>
        <div v-show="isSectionOpen('voiceActors')" class="section-dropdown-body">
          <div class="people-grid">
            <div
              v-for="(va, idx) in currentVoiceActors"
              :key="va.name"
              class="people-card"
            >
              <div class="people-rank-badge va-badge">{{ idx + 1 }}</div>
              <div class="people-details">
                <span class="people-name" :title="va.name">{{ va.name }}</span>
                <div class="people-sub">
                  <span class="people-count">{{ va.count }} {{ va.count === 1 ? 'role' : 'roles' }}</span>
                </div>
                <div class="people-track">
                  <div
                    class="people-bar"
                    :style="{
                      width: getBarWidth(currentVoiceActors, va.count),
                      background: getColor(idx + 2),
                    }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Empty State -->
    <div v-else class="breakdown-empty">No data yet</div>
  </div>
</template>

<style scoped>
.breakdown-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border-subtle);
}

.breakdown-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-xl);
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

.breakdown-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.breakdown-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
  background: transparent;
  border: none;
  text-align: left;
  width: 100%;
}

.section-header.mobile-toggle {
  padding: var(--space-xs) var(--space-sm);
  margin-left: calc(-1 * var(--space-sm));
  margin-right: calc(-1 * var(--space-sm));
  width: calc(100% + var(--space-sm) * 2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.section-header.mobile-toggle:hover {
  background: var(--bg-elevated);
  border-color: var(--border-subtle);
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.breakdown-section-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.section-badge {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: var(--font-weight-medium);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.section-chevron {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  transition: transform var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.section-header.mobile-toggle:hover .section-chevron {
  color: var(--color-primary);
}

.section-chevron.rotated {
  transform: rotate(180deg);
}

.section-dropdown-body {
  margin-top: var(--space-xs);
}

/* 1. Genres - Responsive Interlocking Multi-bar Grid */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-sm);
}

.genre-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.genre-cell:hover {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.genre-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.genre-rank {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--accent-color);
  opacity: 0.85;
}

.genre-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.genre-count {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.genre-track {
  width: 100%;
  height: 5px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.genre-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease-out;
}

/* 2. Top Tags - Inline Wrap-around Chips */
.tags-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-sm);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.tag-chip:hover {
  border-color: var(--chip-color);
  background: var(--bg-hover);
}

.tag-chip-name {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.tag-chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--chip-color);
  color: #0b0f19;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  min-width: 16px;
  height: 16px;
}

/* 3. Top Studios - Stacked Progress Bar */
.stacked-bar-container {
  display: flex;
  width: 100%;
  height: 14px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--bg-hover);
  gap: 1px;
}

.stacked-bar-segment {
  height: 100%;
  transition: width 0.4s ease-out;
}

.studio-legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-xs) var(--space-md);
  margin-top: var(--space-xs);
}

.studio-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  min-width: 0;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.legend-count {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.legend-pct {
  color: var(--text-muted);
  font-size: 10px;
  min-width: 24px;
  text-align: right;
}

/* 4 & 5. Top Staff and Voice Actors - Ranked Responsive Cards */
.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--space-sm);
}

.people-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.people-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.people-rank-badge {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.people-rank-badge.va-badge {
  color: #ff5376;
}

.people-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.people-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.people-sub {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.people-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.people-track {
  width: 100%;
  height: 3px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: 2px;
}

.people-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease-out;
}

.breakdown-empty {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-lg) 0;
}

/* Mobile Responsiveness */
@media (max-width: 480px) {
  .breakdown-card {
    padding: var(--space-md);
  }

  .genre-grid,
  .people-grid,
  .studio-legend-grid {
    grid-template-columns: 1fr;
  }
}
</style>
