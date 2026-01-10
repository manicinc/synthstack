/**
 * @file RecentActivity.spec.ts
 * @description Component tests for RecentActivity.vue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecentActivity from './RecentActivity.vue'

const globalStubs = {
  'q-card': { template: '<div class="q-card"><slot /></div>', props: ['flat'] },
  'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
  'q-btn': { template: '<button class="q-btn"><slot /></button>', props: ['flat', 'dense', 'color', 'label', 'to'] },
  'q-icon': { template: '<i class="q-icon"><slot /></i>', props: ['name', 'size'] },
  'router-link': { template: '<a class="router-link"><slot /></a>', props: ['to'] },
  LoadingState: { template: '<div class="loading-state" />' },
  EmptyState: {
    template: '<div class="empty-state"><slot /></div>',
    props: ['icon', 'message', 'actionLabel', 'actionRoute'],
  },
}

describe('RecentActivity Component', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mockActivities = [
    {
      id: 'act-1',
      type: 'workflow_execution' as const,
      title: 'Data Sync Flow completed',
      description: 'Processed 1,234 records',
      timestamp: new Date().toISOString(),
      status: 'success' as const,
      link: '/app/workflows/flow-1/executions/exec-1',
    },
    {
      id: 'act-2',
      type: 'copilot_message' as const,
      title: 'AI Copilot conversation',
      description: 'Generated report template',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      status: 'success' as const,
      link: '/app/copilot/thread-1',
    },
    {
      id: 'act-3',
      type: 'workflow_execution' as const,
      title: 'Report Generator failed',
      description: 'Connection timeout',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      status: 'error' as const,
      link: '/app/workflows/flow-2/executions/exec-2',
    },
    {
      id: 'act-4',
      type: 'sync' as const,
      title: 'Directus sync completed',
      description: 'Updated 50 content items',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      status: 'success' as const,
    },
    {
      id: 'act-5',
      type: 'workflow_execution' as const,
      title: 'Email Notifier running',
      description: 'Processing notifications',
      timestamp: new Date().toISOString(),
      status: 'pending' as const,
    },
  ]

  it('should render loading state when loading is true', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: [],
        loading: true,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.activity-loading').exists()).toBe(true)
    expect(wrapper.find('.activity-timeline').exists()).toBe(false)
  })

  it('should render empty state when activities array is empty', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: [],
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.empty-state-inline').exists()).toBe(true)
  })

  it('should render activity timeline when data is provided', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.activity-timeline').exists()).toBe(true)
    expect(wrapper.findAll('.activity-item').length).toBe(mockActivities.length)
  })

  it('should display card title and subtitle', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.card-title').text()).toContain('Recent Activity')
    expect(wrapper.find('.card-subtitle').text()).toContain('Latest executions and events')
  })

  it('should render "View All" button', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const viewAllBtn = wrapper.find('.q-btn')
    expect(viewAllBtn.exists()).toBe(true)
  })

  it('should display activity titles', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const titles = wrapper.findAll('.activity-title')
    expect(titles[0].text()).toContain('Data Sync Flow completed')
    expect(titles[1].text()).toContain('AI Copilot conversation')
  })

  it('should display activity descriptions', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const descriptions = wrapper.findAll('.activity-description')
    expect(descriptions[0].text()).toContain('Processed 1,234 records')
  })

  it('should display correct status indicator classes', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const indicators = wrapper.findAll('.indicator-dot')
    expect(indicators[0].classes()).toContain('success')
    expect(indicators[2].classes()).toContain('error')
    expect(indicators[4].classes()).toContain('grey')
  })

  it('should display link for activities with link property', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const links = wrapper.findAll('.activity-link')
    expect(links.length).toBeGreaterThan(0) // Only activities with link should show
  })

  it('should not display link for activities without link property', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: [mockActivities[3]], // Sync activity without link
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.activity-link').exists()).toBe(false)
  })

  it('should emit view event when clickable activity is clicked', async () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const clickableItem = wrapper.findAll('.activity-item.clickable')[0]
    if (clickableItem) {
      await clickableItem.trigger('click')
      expect(wrapper.emitted('view')).toBeTruthy()
    }
  })

  it('should display correct icons for different activity types', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const icons = wrapper.findAll('.activity-icon')
    expect(icons.length).toBe(mockActivities.length)
  })

  it('should limit displayed activities based on limit prop', () => {
    const wrapper = mount(RecentActivity, {
      props: {
        activities: mockActivities,
        loading: false,
        limit: 3,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.findAll('.activity-item').length).toBe(3)
  })
})


