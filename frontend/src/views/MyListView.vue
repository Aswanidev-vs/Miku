<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { useAuthStore } from '../stores/auth'
import { usePlatform } from '../composables/usePlatform'
import { useSettings } from '../composables/useSettings'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import type { Media, ListStatus } from '../types'

const animeStore = useAnimeStore()
const authStore = useAuthStore()
const { gridColumns, screenSmall } = usePlatform()
const { settings } = useSettings()

type MyListTab = ListStatus | 'FAVOURITES'

const activeTab = ref<MyListTab>('CURRENT')
const favFilter = ref<'ALL' | 'ANIME' | 'MANGA'>('ALL')
const searchFilter = ref('')
const sortBy = ref<'updated' | 'title' | 'score' | 'progress'>('updated')

const sortOptions = computed(() => {
  if (activeTab.value === 'FAVOURITES') {
    return [{ value: 'title', label: 'Title' }]
  }
  return [
    { value: 'updated', label: 'Recently updated' },
    { value: 'title', label: 'Title' },
    { value: 'score', label: 'Score' },
    { value: 'progress', label: 'Progress' },
  ]
})

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.currentUser)
const loading = computed(() => animeStore.loading)

const listRows = computed(() => {
  if (activeTab.value === 'FAVOURITES') {
    const favAnime = animeStore.favourites?.anime || []
    const favManga = animeStore.favourites?.manga || []
    const media = favFilter.value === 'ANIME'
      ? favAnime
      : favFilter.value === 'MANGA'
        ? favManga
        : [...favAnime, ...favManga]
    return media.map((item) => ({ media: item, entry: undefined }))
  }
  const collection = animeStore.myList
  if (!collection?.lists) return []
  const list = collection.lists.find(l => l.status === activeTab.value)
  if (!list) return []
  return list.entries
    .filter(e => e.media)
    .map(e => ({ media: e.media as Media, entry: e }))
})

const listMedia = computed(() => {
  const needle = searchFilter.value.trim().toLowerCase()
  return [...listRows.value]
    .filter(({ media }) => {
      if (!needle) return true
      return [media.title.userPreferred, media.title.english, media.title.romaji, media.title.native]
        .filter(Boolean)
        .some(title => String(title).toLowerCase().includes(needle))
    })
    .sort((a, b) => {
      if (sortBy.value === 'title') return titleFor(a.media).localeCompare(titleFor(b.media))
      if (sortBy.value === 'score') return (b.entry?.score || 0) - (a.entry?.score || 0)
      if (sortBy.value === 'progress') return (b.entry?.progress || 0) - (a.entry?.progress || 0)
      return (b.entry?.updatedAt || 0) - (a.entry?.updatedAt || 0)
    })
    .map(({ media }) => media)
})

// Keep the selected card width stable when filtering down to a small result.
// Loading still uses the normal platform count.
const listGridColumns = computed(() => {
  const size = settings.value.myListCardSize
  const preferredColumns = size === 'small' && !screenSmall.value
    ? gridColumns.value + 1
    : size === 'large'
      ? Math.max(2, gridColumns.value - 1)
      : gridColumns.value
  return preferredColumns
})

function titleFor(media: Media) {
  return media.title.userPreferred || media.title.english || media.title.romaji || media.title.native || ''
}

const tabs: { label: string; value: MyListTab }[] = [
  { label: 'Watching', value: 'CURRENT' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Dropped', value: 'DROPPED' },
  { label: 'Favourites', value: 'FAVOURITES' },
]

async function refreshMyList() {
  clearGqlCache()
  if (isLoggedIn.value && user.value) {
    animeStore.startSync(user.value.id)
  }
}

const { pullingDown, refreshing, showRefreshBtn, manualRefresh, setupListeners, removeListeners } = usePullToRefresh(refreshMyList)
const viewRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (isLoggedIn.value && user.value) {
    animeStore.startSync(user.value.id)
  }
  if (viewRef.value) setupListeners(viewRef.value)
})

onUnmounted(() => {
  animeStore.stopSync()
  if (viewRef.value) removeListeners(viewRef.value)
})

watch(isLoggedIn, (val) => {
  if (val && user.value) {
    animeStore.startSync(user.value.id)
  } else {
    animeStore.stopSync()
  }
})

watch(activeTab, (tab) => {
  searchFilter.value = ''
  sortBy.value = tab === 'FAVOURITES' ? 'title' : 'updated'
  if (tab === 'FAVOURITES' && user.value) {
    animeStore.fetchFavourites(user.value.id)
  }
})
</script>

