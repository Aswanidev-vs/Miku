<script setup lang="ts">
import type { User } from '../../types'

defineProps<{
  title: string
  users: User[]
}>()

const emit = defineEmits<{
  select: [user: User]
}>()
</script>

<template>
  <div class="social-list">
    <h4 class="social-list-title">{{ title }}</h4>
    <div v-if="users.length === 0" class="social-empty">
      No one yet
    </div>
    <div v-else class="social-chips">
      <button
        v-for="u in users"
        :key="u.id"
        type="button"
        class="social-chip"
        @click="emit('select', u)"
      >
        <img
          :src="u.avatar.medium"
          :alt="u.name"
          class="social-avatar"
          loading="lazy"
        />
        <span class="social-name">{{ u.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.social-list {
  padding: var(--space-sm) 0;
}

.social-list + .social-list {
  border-top: 1px solid var(--border-subtle);
}

.social-list-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.social-empty {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-xs) 0 var(--space-sm);
}

.social-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.social-chip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  max-width: 100%;
  padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-xs);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.social-chip:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.social-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
}

.social-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
