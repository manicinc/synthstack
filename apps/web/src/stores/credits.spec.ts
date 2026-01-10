/**
 * @file stores/credits.spec.ts
 * @description Tests for the credits Pinia store
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCreditsStore } from './credits'

// Mock api
vi.mock('src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock Quasar
vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: vi.fn(),
    dialog: vi.fn().mockReturnValue({
      onOk: vi.fn().mockReturnThis(),
      onCancel: vi.fn().mockReturnThis(),
    }),
  }),
}))

// Mock devLogger
vi.mock('@/utils/devLogger', () => ({
  devLog: vi.fn(),
  devWarn: vi.fn(),
  devError: vi.fn(),
  logError: vi.fn(),
}))

import { api } from 'src/services/api'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
}

describe('Credits Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have default state values', () => {
      const store = useCreditsStore()

      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.unifiedCredits).toBeNull()
      expect(store.transactions).toEqual([])
      expect(store.workflowCreditsEnabled).toBe(false)
      expect(store.premiumNodeCosts).toEqual({})
    })
  })

  describe('Computed Getters', () => {
    it('should return 0 credits when unifiedCredits is null', () => {
      const store = useCreditsStore()

      expect(store.creditsRemaining).toBe(0)
      expect(store.tier).toBe('free')
      expect(store.hasCredits).toBe(false)
    })

    it('should return correct credits when data is loaded', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 100,
            lifetimeCreditsUsed: 50,
            tier: 'pro',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 5,
              dailyLimit: 100,
              unlimited: false,
            },
            workflows: {
              enabled: true,
              creditsUsedToday: 10,
              executionsToday: 3,
              freeExecutionsPerDay: 20,
              freeExecutionsRemaining: 17,
              creditMultiplier: 1.0,
            },
            totalCreditsUsedToday: 15,
          },
        },
      })

      await store.fetchUnifiedCredits()

      expect(store.creditsRemaining).toBe(100)
      expect(store.tier).toBe('pro')
      expect(store.hasCredits).toBe(true)
    })

    it('should detect low credits', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 3,
            lifetimeCreditsUsed: 97,
            tier: 'pro',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 97,
              dailyLimit: 100,
              unlimited: false,
            },
            workflows: {
              enabled: false,
              creditsUsedToday: 0,
              executionsToday: 0,
              freeExecutionsPerDay: 0,
              freeExecutionsRemaining: 0,
              creditMultiplier: 1.0,
            },
            totalCreditsUsedToday: 97,
          },
        },
      })

      await store.fetchUnifiedCredits()

      expect(store.isLowCredits).toBe(true)
    })

    it('should not detect low credits for unlimited users', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 3,
            lifetimeCreditsUsed: 97,
            tier: 'enterprise',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 97,
              dailyLimit: 999999,
              unlimited: true,
            },
            workflows: {
              enabled: true,
              creditsUsedToday: 0,
              executionsToday: 0,
              freeExecutionsPerDay: 999999,
              freeExecutionsRemaining: 999999,
              creditMultiplier: 0.5,
            },
            totalCreditsUsedToday: 97,
          },
        },
      })

      await store.fetchUnifiedCredits()

      expect(store.isLowCredits).toBe(false)
    })

    it('should check canRunWorkflow correctly', async () => {
      const store = useCreditsStore()

      // Case 1: workflows disabled
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 100,
            lifetimeCreditsUsed: 0,
            tier: 'free',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 0,
              dailyLimit: 10,
              unlimited: false,
            },
            workflows: {
              enabled: false,
              creditsUsedToday: 0,
              executionsToday: 0,
              freeExecutionsPerDay: 0,
              freeExecutionsRemaining: 0,
              creditMultiplier: 2.0,
            },
            totalCreditsUsedToday: 0,
          },
        },
      })

      await store.fetchUnifiedCredits()
      expect(store.canRunWorkflow).toBe(false)
    })

    it('should allow workflow when free executions available', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 0,
            lifetimeCreditsUsed: 100,
            tier: 'pro',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 100,
              dailyLimit: 100,
              unlimited: false,
            },
            workflows: {
              enabled: true,
              creditsUsedToday: 0,
              executionsToday: 5,
              freeExecutionsPerDay: 20,
              freeExecutionsRemaining: 15, // Has free executions
              creditMultiplier: 1.0,
            },
            totalCreditsUsedToday: 100,
          },
        },
      })

      await store.fetchUnifiedCredits()

      expect(store.canRunWorkflow).toBe(true)
    })
  })

  describe('fetchUnifiedCredits', () => {
    it('should fetch and store unified credits', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 50,
            lifetimeCreditsUsed: 150,
            tier: 'maker',
            resetsAt: '2024-02-01T00:00:00Z',
            ai: {
              creditsUsedToday: 10,
              dailyLimit: 50,
              unlimited: false,
            },
            workflows: {
              enabled: true,
              creditsUsedToday: 5,
              executionsToday: 2,
              freeExecutionsPerDay: 5,
              freeExecutionsRemaining: 3,
              creditMultiplier: 1.5,
            },
            totalCreditsUsedToday: 15,
          },
        },
      })

      await store.fetchUnifiedCredits()

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/unified')
      expect(store.unifiedCredits).toBeDefined()
      expect(store.creditsRemaining).toBe(50)
      expect(store.tier).toBe('maker')
    })

    it('should set loading state during fetch', async () => {
      const store = useCreditsStore()

      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockApi.get.mockReturnValueOnce(pendingPromise)

      const fetchPromise = store.fetchUnifiedCredits()
      expect(store.loading).toBe(true)

      resolvePromise!({ data: { success: true, data: { creditsRemaining: 0 } } })
      await fetchPromise

      expect(store.loading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const store = useCreditsStore()

      mockApi.get.mockRejectedValueOnce(new Error('Network error'))

      await store.fetchUnifiedCredits()

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchWorkflowConfig', () => {
    it('should fetch workflow configuration', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            workflowCreditsEnabled: true,
            premiumNodes: {
              'synthstack-agent': 3,
              'synthstack-openai': 2,
              'synthstack-slack': 1,
            },
          },
        },
      })

      await store.fetchWorkflowConfig()

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/workflow/config')
      expect(store.workflowCreditsEnabled).toBe(true)
      expect(store.premiumNodeCosts).toEqual({
        'synthstack-agent': 3,
        'synthstack-openai': 2,
        'synthstack-slack': 1,
      })
    })

    it('should handle missing premium nodes', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            workflowCreditsEnabled: false,
          },
        },
      })

      await store.fetchWorkflowConfig()

      expect(store.workflowCreditsEnabled).toBe(false)
      expect(store.premiumNodeCosts).toEqual({})
    })
  })

  describe('fetchTransactionHistory', () => {
    it('should fetch all transaction history', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            transactions: [
              {
                id: 'tx-1',
                type: 'debit',
                amount: -5,
                balance_before: 100,
                balance_after: 95,
                reference_type: 'ai_generation',
                reference_id: 'gen-123',
                reason: 'AI generation',
                metadata: {},
                created_at: '2024-01-15T10:00:00Z',
              },
              {
                id: 'tx-2',
                type: 'credit',
                amount: 50,
                balance_before: 50,
                balance_after: 100,
                reference_type: 'subscription',
                reference_id: null,
                reason: 'Monthly credit top-up',
                metadata: {},
                created_at: '2024-01-01T00:00:00Z',
              },
            ],
            pagination: {
              total: 2,
              limit: 50,
              offset: 0,
              hasMore: false,
            },
          },
        },
      })

      await store.fetchTransactionHistory()

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/history', {
        params: { limit: 50, offset: 0 }
      })
      expect(store.transactions).toHaveLength(2)
      expect(store.transactions[0].id).toBe('tx-1')
      expect(store.transactions[0].amount).toBe(-5)
      expect(store.transactions[0].balanceBefore).toBe(100) // Transformed from snake_case
    })

    it('should fetch workflow-specific history', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            transactions: [
              {
                id: 'tx-1',
                type: 'debit',
                amount: -3,
                balance_before: 50,
                balance_after: 47,
                reference_type: 'workflow_execution',
                reference_id: 'flow-123',
                reason: 'Workflow execution',
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
            pagination: {
              total: 1,
              limit: 50,
              offset: 0,
              hasMore: false,
            },
          },
        },
      })

      await store.fetchTransactionHistory({ type: 'workflow' })

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/workflow/history', {
        params: { limit: 50, offset: 0 }
      })
    })

    it('should support pagination options', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            transactions: [],
            pagination: {
              total: 100,
              limit: 10,
              offset: 20,
              hasMore: true,
            },
          },
        },
      })

      await store.fetchTransactionHistory({ limit: 10, offset: 20 })

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/history', {
        params: { limit: 10, offset: 20 }
      })
      expect(store.transactionsPagination.hasMore).toBe(true)
    })
  })

  describe('estimateWorkflowCost', () => {
    it('should estimate workflow cost', async () => {
      const store = useCreditsStore()

      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            estimate: {
              estimatedMinCost: 3,
              estimatedMaxCost: 5,
              breakdown: 'Base: 1, Nodes: 2, Premium: 2',
              canAfford: true,
              creditsRemaining: 50,
            },
            isFreeExecution: false,
            freeExecutionsRemaining: 0,
            nodeCount: 10,
            premiumNodeCount: 2,
          },
        },
      })

      const result = await store.estimateWorkflowCost('org-123', 'flow-456')

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/credits/workflow/estimate', {
        organizationId: 'org-123',
        flowId: 'flow-456',
      })
      expect(result).toBeDefined()
      expect(result?.estimate?.estimatedMinCost).toBe(3)
      expect(result?.isFreeExecution).toBe(false)
    })

    it('should return null on error', async () => {
      const store = useCreditsStore()

      mockApi.post.mockRejectedValueOnce(new Error('Network error'))

      const result = await store.estimateWorkflowCost('org-123', 'flow-456')

      expect(result).toBeNull()
    })

    it('should indicate free execution when available', async () => {
      const store = useCreditsStore()

      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            estimate: {
              estimatedMinCost: 2,
              estimatedMaxCost: 3,
              breakdown: 'Base: 1, Nodes: 1',
              canAfford: true,
              creditsRemaining: 50,
            },
            isFreeExecution: true,
            freeExecutionsRemaining: 15,
            nodeCount: 5,
            premiumNodeCount: 0,
          },
        },
      })

      const result = await store.estimateWorkflowCost('org-123', 'flow-456')

      expect(result?.isFreeExecution).toBe(true)
      expect(result?.freeExecutionsRemaining).toBe(15)
    })
  })

  describe('checkCreditsAvailability', () => {
    it('should check if credits are available', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            available: true,
            remaining: 50,
            required: 10,
            deficit: 0,
            unlimited: false,
          },
        },
      })

      const result = await store.checkCreditsAvailability(10)

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/credits/check', {
        params: { amount: 10 }
      })
      expect(result.available).toBe(true)
      expect(result.remaining).toBe(50)
    })

    it('should return unavailable when insufficient credits', async () => {
      const store = useCreditsStore()

      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            available: false,
            remaining: 5,
            required: 10,
            deficit: 5,
            unlimited: false,
          },
        },
      })

      const result = await store.checkCreditsAvailability(10)

      expect(result.available).toBe(false)
      expect(result.deficit).toBe(5)
    })

    it('should return default values on error', async () => {
      const store = useCreditsStore()

      mockApi.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await store.checkCreditsAvailability(10)

      expect(result.available).toBe(false)
      expect(result.deficit).toBe(10)
    })
  })

  describe('initialize', () => {
    it('should fetch both unified credits and workflow config', async () => {
      const store = useCreditsStore()

      mockApi.get
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              creditsRemaining: 100,
              tier: 'pro',
              ai: { creditsUsedToday: 0, dailyLimit: 100, unlimited: false },
              workflows: {
                enabled: true,
                creditsUsedToday: 0,
                executionsToday: 0,
                freeExecutionsPerDay: 20,
                freeExecutionsRemaining: 20,
                creditMultiplier: 1.0,
              },
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              workflowCreditsEnabled: true,
              premiumNodes: { 'synthstack-agent': 3 },
            },
          },
        })

      await store.initialize()

      expect(mockApi.get).toHaveBeenCalledTimes(2)
      expect(store.creditsRemaining).toBe(100)
      expect(store.workflowCreditsEnabled).toBe(true)
    })
  })

  describe('refresh', () => {
    it('should refresh unified credits', async () => {
      const store = useCreditsStore()

      // Initial fetch
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 100,
            tier: 'pro',
            ai: { creditsUsedToday: 0, dailyLimit: 100, unlimited: false },
            workflows: {
              enabled: true,
              creditsUsedToday: 0,
              executionsToday: 0,
              freeExecutionsPerDay: 20,
              freeExecutionsRemaining: 20,
              creditMultiplier: 1.0,
            },
          },
        },
      })

      await store.fetchUnifiedCredits()
      expect(store.creditsRemaining).toBe(100)

      // Refresh with updated data
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            creditsRemaining: 95,
            tier: 'pro',
            ai: { creditsUsedToday: 5, dailyLimit: 100, unlimited: false },
            workflows: {
              enabled: true,
              creditsUsedToday: 0,
              executionsToday: 0,
              freeExecutionsPerDay: 20,
              freeExecutionsRemaining: 20,
              creditMultiplier: 1.0,
            },
          },
        },
      })

      await store.refresh()

      expect(store.creditsRemaining).toBe(95)
    })
  })
})
