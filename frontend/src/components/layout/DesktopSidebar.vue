<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits<{
  'update:collapsed': [collapsed: boolean]
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)

const navItems = [
  { label: 'Discover', route: 'discover', icon: 'compass' },
  { label: 'Search', route: 'search', icon: 'search' },
  { label: 'My List', route: 'mylist', icon: 'list' },
  { label: 'Activity', route: 'feed', icon: 'activity' },
  { label: 'Profile', route: 'profile', icon: 'user' },
  { label: 'Statistics', route: 'profile', icon: 'chart' },
  { label: 'Settings', route: 'settings', icon: 'settings' },
]

const currentUser = computed(() => authStore.currentUser)

function isActive(routeName: string, label: string) {
  if (label === 'Statistics') return route.name === 'statistics'
  return route.name === routeName
}

function navigateTo(routeName: string, label: string) {
  if (label === 'Statistics') {
    router.push({ name: 'statistics' })
    return
  }
  router.push({ name: routeName })
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  emit('update:collapsed', collapsed.value)
}

function openAccount() {
  router.push({ name: 'profile' })
}
</script>

<template>
  <aside class="desktop-sidebar" :class="{ collapsed }" aria-label="Primary navigation">
    <div class="sidebar-brand-row">
      <button class="sidebar-brand" type="button" aria-label="Open Discover" @click="router.push({ name: 'discover' })">
        <img src="/logo.png" alt="" class="sidebar-logo" />
        <span v-if="!collapsed" class="sidebar-brand-copy">
          <strong>Miku</strong>
          <span>AniList client</span>
        </span>
      </button>
      <button
        class="sidebar-collapse"
        type="button"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path v-if="!collapsed" d="m15 18-6-6 6-6" />
          <path v-else d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.label"
        class="sidebar-nav-item"
        :class="{ active: isActive(item.route, item.label) }"
        type="button"
        :aria-label="item.label"
        :aria-current="isActive(item.route, item.label) ? 'page' : undefined"
        :title="collapsed ? item.label : undefined"
        @click="navigateTo(item.route, item.label)"
      >
        <span class="sidebar-nav-icon" aria-hidden="true">
          <svg v-if="item.icon === 'compass'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
          </svg>
          <svg v-else-if="item.icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <svg v-else-if="item.icon === 'list'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" stroke-width="2.6" />
          </svg>
          <svg v-else-if="item.icon === 'activity'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 11a8 8 0 0 1 8 8" />
            <path d="M4 5a14 14 0 0 1 14 14" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <svg v-else-if="item.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
          <svg v-else-if="item.icon === 'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19V5M4 19h16" />
            <path d="m7 15 3-4 3 2 5-7" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </span>
        <span v-if="!collapsed" class="sidebar-nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <button class="sidebar-account" type="button" :title="collapsed ? 'Open account' : undefined" @click="openAccount">
      <img v-if="currentUser" :src="currentUser.avatar.medium" :alt="currentUser.name" class="sidebar-avatar" />
      <img v-else src="/logo.png" alt="" class="sidebar-avatar sidebar-avatar-placeholder" />
      <span v-if="!collapsed" class="sidebar-account-copy">
        <strong>{{ currentUser?.name ?? 'Not signed in' }}</strong>
        <span>
          <i :class="{ connected: currentUser }" aria-hidden="true" />
          {{ currentUser ? 'Connected to AniList' : 'Sign in to sync' }}
        </span>
      </span>
      <svg v-if="!collapsed" class="sidebar-account-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.desktop-sidebar {
  position: fixed;
  z-index: var(--z-sticky);
  top: var(--header-height);
  bottom: 0;
  left: 0;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  background: var(--bg-deep);
  border-right: 1px solid var(--border-subtle);
  transition: width var(--transition-normal);
}

.desktop-sidebar.collapsed {
  width: var(--sidebar-rail-width);
  padding-inline: var(--space-sm);
}

.sidebar-brand-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 44px;
  margin-bottom: var(--space-xl);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  flex: 1;
  text-align: left;
}

.sidebar-logo {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.sidebar-brand-copy,
.sidebar-account-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-brand-copy strong {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  line-height: 1;
}

.sidebar-brand-copy span {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: var(--font-size-2xs);
}

.sidebar-collapse,
.sidebar-nav-item,
.sidebar-account {
  transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.sidebar-collapse {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.sidebar-collapse:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.sidebar-collapse svg {
  width: 16px;
  height: 16px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  min-height: 42px;
  padding: 0 var(--space-md);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-align: left;
}

.collapsed .sidebar-nav-item {
  justify-content: center;
  padding-inline: 0;
}

.sidebar-nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.sidebar-nav-item.active {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
}

.sidebar-nav-icon {
  display: grid;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  place-items: center;
}

.sidebar-nav-icon svg {
  width: 18px;
  height: 18px;
}

.sidebar-nav-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.sidebar-account {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: 56px;
  margin-top: auto;
  padding: var(--space-sm);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  text-align: left;
}

.sidebar-account:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.collapsed .sidebar-account {
  justify-content: center;
  padding-inline: 0;
}

.sidebar-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--border-default);
}

.sidebar-avatar-placeholder {
  border-radius: var(--radius-sm);
}

.sidebar-account-copy {
  flex: 1;
  overflow: hidden;
}

.sidebar-account-copy strong,
.sidebar-account-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-account-copy strong {
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.sidebar-account-copy span {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: var(--text-muted);
  font-size: var(--font-size-2xs);
}

.sidebar-account-copy i {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--text-muted);
}

.sidebar-account-copy i.connected {
  background: var(--status-watching);
}

.sidebar-account-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>
