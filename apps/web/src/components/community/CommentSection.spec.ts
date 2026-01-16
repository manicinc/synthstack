import { shallowMount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CommentSection from './CommentSection.vue'

describe('CommentSection.vue', () => {
  const mockComments = [
    { id: '1', userId: 'u1', userName: 'Test User', content: 'Hello', createdAt: '2023-01-01' }
  ]

  it('renders comments', () => {
    const wrapper = shallowMount(CommentSection, {
      props: { comments: mockComments }
    })
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Test User')
  })

  it('emits add-comment event', async () => {
    const wrapper = shallowMount(CommentSection, {
      props: { comments: [] }
    })
    
    const input = wrapper.find('input')
    await input.setValue('New Comment')
    
    // Access the method directly from the component instance
    const vm = wrapper.vm as any
    
    // Manually set the newComment ref value if needed, although setValue should work if v-model is standard.
    // But with Quasar q-input stubbed as input, v-model might need explicit help or trigger.
    vm.newComment = 'New Comment'

    await vm.submitComment()
    
    expect(wrapper.emitted('add-comment')).toBeTruthy()
    expect(wrapper.emitted('add-comment')![0]).toEqual(['New Comment'])
  })
})
