import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

// jsdom has no matchMedia; install one before the settings singleton imports
// (it registers an OS-theme listener at module scope).
vi.hoisted(() => {
  const mql = { matches: true, media: '(prefers-color-scheme: dark)' }
  ;(globalThis as Record<string, unknown>).matchMedia = vi.fn(() => ({
    ...mql,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

// The auth store pulls in Wails runtime + generated bindings at import time;
// stub them so the component can mount in jsdom without a Wails backend.
vi.mock('@wailsio/runtime', () => ({
  Browser: { OpenURL: vi.fn(() => Promise.resolve()) },
  Events: { On: vi.fn(), Off: vi.fn() },
}))

vi.mock('../../../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service', () => ({
  StartCallbackServer: vi.fn(),
  GetAuthorizationURL: vi.fn(),
  GetToken: vi.fn(),
  HandleCallback: vi.fn(),
  ConsumePendingCode: vi.fn(),
  Logout: vi.fn(),
  IsAuthenticated: vi.fn(),
  GetPendingCode: vi.fn(),
}))

vi.mock('../../api/graphql', () => ({
  gqlQuery: vi.fn(),
  gqlMutate: vi.fn(),
  clearGqlCache: vi.fn(),
  clearAuthTokenCache: vi.fn(),
}))

import AniListPreferences from './AniListPreferences.vue'
import { useSettings } from '../../composables/useSettings'
import { useAuthStore } from '../../stores/auth'
import { gqlMutate } from '../../api/graphql'
import type { User } from '../../types'

const accountUser: User = {
  id: 1,
  name: 'tester',
  avatar: { medium: '', large: '' },
  statistics: {
    anime: { count: 0, meanScore: 0, minutesWatched: 0, episodesWatched: 0 },
    manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
  },
  options: { displayAdultContent: true },
}

describe('AniListPreferences', () => {
  const { settings, set } = useSettings()
  let pinia: Pinia

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    set('titleLanguage', 'ACCOUNT')
    set('scoreFormat', 'ACCOUNT')
    set('defaultTab', '/')
    set('adultContent', null)
    vi.mocked(gqlMutate).mockReset()
    await nextTick()
  })

  function mountPrefs() {
    return mount(AniListPreferences, { global: { plugins: [pinia] } })
  }

  function pickOption(wrapper: ReturnType<typeof mountPrefs>, group: string, label: string) {
    const buttons = wrapper.find(`[aria-label="${group}"]`).findAll('.seg-btn')
    return buttons.find((b) => b.text() === label)!.trigger('click')
  }

  it('renders the group title and four preference rows', () => {
    const wrapper = mountPrefs()
    expect(wrapper.find('.group-title').text()).toBe('AniList Preferences')
    expect(wrapper.findAll('.setting-label').map((l) => l.text())).toEqual([
      'Title Language',
      'Score Format',
      'Default Tab',
      'Adult Content',
    ])
    expect(wrapper.findAll('.seg-picker')).toHaveLength(3)
    expect(wrapper.find('.switch').exists()).toBe(true)
  })

  it('marks the ACCOUNT defaults active initially', () => {
    const wrapper = mountPrefs()
    expect(wrapper.find('[aria-label="Title Language"] .seg-btn.active')!.text()).toBe('Account default')
    expect(wrapper.find('[aria-label="Score Format"] .seg-btn.active')!.text()).toBe('Account default')
    expect(wrapper.find('[aria-label="Default Tab"] .seg-btn.active')!.text()).toBe('Discover')
  })

  it('picking a title language stores it via set()', async () => {
    const wrapper = mountPrefs()
    await pickOption(wrapper, 'Title Language', 'English')
    expect(settings.value.titleLanguage).toBe('ENGLISH')

    await pickOption(wrapper, 'Title Language', 'Native')
    expect(settings.value.titleLanguage).toBe('NATIVE')
  })

  it('picking a score format stores it via set()', async () => {
    const wrapper = mountPrefs()
    await pickOption(wrapper, 'Score Format', '5-star')
    expect(settings.value.scoreFormat).toBe('POINT_5')

    await pickOption(wrapper, 'Score Format', '100-point')
    expect(settings.value.scoreFormat).toBe('POINT_100')
  })

  it('picking a default tab stores it via set()', async () => {
    const wrapper = mountPrefs()
    await pickOption(wrapper, 'Default Tab', 'Feed')
    expect(settings.value.defaultTab).toBe('/feed')

    await pickOption(wrapper, 'Default Tab', 'My List')
    expect(settings.value.defaultTab).toBe('/mylist')
  })

  it('toggling the adult switch writes an explicit boolean', async () => {
    const wrapper = mountPrefs()
    expect(settings.value.adultContent).toBeNull()
    expect(wrapper.find('.switch').classes()).not.toContain('on')
    expect(wrapper.find('.reset-btn').exists()).toBe(false)

    await wrapper.find('.switch').trigger('click')
    expect(settings.value.adultContent).toBe(true)
    expect(wrapper.find('.switch').classes()).toContain('on')

    await wrapper.find('.switch').trigger('click')
    expect(settings.value.adultContent).toBe(false)
    expect(wrapper.find('.switch').classes()).not.toContain('on')
  })

  it('the reset button appears when explicit and returns to account-following null', async () => {
    set('adultContent', true)
    await nextTick()

    const wrapper = mountPrefs()
    const reset = wrapper.find('.reset-btn')
    expect(reset.text()).toBe('Use account setting')

    await reset.trigger('click')
    expect(settings.value.adultContent).toBeNull()
    await nextTick()
    expect(wrapper.find('.reset-btn').exists()).toBe(false)
  })

  it('when null, the switch previews the AniList account value', async () => {
    const authStore = useAuthStore()
    authStore.user = accountUser
    await nextTick()

    const wrapper = mountPrefs()
    expect(settings.value.adultContent).toBeNull()
    const adultRow = wrapper.findAll('.setting-row').find((r) => r.find('.switch').exists())!
    expect(adultRow.find('.setting-hint').text()).toContain('Following your AniList account')
    expect(wrapper.find('.switch').classes()).toContain('on')

    // Toggling from the account-preview state writes the inverse explicitly
    await wrapper.find('.switch').trigger('click')
    expect(settings.value.adultContent).toBe(false)
  })

  it('saves non-ACCOUNT preferences to AniList and refreshes the viewer', async () => {
    vi.mocked(gqlMutate).mockResolvedValueOnce({ data: { UpdateUser: { id: 1 } } })
    set('titleLanguage', 'ENGLISH')
    set('scoreFormat', 'ACCOUNT')
    set('adultContent', true)

    const authStore = useAuthStore()
    authStore.isAuthenticated = true
    authStore.user = accountUser
    const fetchSpy = vi.spyOn(authStore, 'fetchUser').mockResolvedValue(undefined)
    await nextTick()

    const wrapper = mountPrefs()
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeUndefined()
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()

    expect(gqlMutate).toHaveBeenCalledOnce()
    const [mutation, variables] = vi.mocked(gqlMutate).mock.calls[0]
    expect(mutation).toContain('UpdateUser')
    expect(variables).toEqual({
      titleLanguage: 'ENGLISH',
      displayAdultContent: true,
      scoreFormat: undefined,
    })
    expect(fetchSpy).toHaveBeenCalled()
    expect(wrapper.find('.save-status').text()).toBe('Saved to your AniList account')
  })

  it('shows the AniList error when the save fails', async () => {
    vi.mocked(gqlMutate).mockRejectedValueOnce(new Error('validation'))
    set('adultContent', false)

    const authStore = useAuthStore()
    authStore.isAuthenticated = true
    await nextTick()

    const wrapper = mountPrefs()
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.save-error').text()).toBe('validation')
  })

  it('disables the save button while signed out', () => {
    const wrapper = mountPrefs()
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeDefined()
  })
})
