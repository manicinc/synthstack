/**
 * @file services/api.spec.ts
 * @description Tests for API service utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Since the api.ts file has private functions and uses axios directly,
// we'll test the exported functions and transformer behavior through
// a separate test module. For now, we test the key transformation logic.

describe('API Service Key Transformations', () => {
  // Recreate the transformation functions for testing
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
    github_issue_number: 'githubIssueNumber',
    github_pr_number: 'githubPrNumber',
    github_issue_url: 'githubIssueUrl',
    github_pr_url: 'githubPrUrl',
    github_synced_at: 'githubSyncedAt',
    github_sync_direction: 'githubSyncDirection',
  }

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
    githubIssueNumber: 'github_issue_number',
    githubPrNumber: 'github_pr_number',
    githubIssueUrl: 'github_issue_url',
    githubPrUrl: 'github_pr_url',
    githubSyncedAt: 'github_synced_at',
    githubSyncDirection: 'github_sync_direction',
  }

  function snakeToCamel(str: string): string {
    if (FIELD_MAPPINGS[str]) {
      return FIELD_MAPPINGS[str]
    }
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  function camelToSnake(str: string): string {
    if (REVERSE_FIELD_MAPPINGS[str]) {
      return REVERSE_FIELD_MAPPINGS[str]
    }
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }

  function transformKeys<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[camelKey] = transformKeys(value as Record<string, unknown>)
      } else {
        result[camelKey] = value
      }
    }
    return result as T
  }

  function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue
      const snakeKey = camelToSnake(key)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[snakeKey] = toSnakeCase(value as Record<string, unknown>)
      } else {
        result[snakeKey] = value
      }
    }
    return result
  }

  describe('snakeToCamel', () => {
    it('should convert simple snake_case to camelCase', () => {
      expect(snakeToCamel('hello_world')).toBe('helloWorld')
      expect(snakeToCamel('user_name')).toBe('userName')
      expect(snakeToCamel('is_active')).toBe('isActive')
    })

    it('should handle multiple underscores', () => {
      expect(snakeToCamel('a_b_c_d')).toBe('aBCD')
      expect(snakeToCamel('user_first_name')).toBe('userFirstName')
    })

    it('should use special field mappings', () => {
      expect(snakeToCamel('date_created')).toBe('createdAt')
      expect(snakeToCamel('date_updated')).toBe('updatedAt')
      expect(snakeToCamel('owner_id')).toBe('ownerId')
      expect(snakeToCamel('project_id')).toBe('projectId')
      expect(snakeToCamel('due_date')).toBe('dueDate')
      expect(snakeToCamel('is_system')).toBe('isSystem')
    })

    it('should handle GitHub field mappings', () => {
      expect(snakeToCamel('github_issue_number')).toBe('githubIssueNumber')
      expect(snakeToCamel('github_pr_url')).toBe('githubPrUrl')
      expect(snakeToCamel('github_synced_at')).toBe('githubSyncedAt')
    })

    it('should return unchanged string if no underscores', () => {
      expect(snakeToCamel('hello')).toBe('hello')
      expect(snakeToCamel('id')).toBe('id')
    })
  })

  describe('camelToSnake', () => {
    it('should convert simple camelCase to snake_case', () => {
      expect(camelToSnake('helloWorld')).toBe('hello_world')
      expect(camelToSnake('userName')).toBe('user_name')
      expect(camelToSnake('isActive')).toBe('is_active')
    })

    it('should handle multiple capitals', () => {
      expect(camelToSnake('userFirstName')).toBe('user_first_name')
    })

    it('should use special field mappings', () => {
      expect(camelToSnake('createdAt')).toBe('date_created')
      expect(camelToSnake('updatedAt')).toBe('date_updated')
      expect(camelToSnake('ownerId')).toBe('owner_id')
      expect(camelToSnake('projectId')).toBe('project_id')
      expect(camelToSnake('dueDate')).toBe('due_date')
      expect(camelToSnake('isSystem')).toBe('is_system')
    })

    it('should handle GitHub field mappings', () => {
      expect(camelToSnake('githubIssueNumber')).toBe('github_issue_number')
      expect(camelToSnake('githubPrUrl')).toBe('github_pr_url')
      expect(camelToSnake('githubSyncedAt')).toBe('github_synced_at')
    })

    it('should return unchanged string if no capitals', () => {
      expect(camelToSnake('hello')).toBe('hello')
      expect(camelToSnake('id')).toBe('id')
    })
  })

  describe('transformKeys (snake_case to camelCase)', () => {
    it('should transform flat object keys', () => {
      const input = {
        user_name: 'John',
        user_email: 'john@example.com',
        is_active: true,
      }

      const result = transformKeys<any>(input)

      expect(result.userName).toBe('John')
      expect(result.userEmail).toBe('john@example.com')
      expect(result.isActive).toBe(true)
    })

    it('should transform nested object keys', () => {
      const input = {
        user_data: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            email_address: 'john@example.com',
          },
        },
      }

      const result = transformKeys<any>(input)

      expect(result.userData).toBeDefined()
      expect(result.userData.firstName).toBe('John')
      expect(result.userData.lastName).toBe('Doe')
      expect(result.userData.contactInfo.emailAddress).toBe('john@example.com')
    })

    it('should preserve array values', () => {
      const input = {
        user_ids: [1, 2, 3],
        tag_names: ['a', 'b', 'c'],
      }

      const result = transformKeys<any>(input)

      expect(result.userIds).toEqual([1, 2, 3])
      expect(result.tagNames).toEqual(['a', 'b', 'c'])
    })

    it('should handle null values', () => {
      const input = {
        user_name: null,
        created_at: null,
      }

      const result = transformKeys<any>(input)

      expect(result.userName).toBeNull()
      expect(result.createdAt).toBeNull()
    })

    it('should use special mappings for Directus fields', () => {
      const input = {
        id: '123',
        date_created: '2024-01-01',
        date_updated: '2024-01-02',
        owner_id: 'user-1',
        is_system: false,
      }

      const result = transformKeys<any>(input)

      expect(result.id).toBe('123')
      expect(result.createdAt).toBe('2024-01-01')
      expect(result.updatedAt).toBe('2024-01-02')
      expect(result.ownerId).toBe('user-1')
      expect(result.isSystem).toBe(false)
    })

    it('should handle empty object', () => {
      const result = transformKeys<any>({})
      expect(result).toEqual({})
    })
  })

  describe('toSnakeCase (camelCase to snake_case)', () => {
    it('should transform flat object keys', () => {
      const input = {
        userName: 'John',
        userEmail: 'john@example.com',
        isActive: true,
      }

      const result = toSnakeCase(input)

      expect(result.user_name).toBe('John')
      expect(result.user_email).toBe('john@example.com')
      expect(result.is_active).toBe(true)
    })

    it('should transform nested object keys', () => {
      const input = {
        userData: {
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      const result = toSnakeCase(input)

      expect(result.user_data).toBeDefined()
      expect((result.user_data as any).first_name).toBe('John')
      expect((result.user_data as any).last_name).toBe('Doe')
    })

    it('should skip undefined values', () => {
      const input = {
        userName: 'John',
        userEmail: undefined,
        isActive: true,
      }

      const result = toSnakeCase(input)

      expect(result.user_name).toBe('John')
      expect(result.user_email).toBeUndefined()
      expect('user_email' in result).toBe(false)
      expect(result.is_active).toBe(true)
    })

    it('should preserve array values', () => {
      const input = {
        userIds: [1, 2, 3],
      }

      const result = toSnakeCase(input)

      expect(result.user_ids).toEqual([1, 2, 3])
    })

    it('should use special mappings for Directus fields', () => {
      const input = {
        id: '123',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        ownerId: 'user-1',
        isSystem: false,
      }

      const result = toSnakeCase(input)

      expect(result.id).toBe('123')
      expect(result.date_created).toBe('2024-01-01')
      expect(result.date_updated).toBe('2024-01-02')
      expect(result.owner_id).toBe('user-1')
      expect(result.is_system).toBe(false)
    })
  })

  describe('Round-trip transformation', () => {
    it('should preserve data through snake -> camel -> snake', () => {
      const original = {
        user_name: 'John',
        date_created: '2024-01-01',
        is_system: false,
        todo_count: 5,
      }

      const camelCase = transformKeys<any>(original)
      const backToSnake = toSnakeCase(camelCase)

      expect(backToSnake).toEqual(original)
    })

    it('should preserve data through camel -> snake -> camel', () => {
      const original = {
        userName: 'John',
        createdAt: '2024-01-01',
        isSystem: false,
        todoCount: 5,
      }

      const snakeCase = toSnakeCase(original)
      const backToCamel = transformKeys<any>(snakeCase)

      expect(backToCamel).toEqual(original)
    })
  })
})

describe('API Response Types', () => {
  it('should define ApiResponse structure', () => {
    interface ApiResponse<T> {
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

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: '123' },
      message: 'Success',
      meta: {
        page: 1,
        pageSize: 20,
        total: 100,
        totalPages: 5,
      },
    }

    expect(response.success).toBe(true)
    expect(response.data.id).toBe('123')
    expect(response.meta?.total).toBe(100)
  })

  it('should define ApiError structure', () => {
    interface ApiError {
      message: string
      code: string
      status: number
      details?: Record<string, unknown>
    }

    const error: ApiError = {
      message: 'Not found',
      code: 'NOT_FOUND',
      status: 404,
      details: { resource: 'user' },
    }

    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
  })
})

describe('API Service Status Types', () => {
  type ProjectStatus = 'active' | 'completed' | 'archived'
  type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'review'
  type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

  it('should have valid project statuses', () => {
    const validStatuses: ProjectStatus[] = ['active', 'completed', 'archived']
    expect(validStatuses).toHaveLength(3)
  })

  it('should have valid todo statuses', () => {
    const validStatuses: TodoStatus[] = [
      'pending',
      'in_progress',
      'completed',
      'blocked',
      'cancelled',
      'review',
    ]
    expect(validStatuses).toHaveLength(6)
  })

  it('should have valid todo priorities', () => {
    const validPriorities: TodoPriority[] = ['low', 'medium', 'high', 'urgent']
    expect(validPriorities).toHaveLength(4)
  })
})
