<script setup lang="ts">
import { computed } from 'vue'
import type { MediaTitle } from '../../types'
import { preferredTitle } from '../../utils/mediaDisplay'
import { useSettings } from '../../composables/useSettings'

const { settings } = useSettings()

interface MediaFavoriteNode {
  id: number
  title: MediaTitle
  coverImage: { medium: string }
}

interface PersonFavoriteNode {
  id: number
  name: { full: string }
  image: { medium: string }
}

const props = defineProps<{
  favorites: {
    anime?: { nodes: MediaFavoriteNode[] }
    manga?: { nodes: MediaFavoriteNode[] }
    characters?: { nodes: PersonFavoriteNode[] }
    staff?: { nodes: PersonFavoriteNode[] }
  }
}>()

const allFavorites = computed(() => {
  const items: { id: number; title: string; cover: string; type: string; round: boolean }[] = []
  if (props.favorites?.anime?.nodes) {
    for (const node of props.favorites.anime.nodes) {
      items.push({
        id: node.id,
        title: preferredTitle(node.title, settings.value.titleLanguage),
        cover: node.coverImage.medium,
        type: 'anime',
        round: false,
      })
    }
  }
  if (props.favorites?.manga?.nodes) {
    for (const node of props.favorites.manga.nodes) {
      items.push({
        id: node.id,
        title: preferredTitle(node.title, settings.value.titleLanguage),
        cover: node.coverImage.medium,
        type: 'manga',
        round: false,
      })
    }
  }
  if (props.favorites?.characters?.nodes) {
    for (const node of props.favorites.characters.nodes) {
      items.push({
        id: node.id,
        title: node.name.full,
        cover: node.image.medium,
        type: 'character',
        round: true,
      })
    }
  }
  if (props.favorites?.staff?.nodes) {
    for (const node of props.favorites.staff.nodes) {
      items.push({
        id: node.id,
        title: node.name.full,
        cover: node.image.medium,
        type: 'staff',
        round: true,
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
        :key="`${item.type}-${item.id}`"
        class="favorite-item"
        :class="item.type"
      >
        <img
          :src="item.cover"
          :alt="item.title"
          class="favorite-cover"
          :class="{ round: item.round }"
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

.favorite-cover.round {
  border-radius: var(--radius-full);
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

.favorite-type.character {
  color: var(--status-planning);
}

.favorite-type.staff {
  color: var(--status-paused);
}
</style>
