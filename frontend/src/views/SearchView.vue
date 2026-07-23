<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAnimeStore } from '../stores/anime'
import { useMangaStore } from '../stores/manga'
import { usePlatform } from '../composables/usePlatform'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import type { MediaType, SearchType, CharacterSearchResult, StaffSearchResult } from '../types'

const router = useRouter()
const animeStore = useAnimeStore()
const mangaStore = useMangaStore()
const { gridColumns } = usePlatform()

const query = ref('')
const activeType = ref<SearchType>('ANIME')
const hasSearched = ref(false)
const characterResults = ref<CharacterSearchResult[]>([])
const staffResults = ref<StaffSearchResult[]>([])
const characterPageInfo = ref<any>(null)
const staffPageInfo = ref<any>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const isMediaSearch = computed(() => activeType.value === 'ANIME' || activeType.value === 'MANGA')

const currentStore = computed(() =>
  activeType.value === 'ANIME' ? animeStore : mangaStore
)

const results = computed(() => {
  if (activeType.value === 'CHARACTER') return characterResults.value
  if (activeType.value === 'STAFF') return staffResults.value
  return currentStore.value.searchResults
})

const loading = computed(() => currentStore.value.loading)
const pageInfo = computed(() => {
  if (activeType.value === 'CHARACTER') return characterPageInfo.value
  if (activeType.value === 'STAFF') return staffPageInfo.value
  return currentStore.value.pageInfo
})
const hasMore = computed(() => pageInfo.value?.hasNextPage ?? false)

const CHARACTER_SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    characters(search: $search, sort: SEARCH_MATCH) {
      id
      name { full native }
      image { medium large }
      description(asHtml: false)
      gender
      age
    }
    pageInfo { total perPage currentPage lastPage hasNextPage }
  }
}
`

const STAFF_SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    staff(search: $search, sort: SEARCH_MATCH) {
      id
      name { full native }
      image { medium large }
      primaryOccupations
      gender
      age
      homeTown
    }
    pageInfo { total perPage currentPage lastPage hasNextPage }
  }
}
`

function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    hasSearched.value = false
    animeStore.clearSearch()
    mangaStore.clearSearch()
    characterResults.value = []
    staffResults.value = []
    return
  }
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 400)
}

async function performSearch() {
  hasSearched.value = true
  const q = query.value.trim()
  if (!q) return

  if (activeType.value === 'CHARACTER') {
    await searchCharacters(q)
  } else if (activeType.value === 'STAFF') {
    await searchStaff(q)
  } else {
    await currentStore.value.search(q)
  }
}

async function searchCharacters(q: string, page = 1) {
  currentStore.value.loading = true
  try {
    const response = await gqlQuery(CHARACTER_SEARCH_QUERY, { search: q, page, perPage: 20 })
    if (response?.data?.Page) {
      if (page === 1) {
        characterResults.value = response.data.Page.characters
      } else {
        characterResults.value = [...characterResults.value, ...response.data.Page.characters]
      }
      characterPageInfo.value = response.data.Page.pageInfo
    }
  } catch (e) {
    console.error('Character search failed:', e)
  } finally {
    currentStore.value.loading = false
  }
}

async function searchStaff(q: string, page = 1) {
  currentStore.value.loading = true
  try {
    const response = await gqlQuery(STAFF_SEARCH_QUERY, { search: q, page, perPage: 20 })
    if (response?.data?.Page) {
      if (page === 1) {
        staffResults.value = response.data.Page.staff
      } else {
        staffResults.value = [...staffResults.value, ...response.data.Page.staff]
      }
      staffPageInfo.value = response.data.Page.pageInfo
    }
  } catch (e) {
    console.error('Staff search failed:', e)
  } finally {
    currentStore.value.loading = false
  }
}

function switchType(type: SearchType) {
  if (activeType.value === type) return
  activeType.value = type
  if (hasSearched.value && query.value.trim()) {
    performSearch()
  }
}

async function loadMore() {
  if (!pageInfo.value || loading.value) return
  const nextPage = pageInfo.value.currentPage + 1
  const q = query.value.trim()

  if (activeType.value === 'CHARACTER') {
    await searchCharacters(q, nextPage)
  } else if (activeType.value === 'STAFF') {
    await searchStaff(q, nextPage)
  } else {
    const store = currentStore.value
    const response = await gqlQuery(
      activeType.value === 'ANIME'
        ? `query ($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
              media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                id
                title { romaji english native userPreferred }
                coverImage { large medium color }
                format status episodes averageScore genres
              }
              pageInfo { total perPage currentPage lastPage hasNextPage }
            }
          }`
        : `query ($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
              media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
                id
                title { romaji english native userPreferred }
                coverImage { large medium color }
                format status chapters volumes averageScore genres
              }
              pageInfo { total perPage currentPage lastPage hasNextPage }
            }
          }`,
      { search: q, page: nextPage, perPage: 20 }
    )
    if (response?.data?.Page) {
      store.searchResults = [...store.searchResults, ...response.data.Page.media]
      store.pageInfo = response.data.Page.pageInfo
    }
  }
}

function goToCharacter(id: number) {
  router.push({ name: 'character', params: { id } })
}

function goToStaff(id: number) {
  router.push({ name: 'voice-actor', params: { id } })
}

