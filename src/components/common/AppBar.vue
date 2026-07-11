<template>
  <ion-header class="app-bar" :class="{ scrolled }">
    <ion-toolbar>
      <slot name="start" />
      <ion-title>
        <span class="title-display">{{ title }}</span>
      </ion-title>
      <slot name="end" />
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonHeader, IonToolbar, IonTitle } from '@ionic/vue'
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{ title: string }>()
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.app-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: transparent;
  transition: background var(--dur-base) var(--ease-smooth),
    backdrop-filter var(--dur-base) var(--ease-smooth);
}
.app-bar.scrolled {
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--hairline);
}
.title-display {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
}
</style>
