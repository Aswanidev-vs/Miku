<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Settings live on the Profile screen; this route only exists for old links.
const router = useRouter()

onMounted(() => {
  router.replace({ name: 'profile' })
})
</script>

<template>
  <div class="settings-view">
    <p>
      Settings moved to
      <RouterLink :to="{ name: 'profile' }">Profile</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-xl);
  text-align: center;
}
</style>
