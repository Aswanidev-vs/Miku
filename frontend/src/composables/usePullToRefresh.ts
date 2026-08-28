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
  let startX = 0
  let startY = 0
  let pulling = false
  let gestureDetermined = false

  function findScrollContainer(el: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = el.parentElement
    while (current && current !== document.documentElement) {
      const style = getComputedStyle(current)
      const overflowY = style.overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return current
      }
      current = current.parentElement
    }
    return (document.querySelector('.main-content') as HTMLElement) || document.documentElement || document.body
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

    startX = e.touches[0]?.clientX ?? 0
    startY = e.touches[0]?.clientY ?? 0
    pulling = true
    gestureDetermined = false
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling || refreshing.value || !scrollContainer) return

    // If container has scrolled down, abort pull-to-refresh
    if (scrollContainer.scrollTop > 5) {
      pulling = false
      pullingDown.value = 0
      return
    }

    const currentX = e.touches[0]?.clientX ?? 0
    const currentY = e.touches[0]?.clientY ?? 0
    const rawDeltaX = currentX - startX
    const rawDeltaY = currentY - startY

    // Determine if gesture is horizontal (like scrolling tabs) or scrolling down
    if (!gestureDetermined) {
      if (Math.abs(rawDeltaX) > 5 || Math.abs(rawDeltaY) > 5) {
        gestureDetermined = true
        // If horizontal movement is greater, or finger is moving up (scrolling down), cancel PTR
        if (Math.abs(rawDeltaX) > Math.abs(rawDeltaY) || rawDeltaY <= 0) {
          pulling = false
          pullingDown.value = 0
          return
        }
      } else {
        return
      }
    }

    const delta = rawDeltaY / resistance
    if (delta > 0) {
      pullingDown.value = Math.min(delta, threshold * 1.5)
      e.preventDefault()
    } else {
      pullingDown.value = 0
      pulling = false
    }
  }

  async function onTouchEnd() {
    if (!pulling) return
    pulling = false
    gestureDetermined = false

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
