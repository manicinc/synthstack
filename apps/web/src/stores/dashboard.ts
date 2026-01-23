/**
 * Dashboard Store
 * State management for dashboard analytics and real-time updates
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DashboardOverview, TimelinePoint, TopWorkflow, ActivityItem, AIUsageStats } from '@/services/dashboard'
import { dashboardService } from '@/services/dashboard'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const overview = ref<DashboardOverview | null>(null)
  const executionTimeline = ref<TimelinePoint[]>([])
  const topWorkflows = ref<TopWorkflow[]>([])
  const recentActivity = ref<ActivityItem[]>([])
  const aiUsage = ref<AIUsageStats | null>(null)
  const loading = ref(false)
  const lastUpdated = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const timelinePeriod = ref<'day' | 'week' | 'month'>('week')

  // Computed
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)
  const hasData = computed(() => !!overview.value)

  // COMMUNITY: Simplified stats without workflow and AI stats (PRO features)
  const quickStats = computed(() => {
    if (!overview.value) return []

    return [
      {
        key: 'projects',
        title: 'Active Projects',
        value: overview.value.projects?.active || 0,
        icon: 'folder',
        color: 'primary' as const,
        route: '/app/projects',
      },
      {
        key: 'credits',
        title: 'Credits Remaining',
        value: overview.value.credits.balance.toLocaleString(),
        icon: 'payments',
        color: overview.value.credits.balance < 100 ? 'warning' as const : 'info' as const,
        route: '/app/subscription',
      },
    ]
  })

  // COMMUNITY: Simplified usage breakdown without workflow credits
  const usageBreakdown = computed(() => {
    if (!overview.value) return { data: [], total: 0 }

    return {
      data: [
        {
          label: 'API Usage',
          value: overview.value.credits.usedThisMonth * 0.7,
          color: 'var(--accent-primary)'
        },
        {
          label: 'Storage',
          value: overview.value.credits.usedThisMonth * 0.3,
          color: 'var(--accent-secondary)'
        },
      ],
      total: overview.value.credits.usedThisMonth,
      change: overview.value.credits.projectedChange,
    }
  })

  // Actions
  async function fetchOverview() {
    loading.value = true
    error.value = null
    
    try {
      overview.value = await dashboardService.getOverview()
      lastUpdated.value = new Date()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch dashboard data'
      logError('Dashboard fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  // COMMUNITY: Workflow timeline not available (PRO feature)
  async function refreshTimeline(_period: 'day' | 'week' | 'month' = timelinePeriod.value) {
    executionTimeline.value = [] // Empty in Community Edition
  }

  // COMMUNITY: Top workflows not available (PRO feature)
  async function refreshTopWorkflows(_limit = 5) {
    topWorkflows.value = [] // Empty in Community Edition
  }

  async function refreshRecentActivity(limit = 10) {
    try {
      recentActivity.value = await dashboardService.getRecentActivity(limit)
    } catch (err) {
      logError('Recent activity fetch error:', err)
    }
  }

  // COMMUNITY: AI usage not available (PRO feature)
  async function refreshAIUsage() {
    aiUsage.value = null // Not available in Community Edition
  }

  async function refreshAll() {
    loading.value = true
    error.value = null
    
    try {
      await Promise.all([
        fetchOverview(),
        refreshTimeline(),
        refreshTopWorkflows(),
        refreshRecentActivity(),
        refreshAIUsage(),
      ])
    } finally {
      loading.value = false
    }
  }

  function handleWebSocketUpdate(event: { type: string; data: unknown }) {
    switch (event.type) {
      case 'workflow.execution': {
        // Add to recent activity
        const execution = event.data as ActivityItem
        recentActivity.value = [execution, ...recentActivity.value.slice(0, 9)]

        // Update overview stats
        if (overview.value) {
          overview.value.workflows.executions.today++
        }
        break
      }
        
      case 'copilot.message':
        // Update AI usage
        if (overview.value && aiUsage.value) {
          overview.value.aiUsage.conversationsToday++
          aiUsage.value.conversationsToday++
        }
        break
        
      case 'credits.update': {
        const credits = event.data as { balance: number; used: number }
        if (overview.value) {
          overview.value.credits.balance = credits.balance
        }
        break
      }
        
      case 'sync.directus':
        // Could trigger a refresh or show notification
        break
    }
    
    lastUpdated.value = new Date()
  }

  // Real-time update handlers (used by SSE composable)
  function addActivity(activity: ActivityItem | { id: string; type: string; title: string; timestamp: string; status: string }) {
    const newActivity: ActivityItem = {
      id: activity.id,
      type: activity.type as ActivityItem['type'],
      title: activity.title,
      timestamp: activity.timestamp,
      status: activity.status as ActivityItem['status'],
    }
    recentActivity.value = [newActivity, ...recentActivity.value.slice(0, 19)]
    lastUpdated.value = new Date()
  }

  function updateActivityStatus(activityId: string, status: ActivityItem['status']) {
    const activity = recentActivity.value.find(a => a.id === activityId)
    if (activity) {
      activity.status = status
    }
  }

  async function refreshOverview() {
    return fetchOverview()
  }

  function updateCredits(newBalance: number) {
    if (overview.value) {
      overview.value.credits.balance = newBalance
    }
    lastUpdated.value = new Date()
  }

  function handleStatsUpdate(data: Record<string, unknown>) {
    // Handle various stats updates
    if (data.executions && overview.value) {
      overview.value.workflows.executions = {
        ...overview.value.workflows.executions,
        ...(data.executions as object),
      }
    }
    
    if (data.aiUsage && overview.value) {
      overview.value.aiUsage = {
        ...overview.value.aiUsage,
        ...(data.aiUsage as object),
      }
    }
    
    lastUpdated.value = new Date()
  }

  function reset() {
    overview.value = null
    executionTimeline.value = []
    topWorkflows.value = []
    recentActivity.value = []
    aiUsage.value = null
    loading.value = false
    error.value = null
    lastUpdated.value = null
  }

  return {
    // State
    overview,
    executionTimeline,
    topWorkflows,
    recentActivity,
    aiUsage,
    loading,
    lastUpdated,
    error,
    timelinePeriod,
    
    // Computed
    isLoading,
    hasError,
    hasData,
    quickStats,
    usageBreakdown,
    
    // Actions
    fetchOverview,
    refreshTimeline,
    refreshTopWorkflows,
    refreshRecentActivity,
    refreshAIUsage,
    refreshAll,
    handleWebSocketUpdate,
    reset,
    
    // Real-time update handlers
    addActivity,
    updateActivityStatus,
    refreshOverview,
    updateCredits,
    handleStatsUpdate,
  }
})

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
