import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PullToRefresh from './PullToRefresh.vue'

describe('PullToRefresh', () => {
  it('shows "Refreshing..." in the indicator while refreshing', () => {
    const wrapper = mount(PullToRefresh, {
      props: { pullingDown: 80, refreshing: true },
    })
    expect(wrapper.find('.ptr-text').text()).toBe('Refreshing...')
  })

  it('shows "Pull to refresh" when not refreshing', () => {
    const wrapper = mount(PullToRefresh, {
      props: { pullingDown: 0, refreshing: false },
    })
    expect(wrapper.find('.ptr-text').text()).toBe('Pull to refresh')
  })

  it('renders the desktop button only when showRefreshBtn && !refreshing', () => {
    const hiddenByFlag = mount(PullToRefresh, {
      props: { pullingDown: 0, refreshing: false, showRefreshBtn: false },
    })
    expect(hiddenByFlag.find('.ptr-desktop-btn').exists()).toBe(false)

    const hiddenWhileRefreshing = mount(PullToRefresh, {
      props: { pullingDown: 80, refreshing: true, showRefreshBtn: true },
    })
    expect(hiddenWhileRefreshing.find('.ptr-desktop-btn').exists()).toBe(false)

    const shown = mount(PullToRefresh, {
      props: { pullingDown: 0, refreshing: false, showRefreshBtn: true },
    })
    expect(shown.find('.ptr-desktop-btn').exists()).toBe(true)
  })

  it('emits refresh when the desktop button is clicked', async () => {
    const wrapper = mount(PullToRefresh, {
      props: { pullingDown: 0, refreshing: false, showRefreshBtn: true },
    })
    await wrapper.find('.ptr-desktop-btn').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('renders the default slot content', () => {
    const wrapper = mount(PullToRefresh, {
      props: { pullingDown: 0, refreshing: false },
      slots: { default: '<p class="slot-child">content</p>' },
    })
    expect(wrapper.find('.slot-child').exists()).toBe(true)
  })
})
