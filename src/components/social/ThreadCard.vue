<template>
  <article class="thread">
    <div class="bar" />
    <h4 class="title">{{ title }}</h4>
    <p class="sub">{{ replies }} replies · {{ ago }}</p>
  </article>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ title: string; replies?: number; ago?: string }>(),
  { replies: 0, ago: '' },
)
</script>

<style scoped>
.thread {
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px var(--app-gap);
  border-bottom: 1px solid var(--hairline);
  border-left: 3px solid var(--accent-soft);
}
.bar { width: 28px; height: 3px; border-radius: 999px; background: var(--accent); }
.title { font-family: var(--font-display); font-weight: 700; font-size: 15px; margin: 0; color: var(--text-hi); }
.sub { margin: 0; font-family: var(--font-mono); font-size: 11px; color: var(--text-lo); }
</style>
