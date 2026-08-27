import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActivityItem from './ActivityItem.vue'
import type { TextActivity, ListActivity } from '../../types'

const createdAt = Math.floor(Date.now() / 1000) - 120

const listActivity = {
  id: 1,
  type: 'ANIME_LIST',
  status: 'WATCHED_EPISODE',
  progress: 'episode 12',
  createdAt,
  user: { id: 7, name: 'MikuFan', avatar: { medium: 'https://example.com/avatar.png', large: '' } },
  media: { id: 42, title: { romaji: 'Test Anime' }, coverImage: { medium: 'https://example.com/cover.png', large: '' } },
} as unknown as ListActivity

const textActivity = {
  id: 2,
  type: 'TEXT',
  text: '<b>hello world</b><script>alert(1)</script>',
  createdAt,
  user: { id: 7, name: 'MikuFan', avatar: { medium: 'https://example.com/avatar.png', large: '' } },
} as unknown as TextActivity

describe('ActivityItem (list activity)', () => {
  it('renders user, status, media title and progress', () => {
    const wrapper = mount(ActivityItem, { props: { activity: listActivity } })
    expect(wrapper.find('.activity-user').text()).toBe('MikuFan')
    expect(wrapper.find('.activity-action').text()).toBe('watched episode')
    expect(wrapper.find('.activity-media').text()).toBe('Test Anime')
    expect(wrapper.find('.activity-progress').text()).toBe('episode 12')
    expect(wrapper.find('.activity-cover').attributes('src')).toBe('https://example.com/cover.png')
  })

  it('emits open-media with the media id on media title click', async () => {
    const wrapper = mount(ActivityItem, { props: { activity: listActivity } })
    await wrapper.find('.activity-media').trigger('click')
    expect(wrapper.emitted('open-media')).toEqual([[42]])
  })

  it('emits open-media with the media id on cover click', async () => {
    const wrapper = mount(ActivityItem, { props: { activity: listActivity } })
    await wrapper.find('.activity-cover').trigger('click')
    expect(wrapper.emitted('open-media')).toEqual([[42]])
  })

  it('emits open-user with the activity on avatar click', async () => {
    const wrapper = mount(ActivityItem, { props: { activity: listActivity } })
    await wrapper.find('.activity-avatar').trigger('click')
    expect(wrapper.emitted('open-user')).toEqual([[listActivity]])
  })
})

describe('ActivityItem (text activity)', () => {
  it('renders the sanitized message HTML', () => {
    const wrapper = mount(ActivityItem, { props: { activity: textActivity } })
    const message = wrapper.find('.activity-message')
    expect(message.html()).toContain('<b>hello world</b>')
    expect(message.html()).not.toContain('<script')
    expect(message.html()).not.toContain('alert(1)')
  })

  it('emits open-user with the activity on avatar click', async () => {
    const wrapper = mount(ActivityItem, { props: { activity: textActivity } })
    await wrapper.find('.activity-avatar').trigger('click')
    expect(wrapper.emitted('open-user')).toEqual([[textActivity]])
  })
})
