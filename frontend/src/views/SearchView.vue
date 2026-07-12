<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { useMangaStore } from '../stores/manga'
import { gqlQuery } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import type { MediaType } from '../types'

const animeStore = useAnimeStore()
const mangaStore = useMangaStore()

const query = ref('')
const activeType = ref<MediaType>('ANIME')
const hasSearched = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const currentStore = computed(() =>
  activeType.value === 'ANIME' ? animeStore : mangaStore
)

const results = computed(() => currentStore.value.searchResults)
const loading = computed(() => currentStore.value.loading)
const pageInfo = computed(() => currentStore.value.pageInfo)
const hasMore = computed(() => pageInfo.value?.hasNextPage ?? false)

function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    hasSearched.value = false
    animeStore.clearSearch()
    mangaStore.clearSearch()
    return
  }
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 400)
}

async function performSearch() {
  hasSearched.value = true
  await currentStore.value.search(query.value.trim())
}

function switchType(type: MediaType) {
  if (activeType.value === type) return
  activeType.value = type
  if (hasSearched.value && query.value.trim()) {
    performSearch()
  }
}

async function loadMore() {
  if (!pageInfo.value || loading.value) return
  const nextPage = pageInfo.value.currentPage + 1
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
    { search: query.value.trim(), page: nextPage, perPage: 20 }
  )
  if (response?.data?.Page) {
    store.searchResults = [...store.searchResults, ...response.data.Page.media]
    store.pageInfo = response.data.Page.pageInfo
  }
}

function clearSearch() {
  query.value = ''
  hasSearched.value = false
  animeStore.clearSearch()
  mangaStore.clearSearch()
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
          placeholder="Search anime or manga..."
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
      </div>
    </div>

    <div class="search-results">
      <template v-if="hasSearched">
        <template v-if="loading && results.length === 0">
          <AnimeGrid :items="[]" :loading="true" :columns="3" />
        </template>
        <template v-else-if="results.length > 0">
          <AnimeGrid :items="results" :columns="3" />
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
        <template v-else>
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
      <template v-else>
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p class="empty-title">Search {{ activeType === 'ANIME' ? 'Anime' : 'Manga' }}</p>
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
  font-family: var(--font-family);
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
  gap: var(--space-sm);
}

.filter-btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-hover);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background: var(--bg-elevated);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow-primary);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-lg) var(--space-lg);
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
  font-family: var(--font-family);
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
