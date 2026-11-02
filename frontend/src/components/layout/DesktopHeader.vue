<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UpdateNotification from './UpdateNotification.vue'
import SearchDialog from './SearchDialog.vue'

const route = useRoute()
const router = useRouter()
const searchOpen = ref(false)

const pageTitles: Record<string, string> = {
  discover: 'Discover',
  search: 'Search',
  mylist: 'My List',
  feed: 'Activity',
  profile: 'Profile',
  statistics: 'Statistics',
  settings: 'Settings',
}

const pageTitle = computed(() => pageTitles[String(route.name)] ?? 'Miku')

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
}

function submitSearch(query: string) {
  searchOpen.value = false
  router.push({ name: 'search', query: { search: query } })
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="desktop-header">
    <div class="desktop-header-title">
      <button class="header-brand" type="button" aria-label="Open Discover" @click="router.push({ name: 'discover' })">
        <img src="/logo.png" alt="Miku" />
      </button>
      <h1>{{ pageTitle }}</h1>
    </div>

    <div class="desktop-header-actions">
      <button class="header-search" type="button" aria-label="Open search" @click="openSearch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span>Search anime, manga, people</span>
        <kbd>Ctrl K</kbd>
      </button>

      <UpdateNotification :inline="true" />
    </div>

    <SearchDialog v-if="searchOpen" @close="closeSearch" @submit="submitSearch" />
  </header>
</template>

<style scoped>
.desktop-header {
  position: fixed;
  z-index: calc(var(--z-sticky) + 1);
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--space-xl);
  background: var(--bg-deep);
  border-bottom: 1px solid var(--border-subtle);
}

.desktop-header-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-brand {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
}

.header-brand:hover {
  background: var(--bg-hover);
}

.header-brand img {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  object-fit: cover;
}

.desktop-header h1 {
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0;
}

.desktop-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 34px;
}

.header-search {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: min(340px, 30vw);
  min-height: 34px;
  padding: 0 var(--space-sm);
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  text-align: left;
  transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);
}

.header-search:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
  background: var(--bg-hover);
}

.header-search svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.header-search span {
  flex: 1;
  overflow: hidden;
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

kbd {
  padding: 2px 5px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 10px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .desktop-header {
    padding-inline: var(--space-md);
  }

  kbd {
    display: none;
  }

  .header-search {
    width: 220px;
  }
}
</style>
