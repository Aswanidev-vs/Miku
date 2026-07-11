/** Lightweight parallax: translates the element on scroll for hero depth. */
export const vParallax = {
  mounted(el: HTMLElement, binding: { value?: number }) {
    const speed = binding.value ?? 0.3
    const onScroll = () => {
      const y = window.scrollY * speed
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    ;(el as unknown as { __par?: () => void }).__par = onScroll
  },
  unmounted(el: HTMLElement) {
    const fn = (el as unknown as { __par?: () => void }).__par
    if (fn) window.removeEventListener('scroll', fn)
  },
}
