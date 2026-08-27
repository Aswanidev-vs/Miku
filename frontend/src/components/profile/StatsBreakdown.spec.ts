import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsBreakdown from './StatsBreakdown.vue'
import type { UserStatistics } from '../../types'

const statistics: UserStatistics = {
  anime: {
    count: 120,
    meanScore: 72,
    minutesWatched: 30000,
    episodesWatched: 1400,
    genres: [
      { genre: 'Action', count: 40 },
      { genre: 'Comedy', count: 20 },
      { genre: 'Drama', count: 10 },
    ],
    tags: [{ tag: { name: 'Time Skip' }, count: 6 }],
    studios: [{ studio: { name: 'MAPPA' }, count: 12 }],
    staff: [{ staff: { name: { full: 'Hideaki Anno' } }, count: 5 }],
    voiceActors: [{ voiceActor: { name: { full: 'Saori Hayami' } }, count: 9 }],
  },
  manga: {
    count: 30,
    meanScore: 78,
    chaptersRead: 2500,
    volumesRead: 120,
    genres: [{ genre: 'Slice of Life', count: 8 }],
    tags: [{ tag: { name: 'Iyashikei' }, count: 3 }],
  },
}

describe('StatsBreakdown', () => {
  it('renders genre rows with counts', () => {
    const wrapper = mount(StatsBreakdown, { props: { statistics } })
    expect(wrapper.text()).toContain('Top Genres')
    expect(wrapper.text()).toContain('Action')
    expect(wrapper.text()).toContain('40')
    expect(wrapper.text()).toContain('Comedy')
    expect(wrapper.text()).toContain('20')
  })

  it('sizes the top bar at 100% and scales the rest proportionally', () => {
    const wrapper = mount(StatsBreakdown, { props: { statistics } })
    const bars = wrapper.find('.breakdown-section').findAll('.breakdown-bar')
    const widths = bars.map((bar) => (bar.element as HTMLElement).style.width)
    expect(widths).toEqual(['100%', '50%', '25%'])
  })

  it('shows manga sections after switching to the Manga tab', async () => {
    const wrapper = mount(StatsBreakdown, { props: { statistics } })
    await wrapper.findAll('.breakdown-tab')[1].trigger('click')
    expect(wrapper.text()).toContain('Slice of Life')
    expect(wrapper.text()).toContain('Iyashikei')
    expect(wrapper.text()).not.toContain('Action')
    expect(wrapper.text()).not.toContain('Top Studios')
  })

  it('filters null entries without crashing', () => {
    const sparse = {
      anime: {
        count: 5,
        meanScore: 0,
        minutesWatched: 0,
        episodesWatched: 0,
        genres: [null, { genre: null, count: 3 }, { genre: 'Mecha', count: 2 }],
        tags: [{ tag: null, count: 4 }, { tag: { name: 'Robots' }, count: 1 }],
        studios: [{ studio: { name: null }, count: 2 }],
        staff: [{ staff: null, count: 2 }, { staff: { name: {} }, count: 1 }],
        voiceActors: [{ voiceActor: { name: null }, count: 2 }],
      },
      manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
    } as unknown as UserStatistics
    const wrapper = mount(StatsBreakdown, { props: { statistics: sparse } })
    expect(wrapper.text()).toContain('Mecha')
    expect(wrapper.text()).toContain('Robots')
    expect(wrapper.text()).not.toContain('Top Studios')
    expect(wrapper.text()).not.toContain('Top Staff')
    expect(wrapper.text()).not.toContain('Top Voice Actors')
    expect(wrapper.findAll('.breakdown-section')).toHaveLength(2)
  })

  it('shows a no-data line when every breakdown is empty', () => {
    const empty: UserStatistics = {
      anime: { count: 0, meanScore: 0, minutesWatched: 0, episodesWatched: 0 },
      manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
    }
    const wrapper = mount(StatsBreakdown, { props: { statistics: empty } })
    expect(wrapper.text()).toContain('No data yet')
    expect(wrapper.find('.breakdown-section').exists()).toBe(false)
  })
})