function clearSearch() {
  query.value = ''
  hasSearched.value = false
  animeStore.clearSearch()
  mangaStore.clearSearch()
  characterResults.value = []
  staffResults.value = []
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="search-view">
    <div class="search-header">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="search-input"
          :placeholder="activeType === 'CHARACTER' ? 'Search character name...' : activeType === 'STAFF' ? 'Search voice actor / staff...' : 'Search anime or manga...'"
          @input="debouncedSearch"
          @keydown.enter="performSearch"
        />
        <button
          v-if="query"
          class="clear-btn"
          @click="clearSearch"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="type-filter">
        <button
          class="filter-btn"
          :class="{ active: activeType === 'ANIME' }"
          @click="switchType('ANIME')"
        >
          Anime
        </button>
        <button
          class="filter-btn"
          :class="{ active: activeType === 'MANGA' }"
          @click="switchType('MANGA')"
        >
          Manga
        </button>
        <button
          class="filter-btn"
          :class="{ active: activeType === 'CHARACTER' }"
          @click="switchType('CHARACTER')"
        >
          Characters
        </button>
        <button
          class="filter-btn"
          :class="{ active: activeType === 'STAFF' }"
          @click="switchType('STAFF')"
        >
          Staff
        </button>
      </div>
    </div>

    <div class="search-results">
      <template v-if="hasSearched">
        <!-- Loading -->
        <template v-if="loading && results.length === 0">
          <div class="loading-grid">
            <div v-for="i in 12" :key="i" class="placeholder-card">
              <div class="placeholder-img skeleton"></div>
              <div class="placeholder-text skeleton"></div>
            </div>
          </div>
        </template>

        <!-- Media Results (Anime/Manga) -->
        <template v-else-if="isMediaSearch && currentStore.searchResults.length > 0">
          <AnimeGrid :items="currentStore.searchResults" :columns="gridColumns" />
          <button
            v-if="hasMore && !loading"
            class="load-more-btn"
            @click="loadMore"
          >
            Load More
          </button>
          <div v-if="loading && results.length > 0" class="loading-more">
            Loading...
          </div>
        </template>

        <!-- Character Results -->
        <template v-else-if="activeType === 'CHARACTER' && characterResults.length > 0">
          <div class="person-list">
            <div
              v-for="char in characterResults"
              :key="char.id"
              class="person-card"
              @click="goToCharacter(char.id)"
            >
              <img
                v-if="char.image"
                :src="char.image.large || char.image.medium"
                :alt="char.name.full"
                class="person-img"
              />
              <div class="person-info">
                <span class="person-name">{{ char.name.full }}</span>
                <span v-if="char.name.native" class="person-native">{{ char.name.native }}</span>
                <span v-if="char.gender || char.age" class="person-meta">
                  {{ [char.gender, char.age].filter(Boolean).join(' · ') }}
                </span>
              </div>
            </div>
          </div>
          <button
            v-if="hasMore && !loading"
            class="load-more-btn"
            @click="loadMore"
          >
            Load More
          </button>
        </template>

        <!-- Staff Results -->
        <template v-else-if="activeType === 'STAFF' && staffResults.length > 0">
          <div class="person-list">
            <div
              v-for="staff in staffResults"
              :key="staff.id"
              class="person-card"
              @click="goToStaff(staff.id)"
            >
              <img
                v-if="staff.image"
                :src="staff.image.large || staff.image.medium"
                :alt="staff.name.full"
                class="person-img"
              />
              <div class="person-info">
                <span class="person-name">{{ staff.name.full }}</span>
                <span v-if="staff.name.native" class="person-native">{{ staff.name.native }}</span>
                <span v-if="staff.primaryOccupations?.length" class="person-meta">
                  {{ staff.primaryOccupations.join(', ') }}
                </span>
              </div>
            </div>
          </div>
          <button
            v-if="hasMore && !loading"
            class="load-more-btn"
            @click="loadMore"
          >
            Load More
          </button>
        </template>

        <!-- No Results -->
        <template v-else-if="!loading">
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p class="empty-title">No results found</p>
            <p class="empty-subtitle">Try a different search term</p>
          </div>
        </template>
      </template>

      <!-- Initial State -->
      <template v-else>
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p class="empty-title">
            Search {{ activeType === 'ANIME' ? 'Anime' : activeType === 'MANGA' ? 'Manga' : activeType === 'CHARACTER' ? 'Characters' : 'Staff' }}
          </p>
          <p class="empty-subtitle">Type to start searching</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-header {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-hover);
  transition: border-color var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-glow);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-right: var(--space-sm);
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-family: var(--font-body);
  padding: var(--space-xs) 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.clear-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.type-filter {
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
  padding-bottom: var(--space-2xs);
}

.filter-btn {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-btn:hover {
  background: var(--bg-elevated);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
  border-color: var(--color-primary);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-lg) var(--space-lg);
}

/* Person list (characters/staff) */
.person-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.person-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.person-card:hover {
  background: var(--bg-hover);
}

.person-img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
}

.person-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.person-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-native {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.person-meta {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Loading grid */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.placeholder-img {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: var(--radius-md);
}

.placeholder-text {
  height: 14px;
  border-radius: var(--radius-sm);
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-hover) 50%, var(--bg-surface) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl) var(--space-lg);
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-muted);
  opacity: 0.5;
  margin-bottom: var(--space-lg);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.empty-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.load-more-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  margin-top: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-hover);
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
  color: var(--text-primary);
}

.loading-more {
  text-align: center;
  padding: var(--space-lg);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
</style>
