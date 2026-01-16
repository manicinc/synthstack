/**
 * @file api.ts
 * @description API service layer for communicating with the SynthStack backend.
 *
 * This module provides a centralized API client with:
 * - Automatic authentication header injection
 * - Error handling and retry logic
 * - Request/response interceptors
 * - Type-safe API methods for projects, todos, milestones, and copilot
 */

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useRateLimitStore } from '@/stores/rateLimit'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

/** Base API URL from environment */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

/** API response wrapper type */
export interface ApiResponse<T> {
  success?: boolean
  data: T
  message?: string
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    totalPages?: number
  }
}

/** API error type */
export interface ApiError {
  message: string
  code: string
  status: number
  details?: Record<string, unknown>
}

/**
 * Create configured Axios instance
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config) => {
      const authStore = useAuthStore()
      if (authStore.accessToken) {
        config.headers.Authorization = `Bearer ${authStore.accessToken}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const authStore = useAuthStore()

      // Handle 401 - try to refresh token
      if (error.response?.status === 401 && authStore.refreshToken) {
        try {
          await authStore.refreshSession()
          // Retry original request
          const originalRequest = error.config
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
            return client(originalRequest)
          }
        } catch {
          // Refresh failed, log out
          authStore.logout()
        }
      }

      // Transform error
      const responseData = error.response?.data as any
      const responseError = responseData?.error

      const nestedMessage =
        typeof responseError === 'string'
          ? responseError
          : responseError && typeof responseError === 'object'
            ? responseError.message || responseError.error
            : undefined

      const nestedCode =
        responseError && typeof responseError === 'object'
          ? responseError.code
          : undefined

      const headers = (error.response?.headers || {}) as Record<string, any>
      const rateLimitDetails: Record<string, unknown> = {}
      if (headers['x-ratelimit-limit'] !== undefined) rateLimitDetails.limit = Number(headers['x-ratelimit-limit'])
      if (headers['x-ratelimit-remaining'] !== undefined) rateLimitDetails.remaining = Number(headers['x-ratelimit-remaining'])
      if (headers['x-ratelimit-reset'] !== undefined) rateLimitDetails.reset = Number(headers['x-ratelimit-reset'])
      if (headers['retry-after'] !== undefined) rateLimitDetails.retryAfter = Number(headers['retry-after'])

      const details =
        responseData?.details
          ?? (responseError && typeof responseError === 'object' ? responseError : undefined)

      const apiError: ApiError = {
        message: responseData?.message || nestedMessage || error.message || 'An error occurred',
        code: responseData?.code || nestedCode || 'UNKNOWN_ERROR',
        status: error.response?.status || 500,
        details: Object.keys(rateLimitDetails).length > 0
          ? { ...(details || {}), rateLimit: rateLimitDetails }
          : details
      }

      try {
        if (Object.keys(rateLimitDetails).length > 0) {
          const rateLimitStore = useRateLimitStore()
          const method = String(error.config?.method || 'GET').toUpperCase()
          const url = String(error.config?.url || '')
          rateLimitStore.record(rateLimitDetails as any, {
            status: apiError.status,
            endpoint: url ? `${method} ${url}` : method,
          })
        }
      } catch {
        // Avoid breaking error handling if Pinia is not initialized.
      }

      return Promise.reject(apiError)
    }
  )

  return client
}

/** API client singleton */
const apiClient = createApiClient()

// ============================================
// Data Transformers (snake_case to camelCase)
// ============================================

/**
 * Special field mappings for Directus API compatibility
 * Maps API field names to frontend field names
 */
const FIELD_MAPPINGS: Record<string, string> = {
  date_created: 'createdAt',
  date_updated: 'updatedAt',
  owner_id: 'ownerId',
  project_id: 'projectId',
  due_date: 'dueDate',
  assignee_id: 'assigneeId',
  created_by: 'createdBy',
  target_date: 'targetDate',
  start_date: 'startDate',
  end_date: 'endDate',
  todo_count: 'todoCount',
  completed_todo_count: 'completedTodoCount',
  milestone_count: 'milestoneCount',
  is_system: 'isSystem',
  // GitHub integration fields
  github_issue_number: 'githubIssueNumber',
  github_pr_number: 'githubPrNumber',
  github_issue_url: 'githubIssueUrl',
  github_pr_url: 'githubPrUrl',
  github_synced_at: 'githubSyncedAt',
  github_sync_direction: 'githubSyncDirection',
}

