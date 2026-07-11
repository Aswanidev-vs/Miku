import { createGesture } from '@ionic/vue'
import type { GestureDetail } from '@ionic/vue'

interface SwipeOptions {
  el: HTMLElement
  onSwipeLeft?: (d: GestureDetail) => void
  onSwipeRight?: (d: GestureDetail) => void
  threshold?: number
}

/** Thin wrapper over Ionic gestures for swipe-based navigation. */
export function useGesture() {
  function onSwipe(opts: SwipeOptions) {
    const threshold = opts.threshold ?? 60
    const g = createGesture({
      el: opts.el,
      gestureName: 'miku-swipe',
      gesturePriority: 10,
      threshold: 10,
      onEnd: (d: GestureDetail) => {
        const dx = d.deltaX
        if (Math.abs(dx) < threshold) return
        if (dx < 0) opts.onSwipeLeft?.(d)
        else opts.onSwipeRight?.(d)
      },
    })
    g.enable()
    return () => g.destroy()
  }
  return { onSwipe }
}
