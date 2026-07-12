<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'Discover', route: 'discover', icon: 'compass' },
  { name: 'Search', route: 'search', icon: 'search' },
  { name: 'My List', route: 'mylist', icon: 'list' },
  { name: 'Feed', route: 'feed', icon: 'rss' },
  { name: 'Settings', route: 'profile', icon: 'settings' },
]

const currentRoute = computed(() => route.name)

function navigateTo(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <nav class="bottom-nav safe-area-bottom">
    <button
      v-for="tab in tabs"
      :key="tab.route"
      class="nav-item"
      :class="{ active: currentRoute === tab.route }"
      @click="navigateTo(tab.route)"
      :aria-label="tab.name"
      :aria-current="currentRoute === tab.route ? 'page' : undefined"
    >
      <div class="nav-icon">
        <svg v-if="tab.icon === 'compass'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
        <svg v-else-if="tab.icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <svg v-else-if="tab.icon === 'list'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <svg v-else-if="tab.icon === 'rss'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 11a9 9 0 0 1 9 9"/>
          <path d="M4 4a16 16 0 0 1 16 16"/>
          <circle cx="5" cy="19" r="1"/>
        </svg>
        <svg v-else-if="tab.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </div>
      <span class="nav-label">{{ tab.name }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: rgba(12, 12, 16, 0.82);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 var(--space-xs);
  z-index: var(--z-sticky);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Desktop: floating centered pill */
.is-desktop .bottom-nav {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  bottom: var(--space-lg);
  width: min(640px, calc(100% - 32px));
  height: 62px;
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  padding: 0 var(--space-md);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 0;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
  flex: 1;
  color: var(--text-muted);
  position: relative;
  min-width: 0;
}

.nav-item:active {
  transform: scale(0.92);
  transition: transform 80ms var(--ease-out);
}

.nav-item.active {
  color: var(--color-primary);
}

.is-desktop .nav-item {
  flex-direction: row;
  gap: var(--space-sm);
  flex: 0 1 auto;
  padding: 10px 20px;
  border-radius: var(--radius-full);
}

.is-desktop .nav-item.active {
  background: var(--color-primary-subtle);
}

.nav-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon svg {
  width: 20px;
  height: 20px;
}

.nav-label {
  font-family: var(--font-body);
  font-size: 9px;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  letter-spacing: var(--letter-spacing-wide);
}

.is-desktop .nav-label {
  font-size: var(--font-size-xs);
}
</style>
