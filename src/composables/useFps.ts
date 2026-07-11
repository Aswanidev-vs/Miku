/** Dev/perf guard: samples FPS via requestAnimationFrame and reports once per second. */
export function useFps(onSample: (fps: number) => void): () => void {
  if (typeof requestAnimationFrame === 'undefined') return () => {}
  let last = performance.now()
  let frames = 0
  let stopped = false

  const loop = (t: number) => {
    if (stopped) return
    frames++
    if (t - last >= 1000) {
      onSample(Math.round((frames * 1000) / (t - last)))
      frames = 0
      last = t
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  return () => {
    stopped = true
  }
}
