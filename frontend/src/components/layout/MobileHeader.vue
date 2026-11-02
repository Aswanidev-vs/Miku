<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores'
import UpdateNotification from './UpdateNotification.vue'
import SearchDialog from './SearchDialog.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const searchOpen = ref(false)
const currentUser = computed(() => authStore.currentUser)
const profileAvatar = computed(() => currentUser.value?.avatar?.medium || currentUser.value?.avatar?.large || '')

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

function openProfile() {
  router.push({ name: 'profile' })
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
  <header class="mobile-header">
    <button class="mobile-brand" type="button" aria-label="Open Discover" @click="router.push({ name: 'discover' })">
      <img src="/logo.png" alt="Miku" />
    </button>

    <div class="mobile-header-title">
      <span>Miku</span>
      <h1>{{ pageTitle }}</h1>
    </div>

    <div class="mobile-header-actions">
      <UpdateNotification :inline="true" />
      <button class="mobile-profile" type="button" aria-label="Open profile" @click="openProfile">
        <img v-if="profileAvatar" :src="profileAvatar" :alt="currentUser?.name || 'Profile'" />
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.5 3.1-5.5 7-5.5s6.2 2 7 5.5" />
        </svg>
      </button>
    </div>

    <SearchDialog v-if="searchOpen" @close="closeSearch" @submit="submitSearch" />
  </header>
</template>

<style scoped>
.mobile-header {
  position: fixed;
  z-index: calc(var(--z-sticky) + 1);
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: calc(var(--mobile-header-height) + var(--safe-area-top));
  padding: var(--safe-area-top) max(var(--mobile-gutter), env(safe-area-inset-right, 0px)) 0 max(var(--mobile-gutter), env(safe-area-inset-left, 0px));
  background: transparent;
}

.mobile-brand,
.mobile-profile {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.mobile-brand:hover,
.mobile-profile:hover {
  background: var(--bg-hover);
}

.mobile-brand img {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  object-fit: cover;
}

.mobile-header-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.mobile-header-title span {
  color: var(--color-primary);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-wide);
  line-height: 1;
  text-transform: uppercase;
}

.mobile-header-title h1 {
  margin-top: 4px;
  overflow: hidden;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.mobile-profile {
  color: var(--text-secondary);
}

.mobile-profile img,
.mobile-profile svg {
  width: 28px;
  height: 28px;
}

.mobile-profile img {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-full);
  object-fit: cover;
}

@media (max-width: 360px) {
  .mobile-header {
    gap: 2px;
  }

  .mobile-brand,
  .mobile-profile {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }

  .mobile-brand img {
    width: 29px;
    height: 29px;
  }
}
</style>
