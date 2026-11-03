<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimeStore } from '../stores/anime'
import { useAuthStore } from '../stores'
import { usePlatform } from '../composables/usePlatform'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import type { Media, MediaListEntry } from '../types'
import { preferredTitle } from '../utils/mediaDisplay'
import { renderMarkdown } from '../utils/markdown'
import { useSettings } from '../composables/useSettings'

const animeStore = useAnimeStore()
const authStore = useAuthStore()
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

const carouselIndex = ref(0)
const carouselActionMessage = ref('')
const isCarouselHovered = ref(false)
const isManualPaused = ref(false)
const touchStartX = ref<number | null>(null)
const isDiscoverMounted = ref(false)
let carouselTimer: ReturnType<typeof setInterval> | null = null
let listLoadPromise: Promise<void> | null = null

const listEntriesByMediaId = computed(() => {
  const entries = new Map<number, MediaListEntry>()
  for (const list of animeStore.myList?.lists || []) {
    for (const entry of list.entries || []) entries.set(entry.mediaId, entry)
  }
  return entries
})

function releaseTimestamp(media: Media): number {
  if (media.startDate?.year) {
    return Date.UTC(media.startDate.year, (media.startDate.month || 1) - 1, media.startDate.day || 1)
  }
  if (media.seasonYear) {
    const seasonMonth = { WINTER: 0, SPRING: 3, SUMMER: 6, FALL: 9 }[media.season || ''] ?? 0
    return Date.UTC(media.seasonYear, seasonMonth, 1)
  }
  return media.id
}

function recentlyUpdatedTimestamp(media: Media): number {
  const updatedAt = media.mediaListEntry?.updatedAt
  return updatedAt ? updatedAt * 1000 : releaseTimestamp(media)
}

const carouselMedia = computed(() => {
  const sources = settings.value.carouselSources
  const bySource: Record<string, Media[]> = {
    trending: trendingAnime.value,
    seasonal: seasonalAnime.value,
    popular: popularAnime.value,
    'popular-manga': topManga.value,
    'recommended-anime': animeStore.genreRecommendations,
    'recommended-manga': [],
    'currently-watching': (animeStore.myList?.lists || [])
      .find((list) => list.status === 'CURRENT')?.entries
      ?.map((entry) => entry.media)
      .filter(Boolean) as Media[] || [],
    'recently-updated': latestAnime.value,
  }
  const seen = new Set<number>()
  const candidates: Media[] = []
  for (const source of sources) {
    for (const media of bySource[source] || []) {
      if (!media || seen.has(media.id)) continue
      const listEntry = media.mediaListEntry || listEntriesByMediaId.value.get(media.id)
      if (settings.value.carouselMediaFilter !== 'BOTH' && media.type && media.type !== settings.value.carouselMediaFilter) continue
      if (settings.value.carouselDiscoveryFilter === 'my-list' && !listEntry) continue
      if (settings.value.carouselDiscoveryFilter === 'unwatched' && listEntry && listEntry.status !== 'PLANNING') continue
      if (settings.value.carouselHideCompletedDropped && ['COMPLETED', 'DROPPED'].includes(listEntry?.status || '')) continue
      seen.add(media.id)
      candidates.push(listEntry && !media.mediaListEntry ? { ...media, mediaListEntry: listEntry } : media)
    }
  }
  candidates.sort((a, b) => {
    let difference = 0
    if (settings.value.carouselOrder === 'popular') {
      difference = (b.popularity || b.trending || 0) - (a.popularity || a.trending || 0)
    } else if (settings.value.carouselOrder === 'recently-updated') {
      difference = recentlyUpdatedTimestamp(b) - recentlyUpdatedTimestamp(a)
    } else {
      difference = releaseTimestamp(b) - releaseTimestamp(a)
    }
    if (difference !== 0) return difference
    if (settings.value.carouselPreferList) return Number(Boolean(b.mediaListEntry)) - Number(Boolean(a.mediaListEntry))
    return b.id - a.id
  })
  return candidates.slice(0, settings.value.carouselMaxSlides)
})

