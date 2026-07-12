<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import type { Media } from '../types'

const animeStore = useAnimeStore()

const popularAnime = ref<Media[]>([])
const seasonalAnime = ref<Media[]>([])
const topManga = ref<Media[]>([])
const loading = ref(false)

const trendingAnime = computed(() => animeStore.trending)

const POPULAR_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
      title { romaji english native userPreferred }
      coverImage { large medium color }
      format status episodes averageScore
      genres nextAiringEpisode { episode }
    }
  }
}
`

const SEASONAL_QUERY = `
query ($season: Season, $year: Int) {
  Page(page: 1, perPage: 12) {
    media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) {
      id
      title { romaji english native userPreferred }
      coverImage { large medium color }
      format status episodes averageScore
      genres nextAiringEpisode { episode }
    }
  }
}
`

const TOP_MANGA_QUERY = `
query {
  Page(page: 1, perPage: 12) {
    media(sort: SCORE_DESC, type: MANGA) {
      id
      title { romaji english native userPreferred }
      coverImage { large medium color }
      format status chapters volumes averageScore
      genres
    }
  }
}
`

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month < 3) return { season: 'WINTER', year }
  if (month < 6) return { season: 'SPRING', year }
  if (month < 9) return { season: 'SUMMER', year }
  return { season: 'FALL', year }
}

onMounted(async () => {
  loading.value = true

  // Fetch trending (reuse store if already loaded)
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending()
  }

  const { season, year } = getCurrentSeason()

  // Fetch in parallel
  const [popularRes, seasonalRes, mangaRes] = await Promise.all([
    gqlQuery(POPULAR_QUERY, { page: 1, perPage: 12 }).catch(() => null),
    gqlQuery(SEASONAL_QUERY, { season, year }).catch(() => null),
    gqlQuery(TOP_MANGA_QUERY).catch(() => null),
  ])

  if (popularRes?.data?.Page?.media) popularAnime.value = popularRes.data.Page.media
  if (seasonalRes?.data?.Page?.media) seasonalAnime.value = seasonalRes.data.Page.media
  if (mangaRes?.data?.Page?.media) topManga.value = mangaRes.data.Page.media

  loading.value = false
})
</script>

<template>
  <div class="discover-view">
    <header class="discover-header safe-area-top">
      <h1 class="discover-title">Discover</h1>
      <p class="discover-subtitle">Browse anime and manga</p>
    </header>

    <!-- Trending -->
    <section v-if="trendingAnime.length > 0" class="discover-section">
      <h2 class="section-title">Trending Now</h2>
      <AnimeGrid :items="trendingAnime.slice(0, 12)" :columns="3" />
    </section>

    <!-- Popular -->
    <section v-if="popularAnime.length > 0" class="discover-section">
      <h2 class="section-title">Most Popular</h2>
      <AnimeGrid :items="popularAnime" :columns="3" />
    </section>

    <!-- Seasonal -->
    <section v-if="seasonalAnime.length > 0" class="discover-section">
      <h2 class="section-title">This Season</h2>
      <AnimeGrid :items="seasonalAnime" :columns="3" />
    </section>

    <!-- Top Manga -->
    <section v-if="topManga.length > 0" class="discover-section">
      <h2 class="section-title">Top Manga</h2>
      <AnimeGrid :items="topManga" :columns="3" />
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.discover-view {
  min-height: 100%;
}

.discover-header {
  padding: var(--space-xl) var(--space-lg) var(--space-lg);
}

.discover-title {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.discover-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.discover-section {
  padding: 0 var(--space-lg);
  margin-bottom: var(--space-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--space-2xl);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-surface);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
