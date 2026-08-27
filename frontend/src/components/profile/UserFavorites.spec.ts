import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserFavorites from './UserFavorites.vue'

const fullFavorites = {
  anime: { nodes: [{ id: 1, title: { romaji: 'Anime One' }, coverImage: { medium: 'anime.png' } }] },
  manga: { nodes: [{ id: 2, title: { romaji: 'Manga One' }, coverImage: { medium: 'manga.png' } }] },
  characters: { nodes: [{ id: 3, name: { full: 'Character One' }, image: { medium: 'character.png' } }] },
  staff: { nodes: [{ id: 4, name: { full: 'Staff One' }, image: { medium: 'staff.png' } }] },
}

describe('UserFavorites', () => {
  it('renders all four favorite groups', () => {
    const wrapper = mount(UserFavorites, {
      props: { favorites: fullFavorites },
    })
    expect(wrapper.text()).toContain('Anime One')
    expect(wrapper.text()).toContain('Manga One')
    expect(wrapper.text()).toContain('Character One')
    expect(wrapper.text()).toContain('Staff One')
    expect(wrapper.findAll('.favorite-item')).toHaveLength(4)
  })

  it('shows the empty state when there are no favorites', () => {
    const wrapper = mount(UserFavorites, {
      props: { favorites: {} },
    })
    expect(wrapper.text()).toContain('No favorites yet')
    expect(wrapper.find('.favorite-item').exists()).toBe(false)
  })

  it('distinguishes character and staff items with round images and type badges', () => {
    const wrapper = mount(UserFavorites, {
      props: { favorites: fullFavorites },
    })
    const characterItem = wrapper.find('.favorite-item.character')
    const staffItem = wrapper.find('.favorite-item.staff')
    expect(characterItem.find('.favorite-cover').classes()).toContain('round')
    expect(staffItem.find('.favorite-cover').classes()).toContain('round')
    expect(characterItem.find('.favorite-type').text()).toBe('character')
    expect(staffItem.find('.favorite-type').text()).toBe('staff')
  })
})
