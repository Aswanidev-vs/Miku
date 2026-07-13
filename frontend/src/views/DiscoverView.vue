<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { usePlatform } from '../composables/usePlatform'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import type { Media } from '../types'

const animeStore = useAnimeStore()
const { gridColumns } = usePlatform()

// Section data
const popularAnime = ref<Media[]>([])
const seasonalAnime = ref<Media[]>([])
const topManga = ref<Media[]>([])
const trendingAnime = computed(() => animeStore.trending)

// Pagination state for each section
const popularPage = ref(1)
const seasonalPage = ref(1)
const mangaPage = ref(1)
const loadingMore = ref(false)
const allLoaded = ref(false)
const MAX_PAGES = 3 // each section loads up to 3 pages (36 items)

const QUERIES = {
  trending: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          genres nextAiringEpisode { episode }
        }
        pageInfo { hasNextPage }
      }
    }
  `,
  popular: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          genres nextAiringEpisode { episode }
        }
        pageInfo { hasNextPage }
      }
    }
  `,
  seasonal: `
    query ($season: Season, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          genres nextAiringEpisode { episode }
        }
        pageInfo { hasNextPage }
      }
    }
  `,
  manga: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: SCORE_DESC, type: MANGA) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status chapters volumes averageScore
          genres
        }
        pageInfo { hasNextPage }
      }
    }
  `,
}

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month < 3) return { season: 'WINTER', year }
  if (month < 6) return { season: 'SPRING', year }
  if (month < 9) return { season: 'SUMMER', year }
  return { season: 'FALL', year }
}

// Initial load — fire all queries independently
function loadInitialData() {
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending(1, 12)
  }

  const { season, year } = getCurrentSeason()

  gqlQuery(QUERIES.popular, { page: 1, perPage: 12 })
    .then((r) => { if (r?.data?.Page?.media) popularAnime.value = r.data.Page.media })
    .catch(() => {})

  gqlQuery(QUERIES.seasonal, { season, year, page: 1, perPage: 12 })
    .then((r) => { if (r?.data?.Page?.media) seasonalAnime.value = r.data.Page.media })
    .catch(() => {})

  gqlQuery(QUERIES.manga, { page: 1, perPage: 12 })
    .then((r) => { if (r?.data?.Page?.media) topManga.value = r.data.Page.media })
    .catch(() => {})
}

// Load more for a specific section
async function loadMorePopular() {
  if (popularPage.value >= MAX_PAGES) return
  const nextPage = popularPage.value + 1
  try {
    const r = await gqlQuery(QUERIES.popular, { page: nextPage, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      popularAnime.value = [...popularAnime.value, ...r.data.Page.media]
      popularPage.value = nextPage
    }
  } catch { /* ignore */ }
}

async function loadMoreSeasonal() {
  if (seasonalPage.value >= MAX_PAGES) return
  const nextPage = seasonalPage.value + 1
  const { season, year } = getCurrentSeason()
  try {
    const r = await gqlQuery(QUERIES.seasonal, { season, year, page: nextPage, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      seasonalAnime.value = [...seasonalAnime.value, ...r.data.Page.media]
      seasonalPage.value = nextPage
    }
  } catch { /* ignore */ }
}

async function loadMoreManga() {
  if (mangaPage.value >= MAX_PAGES) return
  const nextPage = mangaPage.value + 1
  try {
    const r = await gqlQuery(QUERIES.manga, { page: nextPage, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      topManga.value = [...topManga.value, ...r.data.Page.media]
      mangaPage.value = nextPage
    }
  } catch { /* ignore */ }
}

// Load more for the NEXT section in sequence
let nextSectionIndex = 0
const sectionLoaders = [loadMorePopular, loadMoreSeasonal, loadMoreManga]

async function loadMore() {
  if (loadingMore.value || allLoaded.value) return
  loadingMore.value = true

  try {
    // Cycle through sections: popular → seasonal → manga → popular → ...
    const maxCycles = sectionLoaders.length * MAX_PAGES
    for (let i = 0; i < sectionLoaders.length; i++) {
      const idx = (nextSectionIndex + i) % sectionLoaders.length
      const loader = sectionLoaders[idx]
      const pageRef = [popularPage, seasonalPage, mangaPage][idx]
      if (pageRef.value < MAX_PAGES) {
        await loader()
        nextSectionIndex = (idx + 1) % sectionLoaders.length
        break
      }
    }

    // Check if all sections are fully loaded
    if (
      popularPage.value >= MAX_PAGES &&
      seasonalPage.value >= MAX_PAGES &&
      mangaPage.value >= MAX_PAGES
    ) {
      allLoaded.value = true
    }
  } finally {
    loadingMore.value = false
  }
}

// Refresh — reset everything
async function refreshDiscover() {
  clearGqlCache()
  animeStore.fetchTrending(1, 12)
  popularPage.value = 1
  seasonalPage.value = 1
  mangaPage.value = 1
  nextSectionIndex = 0
  allLoaded.value = false
  loadInitialData()
}

const { pullingDown, refreshing, showRefreshBtn, manualRefresh, setupListeners, removeListeners } = usePullToRefresh(refreshDiscover)
const viewRef = ref<HTMLElement | null>(null)

// IntersectionObserver for infinite scroll
let observer: IntersectionObserver | null = null
const sentinelRef = ref<HTMLElement | null>(null)

function setupInfiniteScroll() {
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore.value && !allLoaded.value) {
        loadMore()
      }
    },
    { rootMargin: '200px' } // trigger 200px before reaching the bottom
  )
  observer.observe(sentinelRef.value)
}

onMounted(() => {
  loadInitialData()
  if (viewRef.value) setupListeners(viewRef.value)
  nextTick(() => setupInfiniteScroll())
})

onUnmounted(() => {
  if (viewRef.value) removeListeners(viewRef.value)
  observer?.disconnect()
})
</script>

<template>
  <PullToRefresh :pulling-down="pullingDown" :refreshing="refreshing" :show-refresh-btn="showRefreshBtn" @refresh="manualRefresh">
    <div ref="viewRef" class="discover-view">
      <header class="discover-header safe-area-top">
        <p class="discover-eyebrow">Miku · AniList</p>
        <h1 class="discover-title">Discover</h1>
        <p class="discover-sub">Hand-picked seasons, trends & hidden gems.</p>
      </header>

      <section v-if="trendingAnime.length > 0" class="discover-section">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Trending Now</h2>
        </div>
        <AnimeGrid :items="trendingAnime.slice(0, 12)" :columns="gridColumns" />
      </section>

      <section v-if="popularAnime.length > 0" class="discover-section">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Most Popular</h2>
        </div>
        <AnimeGrid :items="popularAnime" :columns="gridColumns" />
      </section>

      <section v-if="seasonalAnime.length > 0" class="discover-section">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>This Season</h2>
        </div>
        <AnimeGrid :items="seasonalAnime" :columns="gridColumns" />
      </section>

      <section v-if="topManga.length > 0" class="discover-section">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Top Manga</h2>
        </div>
        <AnimeGrid :items="topManga" :columns="gridColumns" />
      </section>

      <!-- Infinite scroll sentinel + loading indicator -->
      <div ref="sentinelRef" class="load-more-sentinel">
        <div v-if="loadingMore" class="loading-more">
          <div class="spinner"></div>
          <span>Loading more...</span>
        </div>
        <p v-else-if="allLoaded" class="all-loaded">You've seen it all ✨</p>
      </div>
    </div>
  </PullToRefresh>
</template>

<style scoped>
.discover-view {
  min-height: 100%;
  padding-bottom: var(--space-3xl);
}

.discover-header {
  padding: var(--space-3xl) 0 var(--space-lg);
}

.discover-eyebrow {
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wider);
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: var(--space-xs);
}

.discover-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.05;
}

.discover-sub {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.discover-section {
  padding: 0;
  margin-bottom: var(--space-3xl);
}

.section-header {
  margin-bottom: var(--space-md);
}

.section-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-tight);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.title-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  box-shadow: 0 0 10px var(--color-primary-glow);
  flex-shrink: 0;
}

.load-more-sentinel {
  display: flex;
  justify-content: center;
  padding: var(--space-2xl) 0;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.loading-more .spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-default);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.all-loaded {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  text-align: center;
}
</style>
