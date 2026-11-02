<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

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
const user = computed(() => authStore.currentUser)

function openSearch() {
  router.push({ name: 'search' })
}

function openNotifications() {
  router.push({ name: 'feed' })
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
  <header class="desktop-header">
    <div class="desktop-header-title">
      <span class="desktop-header-kicker">Miku / Workspace</span>
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

      <button class="header-icon-button notification-button" type="button" aria-label="Open activity" @click="openNotifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      </button>

      <button class="header-profile" type="button" aria-label="Open profile" @click="openProfile">
        <img v-if="user" :src="user.avatar.medium" :alt="user.name" />
        <img v-else src="/logo.png" alt="" />
        <span v-if="user">{{ user.name }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
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
  align-items: baseline;
  gap: var(--space-sm);
}

.desktop-header-kicker {
  color: var(--text-muted);
  font-size: var(--font-size-2xs);
  letter-spacing: var(--letter-spacing-wide);
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

.header-icon-button,
.header-profile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.header-icon-button:hover,
.header-profile:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.header-icon-button {
  position: relative;
  width: 34px;
  color: var(--text-secondary);
}

.header-icon-button svg {
  width: 18px;
  height: 18px;
}

.header-profile {
  gap: var(--space-sm);
  padding: 0 var(--space-sm);
  color: var(--text-secondary);
}

.header-profile img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.header-profile span {
  max-width: 120px;
  overflow: hidden;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-profile svg {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .desktop-header {
    padding-inline: var(--space-md);
  }

  .desktop-header-kicker,
  .header-profile span,
  .header-profile svg,
  kbd {
    display: none;
  }

  .header-search {
    width: 220px;
  }
}
</style>
