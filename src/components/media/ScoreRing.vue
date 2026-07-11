<template>
  <div class="ring" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`">
      <circle class="track" :cx="size / 2" :cy="size / 2" :r="r" :stroke-width="stroke" />
      <circle
        class="bar"
        :cx="size / 2"
        :cy="size / 2"
        :r="r"
        :stroke-width="stroke"
        :stroke-dasharray="circ"
        :stroke-dashoffset="dash"
      />
    </svg>
    <span class="num" :style="{ fontSize }">{{ display }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ score: number | null; size?: number; stroke?: number }>(),
  { size: 40, stroke: 4 },
)

const r = computed(() => props.size / 2 - props.stroke / 2)
const circ = computed(() => 2 * Math.PI * r.value)
const pct = computed(() => (props.score ? Math.min(100, props.score) : 0) / 100)
const dash = computed(() => circ.value * (1 - pct.value))
const display = computed(() => (props.score ? Math.round(props.score) : '—'))
const fontSize = computed(() => `${Math.round(props.size * 0.32)}px`)
</script>

<style scoped>
.ring { position: relative; display: grid; place-items: center; }
svg { transform: rotate(-90deg); }
circle { fill: none; stroke-linecap: round; }
.track { stroke: var(--bg-elevated); }
.bar {
  stroke: var(--accent);
  transition: stroke-dashoffset var(--dur-slow) var(--ease-out);
  filter: drop-shadow(0 0 6px var(--accent-glow));
}
.num {
  position: absolute;
  font-family: var(--font-mono);
  color: var(--text-hi);
}
</style>
