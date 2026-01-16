/**
 * Dashboard Service
 * API client for dashboard analytics endpoints
 */
import { api } from './api'
import { logError } from '@/utils/devLogger'

// Types
export interface WorkflowStats {
  total: number
  active: number
  changePercent: number
  executions: {
    today: number
    thisWeek: number
    thisMonth: number
    successRate: number
    avgDuration: number
  }
}

export interface AIUsageStats {
  tokensToday: number
  tokensThisWeek: number
  conversationsToday: number
  conversationsThisWeek: number
  changePercent: number
  trend: number[]
  topAgents: Array<{
    slug: string
    name: string
    invocations: number
    tokens: number
  }>
}

export interface CreditsStats {
  balance: number
  usedThisMonth: number
  projectedUsage: number
  projectedChange: number
}

export interface DashboardOverview {
  workflows: WorkflowStats
  aiUsage: AIUsageStats
  credits: CreditsStats
  recentActivity: ActivityItem[]
}

export interface TimelinePoint {
  date: string
  executions: number
  successful: number
  failed: number
}

export interface TopWorkflow {
  id: string
  name: string
  executions: number
  successRate: number
  avgDuration: number
  lastRun: string
  status: 'active' | 'paused' | 'error'
}

export interface ActivityItem {
  id: string
  type: 'workflow_execution' | 'copilot_message' | 'approval' | 'credit_usage' | 'sync'
  title: string
  description?: string
  timestamp: string
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending'
  link?: string
  metadata?: Record<string, unknown>
}

export interface AgentExecutionStats {
  agentSlug: string
  agentName: string
  invocations: number
  tokens: number
  avgResponseTime: number
}

export interface ConversationMetrics {
  totalConversations: number
  avgMessagesPerConversation: number
  avgResponseTime: number
  satisfactionRate: number
}

export interface MemoryGrowthTrend {
  date: string
  totalMemories: number
  newMemories: number
}

// API Service
class DashboardService {
  private baseUrl = '/api/v1/dashboard'

