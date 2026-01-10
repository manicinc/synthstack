/**
 * @file credits.ts
 * @description Unified Pinia store for credit management (AI generations + Workflows)
 *
 * Manages:
 * - Overall credit balance and usage
 * - AI generation credits
 * - Workflow execution credits
 * - Credit transactions history
 * - Tier-based limits and multipliers
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

export interface CreditBalance {
  creditsRemaining: number
  lifetimeCreditsUsed: number
  tier: string
  resetsAt: string
}

export interface AICredits {
  creditsUsedToday: number
  dailyLimit: number
  unlimited: boolean
}

export interface MLServiceCredits {
  creditsUsedToday: number
  requestsToday: number
  enabled: boolean
}

export interface WorkflowCredits {
  enabled: boolean
  creditsUsedToday: number
  executionsToday: number
  freeExecutionsPerDay: number
  freeExecutionsRemaining: number
  creditMultiplier: number
}

export interface UnifiedCredits {
  creditsRemaining: number
  lifetimeCreditsUsed: number
  tier: string
  resetsAt: string
  ai: AICredits
  mlService: MLServiceCredits
  workflows: WorkflowCredits
  totalCreditsUsedToday: number
}

export interface CreditTransaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  referenceType: string
  referenceId: string | null
  reason: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface WorkflowCostEstimate {
  estimatedMinCost: number
  estimatedMaxCost: number
  breakdown: string
  canAfford: boolean
  creditsRemaining: number
}

export interface PremiumNodeCosts {
  [nodeType: string]: number
}

// ============================================
// Store
// ============================================

export const useCreditsStore = defineStore('credits', () => {
  const $q = useQuasar()

  // ============================================
  // State
  // ============================================

  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Unified credits data
  const unifiedCredits = ref<UnifiedCredits | null>(null)
  
  // Transaction history
  const transactions = ref<CreditTransaction[]>([])
  const transactionsPagination = ref({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  })
  
  // Workflow config
  const workflowCreditsEnabled = ref(false)
  const premiumNodeCosts = ref<PremiumNodeCosts>({})

  // ============================================
  // Getters
  // ============================================

  const creditsRemaining = computed(() => unifiedCredits.value?.creditsRemaining ?? 0)
  
  const tier = computed(() => unifiedCredits.value?.tier ?? 'free')
  
  const aiCredits = computed(() => unifiedCredits.value?.ai ?? {
    creditsUsedToday: 0,
    dailyLimit: 10,
    unlimited: false,
  })

  const mlServiceCredits = computed(() => unifiedCredits.value?.mlService ?? {
    creditsUsedToday: 0,
    requestsToday: 0,
    enabled: true,
  })

  const workflowCredits = computed(() => unifiedCredits.value?.workflows ?? {
    enabled: false,
    creditsUsedToday: 0,
    executionsToday: 0,
    freeExecutionsPerDay: 0,
    freeExecutionsRemaining: 0,
    creditMultiplier: 1.0,
  })
  
  const hasCredits = computed(() => creditsRemaining.value > 0)
  
  const isLowCredits = computed(() => {
    if (aiCredits.value.unlimited) return false
    return creditsRemaining.value <= 5 && creditsRemaining.value > 0
  })
  
  const canRunWorkflow = computed(() => {
    if (!workflowCredits.value.enabled) return false
    // Can run if free executions remaining or has credits
    return workflowCredits.value.freeExecutionsRemaining > 0 || creditsRemaining.value > 0
  })
  
  const workflowsEnabled = computed(() => workflowCredits.value.enabled)
  
  const freeWorkflowExecutionsRemaining = computed(() => 
    workflowCredits.value.freeExecutionsRemaining
  )

  // ============================================
  // Actions
  // ============================================

  /**
   * Fetch unified credit summary
   */
  async function fetchUnifiedCredits(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/api/v1/credits/unified')
      
      if (response.data?.success) {
        unifiedCredits.value = response.data.data
      }
    } catch (err: any) {
      logError('Failed to fetch unified credits:', err)
      error.value = err.message || 'Failed to fetch credits'
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch workflow credit configuration
   */
  async function fetchWorkflowConfig(): Promise<void> {
    try {
      const response = await api.get('/api/v1/credits/workflow/config')
      
      if (response.data?.success) {
        workflowCreditsEnabled.value = response.data.data.workflowCreditsEnabled
        premiumNodeCosts.value = response.data.data.premiumNodes || {}
      }
    } catch (err: any) {
      logError('Failed to fetch workflow config:', err)
    }
  }

  /**
   * Fetch credit transaction history
   */
  async function fetchTransactionHistory(options: {
    limit?: number
    offset?: number
    type?: 'all' | 'workflow'
  } = {}): Promise<void> {
    const { limit = 50, offset = 0, type = 'all' } = options
    loading.value = true

    try {
      const endpoint = type === 'workflow' 
        ? '/api/v1/credits/workflow/history'
        : '/api/v1/credits/history'
      
      const response = await api.get(endpoint, {
        params: { limit, offset }
      })
      
      if (response.data?.success) {
        transactions.value = response.data.data.transactions.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceBefore: t.balance_before,
          balanceAfter: t.balance_after,
          referenceType: t.reference_type,
          referenceId: t.reference_id,
          reason: t.reason,
          metadata: t.metadata,
          createdAt: t.created_at,
        }))
        transactionsPagination.value = response.data.data.pagination
      }
    } catch (err: any) {
      logError('Failed to fetch transaction history:', err)
      error.value = err.message || 'Failed to fetch history'
    } finally {
      loading.value = false
    }
  }

  /**
   * Estimate workflow execution cost
   */
  async function estimateWorkflowCost(
    organizationId: string,
    flowId: string
  ): Promise<{
    estimate: WorkflowCostEstimate | null
    isFreeExecution: boolean
    freeExecutionsRemaining: number
    nodeCount: number
    premiumNodeCount: number
  } | null> {
    try {
      const response = await api.post('/api/v1/credits/workflow/estimate', {
        organizationId,
        flowId,
      })
      
      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (err: any) {
      logError('Failed to estimate workflow cost:', err)
      return null
    }
  }

  /**
   * Check if user can afford a specific amount
   */
  async function checkCreditsAvailability(amount: number): Promise<{
    available: boolean
    remaining: number
    required: number
    deficit: number
    unlimited: boolean
  }> {
    try {
      const response = await api.get('/api/v1/credits/check', {
        params: { amount }
      })
      
      if (response.data?.success) {
        return response.data.data
      }
      
      return {
        available: false,
        remaining: 0,
        required: amount,
        deficit: amount,
        unlimited: false,
      }
    } catch (err: any) {
      logError('Failed to check credits:', err)
      return {
        available: false,
        remaining: 0,
        required: amount,
        deficit: amount,
        unlimited: false,
      }
    }
  }

  /**
   * Show low credits warning notification
   */
  function showLowCreditsWarning(): void {
    $q.notify({
      type: 'warning',
      message: `Only ${creditsRemaining.value} credits remaining`,
      caption: 'Upgrade for more credits',
      position: 'top',
      timeout: 8000,
      actions: [
        {
          label: 'Upgrade',
          color: 'white',
          noCaps: true,
          handler: () => navigateToPricing()
        },
        {
          icon: 'close',
          color: 'white',
          round: true
        }
      ]
    })
  }

  /**
   * Show insufficient credits modal
   */
  function showInsufficientCreditsModal(required: number): void {
    $q.dialog({
      title: '💳 Insufficient Credits',
      message: `This action requires ${required} credits, but you only have ${creditsRemaining.value}. Upgrade your plan or purchase more credits to continue.`,
      html: true,
      persistent: false,
      ok: {
        label: 'Upgrade Plan',
        color: 'primary',
        unelevated: true,
        noCaps: true
      },
      cancel: {
        label: 'Maybe Later',
        flat: true,
        noCaps: true
      },
    }).onOk(() => {
      navigateToPricing()
    })
  }

  /**
   * Show workflow cost confirmation dialog
   */
  function showWorkflowCostConfirmation(
    estimate: WorkflowCostEstimate,
    isFreeExecution: boolean,
    onConfirm: () => void
  ): void {
    if (isFreeExecution) {
      // Free execution - just confirm
      $q.dialog({
        title: '▶️ Run Workflow',
        message: 'This execution is free (within your daily free tier). Continue?',
        ok: {
          label: 'Run Workflow',
          color: 'primary',
          unelevated: true,
          noCaps: true
        },
        cancel: {
          label: 'Cancel',
          flat: true,
          noCaps: true
        },
      }).onOk(onConfirm)
      return
    }

    if (!estimate.canAfford) {
      showInsufficientCreditsModal(estimate.estimatedMinCost)
      return
    }

    $q.dialog({
      title: '💳 Workflow Cost',
      message: `
        <div class="q-mb-sm">
          <strong>Estimated cost:</strong> ${estimate.estimatedMinCost}-${estimate.estimatedMaxCost} credits
        </div>
        <div class="q-mb-sm text-caption">
          ${estimate.breakdown}
        </div>
        <div class="text-caption text-grey-7">
          Current balance: ${estimate.creditsRemaining} credits
        </div>
      `,
      html: true,
      ok: {
        label: `Run (${estimate.estimatedMinCost}+ credits)`,
        color: 'primary',
        unelevated: true,
        noCaps: true
      },
      cancel: {
        label: 'Cancel',
        flat: true,
        noCaps: true
      },
    }).onOk(onConfirm)
  }

  /**
   * Navigate to pricing page
   */
  function navigateToPricing(): void {
    window.location.href = '/pricing'
  }

  /**
   * Initialize the store
   */
  async function initialize(): Promise<void> {
    await Promise.all([
      fetchUnifiedCredits(),
      fetchWorkflowConfig(),
    ])
  }

  /**
   * Refresh credits data
   */
  async function refresh(): Promise<void> {
    await fetchUnifiedCredits()
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    loading,
    error,
    unifiedCredits,
    transactions,
    transactionsPagination,
    workflowCreditsEnabled,
    premiumNodeCosts,

    // Getters
    creditsRemaining,
    tier,
    aiCredits,
    mlServiceCredits,
    workflowCredits,
    hasCredits,
    isLowCredits,
    canRunWorkflow,
    workflowsEnabled,
    freeWorkflowExecutionsRemaining,

    // Actions
    fetchUnifiedCredits,
    fetchWorkflowConfig,
    fetchTransactionHistory,
    estimateWorkflowCost,
    checkCreditsAvailability,
    showLowCreditsWarning,
    showInsufficientCreditsModal,
    showWorkflowCostConfirmation,
    navigateToPricing,
    initialize,
    refresh,
  }
})