const activeCarouselMedia = computed(() => carouselMedia.value[carouselIndex.value])
const carouselMotionReduced = computed(() => {
  if (settings.value.reduceMotion) return true
  return settings.value.carouselRespectReducedMotion
    && typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
})

const carouselDuration = computed(() => `${settings.value.carouselDuration}s`)
const carouselAnimationDuration = computed(() => ({ slow: '1.1s', normal: '.7s', fast: '.4s' }[settings.value.carouselAnimationSpeed]))

function stopCarouselAutoplay() {
  if (carouselTimer) {
    clearInterval(carouselTimer)
    carouselTimer = null
  }
}

function startCarouselAutoplay() {
  stopCarouselAutoplay()
  if (!isDiscoverMounted.value) return
  if (!settings.value.carouselAutoplay || carouselMedia.value.length < 2) return
  if (isManualPaused.value) return
  if (isCarouselHovered.value && settings.value.carouselPauseOnHover) return
  carouselTimer = setInterval(() => moveCarousel(1, false), settings.value.carouselDuration * 1000)
}

function resetCarouselAutoplay() {
  stopCarouselAutoplay()
  startCarouselAutoplay()
}

function moveCarousel(direction: number, manual = true) {
  const length = carouselMedia.value.length
  if (length < 2) return
  carouselIndex.value = (carouselIndex.value + direction + length) % length
  if (manual && settings.value.carouselResumeAfterInteraction) {
    isManualPaused.value = false
    resetCarouselAutoplay()
  } else if (manual) {
    isManualPaused.value = true
    stopCarouselAutoplay()
  }
}

function goToCarousel(index: number) {
  if (index < 0 || index >= carouselMedia.value.length) return
  carouselIndex.value = index
  if (settings.value.carouselResumeAfterInteraction) {
    isManualPaused.value = false
    resetCarouselAutoplay()
  } else {
    isManualPaused.value = true
    stopCarouselAutoplay()
  }
}

function handleCarouselKeydown(event: KeyboardEvent) {
  if (!settings.value.carouselKeyboardNavigation) return
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveCarousel(-1) }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveCarousel(1) }
}

function handleTouchStart(event: TouchEvent) {
  if (!settings.value.carouselTouchNavigation) return
  touchStartX.value = event.touches[0]?.clientX ?? null
}

function handleTouchEnd(event: TouchEvent) {
  if (!settings.value.carouselTouchNavigation || touchStartX.value === null) return
  const distance = (event.changedTouches[0]?.clientX ?? touchStartX.value) - touchStartX.value
  touchStartX.value = null
  if (Math.abs(distance) > 44) moveCarousel(distance > 0 ? -1 : 1)
}

function handleCarouselEnter() {
  isCarouselHovered.value = true
  if (settings.value.carouselPauseOnHover) stopCarouselAutoplay()
}

function handleCarouselLeave() {
  isCarouselHovered.value = false
  if (settings.value.carouselPauseOnHover && !isManualPaused.value) startCarouselAutoplay()
}

async function handleCarouselAction() {
  const media = activeCarouselMedia.value
  if (!media) return
  const entry = media.mediaListEntry
  if (!authStore.isLoggedIn) {
    router.push({ name: 'profile' })
    return
  }
  try {
    const nextProgress = entry ? entry.progress + 1 : 0
    await animeStore.updateEntry(media.id, entry?.status || 'PLANNING', entry?.score || 0, nextProgress)
    if (authStore.currentUser) {
      await animeStore.fetchMyList(authStore.currentUser.id)
    }
    carouselActionMessage.value = entry ? 'Progress updated' : 'Added to Planning'
    window.setTimeout(() => { carouselActionMessage.value = '' }, 2200)
  } catch {
    carouselActionMessage.value = 'Could not update your list'
  }
}

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
          type
          title { romaji english native userPreferred }
          coverImage { large medium color }
          description(asHtml: false)
          bannerImage
          format status episodes averageScore
          season seasonYear
          mediaListEntry { id status score progress updatedAt }
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
          type
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          startDate { year month day }
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
          type
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          startDate { year month day }
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
          type
          title { romaji english native userPreferred }
          coverImage { large medium color }
          format status episodes averageScore
          startDate { year month day }
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
          type
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
          type
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

