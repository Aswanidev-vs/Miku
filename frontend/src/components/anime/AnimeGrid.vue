<script setup lang="ts">
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

const skeletonCount = 12
</script>

<template>
  <div class="anime-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }">
    <template v-if="loading">
      <div v-for="i in skeletonCount" :key="'skeleton-' + i" class="grid-item">
        <div class="skeleton-card">
          <SkeletonLoader height="100%" border-radius="var(--radius-lg)" />
        </div>
        <div class="skeleton-text">
          <SkeletonLoader height="14px" width="80%" />
          <SkeletonLoader height="10px" width="50%" />
        </div>
      </div>
    </template>
    <template v-else>
      <div v-for="item in items" :key="item.id" class="grid-item">
        <AnimeCard :anime="item" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.anime-grid {
  display: grid;
  width: 100%;
}

.grid-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.skeleton-card {
  aspect-ratio: 3 / 4;
  width: 100%;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: 0 var(--space-xs);
}
</style>
