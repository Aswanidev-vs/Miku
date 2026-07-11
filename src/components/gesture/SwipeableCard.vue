<template>
  <div ref="el" class="swipeable">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { createGesture } from '@ionic/vue'

const props = withDefaults(
  defineProps<{ threshold?: number }>(),
  { threshold: 80 },
)
const emit = defineEmits<{ (e: 'swipe-left'): void; (e: 'swipe-right'): void }>()

const el = ref<HTMLElement | null>(null)
let gesture: ReturnType<typeof createGesture> | null = null

onMounted(() => {
  if (!el.value) return
  gesture = createGesture({
    el: el.value,
    gestureName: 'miku-swipe-card',
    gesturePriority: 10,
    threshold: 10,
    onEnd: (d) => {
      if (Math.abs(d.deltaX) < props.threshold) {
        el.value!.style.transform = ''
        return
      }
      if (d.deltaX < 0) emit('swipe-left')
      else emit('swipe-right')
    },
  })
  gesture.enable()
})
onUnmounted(() => gesture?.destroy())
</script>

<style scoped>
.swipeable { touch-action: pan-y; }
</style>
