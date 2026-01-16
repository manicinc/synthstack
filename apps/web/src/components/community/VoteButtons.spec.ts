import { shallowMount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import VoteButtons from './VoteButtons.vue'

describe('VoteButtons.vue', () => {
  it('renders initial score', () => {
    const wrapper = shallowMount(VoteButtons, {
      props: { initialScore: 42 }
    })
    expect(wrapper.text()).toContain('42')
  })

  it('emits vote event on click', async () => {
    const wrapper = shallowMount(VoteButtons, {
      props: { initialScore: 10 }
    })
    
    const upBtn = wrapper.findAll('button')[0] 
    await upBtn.trigger('click')
    
    expect(wrapper.emitted('vote')).toBeTruthy()
    expect(wrapper.emitted('vote')![0]).toEqual(['up'])
  })

  it('updates local score optimistically', async () => {
    const wrapper = shallowMount(VoteButtons, {
      props: { initialScore: 10 }
    })
    
    const upBtn = wrapper.findAll('button')[0]
    await upBtn.trigger('click')
    expect(wrapper.text()).toContain('11')
  })
})
