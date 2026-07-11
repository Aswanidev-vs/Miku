<template>
  <div class="grid" :class="density">
    <MediaCard
      v-for="m in media"
      :key="m.id"
      :media="m"
      :density="density"
    />
  </div>
</template>

<script setup lang="ts">
import type { Media } from '@/types/anilist'
import MediaCard from './MediaCard.vue'

defineProps<{ media: Media[]; density?: 'comfortable' | 'compact' }>()
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--app-gap);
  padding: var(--app-gap);
}
.grid.compact { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
</style>