/**
 * Convert snake_case keys to camelCase, with special mappings for Directus fields
 */
function snakeToCamel(str: string): string {
  // Check for special mappings first
  if (FIELD_MAPPINGS[str]) {
    return FIELD_MAPPINGS[str]
  }
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Reverse field mappings for sending data to API
 */
const REVERSE_FIELD_MAPPINGS: Record<string, string> = {
  createdAt: 'date_created',
  updatedAt: 'date_updated',
  ownerId: 'owner_id',
  projectId: 'project_id',
  dueDate: 'due_date',
  assigneeId: 'assignee_id',
  createdBy: 'created_by',
  targetDate: 'target_date',
  startDate: 'start_date',
  endDate: 'end_date',
  todoCount: 'todo_count',
  completedTodoCount: 'completed_todo_count',
  milestoneCount: 'milestone_count',
  isSystem: 'is_system',
  // GitHub integration fields
  githubIssueNumber: 'github_issue_number',
  githubPrNumber: 'github_pr_number',
  githubIssueUrl: 'github_issue_url',
  githubPrUrl: 'github_pr_url',
  githubSyncedAt: 'github_synced_at',
  githubSyncDirection: 'github_sync_direction',
}

/**
 * Convert camelCase keys to snake_case, with special mappings for Directus fields
 */
function camelToSnake(str: string): string {
  // Check for special mappings first
  if (REVERSE_FIELD_MAPPINGS[str]) {
    return REVERSE_FIELD_MAPPINGS[str]
  }
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Transform an object's keys from snake_case to camelCase
 */
function transformKeys<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    // Log is_system transformation specifically for debugging
    if (key === 'is_system') {
      devLog('[transformKeys] is_system:', value, '-> isSystem:', value)
    }
    // Handle nested objects (but not arrays or null)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformKeys(value as Record<string, unknown>)
    } else {
      result[camelKey] = value
    }
  }
  return result as T
}

/**
 * Transform an object's keys from camelCase to snake_case for API requests
 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue // Skip undefined values
    const snakeKey = camelToSnake(key)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>)
    } else {
      result[snakeKey] = value
    }
  }
  return result
}

/**
 * Transform an array of objects from snake_case to camelCase keys
 */
function transformArray<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map(item => transformKeys<T>(item))
}

// ============================================
// API Methods
// ============================================

/**
 * Generic GET request
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, config)
  // Debug logging for todos endpoint
  if (url.includes('/todos')) {
    devLog('[API get] Response for', url, ':', {
      success: response.data.success,
      dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'not array',
      dataType: typeof response.data.data,
    })
  }
  return response.data.data
}

/**
 * Generic POST request
 */
export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config)
  return response.data.data
}

/**
 * Generic PUT request
 */
export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config)
  return response.data.data
}

/**
 * Generic PATCH request
 */
export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config)
  return response.data.data
}

/**
 * Generic DELETE request
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url, config)
  return response.data.data
}

// ============================================
// Domain-Specific API Methods
// ============================================

// --- Projects ---

/** Project status types */
export type ProjectStatus = 'active' | 'completed' | 'archived'

/** Todo status types - matches GitHub issue workflow */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'review'

/** GitHub sync direction for todos */
export type GitHubSyncDirection = 'manual' | 'from_github' | 'to_github' | 'bidirectional'

/** Todo priority types */
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

/** Milestone status types */
export type MilestoneStatus = 'upcoming' | 'in_progress' | 'completed' | 'missed'

/** Marketing plan status types */
export type MarketingPlanStatus = 'draft' | 'active' | 'completed'

/** Tag color options (Quasar colors) */
export type TagColor = 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'dark' | 'grey'

/**
 * Project tag with name and color
 */
export interface ProjectTag {
  name: string
  color: TagColor
}

/**
 * Project entity
 */
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  ownerId?: string
  isSystem?: boolean
  tags?: ProjectTag[]
  createdAt: string
  updatedAt: string
  todoCount?: number
  completedTodoCount?: number
  milestoneCount?: number
  // GitHub integration
  github_repo?: string
  github_default_branch?: string
  github_sync_enabled?: boolean
  github_last_synced_at?: string
  use_global_pat?: boolean
}