async function loadCarouselData() {
  const sources = settings.value.carouselSources
  const loaders: Promise<void>[] = []
  if (sources.includes('popular')) loaders.push(loadPopular())
  if (sources.includes('seasonal')) loaders.push(loadSeasonal())
  if (sources.includes('popular-manga')) loaders.push(loadManga())
  if (sources.includes('recently-updated')) loaders.push(loadLatestAnime())
  if (authStore.currentUser && !animeStore.myList) {
    if (!listLoadPromise) {
      listLoadPromise = animeStore.fetchMyList(authStore.currentUser.id).finally(() => { listLoadPromise = null })
    }
    loaders.push(listLoadPromise)
  }
  await Promise.all(loaders)
  startCarouselAutoplay()
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

watch(carouselMedia, (items) => {
  if (items.length === 0) {
    carouselIndex.value = 0
  } else if (carouselIndex.value >= items.length) {
    carouselIndex.value = 0
  }
  startCarouselAutoplay()
}, { deep: true })

watch(
  () => [
    settings.value.carouselAutoplay,
    settings.value.carouselDuration,
    settings.value.carouselPauseOnHover,
    settings.value.carouselResumeAfterInteraction,
    settings.value.carouselSources,
    settings.value.carouselMaxSlides,
    settings.value.carouselRespectReducedMotion,
  ],
  () => {
    if (settings.value.carouselResumeAfterInteraction) isManualPaused.value = false
    loadCarouselData()
    resetCarouselAutoplay()
  },
  { deep: true },
)

watch(() => authStore.currentUser?.id, () => loadCarouselData())

onMounted(() => {
  isDiscoverMounted.value = true
  // Trending is the hero — load it eagerly so the top of the page fills immediately.
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending(1, 12)
  }
  loadCarouselData()
  if (viewRef.value) setupListeners(viewRef.value)
  nextTick(() => {
    setupLazySections()
    setupInfiniteScroll()
  })
})

