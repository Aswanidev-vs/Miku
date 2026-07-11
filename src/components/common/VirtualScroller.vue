<template>
  <div ref="scroller" class="vs" @scroll.passive="onScroll">
    <div class="vs-spacer" :style="{ height: totalHeight + 'px' }">
      <div class="vs-window" :style="{ transform: `translateY(${offset}px)` }">
        <slot :items="visible" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{ items: T[]; itemHeight: number; overscan?: number }>(),
  { overscan: 4 },
)

const scroller = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewport = ref(600)

function measure() {
  viewport.value = scroller.value?.clientHeight ?? 600
}
const onScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

const start = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const end = computed(() =>
  Math.min(props.items.length, Math.ceil((scrollTop.value + viewport.value) / props.itemHeight) + props.overscan),
)
const visible = computed(() => props.items.slice(start.value, end.value))
const offset = computed(() => start.value * props.itemHeight)
const totalHeight = computed(() => props.items.length * props.itemHeight)

defineExpose({ measure })
</script>

<style scoped>
.vs { overflow-y: auto; height: 100%; position: relative; }
.vs-spacer { position: relative; width: 100%; }
.vs-window { position: absolute; top: 0; left: 0; right: 0; }
</style>