/**
 * Todo item within a project
 */
export interface Todo {
  id: string
  projectId: string
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  dueDate?: string
  assigneeId?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  // GitHub integration
  githubIssueNumber?: number
  githubPrNumber?: number
  githubIssueUrl?: string
  githubPrUrl?: string
  githubSyncedAt?: string
  githubSyncDirection?: GitHubSyncDirection
}

/**
 * Milestone within a project
 */
export interface Milestone {
  id: string
  projectId: string
  title: string
  description?: string
  targetDate?: string
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
}

/**
 * Marketing plan within a project
 */
export interface MarketingPlan {
  id: string
  projectId: string
  title: string
  content?: Record<string, unknown>
  status: MarketingPlanStatus
  budget?: number
  startDate?: string
  endDate?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

/**
 * Projects API endpoints
 */
export const projects = {
  /** List all projects */
  list: async (params?: { page?: number; status?: ProjectStatus; limit?: number }): Promise<Project[]> => {
    const data = await get<Record<string, unknown>[]>('/api/v1/projects', { params })
    return transformArray<Project>(data)
  },

  /** Get a single project by ID */
  get: async (id: string): Promise<Project> => {
    const data = await get<Record<string, unknown>>(`/api/v1/projects/${id}`)
    devLog('[projects.get] Raw API data:', { id, is_system: data.is_system, keys: Object.keys(data) })
    const transformed = transformKeys<Project>(data)
    devLog('[projects.get] Transformed project:', { id, isSystem: transformed.isSystem, name: transformed.name })
    return transformed
  },

  /** Create a new project */
  create: async (data: { name: string; description?: string; tags?: ProjectTag[] }): Promise<Project> => {
    const result = await post<Record<string, unknown>>('/api/v1/projects', data)
    return transformKeys<Project>(result)
  },

  /** Update a project */
  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const apiData: Record<string, unknown> = {}
    if (data.name !== undefined) apiData.name = data.name
    if (data.description !== undefined) apiData.description = data.description
    if (data.status !== undefined) apiData.status = data.status
    if (data.tags !== undefined) apiData.tags = data.tags

    const result = await patch<Record<string, unknown>>(`/api/v1/projects/${id}`, apiData)
    return transformKeys<Project>(result)
  },

  /** Delete a project */
  delete: (id: string) =>
    del<void>(`/api/v1/projects/${id}`),

  /** Todo operations within a project */
  todos: {
    list: async (projectId: string, params?: { status?: TodoStatus }): Promise<Todo[]> => {
      const data = await get<Record<string, unknown>[]>(`/api/v1/projects/${projectId}/todos`, { params })
      devLog('[todos.list] Raw API data count:', data.length, 'first item keys:', data[0] ? Object.keys(data[0]) : 'empty')
      const transformed = transformArray<Todo>(data)
      devLog('[todos.list] Transformed todos count:', transformed.length)
      return transformed
    },

    create: async (projectId: string, data: { title: string; description?: string; priority?: TodoPriority; dueDate?: string }): Promise<Todo> => {
      // Transform camelCase to snake_case for API
      const apiData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.dueDate
      }
      const result = await post<Record<string, unknown>>(`/api/v1/projects/${projectId}/todos`, apiData)
      return transformKeys<Todo>(result)
    },

    update: async (projectId: string, todoId: string, data: Partial<Todo>): Promise<Todo> => {
      // Transform camelCase to snake_case for API
      const apiData: Record<string, unknown> = {}
      if (data.title !== undefined) apiData.title = data.title
      if (data.description !== undefined) apiData.description = data.description
      if (data.status !== undefined) apiData.status = data.status
      if (data.priority !== undefined) apiData.priority = data.priority
      if (data.dueDate !== undefined) apiData.due_date = data.dueDate
      if (data.assigneeId !== undefined) apiData.assignee_id = data.assigneeId

      const result = await patch<Record<string, unknown>>(`/api/v1/projects/${projectId}/todos/${todoId}`, apiData)
      return transformKeys<Todo>(result)
    },

