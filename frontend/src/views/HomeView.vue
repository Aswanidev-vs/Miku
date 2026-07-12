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
    <header class="home-header safe-area-top">
      <div class="header-content">
        <div>
          <h1 class="app-title">Miku</h1>
          <p class="app-subtitle">AniList Client</p>
        </div>
      </div>
    </header>

    <section class="home-section">
      <div class="section-header">
        <h2 class="section-title">Trending Anime</h2>
      </div>
      <div v-if="loading && trendingAnime.length === 0" class="loading-grid">
        <div v-for="i in 6" :key="i" class="skeleton-card">
          <div class="skeleton skeleton-image"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-sm"></div>
        </div>
      </div>
      <AnimeGrid v-else :items="trendingAnime" :columns="3" />
    </section>

    <section v-if="!loading && trendingAnime.length > 0" class="home-section">
      <div class="section-header">
        <h2 class="section-title">Recently Updated</h2>
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
  background: var(--bg-deepest);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.home-section {
  padding: 0 var(--space-lg);
  margin-bottom: var(--space-xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

/* Loading skeleton */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.skeleton {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}

.skeleton-image {
  aspect-ratio: 3/4;
}

.skeleton-text {
  height: 14px;
  width: 80%;
}

.skeleton-text-sm {
  height: 10px;
  width: 50%;
}
</style>
