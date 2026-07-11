<template>
  <div class="skeleton" :style="{ height: height + 'px', borderRadius: radius }" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ height?: number; radius?: string }>(), {
  height: 16,
  radius: '8px',
})
</script>

<style scoped>
.skeleton {
  width: 100%;
  background: linear-gradient(
    100deg,
    var(--bg-elevated) 30%,
    var(--accent-soft) 50%,
    var(--bg-elevated) 70%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s var(--ease-out) infinite;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
