<template>
  <div class="stepper">
    <button class="step" :disabled="value === 0" aria-label="decrease" @click.stop="dec">–</button>
    <span class="val">{{ display }}</span>
    <button class="step" aria-label="increase" @click.stop="inc">+</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; max?: number | null }>()
const emit = defineEmits<{ (e: 'change', v: number): void }>()

const display = computed(() =>
  props.max ? `${props.value}/${props.max}` : `${props.value}`,
)
function inc() {
  if (props.max && props.value >= props.max) return
  emit('change', props.value + 1)
}
function dec() {
  if (props.value <= 0) return
  emit('change', props.value - 1)
}
</script>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-elevated);
  border-radius: 999px;
  padding: 2px;
}
.step {
  width: 44px; height: 44px;
  border: 0; border-radius: 50%;
  background: transparent; color: var(--text-hi);
  font-size: 18px; line-height: 1; cursor: pointer;
  transition: background var(--dur-fast) var(--ease-smooth);
}
.step:active { background: var(--accent-soft); }
.step:disabled { color: var(--text-lo); cursor: default; }
.val {
  font-family: var(--font-mono);
  font-size: 13px; min-width: 48px; text-align: center;
  color: var(--text-hi);
}
</style>