onUnmounted(() => {
  isDiscoverMounted.value = false
  if (viewRef.value) removeListeners(viewRef.value)
  observer?.disconnect()
  lazyObserver?.disconnect()
  stopCarouselAutoplay()
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

      <section
        v-if="activeCarouselMedia"
        class="featured-carousel"
        :class="[
          `hero-${settings.carouselHeroHeight}`,
          `align-${settings.carouselAlignment}`,
          `transition-${settings.carouselTransition}`,
          { 'has-zoom': settings.carouselBackgroundZoom && !carouselMotionReduced, 'has-entrance': settings.carouselTextEntrance && !carouselMotionReduced, 'motion-reduced': carouselMotionReduced },
        ]"
        :style="{ '--carousel-duration': carouselDuration, '--carousel-animation-duration': carouselAnimationDuration }"
        tabindex="0"
        aria-roledescription="carousel"
        :aria-label="`Featured title ${carouselIndex + 1} of ${carouselMedia.length}`"
        @keydown="handleCarouselKeydown"
        @mouseenter="handleCarouselEnter"
        @mouseleave="handleCarouselLeave"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
      >
        <Transition name="carousel-bg" mode="out-in">
          <div :key="activeCarouselMedia.id" class="carousel-background" :style="{ backgroundImage: `url('${activeCarouselMedia.bannerImage || activeCarouselMedia.coverImage.large}')` }" aria-hidden="true" />
        </Transition>
        <div class="carousel-shade" aria-hidden="true" />
        <div :key="activeCarouselMedia.id" class="carousel-content">
          <div v-if="settings.carouselShowCover" class="carousel-cover">
            <img :src="activeCarouselMedia.coverImage.large" :alt="preferredTitle(activeCarouselMedia.title, settings.titleLanguage)" />
            <span v-if="activeCarouselMedia.nextAiringEpisode" class="featured-airing">Episode {{ activeCarouselMedia.nextAiringEpisode.episode }} next</span>
          </div>
          <div class="carousel-copy">
            <p class="featured-kicker">Featured from AniList</p>
            <h2 id="featured-title">{{ preferredTitle(activeCarouselMedia.title, settings.titleLanguage) }}</h2>
            <p v-if="settings.carouselShowMetadata" class="featured-meta">
              <span v-if="activeCarouselMedia.format">{{ activeCarouselMedia.format.replace('_', ' ') }}</span>
              <span v-if="activeCarouselMedia.seasonYear">· {{ activeCarouselMedia.season ? `${activeCarouselMedia.season.toLowerCase()} ` : '' }}{{ activeCarouselMedia.seasonYear }}</span>
              <span v-if="activeCarouselMedia.status">· {{ activeCarouselMedia.status.replaceAll('_', ' ').toLowerCase() }}</span>
              <span v-if="activeCarouselMedia.averageScore">· {{ activeCarouselMedia.averageScore }}%</span>
            </p>
            <p
              v-if="settings.carouselShowSynopsis"
              class="featured-description"
              v-html="renderMarkdown(activeCarouselMedia.description || 'Explore the cast, details, and related titles for this AniList pick.')"
            ></p>
            <p v-if="settings.carouselShowProgress && activeCarouselMedia.mediaListEntry" class="featured-progress">
              On your list · {{ activeCarouselMedia.mediaListEntry.status.replaceAll('_', ' ').toLowerCase() }}<span v-if="activeCarouselMedia.episodes"> · {{ activeCarouselMedia.mediaListEntry.progress }}/{{ activeCarouselMedia.episodes }} episodes</span>
            </p>
            <div class="featured-actions">
              <button class="btn btn-primary featured-action" type="button" @click="router.push({ name: 'media-detail', params: { id: activeCarouselMedia.id } })">View details</button>
              <button class="btn btn-secondary featured-action" type="button" @click="handleCarouselAction">{{ !authStore.isLoggedIn ? 'Sign in to track' : activeCarouselMedia.mediaListEntry ? 'Update progress' : 'Add to My List' }}</button>
            </div>
            <span v-if="carouselActionMessage" class="carousel-feedback" role="status">{{ carouselActionMessage }}</span>
          </div>
        </div>
        <button v-if="settings.carouselShowNavigation && carouselMedia.length > 1" class="carousel-nav carousel-nav-prev" type="button" aria-label="Previous featured title" @click="moveCarousel(-1)">‹</button>
        <button v-if="settings.carouselShowNavigation && carouselMedia.length > 1" class="carousel-nav carousel-nav-next" type="button" aria-label="Next featured title" @click="moveCarousel(1)">›</button>
        <div v-if="settings.carouselShowPagination && carouselMedia.length > 1" class="carousel-pagination" :class="`pagination-${settings.carouselPaginationStyle}`" aria-label="Featured title pagination">
          <template v-if="settings.carouselPaginationStyle === 'progress'">
            <span class="pagination-progress"><span :style="{ width: `${((carouselIndex + 1) / carouselMedia.length) * 100}%` }" /></span>
          </template>
          <template v-else>
            <button v-for="(_, index) in carouselMedia" :key="index" type="button" :class="{ active: carouselIndex === index }" :aria-label="`Go to featured title ${index + 1}`" :aria-current="carouselIndex === index ? 'true' : undefined" @click="goToCarousel(index)" />
          </template>
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

.featured-carousel {
  position: relative;
  min-height: 410px;
  margin-bottom: var(--space-2xl);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  outline: none;
}

.featured-carousel:focus-visible { box-shadow: 0 0 0 3px var(--color-primary-glow); }
.featured-carousel.hero-compact { min-height: 320px; }
.featured-carousel.hero-large { min-height: 500px; }
.carousel-background, .carousel-shade { position: absolute; inset: 0; }
.carousel-background { z-index: -2; background-position: center; background-size: cover; transform: scale(1.02); }
.carousel-shade { z-index: -1; background: linear-gradient(90deg, rgba(9, 8, 13, .97) 0%, rgba(9, 8, 13, .83) 42%, rgba(9, 8, 13, .35) 100%), linear-gradient(0deg, rgba(9, 8, 13, .72), transparent 56%); }
.has-zoom .carousel-background { animation: carousel-zoom var(--carousel-duration) ease-out infinite alternate; }
.carousel-bg-enter-active, .carousel-bg-leave-active { transition: opacity var(--carousel-animation-duration) ease; }
.carousel-bg-enter-from, .carousel-bg-leave-to { opacity: 0; }
.transition-slide .carousel-bg-enter-active, .transition-slide .carousel-bg-leave-active { transition: opacity var(--carousel-animation-duration) ease, transform var(--carousel-animation-duration) ease; }
.transition-slide .carousel-bg-enter-from { transform: translateX(4%) scale(1.03); }
.transition-slide .carousel-bg-leave-to { transform: translateX(-4%) scale(1.03); }
.transition-fade-zoom .carousel-bg-enter-active, .transition-fade-zoom .carousel-bg-leave-active { transition: opacity var(--carousel-animation-duration) ease, transform var(--carousel-animation-duration) ease; }
.transition-fade-zoom .carousel-bg-enter-from { transform: scale(1.08); }
.transition-fade-zoom .carousel-bg-leave-to { transform: scale(.98); }
.transition-none .carousel-bg-enter-active, .transition-none .carousel-bg-leave-active { transition: none; }
.motion-reduced .carousel-bg-enter-active, .motion-reduced .carousel-bg-leave-active { transition: none; }
.carousel-content { display: grid; grid-template-columns: minmax(140px, 210px) minmax(0, 580px); align-items: center; gap: var(--space-xl); min-height: inherit; padding: var(--space-2xl); }
.has-entrance .carousel-content { animation: carousel-copy-in var(--carousel-animation-duration) ease both; }
.transition-slide.has-entrance .carousel-content { animation-name: carousel-copy-slide; }
.transition-fade-zoom.has-entrance .carousel-content { animation-name: carousel-copy-zoom; }
.transition-none.has-entrance .carousel-content { animation: none; }
.motion-reduced .carousel-content, .motion-reduced .carousel-background { animation: none; }
.carousel-cover { position: relative; align-self: center; overflow: hidden; border-radius: var(--radius-md); box-shadow: var(--shadow-lg); }
.carousel-cover img { display: block; width: 100%; aspect-ratio: 2 / 3; object-fit: cover; }
.carousel-copy { max-width: 58ch; min-width: 0; overflow-wrap: anywhere; }
.align-center .carousel-content { grid-template-columns: minmax(0, 720px); justify-content: center; text-align: center; }
.align-center .carousel-copy { margin: 0 auto; }
.align-center .carousel-cover { display: none; }
.align-center .featured-meta, .align-center .featured-actions { justify-content: center; }
.featured-carousel .featured-kicker { margin-bottom: var(--space-sm); color: var(--color-primary-light); font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; }
.featured-carousel h2 { max-width: 18ch; color: #fff; font-family: var(--font-heading); font-size: clamp(2rem, 4vw, 4rem); line-height: .98; letter-spacing: var(--letter-spacing-tight); }
.align-center h2 { margin-inline: auto; }
.featured-carousel .featured-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-top: var(--space-md); color: rgba(255,255,255,.72); font-size: var(--font-size-xs); text-transform: capitalize; }
.featured-carousel .featured-description { display: -webkit-box; max-width: 56ch; margin: var(--space-md) 0 var(--space-lg); overflow: hidden; overflow-wrap: anywhere; color: rgba(255,255,255,.78); font-size: var(--font-size-sm); line-height: var(--line-height-relaxed); -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.featured-progress { margin-bottom: var(--space-md); color: var(--color-primary-light); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.featured-actions { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.featured-action { min-height: 40px; }
.carousel-feedback { display: block; margin-top: var(--space-sm); color: var(--color-primary-light); font-size: var(--font-size-xs); }
.carousel-nav { position: absolute; top: 50%; z-index: 2; display: grid; width: 38px; height: 38px; place-items: center; color: #fff; background: rgba(10, 9, 14, .62); border: 1px solid rgba(255,255,255,.18); border-radius: 50%; font-size: 28px; line-height: 1; transform: translateY(-50%); transition: background var(--transition-fast), border-color var(--transition-fast); }
.carousel-nav:hover { background: var(--color-primary); border-color: var(--color-primary); }
.carousel-nav-prev { left: var(--space-md); }
.carousel-nav-next { right: var(--space-md); }
.carousel-pagination { position: absolute; right: 0; bottom: var(--space-lg); left: 0; z-index: 2; display: flex; justify-content: center; gap: 6px; }
.pagination-dots button, .pagination-minimal button { width: 7px; height: 7px; padding: 0; background: rgba(255,255,255,.42); border: 0; border-radius: 50%; transition: width var(--transition-fast), background var(--transition-fast); }
.pagination-dots button.active { width: 24px; background: var(--color-primary); border-radius: var(--radius-full); }
.pagination-minimal button { width: 18px; height: 2px; border-radius: 0; }
.pagination-minimal button.active { background: #fff; }
.pagination-progress { width: min(180px, 40vw); height: 3px; overflow: hidden; background: rgba(255,255,255,.25); border-radius: var(--radius-full); }
.pagination-progress span { display: block; height: 100%; background: var(--color-primary); transition: width var(--transition-normal); }
@keyframes carousel-zoom { from { transform: scale(1.02); } to { transform: scale(1.09); } }
@keyframes carousel-copy-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes carousel-copy-slide { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
@keyframes carousel-copy-zoom { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }

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

.is-mobile .discover-section--rail :deep(.anime-grid) {
  display: flex;
  gap: var(--space-sm) !important;
  overflow-x: auto;
  padding-bottom: var(--space-xs);
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.is-mobile .discover-section--rail :deep(.anime-grid)::-webkit-scrollbar {
  display: none;
}

.is-mobile .discover-section--rail :deep(.grid-item) {
  flex: 0 0 clamp(132px, 37vw, 164px);
}

@media (max-width: 720px) {
  .discover-header {
    padding-top: var(--space-md);
  }

  .discover-title {
    display: none;
  }

  .discover-sub {
    margin-top: 0;
  }

  .featured-carousel,
  .featured-carousel.hero-large,
  .featured-carousel.hero-compact { min-height: clamp(390px, 64svh, 480px); }

  .carousel-content { grid-template-columns: clamp(72px, 23vw, 96px) minmax(0, 1fr); gap: var(--space-md); padding: var(--space-lg); align-content: start; min-width: 0; }
  .carousel-cover { align-self: start; }
  .featured-carousel h2 { font-size: clamp(1.55rem, 8vw, 2.4rem); }
  .featured-carousel .featured-description { margin-bottom: var(--space-md); -webkit-line-clamp: 4; }
  .carousel-nav { width: 32px; height: 32px; font-size: 22px; }
  .carousel-nav-prev { left: var(--space-xs); }
  .carousel-nav-next { right: var(--space-xs); }
  .carousel-pagination { bottom: var(--space-sm); }

  .quick-action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-action {
    min-height: 60px;
    padding: var(--space-sm) var(--space-md);
  }
}

@media (max-width: 480px) {
  .featured-carousel,
  .featured-carousel.hero-large,
  .featured-carousel.hero-compact { min-height: clamp(460px, calc(100svh - var(--mobile-header-height) - var(--nav-height) - 24px), 560px); }
  .carousel-content { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-sm); min-width: 0; padding: var(--space-md) var(--space-md) var(--space-4xl); }
  .carousel-cover { width: clamp(72px, 22vw, 92px); }
  .carousel-copy { align-self: stretch; width: 100%; max-width: none; }
  .featured-carousel h2 { max-width: 100%; font-size: clamp(1.35rem, 7vw, 2rem); }
  .featured-carousel .featured-description { margin: var(--space-sm) 0 var(--space-md); -webkit-line-clamp: 2; }
  .featured-actions { flex-direction: row; align-items: stretch; width: 100%; }
  .featured-action { flex: 1 1 0; min-width: 0; padding-inline: var(--space-sm); font-size: var(--font-size-xs); }
  .carousel-nav { top: auto; bottom: var(--space-xl); transform: none; }
  .carousel-pagination { bottom: var(--space-sm); }
}

@media (max-width: 380px) {
  .featured-actions { flex-direction: column; }

  .quick-action-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 520px) and (orientation: landscape) {
  .featured-carousel,
  .featured-carousel.hero-large,
  .featured-carousel.hero-compact { min-height: 340px; }

  .carousel-content { padding-block: var(--space-md); }
  .featured-carousel .featured-description { -webkit-line-clamp: 2; }
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
