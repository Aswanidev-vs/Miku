<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimeStore } from '../stores/anime'
import { usePlatform } from '../composables/usePlatform'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import UpdateNotification from '../components/layout/UpdateNotification.vue'
import type { Media } from '../types'
import { preferredTitle } from '../utils/mediaDisplay'
import { useSettings } from '../composables/useSettings'

const animeStore = useAnimeStore()
const router = useRouter()
const { gridColumns } = usePlatform()
const { settings } = useSettings()

// Section data
const popularAnime = ref<Media[]>([])
const seasonalAnime = ref<Media[]>([])
const latestAnime = ref<Media[]>([])
const latestManga = ref<Media[]>([])
const topManga = ref<Media[]>([])
const trendingAnime = computed(() => animeStore.trending)
const featuredAnime = computed(() => trendingAnime.value[0])

// Pagination state for each section (used by "load more")
const popularPage = ref(1)
const seasonalPage = ref(1)
const latestAnimePage = ref(1)
const latestMangaPage = ref(1)
const mangaPage = ref(1)
const loadingMore = ref(false)
const allLoaded = ref(false)
const MAX_PAGES = 3 // each section loads up to 3 pages (36 items)

// Whether a section's first page has been lazy-loaded yet
const popularLoaded = ref(false)
const seasonalLoaded = ref(false)
const latestAnimeLoaded = ref(false)
const latestMangaLoaded = ref(false)
const mangaLoaded = ref(false)