    delete: (projectId: string, todoId: string) =>
      del<void>(`/api/v1/projects/${projectId}/todos/${todoId}`)
  },

  /** Milestone operations within a project */
  milestones: {
    list: async (projectId: string): Promise<Milestone[]> => {
      const data = await get<Record<string, unknown>[]>(`/api/v1/projects/${projectId}/milestones`)
      return transformArray<Milestone>(data)
    },

    create: async (projectId: string, data: { title: string; description?: string; targetDate?: string }): Promise<Milestone> => {
      const apiData = {
        title: data.title,
        description: data.description,
        target_date: data.targetDate
      }
      const result = await post<Record<string, unknown>>(`/api/v1/projects/${projectId}/milestones`, apiData)
      return transformKeys<Milestone>(result)
    },

    update: async (projectId: string, milestoneId: string, data: Partial<Milestone>): Promise<Milestone> => {
      const apiData: Record<string, unknown> = {}
      if (data.title !== undefined) apiData.title = data.title
      if (data.description !== undefined) apiData.description = data.description
      if (data.status !== undefined) apiData.status = data.status
      if (data.targetDate !== undefined) apiData.target_date = data.targetDate

      const result = await patch<Record<string, unknown>>(`/api/v1/projects/${projectId}/milestones/${milestoneId}`, apiData)
      return transformKeys<Milestone>(result)
    },

    delete: (projectId: string, milestoneId: string) =>
      del<void>(`/api/v1/projects/${projectId}/milestones/${milestoneId}`)
  },

  /** Marketing plan operations within a project */
  marketingPlans: {
    list: async (projectId: string): Promise<MarketingPlan[]> => {
      const data = await get<Record<string, unknown>[]>(`/api/v1/projects/${projectId}/marketing-plans`)
      return transformArray<MarketingPlan>(data)
    },

    create: async (projectId: string, data: { title: string; content?: Record<string, unknown>; budget?: number; startDate?: string; endDate?: string }): Promise<MarketingPlan> => {
      const apiData = {
        title: data.title,
        content: data.content,
        budget: data.budget,
        start_date: data.startDate,
        end_date: data.endDate
      }
      const result = await post<Record<string, unknown>>(`/api/v1/projects/${projectId}/marketing-plans`, apiData)
      return transformKeys<MarketingPlan>(result)
    },

    update: async (projectId: string, planId: string, data: Partial<MarketingPlan>): Promise<MarketingPlan> => {
      const apiData: Record<string, unknown> = {}
      if (data.title !== undefined) apiData.title = data.title
      if (data.content !== undefined) apiData.content = data.content
      if (data.status !== undefined) apiData.status = data.status
      if (data.budget !== undefined) apiData.budget = data.budget
      if (data.startDate !== undefined) apiData.start_date = data.startDate
      if (data.endDate !== undefined) apiData.end_date = data.endDate

      const result = await patch<Record<string, unknown>>(`/api/v1/projects/${projectId}/marketing-plans/${planId}`, apiData)
      return transformKeys<MarketingPlan>(result)
    },

    delete: (projectId: string, planId: string) =>
      del<void>(`/api/v1/projects/${projectId}/marketing-plans/${planId}`)
  },

  /** AI Copilot suggestions for a project */
  copilot: {
    suggestTodos: (projectId: string, context?: string) =>
      post<{ suggestions: string[] }>(`/api/v1/projects/${projectId}/copilot/suggest-todos`, { context }),

    suggestMilestones: (projectId: string, context?: string) =>
      post<{ suggestions: string[] }>(`/api/v1/projects/${projectId}/copilot/suggest-milestones`, { context }),

    generateMarketingPlan: (projectId: string, goals?: string) =>
      post<MarketingPlan>(`/api/v1/projects/${projectId}/copilot/generate-marketing-plan`, { goals })
  }
}

// --- User / Account ---

export interface User {
  id: string
  email: string
  username: string
  name?: string
  avatarUrl?: string
  plan: 'free' | 'maker' | 'pro'
  subscription_tier?: string
  credits: number
  createdAt: string
  emailVerified?: boolean
  isGuest?: boolean
  isAdmin?: boolean
}

export interface UserStats {
  generationsThisMonth: number
  generationsLimit: number
  profilesCreated: number
  profilesDownloaded: number
}

export const users = {
  me: () =>
    get<User>('/api/v1/users/me'),
  
  stats: () =>
    get<UserStats>('/api/v1/users/me/stats'),
  
  update: (data: Partial<User>) =>
    patch<User>('/api/v1/users/me', data),
}

