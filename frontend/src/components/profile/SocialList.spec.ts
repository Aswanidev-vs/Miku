import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SocialList from './SocialList.vue'
import type { User } from '../../types'

function makeUser(id: number, name: string): User {
  return {
    id,
    name,
    avatar: { medium: `https://img.test/${id}-m.png`, large: `https://img.test/${id}-l.png` },
    statistics: {
      anime: { count: 0, meanScore: 0, minutesWatched: 0, episodesWatched: 0 },
      manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
    },
    options: {},
  }
}

describe('SocialList', () => {
  it('renders the title and a chip per user', () => {
    const wrapper = mount(SocialList, {
      props: { title: 'Following', users: [makeUser(1, 'Alice'), makeUser(2, 'Bob')] },
    })
    expect(wrapper.text()).toContain('Following')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.findAll('.social-chip')).toHaveLength(2)
  })

  it('shows the empty state when there are no users', () => {
    const wrapper = mount(SocialList, {
      props: { title: 'Followers', users: [] },
    })
    expect(wrapper.text()).toContain('No one yet')
    expect(wrapper.find('.social-chip').exists()).toBe(false)
  })

  it('emits select with the user on chip click', async () => {
    const alice = makeUser(1, 'Alice')
    const wrapper = mount(SocialList, {
      props: { title: 'Following', users: [alice] },
    })
    await wrapper.find('.social-chip').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[alice]])
  })
})
