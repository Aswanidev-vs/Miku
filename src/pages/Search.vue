<template>
  <ion-page>
    <AppBar title="Search" />
    <div class="search-wrap">
      <div class="field">
        <ion-icon :icon="search" class="ic" />
        <input
          v-model="term"
          class="input"
          type="search"
          placeholder="Anime, manga, studio…"
          @input="onInput"
        />
      </div>
      <MediaGrid v-if="results.length" :media="results" :density="ui.density" />
      <EmptyState v-else-if="searched" message="No matches — try another title" />
      <p v-else class="hint">Start typing to search AniList.</p>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonIcon } from '@ionic/vue'
import { search } from 'ionicons/icons'
import AppBar from '@/components/common/AppBar.vue'
import MediaGrid from '@/components/media/MediaGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useMediaStore } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import type { Media } from '@/types/anilist'

const store = useMediaStore()
const ui = useUiStore()
const term = ref('')
const results = ref<Media[]>([])
const searched = ref(false)
let timer: number | undefined

function onInput() {
  window.clearTimeout(timer)
  timer = window.setTimeout(async () => {
    if (!term.value.trim()) {
      results.value = []
      searched.value = false
      return
    }
    searched.value = true
    results.value = await store.search(term.value.trim())
  }, 280)
}
</script>

<style scoped>
.search-wrap { padding: 0 0 24px; }
.field { display: flex; align-items: center; gap: 8px; margin: 12px var(--app-gap); padding: 10px 14px; background: var(--bg-elevated); border-radius: 14px; }
.ic { color: var(--text-lo); font-size: 18px; }
.input { flex: 1; background: transparent; border: 0; outline: none; color: var(--text-hi); font-family: var(--font-body); font-size: 16px; }
.input::placeholder { color: var(--text-lo); }
.hint { text-align: center; color: var(--text-lo); font-family: var(--font-body); padding: 40px 24px; }
</style>