// --- Credits / Subscription ---

export interface Subscription {
  id: string
  plan: 'free' | 'maker' | 'pro'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export const billing = {
  subscription: () =>
    get<Subscription>('/api/v1/billing/subscription'),

  createCheckout: (priceId: string) =>
    post<{ url: string }>('/api/v1/billing/checkout', { priceId }),

  createPortal: () =>
    post<{ url: string }>('/api/v1/billing/portal'),

  credits: () =>
    get<{ credits: number; limit: number }>('/api/v1/billing/credits')
}

// ============================================
// Gamification Types & API
// ============================================

/** Sprint duration types */
export type SprintDurationType = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'

/** Sprint status types */
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled'

/** Achievement rarity */
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/** User gamification stats */
export interface GamificationStats {
  totalPoints: number
  pointsThisWeek: number
  pointsThisMonth: number
  currentStreak: number
  longestStreak: number
  level: number
  levelTitle: string
  xpCurrent: number
  xpToNextLevel: number
  xpProgress: number
  tasksCompleted: number
  tasksCompletedEarly: number
  sprintsCompleted: number
  bestDailyPoints: number
  bestWeeklyPoints: number
  rank?: number
  // Aliases for backwards compatibility with components
  bestStreak?: number // alias for longestStreak
  xpForNextLevel?: number // alias for xpToNextLevel
  tasksCompletedThisWeek?: number // derived from tasksCompleted
  achievementsUnlocked?: number // optional, may not be available
  bestDayPoints?: number // alias for bestDailyPoints
  bestWeekPoints?: number // alias for bestWeeklyPoints
}

/** Points breakdown for task completion */
export interface PointsBreakdown {
  base: number
  priorityMultiplier: number
  earlyBonus: number
  streakBonus: number
  total: number
}

/** Task completion gamification result */
export interface GamificationResult {
  pointsAwarded: number
  breakdown: PointsBreakdown
  levelUp?: { newLevel: number; levelTitle: string }
  newAchievements: Achievement[]
  streak: number
}

/** Achievement entity */
export interface Achievement {
  id: string
  name: string
  slug: string
  description: string
  category: string
  icon: string
  badgeColor: string
  rarity: AchievementRarity
  requirementType: string
  requirementValue: number
  pointsReward: number
  isUnlocked?: boolean
  unlockedAt?: string
  progress?: number
}

/** Sprint entity */
export interface Sprint {
  id: string
  projectId: string
  name: string
  goal?: string
  durationType: SprintDurationType
  startDate: string
  endDate: string
  pointGoal: number
  pointsCompleted: number
  status: SprintStatus
  velocityActual: number
  velocityPredicted?: number
  taskCount?: number
  completedCount?: number
}

/** Retrospective entity */
export interface Retrospective {
  id: string
  sprintId: string
  wentWell: string[]
  needsImprovement: string[]
  actionItems: string[]
  sentimentRating?: number
  notes?: string
  isCompleted: boolean
  createdAt: string
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  userId: string
  userName: string
  userAvatar?: string
  totalPoints: number
  currentStreak: number
  level: number
  rank: number
  isCurrentUser: boolean
  // Aliases for backwards compatibility with components
  avatarUrl?: string // alias for userAvatar
  displayName?: string // alias for userName
  tasksCompleted?: number // optional stat
  points?: number // alias for totalPoints
}

/** Point history entry */
export interface PointEvent {
  id: string
  eventType: string
  pointsAwarded: number
  sourceType?: string
  sourceId?: string
  description?: string
  createdAt: string
}

/** Velocity data point */
export interface VelocityPoint {
  sprintId: string
  sprintName: string
  pointsCompleted: number
  velocityActual: number
  startDate: string
  endDate: string
}

/** Gamification API */
export const gamification = {
  /** Get user stats for a project */
  stats: (projectId: string) =>
    get<GamificationStats>(`/api/v1/gamification/stats/${projectId}`),

  /** Get global user stats */
  globalStats: () =>
    get<GamificationStats>('/api/v1/gamification/stats'),

  /** Get achievements with user progress */
  achievements: (params?: { projectId?: string; category?: string; unlockedOnly?: boolean }) =>
    get<Achievement[]>('/api/v1/gamification/achievements', { params }),

  /** Get project leaderboard */
  leaderboard: (projectId: string, params?: { limit?: number; period?: string }) =>
    get<LeaderboardEntry[]>(`/api/v1/gamification/leaderboard/${projectId}`, { params }),

  /** Get user point history */
  pointHistory: (params?: { projectId?: string; limit?: number; offset?: number }) =>
    get<PointEvent[]>('/api/v1/gamification/point-history', { params }),

  /** Complete a task and award points */
  completeTask: (todoId: string) =>
    post<GamificationResult>(`/api/v1/gamification/tasks/${todoId}/complete`),

  /** Sprint operations */
  sprints: {
    list: (projectId: string, params?: { status?: SprintStatus | 'all'; limit?: number }) =>
      get<Sprint[]>(`/api/v1/gamification/sprints/${projectId}`, { params }),

    get: (projectId: string, sprintId: string) =>
      get<Sprint>(`/api/v1/gamification/sprints/${projectId}/${sprintId}`),

    create: (projectId: string, data: {
      name: string
      goal?: string
      duration_type?: SprintDurationType
      start_date: string
      end_date: string
      point_goal?: number
    }) =>
      post<Sprint>(`/api/v1/gamification/sprints/${projectId}`, data),

    update: (projectId: string, sprintId: string, data: Partial<Sprint>) =>
      patch<Sprint>(`/api/v1/gamification/sprints/${projectId}/${sprintId}`, data),

    start: (projectId: string, sprintId: string) =>
      post<Sprint>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/start`),

    complete: (projectId: string, sprintId: string) =>
      post<{ sprint: Sprint; velocity: number }>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/complete`),

    addTasks: (projectId: string, sprintId: string, taskIds: string[]) =>
      post<void>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/tasks`, { task_ids: taskIds }),

    removeTask: (projectId: string, sprintId: string, todoId: string) =>
      del<void>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/tasks/${todoId}`)
  },

  /** Velocity data */
  velocity: (projectId: string, params?: { limit?: number }) =>
    get<VelocityPoint[]>(`/api/v1/gamification/velocity/${projectId}`, { params }),

  /** Retrospective operations */
  retrospectives: {
    get: (projectId: string, sprintId: string) =>
      get<Retrospective[]>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/retrospective`),

    add: (projectId: string, sprintId: string, data: {
      went_well?: string[]
      needs_improvement?: string[]
      action_items?: string[]
      sentiment_rating?: number
      notes?: string
    }) =>
      post<Retrospective>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/retrospective`, data),

    complete: (projectId: string, sprintId: string) =>
      post<void>(`/api/v1/gamification/sprints/${projectId}/${sprintId}/retrospective/complete`)
  }
}

