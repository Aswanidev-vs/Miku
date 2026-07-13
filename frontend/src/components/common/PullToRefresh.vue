<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pullingDown: number
  refreshing: boolean
  showRefreshBtn?: boolean
  threshold?: number
}>()

const emit = defineEmits<{
  refresh: []
}>()

const indicatorOpacity = computed(() => {
  if (props.refreshing) return 1
  return Math.min(props.pullingDown / (props.threshold || 80), 1)
})

const indicatorTranslate = computed(() => {
  if (props.refreshing) return 0
  return Math.min(props.pullingDown - 30, 40)
})
</script>

<template>
  <div class="ptr-wrapper">
    <!-- Mobile: pull-down indicator -->
    <div
      class="ptr-indicator"
      :style="{
        opacity: indicatorOpacity,
        transform: `translateY(${indicatorTranslate}px)`,
      }"
    >
      <div class="ptr-spinner" :class="{ refreshing }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        </svg>
      </div>
      <span class="ptr-text">{{ refreshing ? 'Refreshing...' : 'Pull to refresh' }}</span>
    </div>

    <!-- Desktop: floating refresh button (visible when at top) -->
    <button
      v-if="showRefreshBtn && !refreshing"
      class="ptr-desktop-btn"
      @click="emit('refresh')"
      aria-label="Refresh"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    </button>

    <slot />
  </div>
</template>

<style scoped>
.ptr-wrapper {
  position: relative;
  min-height: 100%;
}

.ptr-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}

.ptr-spinner {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
  transition: transform 150ms ease;
}

.ptr-spinner svg {
  width: 100%;
  height: 100%;
}

.ptr-spinner.refreshing svg {
  animation: ptr-spin 0.8s linear infinite;
}

@keyframes ptr-spin {
  to { transform: rotate(360deg); }
}

.ptr-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-family: var(--font-body);
}

/* Desktop refresh button — top-right corner */
.ptr-desktop-btn {
  display: none;
}

.is-desktop .ptr-desktop-btn {
  display: flex;
  position: fixed;
  top: var(--space-lg);
  right: var(--space-2xl);
  z-index: var(--z-dropdown);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.is-desktop .ptr-desktop-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: rotate(90deg);
}

.is-desktop .ptr-desktop-btn svg {
  width: 18px;
  height: 18px;
}
</style>
