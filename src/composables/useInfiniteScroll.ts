import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface Options {
  /** Called when the sentinel scrolls into view and more data is wanted. */
  onLoadMore: () => Promise<void> | void
  /** Whether more pages exist. */
  hasMore: () => boolean
  rootMargin?: string
}

/** Infinite-scroll via IntersectionObserver — off the main thread, no scroll listeners. */
export function useInfiniteScroll(target: Ref<HTMLElement | null>, opts: Options) {
  const loading = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!target.value || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting || loading.value || !opts.hasMore()) return
        loading.value = true
        try {
          await opts.onLoadMore()
        } finally {
          loading.value = false
        }
      },
      { rootMargin: opts.rootMargin ?? '400px' },
    )
    observer.observe(target.value)
  })

  onUnmounted(() => observer?.disconnect())
  return { loading }
}
