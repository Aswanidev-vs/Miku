<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useAnimeStore } from '../stores/anime'
import { useAuthStore } from '../stores/auth'
import { usePlatform } from '../composables/usePlatform'
import { usePullToRefresh } from '../composables/usePullToRefresh'
import { clearGqlCache } from '../api/graphql'
import AnimeGrid from '../components/anime/AnimeGrid.vue'
import PullToRefresh from '../components/common/PullToRefresh.vue'
import type { Media, ListStatus } from '../types'

const animeStore = useAnimeStore()
const authStore = useAuthStore()
const { gridColumns } = usePlatform()

const activeTab = ref<ListStatus>('CURRENT')

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.currentUser)
const loading = computed(() => animeStore.loading)

const listMedia = computed(() => {
  const collection = animeStore.myList
  if (!collection?.lists) return []
  const list = collection.lists.find(l => l.status === activeTab.value)
  if (!list) return []
  return list.entries
    .filter(e => e.media)
    .map(e => e.media as Media)
})

const tabs: { label: string; value: ListStatus }[] = [
  { label: 'Watching', value: 'CURRENT' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Dropped', value: 'DROPPED' },
]

async function refreshMyList() {
  clearGqlCache()
  if (isLoggedIn.value && user.value) {
    animeStore.startSync(user.value.id)
  }
}

const { containerRef, pullingDown, refreshing } = usePullToRefresh(refreshMyList)

onMounted(() => {
  if (isLoggedIn.value && user.value) {
    animeStore.startSync(user.value.id)
  }
})

onUnmounted(() => {
  animeStore.stopSync()
})

watch(isLoggedIn, (val) => {
  if (val && user.value) {
    animeStore.startSync(user.value.id)
  } else {
    animeStore.stopSync()
  }
})
</script>

<template>
  <PullToRefresh :pulling-down="pullingDown" :refreshing="refreshing">
    <div ref="containerRef" class="mylist-view">
      <header class="mylist-header safe-area-top">
        <h1 class="mylist-title">My List</h1>
        <p class="mylist-subtitle">Your anime collection</p>
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

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Content -->
      <div v-else class="mylist-content">
        <template v-if="listMedia.length > 0">
          <AnimeGrid :items="listMedia" :columns="gridColumns" />
        </template>
        <template v-else>
          <div class="empty-state">
            <p class="empty-title">No anime here</p>
            <p class="empty-subtitle">Add anime to your list from the detail page</p>
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
</style>