const QUERIES = {
  trending: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          title { romaji english native userPreferred }
          coverImage { large medium color }
          description(asHtml: false)
          bannerImage
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
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
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
  latestAnime: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: ID_DESC, type: ANIME) {
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
  latestManga: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: ID_DESC, type: MANGA) {
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

function openRoute(name: 'search' | 'mylist' | 'statistics') {
  router.push({ name })
}

// Lazy initial loaders — fetch a section's first page only when it scrolls into view.
async function loadPopular() {
  if (popularLoaded.value) return
  try {
    const r = await gqlQuery(QUERIES.popular, { page: 1, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      popularAnime.value = r.data.Page.media
      popularLoaded.value = true
    } else {
      console.warn('[Discover] Popular query returned empty results')
      popularLoaded.value = false
    }
  } catch (err) {
    console.warn('[Discover] Popular section failed to load:', err)
    popularLoaded.value = false
  }
}

async function loadSeasonal() {
  if (seasonalLoaded.value) return
  const { season, year } = getCurrentSeason()
  try {
    const r = await gqlQuery(QUERIES.seasonal, { season, year, page: 1, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      seasonalAnime.value = r.data.Page.media
      seasonalLoaded.value = true
    } else {
      // Empty array returned — no anime for this season/year, don't mark as loaded so it can retry
      console.warn('[Discover] Seasonal query returned empty results for', { season, year })
      seasonalLoaded.value = false
    }
  } catch (err) {
    console.warn('[Discover] Seasonal section failed to load:', err)
    seasonalLoaded.value = false
  }
}

async function loadLatestAnime() {
  if (latestAnimeLoaded.value) return
  try {
    const r = await gqlQuery(QUERIES.latestAnime, { page: 1, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      latestAnime.value = r.data.Page.media
      latestAnimeLoaded.value = true
    } else {
      console.warn('[Discover] Latest anime query returned empty results')
      latestAnimeLoaded.value = false
    }
  } catch (err) {
    console.warn('[Discover] Latest anime section failed to load:', err)
    latestAnimeLoaded.value = false
  }
}

async function loadLatestManga() {
  if (latestMangaLoaded.value) return
  try {
    const r = await gqlQuery(QUERIES.latestManga, { page: 1, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      latestManga.value = r.data.Page.media
      latestMangaLoaded.value = true
    } else {
      console.warn('[Discover] Latest manga query returned empty results')
      latestMangaLoaded.value = false
    }
  } catch (err) {
    console.warn('[Discover] Latest manga section failed to load:', err)
    latestMangaLoaded.value = false
  }
}

async function loadManga() {
  if (mangaLoaded.value) return
  try {
    const r = await gqlQuery(QUERIES.manga, { page: 1, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      topManga.value = r.data.Page.media
      mangaLoaded.value = true
    } else {
      console.warn('[Discover] Manga query returned empty results')
      mangaLoaded.value = false
    }
  } catch (err) {
    console.warn('[Discover] Manga section failed to load:', err)
    mangaLoaded.value = false
  }
}

// Load more pages for a specific section (triggered by the bottom sentinel)
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

async function loadMoreLatestAnime() {
  if (latestAnimePage.value >= MAX_PAGES) return
  const nextPage = latestAnimePage.value + 1
  try {
    const r = await gqlQuery(QUERIES.latestAnime, { page: nextPage, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      latestAnime.value = [...latestAnime.value, ...r.data.Page.media]
      latestAnimePage.value = nextPage
    }
  } catch { /* ignore */ }
}

async function loadMoreLatestManga() {
  if (latestMangaPage.value >= MAX_PAGES) return
  const nextPage = latestMangaPage.value + 1
  try {
    const r = await gqlQuery(QUERIES.latestManga, { page: nextPage, perPage: 12 })
    if (r?.data?.Page?.media?.length) {
      latestManga.value = [...latestManga.value, ...r.data.Page.media]
      latestMangaPage.value = nextPage
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
const sectionLoaders = [loadMorePopular, loadMoreSeasonal, loadMoreLatestAnime, loadMoreLatestManga, loadMoreManga]

async function loadMore() {
  if (loadingMore.value || allLoaded.value) return
  loadingMore.value = true

  try {
    for (let i = 0; i < sectionLoaders.length; i++) {
      const idx = (nextSectionIndex + i) % sectionLoaders.length
      const loader = sectionLoaders[idx]
      const pageRef = [popularPage, seasonalPage, latestAnimePage, latestMangaPage, mangaPage][idx]
      if (pageRef.value < MAX_PAGES) {
        await loader()
        nextSectionIndex = (idx + 1) % sectionLoaders.length
        break
      }
    }

    if (
      popularPage.value >= MAX_PAGES &&
      seasonalPage.value >= MAX_PAGES &&
      latestAnimePage.value >= MAX_PAGES &&
      latestMangaPage.value >= MAX_PAGES &&
      mangaPage.value >= MAX_PAGES
    ) {
      allLoaded.value = true
    }
  } finally {
    loadingMore.value = false
  }
}

// Refresh — reset everything and re-arm lazy loading
async function refreshDiscover() {
  clearGqlCache()
  animeStore.fetchTrending(1, 12)
  popularPage.value = 1
  seasonalPage.value = 1
  latestAnimePage.value = 1
  latestMangaPage.value = 1
  mangaPage.value = 1
  nextSectionIndex = 0
  allLoaded.value = false
  popularAnime.value = []
  seasonalAnime.value = []
  latestAnime.value = []
  latestManga.value = []
  topManga.value = []
  popularLoaded.value = false
  seasonalLoaded.value = false
  latestAnimeLoaded.value = false
  latestMangaLoaded.value = false
  mangaLoaded.value = false
  lazyObserver?.disconnect()
  nextTick(setupLazySections)
}

const { pullingDown, refreshing, showRefreshBtn, manualRefresh, setupListeners, removeListeners } = usePullToRefresh(refreshDiscover)
const viewRef = ref<HTMLElement | null>(null)

// IntersectionObserver for lazy section loading
const popularSectionRef = ref<HTMLElement | null>(null)
const seasonalSectionRef = ref<HTMLElement | null>(null)
const latestAnimeSectionRef = ref<HTMLElement | null>(null)
const latestMangaSectionRef = ref<HTMLElement | null>(null)
const mangaSectionRef = ref<HTMLElement | null>(null)
let lazyObserver: IntersectionObserver | null = null

function setupLazySections() {
  const sections = [
    { ref: popularSectionRef, loaded: popularLoaded, load: loadPopular },
    { ref: seasonalSectionRef, loaded: seasonalLoaded, load: loadSeasonal },
    { ref: latestAnimeSectionRef, loaded: latestAnimeLoaded, load: loadLatestAnime },
    { ref: latestMangaSectionRef, loaded: latestMangaLoaded, load: loadLatestManga },
    { ref: mangaSectionRef, loaded: mangaLoaded, load: loadManga },
  ]
  // Find the scroll container (.main-content) to use as IntersectionObserver root
  const scrollContainer = document.querySelector('.main-content') as HTMLElement | null
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const s = sections.find((x) => x.ref.value === e.target)
        if (!s) continue
        if (s.loaded.value) {
          obs.unobserve(e.target)
          continue
        }
        s.load().then(() => {
          if (s.loaded.value) obs.unobserve(e.target)
        })
      }
    },
    {
      root: scrollContainer, // observe against the actual scroll container
      rootMargin: '300px',
    }
  )
  for (const s of sections) {
    if (s.ref.value) obs.observe(s.ref.value)
  }
  lazyObserver = obs
}

// IntersectionObserver for infinite scroll (load more pages)
let observer: IntersectionObserver | null = null
const sentinelRef = ref<HTMLElement | null>(null)

function setupInfiniteScroll() {
  if (!sentinelRef.value) return
  const scrollContainer = document.querySelector('.main-content') as HTMLElement | null
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore.value && !allLoaded.value) {
        loadMore()
      }
    },
    { root: scrollContainer, rootMargin: '200px' }
  )
  observer.observe(sentinelRef.value)
}

onMounted(() => {
  // Trending is the hero — load it eagerly so the top of the page fills immediately.
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending(1, 12)
  }
  if (viewRef.value) setupListeners(viewRef.value)
  nextTick(() => {
    setupLazySections()
    setupInfiniteScroll()
  })
})

onUnmounted(() => {
  if (viewRef.value) removeListeners(viewRef.value)
  observer?.disconnect()
  lazyObserver?.disconnect()
})
</script>

<template>
  <PullToRefresh :pulling-down="pullingDown" :refreshing="refreshing" :show-refresh-btn="showRefreshBtn" @refresh="manualRefresh">
    <div ref="viewRef" class="discover-view">
      <UpdateNotification />
      <header class="discover-header safe-area-top">
        <p class="discover-eyebrow">Miku · AniList</p>
        <h1 class="discover-title">Discover</h1>
        <p class="discover-sub">Hand-picked seasons, trends & hidden gems.</p>
      </header>

      <section v-if="featuredAnime" class="featured-media" aria-labelledby="featured-title">
        <div class="featured-cover">
          <img
            :src="featuredAnime.coverImage.large"
            :alt="preferredTitle(featuredAnime.title, settings.titleLanguage)"
          />
          <span v-if="featuredAnime.nextAiringEpisode" class="featured-airing">
            Episode {{ featuredAnime.nextAiringEpisode.episode }} next
          </span>
        </div>
        <div class="featured-copy">
          <p class="featured-kicker">Featured from trending</p>
          <h2 id="featured-title">{{ preferredTitle(featuredAnime.title, settings.titleLanguage) }}</h2>
          <p class="featured-meta">
            <span v-if="featuredAnime.format">{{ featuredAnime.format.replace('_', ' ') }}</span>
            <span v-if="featuredAnime.format && featuredAnime.status" aria-hidden="true">·</span>
            <span v-if="featuredAnime.status">{{ featuredAnime.status.replaceAll('_', ' ').toLowerCase() }}</span>
          </p>
          <p class="featured-description">
            {{ featuredAnime.description || 'Explore the cast, details, and related titles for this trending pick.' }}
          </p>
          <button class="btn btn-primary featured-action" type="button" @click="router.push({ name: 'media-detail', params: { id: featuredAnime.id } })">
            View details
          </button>
        </div>
      </section>

      <section class="quick-actions" aria-labelledby="quick-actions-title">
        <div class="section-header">
          <h2 id="quick-actions-title" class="section-title">Quick actions</h2>
        </div>
        <div class="quick-action-grid">
          <button class="quick-action" type="button" @click="openRoute('search')">
            <span class="quick-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </span>
            <span><strong>Find a title</strong><small>Search anime, manga, and people</small></span>
          </button>
          <button class="quick-action" type="button" @click="openRoute('mylist')">
            <span class="quick-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6h12M8 12h12M8 18h12" />
                <path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.6" />
              </svg>
            </span>
            <span><strong>Open My List</strong><small>Pick up where you left off</small></span>
          </button>
          <button class="quick-action" type="button" @click="openRoute('statistics')">
            <span class="quick-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V5M4 19h16" />
                <path d="m7 15 3-4 3 2 5-7" />
              </svg>
            </span>
            <span><strong>View statistics</strong><small>See your watching history</small></span>
          </button>
        </div>
      </section>

      <section v-if="trendingAnime.length > 0" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Trending Now</h2>
        </div>
        <AnimeGrid :items="trendingAnime.slice(0, 12)" :columns="gridColumns" />
      </section>

      <section ref="popularSectionRef" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Most Popular</h2>
        </div>
        <AnimeGrid v-if="popularAnime.length > 0" :items="popularAnime" :columns="gridColumns" />
        <AnimeGrid v-else-if="!popularLoaded" :items="[]" :loading="true" :columns="gridColumns" />
        <p v-else class="section-empty">Nothing found</p>
      </section>

      <section ref="seasonalSectionRef" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>This Season</h2>
        </div>
        <AnimeGrid v-if="seasonalAnime.length > 0" :items="seasonalAnime" :columns="gridColumns" />
        <AnimeGrid v-else-if="!seasonalLoaded" :items="[]" :loading="true" :columns="gridColumns" />
        <p v-else class="section-empty">Nothing found</p>
      </section>

      <section ref="latestAnimeSectionRef" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Newly Added Anime</h2>
        </div>
        <AnimeGrid v-if="latestAnime.length > 0" :items="latestAnime" :columns="gridColumns" />
        <AnimeGrid v-else-if="!latestAnimeLoaded" :items="[]" :loading="true" :columns="gridColumns" />
        <p v-else class="section-empty">Nothing found</p>
      </section>

      <section ref="latestMangaSectionRef" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Newly Added Manga</h2>
        </div>
        <AnimeGrid v-if="latestManga.length > 0" :items="latestManga" :columns="gridColumns" />
        <AnimeGrid v-else-if="!latestMangaLoaded" :items="[]" :loading="true" :columns="gridColumns" />
        <p v-else class="section-empty">Nothing found</p>
      </section>

      <section ref="mangaSectionRef" class="discover-section discover-section--rail">
        <div class="section-header">
          <h2 class="section-title"><span class="title-dot"></span>Top Manga</h2>
        </div>
        <AnimeGrid v-if="topManga.length > 0" :items="topManga" :columns="gridColumns" />
        <AnimeGrid v-else-if="!mangaLoaded" :items="[]" :loading="true" :columns="gridColumns" />
        <p v-else class="section-empty">Nothing found</p>
      </section>

      <!-- Infinite scroll sentinel + loading indicator -->
      <div ref="sentinelRef" class="load-more-sentinel">
        <div v-if="loadingMore" class="loading-more">
          <div class="spinner"></div>
          <span>Loading more...</span>
        </div>
        <p v-else-if="allLoaded" class="all-loaded">You've seen it all</p>
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
  letter-spacing: var(--letter-spacing-normal);
  color: var(--text-muted);
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

.featured-media {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  gap: var(--space-2xl);
  max-width: 760px;
  margin-bottom: var(--space-2xl);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.featured-cover {
  position: relative;
  min-height: 260px;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.featured-cover img {
  width: 100%;
  height: 100%;
  min-height: 260px;
  object-fit: cover;
}

.featured-airing {
  position: absolute;
  right: var(--space-sm);
  bottom: var(--space-sm);
  left: var(--space-sm);
  padding: 5px 7px;
  color: var(--text-on-primary);
  background: var(--color-primary);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.featured-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  padding: var(--space-md) var(--space-md) var(--space-md) 0;
}

.featured-kicker {
  margin-bottom: var(--space-sm);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.featured-copy h2 {
  max-width: 18ch;
  font-size: var(--font-size-2xl);
}

.featured-meta {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}

.featured-description {
  display: -webkit-box;
  max-width: 52ch;
  margin: var(--space-md) 0 var(--space-xl);
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.featured-action {
  min-height: 40px;
}

.quick-actions {
  margin-bottom: var(--space-3xl);
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}

.quick-action {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 64px;
  padding: var(--space-md);
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  text-align: left;
  transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.quick-action:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
  border-color: var(--border-default);
}

.quick-action-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-radius: var(--radius-sm);
}

.quick-action-icon svg {
  width: 17px;
  height: 17px;
}

.quick-action span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.quick-action strong {
  color: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.quick-action small {
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--font-size-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
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
  background: var(--color-primary);
  flex-shrink: 0;
}

.section-empty {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-lg) 0;
}

.is-desktop .discover-section--rail :deep(.anime-grid) {
  display: flex;
  gap: var(--space-md) !important;
  overflow-x: auto;
  padding-bottom: var(--space-xs);
  scrollbar-width: thin;
}

.is-desktop .discover-section--rail :deep(.grid-item) {
  flex: 0 0 148px;
}

@media (max-width: 720px) {
  .featured-media {
    grid-template-columns: 104px minmax(0, 1fr);
    gap: var(--space-md);
  }

  .featured-cover,
  .featured-cover img {
    min-height: 148px;
  }

  .featured-copy {
    padding: var(--space-xs) 0;
  }

  .featured-copy h2 {
    font-size: var(--font-size-lg);
  }

  .featured-description {
    margin-bottom: var(--space-md);
    -webkit-line-clamp: 2;
  }

  .quick-action-grid {
    grid-template-columns: 1fr;
  }
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
