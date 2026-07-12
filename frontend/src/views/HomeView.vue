<script setup lang="ts">
</script>

<template>
  <div class="home-view">
    <h1>Miku</h1>
    <p class="text-secondary">AniList Client</p>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-xl);
  text-align: center;
}

h1 {
  font-size: var(--font-size-2xl);
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
