import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

// jsdom has no matchMedia; install one before the settings singleton imports
// (it registers an OS-theme listener at module scope). OS defaults to dark.
vi.hoisted(() => {
  const mql = { matches: true, media: '(prefers-color-scheme: dark)' }
  ;(globalThis as Record<string, unknown>).matchMedia = vi.fn(() => ({
    ...mql,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

import AppearanceSettings from './AppearanceSettings.vue'
import { useSettings } from '../../composables/useSettings'

describe('AppearanceSettings', () => {
  const { settings, set } = useSettings()
  const root = document.documentElement

  beforeEach(async () => {
    set('theme', 'dark')
    set('accentColor', null)
    await nextTick()
  })

  it('renders the four theme options with dark active by default', () => {
    const wrapper = mount(AppearanceSettings)
    const buttons = wrapper.findAll('.theme-btn')
    expect(buttons.map((b) => b.text())).toEqual(['System', 'Dark', 'Light', 'Black'])
    expect(buttons[1].classes()).toContain('active')
  })

  it('switches theme and applies it to the document root', async () => {
    const wrapper = mount(AppearanceSettings)
    const light = wrapper.findAll('.theme-btn').find((b) => b.text() === 'Light')!
    await light.trigger('click')

    expect(settings.value.theme).toBe('light')
    expect(light.classes()).toContain('active')
    expect(root.getAttribute('data-theme')).toBe('light')
  })

  it('renders the six preset swatches with the default coral active', () => {
    const wrapper = mount(AppearanceSettings)
    const swatches = wrapper.findAll('.swatch')
    expect(swatches).toHaveLength(6)
    expect(swatches.at(-1)!.classes()).toContain('active') // #ff6f91 == default
  })

  it('selecting a preset stores it and inlines the accent vars', async () => {
    const wrapper = mount(AppearanceSettings)
    const blue = wrapper.find('[aria-label="Accent #6aa9e2"]')
    await blue.trigger('click')

    expect(settings.value.accentColor).toBe('#6aa9e2')
    expect(blue.classes()).toContain('active')
    expect(root.style.getPropertyValue('--color-primary')).toBe('#6aa9e2')
    expect(root.style.getPropertyValue('--color-primary-light'))
      .toBe('color-mix(in srgb, #6aa9e2 70%, white)')
  })

  it('picking the default coral swatch resets the accent back to token defaults', async () => {
    set('accentColor', '#69cf8c')
    await nextTick()

    const wrapper = mount(AppearanceSettings)
    await wrapper.find('[aria-label="Accent #ff6f91"]').trigger('click')

    expect(settings.value.accentColor).toBeNull()
    expect(root.style.getPropertyValue('--color-primary')).toBe('')
  })

  it('the custom color input stores a custom accent', async () => {
    const wrapper = mount(AppearanceSettings)
    const input = wrapper.find('.custom-input')
    ;(input.element as HTMLInputElement).value = '#123456'
    await input.trigger('input')

    expect(settings.value.accentColor).toBe('#123456')
    expect(root.style.getPropertyValue('--color-primary')).toBe('#123456')
  })

  it('reset clears a custom accent and is disabled when none is set', async () => {
    set('accentColor', '#e57e6e')
    await nextTick()

    const wrapper = mount(AppearanceSettings)
    const reset = wrapper.find('.reset-btn')
    expect(reset.attributes('disabled')).toBeUndefined()

    await reset.trigger('click')
    expect(settings.value.accentColor).toBeNull()
    expect(root.style.getPropertyValue('--color-primary')).toBe('')
    await nextTick()
    expect(wrapper.find('.reset-btn').attributes('disabled')).toBeDefined()
  })
})