  /**
   * Get comprehensive dashboard overview
   */
  async getOverview(): Promise<DashboardOverview> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/overview`)
      return response.data
    } catch (error) {
      logError('Failed to fetch dashboard overview:', error)
      // Return mock data for development
      return this.getMockOverview()
    }
  }

  /**
   * Get workflow execution timeline
   */
  async getExecutionTimeline(days = 7): Promise<TimelinePoint[]> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/timeline`, {
        params: { days },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch execution timeline:', error)
      return this.getMockTimeline(days)
    }
  }

  /**
   * Get top performing workflows
   */
  async getTopWorkflows(limit = 5): Promise<TopWorkflow[]> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/top-workflows`, {
        params: { limit },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch top workflows:', error)
      return this.getMockTopWorkflows(limit)
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/activity`, {
        params: { limit },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch recent activity:', error)
      return this.getMockActivity(limit)
    }
  }

  /**
   * Get AI/Copilot usage stats
   */
  async getAIUsageStats(): Promise<AIUsageStats> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/ai-usage`)
      return response.data
    } catch (error) {
      logError('Failed to fetch AI usage stats:', error)
      return this.getMockAIUsage()
    }
  }

  /**
   * Get executions by agent
   */
  async getExecutionsByAgent(): Promise<AgentExecutionStats[]> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/by-agent`)
      return response.data
    } catch (error) {
      logError('Failed to fetch executions by agent:', error)
      return []
    }
  }

  /**
   * Get conversation metrics
   */
  async getConversationMetrics(): Promise<ConversationMetrics> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/conversations`)
      return response.data
    } catch (error) {
      logError('Failed to fetch conversation metrics:', error)
      return {
        totalConversations: 0,
        avgMessagesPerConversation: 0,
        avgResponseTime: 0,
        satisfactionRate: 0,
      }
    }
  }

  /**
   * Get memory growth trend
   */
  async getMemoryGrowthTrend(days = 30): Promise<MemoryGrowthTrend[]> {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/memory-growth`, {
        params: { days },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch memory growth:', error)
      return []
    }
  }

  /**
   * Export dashboard data
   * Returns blob for download
   */
  async exportData(
    dataType: 'workflow-analytics' | 'copilot-usage' | 'dashboard-overview',
    format: 'csv' | 'json' | 'pdf',
    range: 'day' | 'week' | 'month'
  ): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/analytics/export`, {
      params: { dataType, format, range },
      responseType: 'blob',
    })
    return response.data
  }

  /**
   * Get workflow analytics for a specific period
   */
  async getWorkflowAnalytics(period: 'day' | 'week' | 'month' = 'week') {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/workflows`, {
        params: { period },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch workflow analytics:', error)
      return null
    }
  }

  /**
   * Get copilot usage analytics for a specific period
   */
  async getCopilotUsage(period: 'day' | 'week' | 'month' = 'week') {
    try {
      const response = await api.get(`${this.baseUrl}/analytics/copilot`, {
        params: { period },
      })
      return response.data
    } catch (error) {
      logError('Failed to fetch copilot usage:', error)
      return null
    }
  }

  // Mock data for development
  private getMockOverview(): DashboardOverview {
    return {
      workflows: {
        total: 12,
        active: 8,
        changePercent: 15,
        executions: {
          today: 47,
          thisWeek: 312,
          thisMonth: 1248,
          successRate: 94.5,
          avgDuration: 2340,
        },
      },
      aiUsage: {
        tokensToday: 15420,
        tokensThisWeek: 87650,
        conversationsToday: 23,
        conversationsThisWeek: 156,
        changePercent: 12,
        trend: [12000, 14500, 13200, 15800, 14200, 15420],
        topAgents: [
          { slug: 'general', name: 'General Assistant', invocations: 45, tokens: 8500 },
          { slug: 'developer', name: 'Developer', invocations: 28, tokens: 4200 },
          { slug: 'researcher', name: 'Researcher', invocations: 18, tokens: 2720 },
        ],
      },
      credits: {
        balance: 4750,
        usedThisMonth: 1250,
        projectedUsage: 2000,
        projectedChange: 8,
      },
      recentActivity: this.getMockActivity(5),
    }
  }

  private getMockTimeline(days: number): TimelinePoint[] {
    const timeline: TimelinePoint[] = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      const executions = Math.floor(Math.random() * 50) + 10
      const successRate = 0.85 + Math.random() * 0.15
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        executions,
        successful: Math.floor(executions * successRate),
        failed: Math.floor(executions * (1 - successRate)),
      })
    }
    
    return timeline
  }

  private getMockTopWorkflows(limit: number): TopWorkflow[] {
    const workflows = [
      { id: '1', name: 'Lead Qualification', executions: 156, successRate: 98.2, avgDuration: 1250, status: 'active' as const },
      { id: '2', name: 'Email Campaign', executions: 89, successRate: 95.5, avgDuration: 3400, status: 'active' as const },
      { id: '3', name: 'Data Sync', executions: 312, successRate: 99.1, avgDuration: 890, status: 'active' as const },
      { id: '4', name: 'Report Generation', executions: 45, successRate: 92.0, avgDuration: 5600, status: 'paused' as const },
      { id: '5', name: 'Notification Dispatcher', executions: 234, successRate: 97.8, avgDuration: 450, status: 'active' as const },
    ]
    
    return workflows.slice(0, limit).map(w => ({
      ...w,
      lastRun: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }))
  }

  private getMockActivity(limit: number): ActivityItem[] {
    const activities: ActivityItem[] = [
      {
        id: '1',
        type: 'workflow_execution',
        title: 'Lead Qualification completed',
        description: 'Processed 12 new leads',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        status: 'success',
        link: '/app/workflows/logs/1',
      },
      {
        id: '2',
        type: 'copilot_message',
        title: 'AI Assistant conversation',
        description: 'Research on competitor analysis',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'success',
        link: '/app',
      },
      {
        id: '3',
        type: 'workflow_execution',
        title: 'Email Campaign triggered',
        description: 'Weekly newsletter dispatch',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'success',
        link: '/app/workflows/logs/3',
      },
      {
        id: '4',
        type: 'credit_usage',
        title: 'Credits consumed',
        description: '45 credits for workflow executions',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        status: 'info',
        link: '/app/subscription',
      },
      {
        id: '5',
        type: 'workflow_execution',
        title: 'Data Sync failed',
        description: 'API timeout error',
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        status: 'error',
        link: '/app/workflows/logs/5',
      },
      {
        id: '6',
        type: 'approval',
        title: 'Approval required',
        description: 'High-risk workflow pending review',
        timestamp: new Date(Date.now() - 28800000).toISOString(),
        status: 'warning',
        link: '/app/workflows/approvals',
      },
      {
        id: '7',
        type: 'sync',
        title: 'Directus sync completed',
        description: 'Project data synchronized',
        timestamp: new Date(Date.now() - 36000000).toISOString(),
        status: 'success',
      },
    ]
    
    return activities.slice(0, limit)
  }

  private getMockAIUsage(): AIUsageStats {
    return {
      tokensToday: 15420,
      tokensThisWeek: 87650,
      conversationsToday: 23,
      conversationsThisWeek: 156,
      changePercent: 12,
      trend: [12000, 14500, 13200, 15800, 14200, 16100, 15420],
      topAgents: [
        { slug: 'general', name: 'General Assistant', invocations: 45, tokens: 8500 },
        { slug: 'developer', name: 'Developer', invocations: 28, tokens: 4200 },
        { slug: 'researcher', name: 'Researcher', invocations: 18, tokens: 2720 },
      ],
    }
  }
}

export const dashboardService = new DashboardService()
export default dashboardService

