<script setup lang="ts">
import { RouterView } from 'vue-router'
import BottomNav from './components/layout/BottomNav.vue'
</script>

<template>
  <div class="app-container">
    <main class="main-content">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.main-content {
  flex: 1;
  padding-bottom: var(--nav-height);
}
</style>
