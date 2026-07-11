<template>
  <ion-modal
    :is-open="open"
    :breakpoint="[0, 0.6, 0.9]"
    :initial-breakpoint="0.6"
    @did-dismiss="$emit('close')"
  >
    <ion-content class="sheet">
      <div class="grip" />
      <header class="head">
        <img v-if="cover" :src="cover" class="mini" :alt="title" />
        <div>
          <h3>{{ title }}</h3>
          <StatusChip :status="status" />
        </div>
      </header>

      <section class="field">
        <label>Progress</label>
        <ProgressStepper
          :value="progress"
          :max="max"
          @change="(v) => (progress = v)"
        />
      </section>

      <section class="field">
        <label>Score</label>
        <div class="score-row">
          <input v-model.number="score" class="score-input" type="range" min="0" max="100" step="1" />
          <span class="score-val">{{ score }}</span>
        </div>
      </section>

      <section class="field">
        <label>Status</label>
        <div class="segments">
          <button
            v-for="s in statuses"
            :key="s"
            class="seg"
            :class="{ on: status === s }"
            @click="status = s"
          >{{ s }}</button>
        </div>
      </section>

      <button class="save" @click="save">Save</button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { IonModal, IonContent } from '@ionic/vue'
import type { ListEntry } from '@/data/repositories/listRepository'
import type { MediaListStatus } from '@/types/anilist'
import StatusChip from '@/components/media/StatusChip.vue'
import ProgressStepper from './ProgressStepper.vue'

const props = defineProps<{ entry: ListEntry | null; open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', v: { mediaId: number; progress: number; score: number; status: MediaListStatus }): void
}>()

const statuses: MediaListStatus[] = ['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REPEATING']
const title = ref('')
const cover = ref<string | null>(null)
const progress = ref(0)
const score = ref(0)
const max = ref<number | null>(null)
const status = ref<MediaListStatus>('CURRENT')

watch(
  () => props.entry,
  (e) => {
    if (!e) return
    title.value = e.media?.title.english ?? e.media?.title.romaji ?? `Media #${e.mediaId}`
    cover.value = e.media?.coverImage.medium ?? null
    progress.value = e.progress
    score.value = e.score ?? 0
    max.value = e.media?.episodes ?? null
    status.value = e.status
  },
  { immediate: true },
)

function save() {
  if (!props.entry) return
  emit('save', {
    mediaId: props.entry.mediaId,
    progress: progress.value,
    score: score.value,
    status: status.value,
  })
}
</script>

<style scoped>
.sheet { --background: var(--bg-surface); padding: 8px 18px calc(18px + env(safe-area-inset-bottom)); }
.grip { width: 40px; height: 4px; border-radius: 999px; background: var(--text-lo); margin: 6px auto 14px; }
.head { display: flex; gap: 12px; align-items: center; margin-bottom: 18px; }
.mini { width: 48px; height: 66px; object-fit: cover; border-radius: 8px; }
.head h3 { font-family: var(--font-display); font-weight: 700; margin: 0 0 6px; }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-lo); margin-bottom: 8px; }
.score-row { display: flex; align-items: center; gap: 12px; }
.score-input { flex: 1; accent-color: var(--accent); }
.score-val { font-family: var(--font-mono); color: var(--text-hi); min-width: 32px; text-align: right; }
.segments { display: flex; flex-wrap: wrap; gap: 6px; }
.seg { padding: 7px 12px; border-radius: 999px; border: 1px solid var(--hairline); background: transparent; color: var(--text-mid); font-size: 12px; cursor: pointer; }
.seg.on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
.save { width: 100%; padding: 14px; border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-family: var(--font-body); font-weight: 700; font-size: 15px; cursor: pointer; }
.save:active { background: var(--accent-press); }
</style>
