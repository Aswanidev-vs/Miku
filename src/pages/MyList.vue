<template>
  <ion-page>
    <AppBar title="My List" />
    <PullRefresh @refresh="store.load()">
      <div v-if="!store.all.length && !store.loading" class="center">
        <EmptyState message="Your list is empty — add something from Search" />
      </div>
      <VirtualScroller v-else :items="store.all" :item-height="72" class="list">
        <template #default="{ items }">
          <ListRow
            v-for="e in (items as ListEntry[])"
            :key="e.id"
            :entry="e"
            :density="ui.density"
            @open="openSheet(e)"
            @progress="({ id, value }) => store.setProgress(id, value)"
          />
        </template>
      </VirtualScroller>
    </PullRefresh>

    <ListEditorSheet
      :entry="active"
      :open="sheetOpen"
      @close="sheetOpen = false"
      @save="onSave"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonPage } from '@ionic/vue'
import AppBar from '@/components/common/AppBar.vue'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import ListRow from '@/components/list/ListRow.vue'
import ListEditorSheet from '@/components/list/ListEditorSheet.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PullRefresh from '@/components/gesture/PullRefresh.vue'
import { useListStore } from '@/stores/list'
import { useUiStore } from '@/stores/ui'
import { useHaptics } from '@/composables/useHaptics'
import type { ListEntry } from '@/data/repositories/listRepository'
import type { MediaListStatus } from '@/types/anilist'

const store = useListStore()
const ui = useUiStore()
const haptics = useHaptics()
const active = ref<ListEntry | null>(null)
const sheetOpen = ref(false)

function openSheet(e: ListEntry) {
  active.value = e
  sheetOpen.value = true
  haptics.tap()
}
function onSave(v: { mediaId: number; progress: number; score: number; status: MediaListStatus }) {
  store.setProgress(v.mediaId, v.progress)
  store.setScore(v.mediaId, v.score)
  store.setStatus(v.mediaId, v.status)
  sheetOpen.value = false
  haptics.success()
}
onMounted(() => store.load())
</script>

<style scoped>
.list { padding-bottom: 24px; }
.center { padding: 40px 0; }
</style>
