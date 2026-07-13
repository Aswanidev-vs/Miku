import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Pull-to-refresh (mobile touch) + manual refresh button (desktop).
 * Auto-detects the nearest scroll container in the DOM hierarchy.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; resistance?: number } = {}
) {
  const { threshold = 80, resistance = 2.5 } = options
  const pullingDown = ref(0)
  const refreshing = ref(false)
  const showRefreshBtn = ref(false)

  let scrollContainer: HTMLElement | null = null
  let startY = 0
  let currentY = 0
  let pulling = false

  function findScrollContainer(el: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = el.parentElement
    while (current && current !== document.body) {
      const style = getComputedStyle(current)
      const overflowY = style.overflowY
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight
      ) {
        return current
      }
      current = current.parentElement
    }
    return document.body
  }

  // ---- Touch (mobile) ----

  function onTouchStart(e: TouchEvent) {
    if (refreshing.value) return
    if (!scrollContainer) {
      const view = e.currentTarget as HTMLElement
      scrollContainer = findScrollContainer(view)
    }
    if (!scrollContainer) return
    if (scrollContainer.scrollTop > 5) return

    startY = e.touches[0].clientY
    pulling = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling || refreshing.value) return
    currentY = e.touches[0].clientY
    const delta = (currentY - startY) / resistance
    if (delta > 0) {
      pullingDown.value = Math.min(delta, threshold * 1.5)
      e.preventDefault()
    } else {
      pullingDown.value = 0
    }
  }

  async function onTouchEnd() {
    if (!pulling) return
    pulling = false

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

  // ---- Scroll visibility (desktop refresh button) ----

  function onScroll() {
    if (!scrollContainer) return
    showRefreshBtn.value = scrollContainer.scrollTop <= 5
  }

  // ---- Manual refresh (desktop click) ----

  async function manualRefresh() {
    if (refreshing.value) return
    refreshing.value = true
    try {
      await onRefresh()
    } finally {
      refreshing.value = false
    }
  }

  // ---- Lifecycle ----

  function setupListeners(el: HTMLElement) {
    // Touch events (mobile)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    // Find scroll container and listen for scroll (desktop button visibility)
    if (!scrollContainer) scrollContainer = findScrollContainer(el)
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true })
      // Check initial state
      showRefreshBtn.value = scrollContainer.scrollTop <= 5
    }
  }

  function removeListeners(el: HTMLElement) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', onScroll)
    }
  }

  return {
    pullingDown,
    refreshing,
    showRefreshBtn,
    manualRefresh,
    setupListeners,
    removeListeners,
  }
}
