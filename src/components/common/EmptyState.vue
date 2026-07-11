<template>
  <div class="empty">
    <div class="glyph" aria-hidden="true">
      <ion-icon :icon="sparkles" />
    </div>
    <p class="msg">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { sparkles } from 'ionicons/icons'

defineProps<{ message: string }>()
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-mid);
}
.glyph {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 24px;
}
.msg { font-family: var(--font-body); margin: 0; }
</style>
