/**
 * Shared-element transition hook. Marks an element with a shared id and records
 * its bounding rect so the destination route can FLIP-animate from it.
 * Real FLIP playback lives in MediaDetail; this only captures the origin.
 */
const MAX_SHARED = 30
const shared = new Map<string, DOMRect>()

export const vSharedElement = {
  mounted(el: HTMLElement, binding: { value: string }) {
    el.dataset.sharedId = binding.value
    el.style.willChange = 'transform'
    const handler = () => {
      const rect = el.getBoundingClientRect()
      shared.set(binding.value, rect)
      // LRU-style cap: evict oldest when over limit
      if (shared.size > MAX_SHARED) {
        const oldest = shared.keys().next().value
        if (oldest !== undefined) shared.delete(oldest)
      }
      ;(window as unknown as { __mikuShared?: Map<string, DOMRect> }).__mikuShared = shared
    }
    el.addEventListener('click', handler)
    ;(el as unknown as { __lp?: { handler: () => void } }).__lp = { handler }
  },
  unmounted(el: HTMLElement) {
    el.style.willChange = ''
    const lp = (el as unknown as { __lp?: { handler: () => void } }).__lp
    if (lp) el.removeEventListener('click', lp.handler)
  },
}
