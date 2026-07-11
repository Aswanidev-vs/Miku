<template>
  <ion-page>
    <AppBar title="Social" />
    <div class="feed">
      <ActivityItem v-for="a in store.activities" :key="a.id" :item="a" />
      <div ref="sentinel" class="sentinel">
        <SkeletonBlock v-if="store.loading" :height="60" />
      </div>
      <EmptyState v-if="!store.activities.length && !store.loading" message="No activity yet" />
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonPage } from '@ionic/vue'
import AppBar from '@/components/common/AppBar.vue'
import ActivityItem from '@/components/social/ActivityItem.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useSocialStore } from '@/stores/social'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'

const store = useSocialStore()
const sentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(sentinel, {
  hasMore: () => store.hasMore,
  onLoadMore: () => store.loadFeed(),
})

onMounted(() => store.loadFeed(true))
</script>

<style scoped>
.feed { padding-bottom: 24px; }
.sentinel { padding: 12px var(--app-gap); }
</style>
