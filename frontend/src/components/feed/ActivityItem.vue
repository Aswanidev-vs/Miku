<script setup lang="ts">
import type { TextActivity, ListActivity } from '../../types'
import { renderActivityHtml } from '../../utils/activityHtml'
import { formatTime, statusLabel } from '../../utils/activityFormat'

defineProps<{
  activity: TextActivity | ListActivity
}>()

const emit = defineEmits<{
  'open-media': [id: number]
  'open-user': [activity: TextActivity | ListActivity]
}>()

// Cover/title are only clickable when the media actually resolved to an id
function openMedia(id?: number) {
  if (id) emit('open-media', id)
}
</script>

<template>
  <div class="activity-item">
    <!-- List Activity -->
    <template v-if="'media' in activity && activity.media">
      <div class="activity-avatar" @click="emit('open-user', activity)">
        <img
          v-if="activity.user?.avatar"
          :src="activity.user.avatar.medium"
          :alt="activity.user.name"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="activity-body">
        <p class="activity-text">
          <span class="activity-user">{{ activity.user?.name }}</span>
          <span class="activity-action">{{ statusLabel(activity.status) }}</span>
          <span class="activity-media" @click="openMedia(activity.media?.id)">
            {{ activity.media?.title?.romaji }}
          </span>
          <span v-if="activity.progress" class="activity-progress">
            {{ activity.progress }}
          </span>
        </p>
        <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
      </div>
      <img
        v-if="activity.media?.coverImage"
        :src="activity.media.coverImage.medium"
        :alt="activity.media.title?.romaji"
        class="activity-cover"
        loading="lazy"
        decoding="async"
        @click="openMedia(activity.media?.id)"
      />
    </template>

    <!-- Text Activity -->
    <template v-else-if="'text' in activity">
      <div class="activity-avatar" @click="emit('open-user', activity)">
        <img
          v-if="activity.user?.avatar"
          :src="activity.user.avatar.medium"
          :alt="activity.user.name"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="activity-body">
        <p class="activity-text">
          <span class="activity-user">{{ activity.user?.name }}</span>
        </p>
        <div class="activity-message" v-html="renderActivityHtml(activity.text)"></div>
        <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.activity-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--bg-surface);
  align-items: flex-start;
}

.activity-avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.activity-avatar img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.activity-body {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

.activity-user {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.activity-action {
  margin: 0 var(--space-xs);
}

.activity-media {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-light);
  cursor: pointer;
}

.activity-media:hover {
  text-decoration: underline;
}

.activity-progress {
  margin-left: var(--space-xs);
  color: var(--text-muted);
}

.activity-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
  line-height: var(--line-height-normal);
}

.activity-message :deep(a) {
  color: var(--color-primary-light);
  word-break: break-word;
}

.activity-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-xs);
  display: block;
}

.activity-cover {
  width: 48px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
  cursor: pointer;
}
</style>
