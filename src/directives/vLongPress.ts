/** Long-press detection for contextual actions (e.g. open editor sheet). */
export const vLongPress = {
  mounted(el: HTMLElement, binding: { value: () => void; arg?: string }) {
    let timer: number | undefined
    const dur = binding.arg ? Number(binding.arg) : 450
    const start = () => {
      timer = window.setTimeout(() => binding.value(), dur)
    }
    const cancel = () => {
      if (timer) window.clearTimeout(timer)
    }
    el.addEventListener('pointerdown', start)
    el.addEventListener('pointerup', cancel)
    el.addEventListener('pointerleave', cancel)
    el.addEventListener('pointercancel', cancel)
    ;(el as unknown as { __lp?: { start: () => void; cancel: () => void } }).__lp = { start, cancel }
  },
  unmounted(el: HTMLElement) {
    const lp = (el as unknown as { __lp?: { start: () => void; cancel: () => void } }).__lp
    if (lp) {
      lp.cancel()
      el.removeEventListener('pointerdown', lp.start)
      el.removeEventListener('pointerup', lp.cancel)
      el.removeEventListener('pointerleave', lp.cancel)
      el.removeEventListener('pointercancel', lp.cancel)
    }
  },
}
