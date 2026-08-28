import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePullToRefresh } from './usePullToRefresh'

// jsdom cannot construct real TouchEvents, so we dispatch plain Events with a
// stubbed `touches` list.
function touchEvent(type: string, clientY: number, clientX = 0): Event {
  const e = new Event(type, { cancelable: true })
  Object.defineProperty(e, 'touches', { value: [{ clientY, clientX }] })
  return e
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// Let queued microtasks run so awaited refresh promises settle.
async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('usePullToRefresh', () => {
  let el: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  it('divides raw pull distance by the resistance divisor (default 2.5)', () => {
    const h = usePullToRefresh(async () => {})
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 100))
    el.dispatchEvent(touchEvent('touchmove', 200)) // (200 - 100) / 2.5 = 40
    expect(h.pullingDown.value).toBe(40)

    // Pulling back up (negative delta) resets to 0
    el.dispatchEvent(touchEvent('touchmove', 100))
    expect(h.pullingDown.value).toBe(0)
  })

  it('caps pullingDown at threshold * 1.5', () => {
    const h = usePullToRefresh(async () => {})
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 0))
    el.dispatchEvent(touchEvent('touchmove', 1000)) // 1000 / 2.5 = 400 -> capped at 120
    expect(h.pullingDown.value).toBe(120)
  })

  it('triggers a refresh when the resisted pull crosses the threshold', async () => {
    const d = deferred()
    const onRefresh = vi.fn(() => d.promise)
    const h = usePullToRefresh(onRefresh) // threshold 80, resistance 2.5
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 0))
    el.dispatchEvent(touchEvent('touchmove', 250)) // 250 / 2.5 = 100 >= 80
    expect(h.pullingDown.value).toBe(100)

    el.dispatchEvent(touchEvent('touchend', 250))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(h.refreshing.value).toBe(true)
    expect(h.pullingDown.value).toBe(80) // snapped to the threshold while refreshing

    d.resolve()
    await flush()
    expect(h.refreshing.value).toBe(false)
    expect(h.pullingDown.value).toBe(0)
  })

  it('does not refresh when the pull stays below the threshold', () => {
    const onRefresh = vi.fn(async () => {})
    const h = usePullToRefresh(onRefresh)
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 0))
    el.dispatchEvent(touchEvent('touchmove', 150)) // 150 / 2.5 = 60 < 80
    el.dispatchEvent(touchEvent('touchend', 150))

    expect(onRefresh).not.toHaveBeenCalled()
    expect(h.refreshing.value).toBe(false)
    expect(h.pullingDown.value).toBe(0)
  })

  it('honors custom threshold and resistance options', () => {
    const h = usePullToRefresh(async () => {}, { threshold: 50, resistance: 2 })
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 0))
    el.dispatchEvent(touchEvent('touchmove', 120)) // 120 / 2 = 60 >= 50
    expect(h.pullingDown.value).toBe(60)

    el.dispatchEvent(touchEvent('touchend', 120))
    expect(h.refreshing.value).toBe(true)
    expect(h.pullingDown.value).toBe(50)
  })

  it('manualRefresh guards re-entrancy while a refresh is in flight', async () => {
    const d = deferred()
    const onRefresh = vi.fn(() => d.promise)
    const h = usePullToRefresh(onRefresh)

    const first = h.manualRefresh()
    expect(h.refreshing.value).toBe(true)

    const second = h.manualRefresh() // must be ignored while in flight
    expect(onRefresh).toHaveBeenCalledTimes(1)

    d.resolve()
    await Promise.all([first, second])
    expect(h.refreshing.value).toBe(false)
  })

  it('resets refreshing even when onRefresh rejects', async () => {
    const h = usePullToRefresh(() => Promise.reject(new Error('network')))
    await expect(h.manualRefresh()).rejects.toThrow('network')
    expect(h.refreshing.value).toBe(false)
  })

  it('shows the refresh button when the scroll container is at the top', () => {
    const h = usePullToRefresh(async () => {})
    h.setupListeners(el)
    // jsdom never scrolls, so scrollTop is 0 -> button visible
    expect(h.showRefreshBtn.value).toBe(true)
  })

  it('cancels pull when gesture is predominantly horizontal', () => {
    const h = usePullToRefresh(async () => {})
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 100, 100))
    // Move 50px right, only 10px down
    el.dispatchEvent(touchEvent('touchmove', 110, 150))
    expect(h.pullingDown.value).toBe(0)
  })

  it('cancels pull when initial vertical gesture is moving up (scrolling down)', () => {
    const h = usePullToRefresh(async () => {})
    h.setupListeners(el)

    el.dispatchEvent(touchEvent('touchstart', 100, 0))
    // Move up (finger Y decreases)
    el.dispatchEvent(touchEvent('touchmove', 80, 0))
    expect(h.pullingDown.value).toBe(0)

    // Subsequent move down within same touch should not pull
    el.dispatchEvent(touchEvent('touchmove', 150, 0))
    expect(h.pullingDown.value).toBe(0)
  })
})
