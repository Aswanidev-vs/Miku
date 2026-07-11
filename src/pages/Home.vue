<template>
  <ion-page>
    <AppBar title="Miku">
      <template #start>
        <img src="/logo-mark.svg" alt="" class="logo-mark" />
      </template>
    </AppBar>
    <PullRefresh @refresh="onRefresh">
      <section v-if="hero" class="hero">
        <img v-shared-element="`cover-${hero.id}`" :src="hero.coverImage.large ?? ''" class="hero-img" v-parallax="0.25" />
        <div class="hero-scrim" />
        <div class="hero-meta">
          <span class="kicker">Trending now</span>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <div class="hero-score"><ScoreRing :score="hero.meanScore" :size="46" /></div>
        </div>
      </section>

      <section class="section">
        <h2 class="sec-title">Popular this season</h2>
        <MediaGrid :media="media" :density="ui.density" />
        <div ref="sentinel" class="sentinel">
          <SkeletonBlock v-if="store.loading" :height="120" />
        </div>
      </section>
    </PullRefresh>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonPage } from '@ionic/vue'
import AppBar from '@/components/common/AppBar.vue'
import MediaGrid from '@/components/media/MediaGrid.vue'
import ScoreRing from '@/components/media/ScoreRing.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import PullRefresh from '@/components/gesture/PullRefresh.vue'
import { vSharedElement } from '@/directives/vSharedElement'
import { vParallax } from '@/directives/vParallax'
import { useMediaStore } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'

const store = useMediaStore()
const ui = useUiStore()
const sentinel = ref<HTMLElement | null>(null)

const media = computed(() => store.popular)
const hero = computed(() => store.trending[0] ?? null)
const heroTitle = computed(
  () => hero.value?.title.english ?? hero.value?.title.romaji ?? '',
)

useInfiniteScroll(sentinel, {
  hasMore: () => store.popular.length < 200,
  onLoadMore: () => store.loadPopular(),
})

onMounted(async () => {
  await Promise.all([store.loadTrending(), store.loadPopular()])
})

async function onRefresh() {
  await store.loadPopular(true)
  await store.loadTrending()
}
</script>

<style scoped>
.hero { position: relative; height: min(320px, 48vh); overflow: hidden; }
.hero-img { position: absolute; inset: -40px 0 0; width: 100%; height: 120%; object-fit: cover; }
.hero-scrim { position: absolute; inset: 0; background: linear-gradient(115deg, var(--bg-base) 6%, transparent 60%), linear-gradient(to top, var(--bg-base), transparent 70%), linear-gradient(to right, var(--aurora-1), var(--aurora-2)); opacity: .22; }
.hero-meta { position: absolute; left: 18px; bottom: 18px; right: 18px; }
.kicker { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: var(--accent); }
.hero-title { font-family: var(--font-display); font-weight: 800; font-size: clamp(24px, 6vw, 34px); line-height: 1.02; letter-spacing: -0.02em; margin: 6px 0 12px; color: var(--text-hi); }
.hero-score { position: absolute; right: 0; bottom: 0; }
.section { padding: 18px 0 32px; }
.sec-title { font-family: var(--font-display); font-weight: 700; font-size: 18px; margin: 0 0 12px; padding: 0 var(--app-gap); color: var(--text-hi); }
.sentinel { padding: 12px var(--app-gap); }
.logo-mark { width: 28px; height: 28px; border-radius: 6px; margin-right: 6px; }
</style>
