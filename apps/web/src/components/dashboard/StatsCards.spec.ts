/**
 * @file StatsCards.spec.ts
 * @description Component tests for StatsCards.vue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StatsCards from './StatsCards.vue'

const globalStubs = {
  'q-card': { template: '<div class="q-card"><slot /></div>', props: ['flat'] },
  'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
  'q-icon': { template: '<i class="q-icon"><slot /></i>', props: ['name', 'size'] },
  LoadingState: { template: '<div class="loading-state" />' },
  EmptyState: { template: '<div class="empty-state"><slot /></div>', props: ['icon', 'message', 'actionLabel'] },
}

describe('StatsCards Component', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mockStats = [
    {
      key: 'workflows',
      icon: 'account_tree',
      title: 'Total Workflows',
      value: '150',
      change: 12.5,
      changeLabel: 'vs last week',
      color: 'primary' as const,
    },
    {
      key: 'executions',
      icon: 'play_arrow',
      title: 'Executions Today',
      value: '1,234',
      change: -5.2,
      changeLabel: 'vs yesterday',
      color: 'success' as const,
    },
    {
      key: 'successRate',
      icon: 'check_circle',
      title: 'Success Rate',
      value: '98.5%',
      change: 2.1,
      changeLabel: 'vs last month',
      color: 'info' as const,
    },
    {
      key: 'credits',
      icon: 'payments',
      title: 'Credits Balance',
      value: '5,000',
      change: 0,
      changeLabel: 'no change',
      color: 'warning' as const,
    },
  ]

  it('should render loading state when loading is true', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: [],
        loading: true,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.findAll('.stat-card-skeleton').length).toBeGreaterThan(0)
  })

  it('should render empty state when stats array is empty', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: [],
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.stats-empty-card').exists()).toBe(true)
  })

  it('should render stats cards when data is provided', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: mockStats,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    expect(wrapper.findAll('.stat-card').length).toBe(4)
  })

  it('should display correct stat values', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: mockStats,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const statValues = wrapper.findAll('.stat-value')
    expect(statValues[0].text()).toContain('150')
    expect(statValues[1].text()).toContain('1,234')
  })

  it('should display correct stat titles', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: mockStats,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const statLabels = wrapper.findAll('.stat-label')
    expect(statLabels[0].text()).toContain('Total Workflows')
    expect(statLabels[1].text()).toContain('Executions Today')
  })

  it('should show positive change with correct class', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: [mockStats[0]], // Positive change
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const changeBadge = wrapper.find('.stat-badge')
    expect(changeBadge.exists()).toBe(true)
    expect(changeBadge.classes()).toContain('positive')
  })

  it('should show negative change with correct class', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: [mockStats[1]], // Negative change
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const changeBadge = wrapper.find('.stat-badge')
    expect(changeBadge.exists()).toBe(true)
    expect(changeBadge.classes()).toContain('negative')
  })

  it('should show neutral change with correct class', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: [mockStats[3]], // Zero change
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const changeBadge = wrapper.find('.stat-badge')
    expect(changeBadge.exists()).toBe(true)
    expect(changeBadge.classes()).toContain('neutral')
  })

  it('should emit click event when stat card is clicked', async () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: mockStats,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    await wrapper.findAll('.stat-card')[0].trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0][0]).toEqual(mockStats[0])
  })

  it('should render stat icons with correct color class', () => {
    const wrapper = mount(StatsCards, {
      props: {
        stats: mockStats,
        loading: false,
      },
      global: {
        plugins: [pinia],
        stubs: globalStubs,
      },
    })

    const statIcons = wrapper.findAll('.stat-icon')
    expect(statIcons[0].classes()).toContain('primary')
    expect(statIcons[1].classes()).toContain('success')
  })
})


