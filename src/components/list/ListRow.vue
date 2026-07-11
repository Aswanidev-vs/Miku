<template>
  <div class="row" :class="density" @click="$emit('open', entry)">
    <img
      v-if="cover"
      class="thumb"
      :src="cover"
      :alt="title"
      loading="lazy"
      decoding="async"
    />
    <div class="meta">
      <h4 class="title">{{ title }}</h4>
      <div class="sub">
        <StatusChip :status="entry.status" />
        <span class="score">{{ entry.score ? entry.score.toFixed(0) : '—' }}</span>
      </div>
    </div>
    <ProgressStepper
      v-if="entry.media?.episodes"
      :value="entry.progress"
      :max="entry.media.episodes"
      @change="(v) => $emit('progress', { id: entry.mediaId, value: v })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ListEntry } from '@/data/repositories/listRepository'
import StatusChip from '@/components/media/StatusChip.vue'
import ProgressStepper from './ProgressStepper.vue'

const props = defineProps<{ entry: ListEntry; density?: 'comfortable' | 'compact' }>()
defineEmits<{ (e: 'open', v: ListEntry): void; (e: 'progress', v: { id: number; value: number }): void }>()

const title = computed(
  () => props.entry.media?.title.english ?? props.entry.media?.title.romaji ?? `Media #${props.entry.mediaId}`,
)
const cover = computed(() => props.entry.media?.coverImage.medium ?? null)
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px var(--app-gap);
  border-bottom: 1px solid var(--hairline);
}
.row.compact { padding: 7px var(--app-gap); grid-template-columns: 36px 1fr auto; }
.thumb { width: 44px; height: 60px; object-fit: cover; border-radius: 8px; }
.row.compact .thumb { width: 36px; height: 50px; }
.meta { min-width: 0; }
.title {
  font-family: var(--font-body); font-weight: 500; font-size: 14px;
  margin: 0 0 4px; color: var(--text-hi);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row.compact .title { font-size: 13px; }
.sub { display: flex; align-items: center; gap: 8px; }
.score { font-family: var(--font-mono); font-size: 12px; color: var(--text-mid); }
</style>
