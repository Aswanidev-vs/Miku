<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pullingDown: number
  refreshing: boolean
  threshold?: number
}>()

const indicatorOpacity = computed(() => {
  if (props.refreshing) return 1
  return Math.min(props.pullingDown / (props.threshold || 80), 1)
})

const indicatorTranslate = computed(() => {
  if (props.refreshing) return 0
  return Math.min(props.pullingDown - 30, 40)
})

const spinnerRotation = computed(() => {
  if (props.refreshing) return 'auto'
  return `${(props.pullingDown / (props.threshold || 80)) * 360}deg`
})
</script>

<template>
  <div class="ptr-wrapper">
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
</style>
