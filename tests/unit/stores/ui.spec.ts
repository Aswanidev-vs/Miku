import { it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

beforeEach(() => setActivePinia(createPinia()))

it('defaults density to comfortable', () => {
  const ui = useUiStore()
  expect(ui.density).toBe('comfortable')
})

it('toggles density and reduced motion', () => {
  const ui = useUiStore()
  ui.setDensity('compact')
  expect(ui.density).toBe('compact')
  ui.toggleReducedMotion()
  expect(ui.reducedMotion).toBe(true)
})

it('shows a toast then clears it', () => {
  vi.useFakeTimers()
  const ui = useUiStore()
  ui.showToast('hi')
  expect(ui.toast).toBe('hi')
  vi.advanceTimersByTime(2600)
  expect(ui.toast).toBe('')
  vi.useRealTimers()
})
