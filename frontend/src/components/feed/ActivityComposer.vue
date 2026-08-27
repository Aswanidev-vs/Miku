<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  avatar?: string
  name?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  post: [text: string]
}>()

const text = ref('')
const canPost = computed(() => !props.disabled && text.value.trim().length > 0)
const initial = computed(() => (props.name?.trim().charAt(0) || 'M').toUpperCase())

function post() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('post', trimmed)
  text.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') post()
}
</script>

<template>
  <div class="activity-composer">
    <div class="composer-avatar">
      <img v-if="avatar" :src="avatar" :alt="name ?? 'avatar'" />
      <span v-else class="composer-avatar-fallback">{{ initial }}</span>
    </div>
    <div class="composer-body">
      <textarea
        v-model="text"
        class="composer-textarea"
        rows="2"
        placeholder="Share something..."
        :disabled="disabled"
        @keydown="onKeydown"
      ></textarea>
      <button class="btn btn-primary composer-post-btn" :disabled="!canPost" @click="post">
        Post
      </button>
    </div>
  </div>
</template>

<style scoped>
.activity-composer {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.composer-avatar {
  flex-shrink: 0;
}

.composer-avatar img,
.composer-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
}

.composer-avatar img {
  object-fit: cover;
}

.composer-avatar-fallback {
  background: var(--color-primary-subtle);
  color: var(--color-primary-light);
  font-weight: var(--font-weight-semibold);
}

.composer-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.composer-textarea {
  width: 100%;
  resize: none;
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.composer-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.composer-textarea:disabled {
  opacity: 0.6;
}

.composer-post-btn {
  align-self: flex-end;
}
</style>
