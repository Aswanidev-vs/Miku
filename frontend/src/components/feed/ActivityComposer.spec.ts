import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActivityComposer from './ActivityComposer.vue'

describe('ActivityComposer', () => {
  it('renders a textarea and a Post button', () => {
    const wrapper = mount(ActivityComposer)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('keeps the Post button disabled while the text is empty', async () => {
    const wrapper = mount(ActivityComposer)
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('hello')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('emits post with the trimmed text on click', async () => {
    const wrapper = mount(ActivityComposer)
    await wrapper.find('textarea').setValue('  hello world  ')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('post')).toEqual([['hello world']])
  })

  it('does not emit when the text is empty or whitespace', async () => {
    const wrapper = mount(ActivityComposer)
    await wrapper.find('button').trigger('click')

    await wrapper.find('textarea').setValue('   ')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('post')).toBeUndefined()
  })

  it('emits post on Ctrl+Enter', async () => {
    const wrapper = mount(ActivityComposer)
    await wrapper.find('textarea').setValue('ctrl post')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(wrapper.emitted('post')).toEqual([['ctrl post']])
  })
})
