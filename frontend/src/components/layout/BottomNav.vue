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
  { name: 'Profile', route: 'profile', icon: 'user' },
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
        <svg v-if="tab.icon === 'compass'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
        <svg v-else-if="tab.icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <svg v-else-if="tab.icon === 'list'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <svg v-else-if="tab.icon === 'rss'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 11a9 9 0 0 1 9 9"/>
          <path d="M4 4a16 16 0 0 1 16 16"/>
          <circle cx="5" cy="19" r="1"/>
        </svg>
        <svg v-else-if="tab.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
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
  background: rgba(10, 10, 15, 0.95);
  border-top: 0.5px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 var(--space-xs);
  z-index: 100;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 0;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  flex: 1;
  color: var(--text-muted);
  position: relative;
  min-width: 0;
}

.nav-item:active {
  transform: scale(0.9);
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon svg {
  width: 22px;
  height: 22px;
}

.nav-item.active .nav-icon svg {
  stroke: var(--color-primary);
  filter: drop-shadow(0 0 6px var(--color-primary-glow));
}

.nav-label {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  line-height: 1;
  letter-spacing: 0.01em;
}
</style>
