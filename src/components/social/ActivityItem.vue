<template>
  <article class="activity">
    <img v-if="item.user.avatar?.large" class="avatar" :src="item.user.avatar.large" :alt="item.user.name" />
    <div class="body">
      <p class="head"><b>{{ item.user.name }}</b><span class="time">{{ ago }}</span></p>
      <p class="text">{{ item.text }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Activity } from '@/types/anilist'

const props = defineProps<{ item: Activity }>()

const ago = computed(() => {
  const s = Math.floor((Date.now() / 1000 - props.item.createdAt))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
})
</script>

<style scoped>
.activity {
  display: flex; gap: 12px;
  padding: 12px var(--app-gap);
  border-bottom: 1px solid var(--hairline);
}
.avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex: none; }
.body { min-width: 0; flex: 1; }
.head { margin: 0 0 3px; font-size: 13px; color: var(--text-mid); }
.head b { color: var(--text-hi); font-weight: 600; }
.time { margin-left: 8px; color: var(--text-lo); font-family: var(--font-mono); font-size: 11px; }
.text { margin: 0; font-size: 14px; line-height: 1.4; color: var(--text-hi); }
</style>
