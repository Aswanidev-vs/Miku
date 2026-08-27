<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  favorites: {
    anime?: { nodes: { id: number; title: { romaji: string }; coverImage: { medium: string } }[] }
    manga?: { nodes: { id: number; title: { romaji: string }; coverImage: { medium: string } }[] }
  }
}>()

const allFavorites = computed(() => {
  const items: { id: number; title: string; cover: string; type: string }[] = []
  if (props.favorites?.anime?.nodes) {
    for (const node of props.favorites.anime.nodes) {
      items.push({
        id: node.id,
        title: node.title.romaji,
        cover: node.coverImage.medium,
        type: 'anime',
      })
    }
  }
  if (props.favorites?.manga?.nodes) {
    for (const node of props.favorites.manga.nodes) {
      items.push({
        id: node.id,
        title: node.title.romaji,
        cover: node.coverImage.medium,
        type: 'manga',
      })
    }
  }
  return items
})
</script>

<template>
  <div class="favorites-container">
    <h3 class="favorites-title">Favorites</h3>
    <div v-if="allFavorites.length === 0" class="favorites-empty">
      No favorites yet
    </div>
    <div v-else class="favorites-list">
      <div
        v-for="item in allFavorites"
        :key="item.id"
        class="favorite-item"
      >
        <img
          :src="item.cover"
          :alt="item.title"
          class="favorite-cover"
          loading="lazy"
        />
        <div class="favorite-info">
          <span class="favorite-title">{{ item.title }}</span>
          <span class="favorite-type" :class="item.type">{{ item.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-container {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.favorites-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.favorites-empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.favorite-item:hover {
  background: var(--bg-hover);
}

.favorite-cover {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.favorite-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.favorite-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-type {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-weight-semibold);
}

.favorite-type.anime {
  color: var(--status-watching);
}

.favorite-type.manga {
  color: var(--status-completed);
}
</style>
