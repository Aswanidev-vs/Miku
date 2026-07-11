<template>
  <ion-page>
    <AppBar :title="title" />
    <div v-if="media" class="detail">
      <div class="banner">
        <img v-if="media.bannerImage" :src="media.bannerImage" class="banner-img" v-parallax="0.2" />
        <div class="banner-scrim" />
      </div>
      <div class="head">
        <img :src="cover" class="poster" v-shared-element="`cover-${media.id}`" />
        <div class="info">
          <span class="format">{{ media.format }} · {{ media.status }}</span>
          <div class="score"><ScoreRing :score="media.meanScore" :size="52" /></div>
          <div class="genres">
            <span v-for="g in media.genres" :key="g" class="genre">{{ g }}</span>
          </div>
        </div>
      </div>
      <p class="desc" v-if="media.description" v-html="clean(media.description)" />
      <button class="add" @click="add">Add to my list</button>
    </div>
    <div v-else class="loading"><SkeletonBlock :height="420" /></div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { IonPage } from '@ionic/vue'
import { useRoute } from 'vue-router'
import AppBar from '@/components/common/AppBar.vue'
import ScoreRing from '@/components/media/ScoreRing.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { vSharedElement } from '@/directives/vSharedElement'
import { vParallax } from '@/directives/vParallax'
import { useMediaStore } from '@/stores/media'
import { useListStore } from '@/stores/list'

const route = useRoute()
const mediaStore = useMediaStore()
const listStore = useListStore()

const id = computed(() => Number(route.params.id))
const media = computed(() => mediaStore.detailId === id.value ? mediaStore.detail : null)
const title = computed(
  () => media.value?.title.english ?? media.value?.title.romaji ?? 'Detail',
)
const cover = computed(() => media.value?.coverImage.large ?? media.value?.coverImage.extraLarge ?? '')

function clean(html: string) {
  return html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
}
function add() {
  listStore.setStatus(id.value, 'CURRENT')
}

onMounted(() => mediaStore.loadDetail(id.value))
</script>

<style scoped>
.detail { padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }
.banner { position: relative; height: min(200px, 32vh); overflow: hidden; }
.banner-img { width: 100%; height: 120%; object-fit: cover; }
.banner-scrim { position: absolute; inset: 0; background: linear-gradient(to top, var(--bg-base), transparent 70%); }
.head { display: flex; gap: 16px; margin: -56px 18px 0; position: relative; z-index: 2; }
.poster { width: 110px; height: 154px; border-radius: 14px; object-fit: cover; border: 1px solid var(--hairline); flex: none; }
.info { padding-top: 60px; }
.format { font-family: var(--font-mono); font-size: 12px; color: var(--text-lo); text-transform: uppercase; letter-spacing: .06em; }
.score { margin: 10px 0; }
.genres { display: flex; flex-wrap: wrap; gap: 6px; }
.genre { font-size: 11px; padding: 3px 9px; border-radius: 999px; background: var(--bg-elevated); color: var(--text-mid); }
.desc { padding: 18px; font-size: 14px; line-height: 1.55; color: var(--text-mid); }
.add { margin: 0 18px; padding: 13px; width: calc(100% - 36px); border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-weight: 700; cursor: pointer; }
.loading { padding: 18px; }
</style>
