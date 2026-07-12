import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Pull-to-refresh gesture handler.
 * Attach the returned `containerRef` to the scrollable element.
 * Call `onRefresh` when the user pulls past the threshold.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; resistance?: number } = {}
) {
  const { threshold = 80, resistance = 2.5 } = options
  const containerRef = ref<HTMLElement | null>(null)
  const pulling = ref(false)
  const pullingDown = ref(0)
  const refreshing = ref(false)

  let startY = 0
  let currentY = 0

  function onTouchStart(e: TouchEvent) {
    if (refreshing.value) return
    const el = containerRef.value
    if (!el || el.scrollTop > 0) return
    startY = e.touches[0].clientY
    pulling.value = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling.value || refreshing.value) return
    currentY = e.touches[0].clientY
    const delta = (currentY - startY) / resistance
    if (delta > 0) {
      pullingDown.value = Math.min(delta, threshold * 1.5)
      // Prevent native scroll while pulling
      e.preventDefault()
    } else {
      pullingDown.value = 0
    }
  }

  async function onTouchEnd() {
    if (!pulling.value) return
    pulling.value = false

    if (pullingDown.value >= threshold && !refreshing.value) {
      refreshing.value = true
      pullingDown.value = threshold
      try {
        await onRefresh()
      } finally {
        refreshing.value = false
        pullingDown.value = 0
      }
    } else {
      pullingDown.value = 0
    }
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const el = containerRef.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
  })

  return { containerRef, pullingDown, refreshing }
}
