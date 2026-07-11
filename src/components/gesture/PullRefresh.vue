<template>
  <div ref="el" class="pull">
    <div class="indicator" :class="{ active: pulling || refreshing }">
      <span class="ring" />
      <ion-icon v-if="!refreshing" :icon="arrowDown" class="arrow" />
    </div>
    <div class="content" :style="{ transform: `translateY(${offset}px)` }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { arrowDown } from 'ionicons/icons'

const emit = defineEmits<{ (e: 'refresh'): void | Promise<void> }>()
const el = ref<HTMLElement | null>(null)
const offset = ref(0)
const pulling = ref(false)
const refreshing = ref(false)
let startY = 0

function onStart(e: TouchEvent) {
  if ((el.value?.scrollTop ?? 0) > 0 || refreshing.value) return
  startY = e.touches[0].clientY
  pulling.value = true
}
function onMove(e: TouchEvent) {
  if (!pulling.value) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) {
    offset.value = 0
    return
  }
  offset.value = Math.min(80, dy * 0.5) // elastic
}
async function onEnd() {
  if (offset.value > 50) {
    refreshing.value = true
    offset.value = 50
    try {
      await emit('refresh')
    } finally {
      refreshing.value = false
      offset.value = 0
    }
  } else {
    offset.value = 0
  }
  pulling.value = false
}

onMounted(() => {
  el.value?.addEventListener('touchstart', onStart, { passive: true })
  el.value?.addEventListener('touchmove', onMove, { passive: true })
  el.value?.addEventListener('touchend', onEnd)
})
onUnmounted(() => {
  el.value?.removeEventListener('touchstart', onStart)
  el.value?.removeEventListener('touchmove', onMove)
  el.value?.removeEventListener('touchend', onEnd)
})
</script>

<style scoped>
.pull { height: 100%; overflow-y: auto; position: relative; }
.indicator {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  opacity: 0; transition: opacity var(--dur-fast) var(--ease-smooth);
  display: grid; place-items: center;
}
.indicator.active { opacity: 1; }
.ring { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--accent-soft); border-top-color: var(--accent); }
.indicator.active .ring { animation: spin .8s linear infinite; }
.arrow { position: absolute; color: var(--accent); font-size: 14px; }
@keyframes spin { to { transform: rotate(360deg); } }
.content { transition: transform var(--dur-base) var(--ease-spring); }
.pull:not(.active) .content { transition: none; }
</style>
