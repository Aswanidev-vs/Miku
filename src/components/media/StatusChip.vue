<template>
  <span class="chip" :class="tone">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MediaListStatus } from '@/types/anilist'

const props = defineProps<{ status: MediaListStatus | string }>()

const map: Record<string, { label: string; tone: string }> = {
  CURRENT: { label: 'Watching', tone: 'watching' },
  PLANNING: { label: 'Plan to', tone: 'planning' },
  COMPLETED: { label: 'Completed', tone: 'completed' },
  PAUSED: { label: 'Paused', tone: 'paused' },
  DROPPED: { label: 'Dropped', tone: 'dropped' },
  REPEATING: { label: 'Rewatching', tone: 'watching' },
}
const label = computed(() => map[props.status]?.label ?? props.status)
const tone = computed(() => map[props.status]?.tone ?? 'planning')
</script>

<style scoped>
.chip {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.watching { color: var(--accent); background: var(--accent-soft); }
.completed { color: #7fe3a0; background: rgba(127,227,160,.12); }
.planning { color: var(--text-mid); background: rgba(255,255,255,.05); }
.paused { color: #f0c674; background: rgba(240,198,116,.12); }
.dropped { color: #ff8a8a; background: rgba(255,138,138,.12); }
</style>
