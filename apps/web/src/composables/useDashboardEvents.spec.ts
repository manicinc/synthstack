/**
 * @file useDashboardEvents.spec.ts
 * @description Tests for useDashboardEvents composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock EventSource
class MockEventSource {
  // Static property to track constructor calls
  static calls: string[] = []
  static lastInstance: MockEventSource | null = null

  url: string
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  readyState: number = 0

  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()

  constructor(url: string) {
    MockEventSource.calls.push(url)
    MockEventSource.lastInstance = this
    this.url = url
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }
  
  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }
  
  removeEventListener(event: string, callback: (event: MessageEvent) => void) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }
  
  close() {
    this.readyState = 2
  }
  
  // Test helper to emit events
  simulateMessage(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const event = new MessageEvent(eventType, {
        data: JSON.stringify(data),
      })
      callbacks.forEach((cb) => cb(event))
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Store the original EventSource
const OriginalEventSource = globalThis.EventSource

describe('useDashboardEvents', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Reset mock tracking
    MockEventSource.calls = []
    MockEventSource.lastInstance = null

    // Mock EventSource globally with direct class assignment
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource

    // Reset module cache
    vi.resetModules()
  })

  afterEach(() => {
    // Restore EventSource
    globalThis.EventSource = OriginalEventSource
    MockEventSource.lastInstance = null
  })

  it('should initialize with disconnected state', async () => {
    // Mock auth store
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: false,
        accessToken: null,
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { isConnected, connectionError } = useDashboardEvents()

    expect(isConnected.value).toBe(false)
    expect(connectionError.value).toBe(null)
  })

  it('should not connect when not authenticated', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: false,
        accessToken: null,
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { connect, connectionError } = useDashboardEvents()

    connect()

    expect(connectionError.value).toBe('Not authenticated')
  })

  it('should not connect when no access token', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: null,
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { connect, connectionError } = useDashboardEvents()

    connect()

    expect(connectionError.value).toBe('No access token')
  })

  it('should connect when authenticated with token', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: 'test-token-123',
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { connect, isConnected } = useDashboardEvents()

    connect()

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 10))

    // EventSource should have been created with token
    expect(MockEventSource.calls.length).toBeGreaterThan(0)
    expect(MockEventSource.calls[0]).toContain('token=test-token-123')
  })

  it('should disconnect properly', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: 'test-token-123',
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { connect, disconnect, isConnected } = useDashboardEvents()

    connect()
    await new Promise((resolve) => setTimeout(resolve, 10))

    disconnect()

    expect(MockEventSource.lastInstance?.readyState).toBe(2) // Closed
  })

  it('should register event handlers', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: 'test-token-123',
      }),
    }))

    const mockAddActivity = vi.fn()
    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: mockAddActivity,
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { on, connect } = useDashboardEvents()

    const handler = vi.fn()
    const unsubscribe = on('workflow_execution_completed', handler)

    connect()
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Simulate event
    MockEventSource.lastInstance?.simulateMessage('workflow_execution_completed', {
      executionId: 'exec-1',
      flowName: 'Test Flow',
      status: 'completed',
    })

    expect(handler).toHaveBeenCalledWith({
      executionId: 'exec-1',
      flowName: 'Test Flow',
      status: 'completed',
    })

    // Test unsubscribe
    unsubscribe()
    handler.mockClear()
    MockEventSource.lastInstance?.simulateMessage('workflow_execution_completed', { test: true })
    expect(handler).not.toHaveBeenCalled()
  })

  it('should return correct connection status', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: 'test-token-123',
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { connectionStatus } = useDashboardEvents()

    // Initially disconnected
    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should track reconnect attempts', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: true,
        accessToken: 'test-token-123',
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEvents } = await import('./useDashboardEvents')
    const { reconnectAttempts } = useDashboardEvents()

    expect(reconnectAttempts.value).toBe(0)
  })
})

describe('useDashboardEventsGlobal', () => {
  beforeEach(() => {
    vi.resetModules()

    // Reset mock tracking
    MockEventSource.calls = []
    MockEventSource.lastInstance = null

    // Mock EventSource globally with direct class assignment
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource
  })

  afterEach(() => {
    globalThis.EventSource = OriginalEventSource
  })

  it('should return singleton instance', async () => {
    vi.doMock('@/stores/auth', () => ({
      useAuthStore: () => ({
        isAuthenticated: false,
        accessToken: null,
      }),
    }))

    vi.doMock('@/stores/dashboard', () => ({
      useDashboardStore: () => ({
        addActivity: vi.fn(),
        updateActivityStatus: vi.fn(),
        updateCredits: vi.fn(),
        handleStatsUpdate: vi.fn(),
      }),
    }))

    const { useDashboardEventsGlobal } = await import('./useDashboardEvents')

    const instance1 = useDashboardEventsGlobal()
    const instance2 = useDashboardEventsGlobal()

    expect(instance1).toBe(instance2)
  })
})

