<script setup lang="ts">
defineProps<{
  message?: string | null
}>()
</script>

<template>
  <section class="rate-limit-notice" role="alert" aria-live="polite">
    <div class="rate-limit-art">
      <img
        src="../../gif/nibutani.gif"
        alt="Anime character waiting patiently for AniList"
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="rate-limit-copy">
      <p class="rate-limit-eyebrow">AniList pause</p>
      <h2>Give it a second.</h2>
      <p class="rate-limit-description">
        Requests are cooling down. Try again shortly.
      </p>
      <p v-if="message" class="rate-limit-details">{{ message }}</p>
    </div>

    <div class="rate-limit-actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped>
.rate-limit-notice {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: min(100%, 560px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--border-subtle));
  border-radius: var(--radius-md, 12px);
  background: var(--bg-surface);
  box-shadow: 0 10px 24px rgb(0 0 0 / 14%);
  text-align: left;
}

.rate-limit-art {
  flex: none;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-right: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  background: var(--bg-elevated);
}

.rate-limit-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right bottom;
}

.rate-limit-copy {
  min-width: 0;
  padding: 16px 18px 4px;
  text-align: center;
}

.rate-limit-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px 16px;
}

.rate-limit-eyebrow {
  margin: 0 0 4px;
  color: var(--color-primary-light, var(--color-primary));
  font-size: 10px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.rate-limit-copy h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  line-height: 1.2;
}

.rate-limit-description,
.rate-limit-details {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
}

.rate-limit-details {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 11px;
}

@media (max-width: 520px) {
  .rate-limit-notice {
    min-height: 100px;
  }
  .rate-limit-art {
    aspect-ratio: 16 / 9;
  }
  .rate-limit-copy { padding: 14px 14px 2px; }
  .rate-limit-copy h2 { font-size: 18px; }
  .rate-limit-actions {
    padding: 10px 14px 14px;
  }
}
</style>
