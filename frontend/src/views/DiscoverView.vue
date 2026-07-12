<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { usePlatform } from '../composables/usePlatform'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import type { Media } from '../types'

const animeStore = useAnimeStore()
const { gridColumns } = usePlatform()

const popularAnime = ref<Media[]>([])
const seasonalAnime = ref<Media[]>([])
const topManga = ref<Media[]>([])

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

onMounted(() => {
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending()
  }

  const { season, year } = getCurrentSeason()

  // Fire all queries independently — each section appears as its data arrives
  gqlQuery(POPULAR_QUERY, { page: 1, perPage: 12 })
    .then((r) => { if (r?.data?.Page?.media) popularAnime.value = r.data.Page.media })
    .catch(() => {})

  gqlQuery(SEASONAL_QUERY, { season, year })
    .then((r) => { if (r?.data?.Page?.media) seasonalAnime.value = r.data.Page.media })
    .catch(() => {})

  gqlQuery(TOP_MANGA_QUERY)
    .then((r) => { if (r?.data?.Page?.media) topManga.value = r.data.Page.media })
    .catch(() => {})
})
</script>

<template>
  <div class="discover-view">
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
  </div>
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
</style>