// ============================================
// Export API client for custom requests
// ============================================

// ============================================
// Pricing Types & API
// ============================================

/** Pricing tier entity */
export interface PricingTier {
  id: string
  slug: string
  name: string
  description: string | null
  priceDisplay: string | null
  priceMonthly: number | null
  priceYearly: number | null
  billingType: 'recurring' | 'one_time' | 'custom'
  currency: string
  features: string[]
  badge: string | null
  badgeColor: string | null
  isFeatured: boolean
  isEnterprise: boolean
  ctaLabel: string
  ctaUrl: string | null
  ctaStyle: 'primary' | 'outline' | 'secondary'
  creditsMonthly: number | null
  creditsIncluded: string | null
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
}

/** Pricing API (public, no auth required) */
export const pricing = {
  /** Get all published pricing tiers */
  list: async (params?: {
    region?: string
    audience?: string
    billingType?: 'recurring' | 'one_time' | 'custom'
  }): Promise<PricingTier[]> => {
    const response = await apiClient.get<{ tiers: PricingTier[] }>('/api/v1/pricing/tiers', { params })
    return response.data.tiers
  },

  /** Get a specific pricing tier by slug */
  get: async (slug: string): Promise<PricingTier | null> => {
    try {
      const response = await apiClient.get<{ tier: PricingTier }>(`/api/v1/pricing/tiers/${slug}`)
      return response.data.tier
    } catch {
      return null
    }
  }
}

export { apiClient }

/** Named export for simpler imports */
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
}

export default {
  projects,
  profiles,
  users,
  billing,
  gamification,
  pricing,
  get,
  post,
  put,
  patch,
  del
}
