<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Media } from '../../types'
import AnimeCard from './AnimeCard.vue'
import SkeletonLoader from '../common/SkeletonLoader.vue'

const props = withDefaults(
  defineProps<{
    items: Media[]
    loading?: boolean
    columns?: number
    gap?: string
  }>(),
  {
    loading: false,
    columns: 3,
    gap: 'var(--space-md)',
  }
)

const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

const ITEM_HEIGHT = 260
const BUFFER = 2

const visibleRange = computed(() => {
  if (!containerHeight.value) return { start: 0, end: props.items.length }
  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER)
  const visibleCount = Math.ceil(containerHeight.value / ITEM_HEIGHT) * props.columns + BUFFER * props.columns
  const end = Math.min(props.items.length, start + visibleCount)
  return { start, end }
})

const totalHeight = computed(() => {
  const rows = Math.ceil(props.items.length / props.columns)
  return rows * ITEM_HEIGHT
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, i) => ({
    item,
    index: start + i,
  }))
})

const offsetY = computed(() => {
  const row = Math.floor(visibleRange.value.start / props.columns)
  return row * ITEM_HEIGHT
})

function onScroll() {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop
  }
}

function onResize() {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(scrollContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const skeletonCount = computed(() => props.columns * 4)
</script>

<template>
  <div ref="scrollContainer" class="anime-grid-scroll" @scroll="onScroll">
    <div class="anime-grid-spacer" :style="{ height: totalHeight + 'px' }">
      <div
        class="anime-grid"
        :style="{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
          transform: `translateY(${offsetY}px)`,
        }"
      >
        <template v-if="loading">
          <div v-for="i in skeletonCount" :key="'skeleton-' + i" class="grid-item">
            <div class="skeleton-card">
              <SkeletonLoader height="180px" border-radius="var(--radius-lg)" />
              <div class="skeleton-text">
                <SkeletonLoader height="14px" width="80%" />
                <SkeletonLoader height="10px" width="50%" />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="{ item, index } in visibleItems"
            :key="item.id"
            class="grid-item"
            :style="{ gridRow: Math.floor(index / columns) + 1 }"
          >
            <AnimeCard :anime="item" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anime-grid-scroll {
  overflow-y: auto;
  height: 100%;
}

.anime-grid-spacer {
  position: relative;
}

.anime-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
}

.grid-item {
  min-width: 0;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-xs);
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: 0 var(--space-xs);
}
</style>
