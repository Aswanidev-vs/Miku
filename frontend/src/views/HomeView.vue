<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAnimeStore } from '../stores/anime'
import AnimeGrid from '../components/anime/AnimeGrid.vue'

const animeStore = useAnimeStore()

onMounted(() => {
  if (animeStore.trending.length === 0) {
    animeStore.fetchTrending()
  }
})

const trendingAnime = computed(() => animeStore.trending)
const loading = computed(() => animeStore.loading)
</script>

<template>
  <div class="home-view">
    <header class="home-header">
      <h1 class="app-title">Miku</h1>
      <p class="app-subtitle">AniList Client</p>
    </header>

    <section class="home-section">
      <div class="section-header">
        <h2>Trending Anime</h2>
      </div>
      <AnimeGrid :items="trendingAnime" :loading="loading" :columns="3" />
    </section>

    <section v-if="!loading && trendingAnime.length > 0" class="home-section">
      <div class="section-header">
        <h2>Recently Updated</h2>
      </div>
      <AnimeGrid :items="trendingAnime.slice(0, 6)" :columns="3" />
    </section>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.home-header {
  padding: var(--space-xl) var(--space-lg) var(--space-lg);
}

.app-title {
  font-size: var(--font-size-2xl);
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.home-section {
  flex: 1;
  padding: 0 var(--space-lg);
  margin-bottom: var(--space-xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-header h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
</style>
