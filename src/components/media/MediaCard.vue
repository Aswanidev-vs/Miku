<template>
  <article
    v-shared-element="`cover-${media.id}`"
    class="card"
    :class="density"
    @click="open"
  >
    <div class="cover" :style="bgStyle">
      <img
        v-if="media.coverImage.large"
        :src="media.coverImage.large"
        :alt="title"
        loading="lazy"
        decoding="async"
      />
      <div class="scrim" />
      <span class="badge"><ScoreRing :score="media.meanScore" :size="38" /></span>
      <span v-if="media.episodes" class="eps">{{ media.episodes }}<i>ep</i></span>
    </div>
    <h3 class="title">{{ title }}</h3>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Media } from '@/types/anilist'
import ScoreRing from './ScoreRing.vue'
import { vSharedElement } from '@/directives/vSharedElement'

const props = defineProps<{ media: Media; density?: 'comfortable' | 'compact' }>()
const router = useRouter()

const title = computed(
  () => props.media.title.english ?? props.media.title.romaji ?? `Media #${props.media.id}`,
)
const bgStyle = computed(() => ({
  background: `linear-gradient(160deg, var(--bg-elevated), color-mix(in srgb, var(--aurora-2) 18%, var(--bg-elevated)))`,
}))

function open() {
  router.push(`/media/${props.media.id}`)
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  border-radius: var(--app-radius);
  transition: transform var(--dur-base) var(--ease-spring);
}
.card:active { transform: scale(0.97); }
.cover {
  position: relative;
  aspect-ratio: 3 /4;
  border-radius: var(--app-radius);
  overflow: hidden;
  border: 1px solid var(--hairline);
}
.cover img {
  width: 100%; height: 100%; object-fit: cover;
  display: block;
}
.scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(12,10,15,.92) 4%, transparent 46%);
}
.badge { position: absolute; top: 8px; left: 8px; }
.eps {
  position: absolute; bottom: 8px; right: 8px;
  font-family: var(--font-mono);
  font-size: 12px; color: var(--text-hi);
  background: color-mix(in srgb, var(--bg-base) 70%, transparent);
  padding: 2px 7px; border-radius: 999px;
}
.eps i { color: var(--text-lo); font-style: normal; margin-left: 2px; }
.title {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 14px; line-height: 1.25;
  margin: 0; color: var(--text-hi);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.card.compact .title { font-size: 13px; }
</style>