<template>
  <PullToRefresh :pulling-down="pullingDown" :refreshing="refreshing" :show-refresh-btn="showRefreshBtn" @refresh="manualRefresh">
    <div ref="viewRef" class="mylist-view">
      <header class="mylist-header safe-area-top">
        <h1 class="mylist-title">My List</h1>
        <p class="mylist-subtitle">Your anime & manga collection</p>
      </header>

    <!-- Not logged in -->
    <template v-if="!isLoggedIn">
      <div class="empty-state">
        <p class="empty-title">Sign in to see your list</p>
        <p class="empty-subtitle">Connect your AniList account to track your anime</p>
      </div>
    </template>

    <!-- Logged in -->
    <template v-else>
      <!-- Tabs -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="list-tools" role="search">
        <label class="list-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input v-model="searchFilter" type="search" placeholder="Filter this list" aria-label="Filter this list" />
        </label>
        <label class="sort-select">
          <span>Sort</span>
          <select v-model="sortBy" aria-label="Sort list">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <!-- Sub-filter for Favourites (All / Anime / Manga) -->
      <div
        v-if="activeTab === 'FAVOURITES' && ((animeStore.favourites?.anime?.length || 0) > 0 || (animeStore.favourites?.manga?.length || 0) > 0)"
        class="fav-filter-bar"
      >
        <button
          class="fav-filter-btn"
          :class="{ active: favFilter === 'ALL' }"
          @click="favFilter = 'ALL'"
        >
          All ({{ (animeStore.favourites?.anime?.length || 0) + (animeStore.favourites?.manga?.length || 0) }})
        </button>
        <button
          v-if="(animeStore.favourites?.anime?.length || 0) > 0"
          class="fav-filter-btn"
          :class="{ active: favFilter === 'ANIME' }"
          @click="favFilter = 'ANIME'"
        >
          Anime ({{ animeStore.favourites?.anime?.length || 0 }})
        </button>
        <button
          v-if="(animeStore.favourites?.manga?.length || 0) > 0"
          class="fav-filter-btn"
          :class="{ active: favFilter === 'MANGA' }"
          @click="favFilter = 'MANGA'"
        >
          Manga ({{ animeStore.favourites?.manga?.length || 0 }})
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Content -->
      <div v-else class="mylist-content">
        <template v-if="listMedia.length > 0">
          <AnimeGrid :items="listMedia" :columns="listGridColumns" />
        </template>
        <template v-else>
          <div class="empty-state">
            <p class="empty-title">{{ searchFilter ? 'No matches' : activeTab === 'FAVOURITES' ? 'No favorites yet' : 'No anime here' }}</p>
            <p class="empty-subtitle">{{ searchFilter ? 'Try another title or clear the filter' : activeTab === 'FAVOURITES' ? 'Favorite anime or manga to see them here' : 'Add anime to your list from the detail page' }}</p>
          </div>
        </template>
      </div>
    </template>
    </div>
  </PullToRefresh>
</template>

<style scoped>
.mylist-view {
  min-height: 100%;
}

.mylist-header {
  padding: var(--space-xl) 0 var(--space-lg);
}

.mylist-title {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.mylist-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.tab-bar {
  display: flex;
  gap: var(--space-xs);
  padding: 0;
  margin-bottom: var(--space-lg);
  overflow-x: auto;
}

.tab-btn {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-hover);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--bg-elevated);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
  border-color: var(--color-primary);
}

.fav-filter-bar {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.list-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin: calc(var(--space-sm) * -1) 0 var(--space-lg);
}

.list-search {
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--space-sm);
  min-width: 0;
  padding: 0 var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.list-search:focus-within { border-color: var(--color-primary); }
.list-search svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--text-muted); }
.list-search input { width: 100%; min-width: 0; height: 38px; color: var(--text-primary); background: transparent; border: 0; outline: 0; font: inherit; font-size: var(--font-size-sm); }
.list-search input::placeholder { color: var(--text-muted); }

.sort-select { display: flex; align-items: center; gap: var(--space-xs); flex-shrink: 0; color: var(--text-muted); font-size: var(--font-size-xs); }
.sort-select select { height: 38px; padding: 0 26px 0 var(--space-sm); color: var(--text-secondary); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font: inherit; }

.fav-filter-btn {
  padding: 4px var(--space-sm);
  border: 1px solid var(--bg-hover);
  background: var(--bg-surface);
  color: var(--text-muted);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.fav-filter-btn.active {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.mylist-content {
  padding: 0 0 var(--space-lg);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: var(--space-xl);
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

@media (max-width: 640px) {
  .mylist-header {
    padding-top: var(--space-lg);
  }

  .mylist-title {
    display: none;
  }

  .mylist-subtitle {
    margin-top: 0;
  }

  .tab-bar {
    margin-right: calc(-1 * var(--mobile-gutter));
    margin-left: calc(-1 * var(--mobile-gutter));
    padding-right: var(--mobile-gutter);
    padding-left: var(--mobile-gutter);
  }

  .list-tools {
    align-items: stretch;
    flex-direction: column;
    margin-top: 0;
  }

  .list-search,
  .sort-select select {
    min-height: 44px;
  }

  .sort-select { justify-content: space-between; }
  .sort-select select { flex: 1; }
}
</style>
