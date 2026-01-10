/**
 * @file projects.spec.ts
 * @description Unit tests for the projects Pinia store.
 * Tests CRUD operations, computed properties, and AI copilot actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectsStore } from '@/stores/projects'
import type { Project, Todo, Milestone, MarketingPlan } from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  projects: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    todos: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    milestones: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    marketingPlans: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    copilot: {
      suggestTodos: vi.fn(),
      suggestMilestones: vi.fn(),
      generateMarketingPlan: vi.fn()
    }
  }
}))

// Import after mocking
import { projects as api } from '@/services/api'

describe('Projects Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty projects array initially', () => {
      const store = useProjectsStore()
      expect(store.projects).toEqual([])
    })

    it('should have null currentProject initially', () => {
      const store = useProjectsStore()
      expect(store.currentProject).toBeNull()
    })

    it('should have loading false initially', () => {
      const store = useProjectsStore()
      expect(store.loading).toBe(false)
    })

    it('should have null error initially', () => {
      const store = useProjectsStore()
      expect(store.error).toBeNull()
    })
  })

  describe('fetchProjects', () => {
    it('should fetch and store projects', async () => {
      const store = useProjectsStore()
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Test Project',
          description: 'Test description',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          todoCount: 5,
          completedTodoCount: 2,
          milestoneCount: 3
        }
      ]

      vi.mocked(api.list).mockResolvedValue(mockProjects)

      await store.fetchProjects()

      expect(api.list).toHaveBeenCalled()
      expect(store.projects).toEqual(mockProjects)
      expect(store.loading).toBe(false)
    })

    it('should handle fetch errors', async () => {
      const store = useProjectsStore()
      vi.mocked(api.list).mockRejectedValue(new Error('Network error'))

      await store.fetchProjects()

      expect(store.error).toBe('Failed to load projects')
      expect(store.loading).toBe(false)
    })
  })

  describe('createProject', () => {
    it('should create a new project', async () => {
      const store = useProjectsStore()
      const newProject: Project = {
        id: '2',
        name: 'New Project',
        description: 'New description',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      vi.mocked(api.create).mockResolvedValue(newProject)

      const result = await store.createProject({
        name: 'New Project',
        description: 'New description'
      })

      expect(api.create).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New description'
      })
      expect(result).toEqual(newProject)
      expect(store.projects).toContain(newProject)
    })

    it('should handle create errors', async () => {
      const store = useProjectsStore()
      vi.mocked(api.create).mockRejectedValue(new Error('Creation failed'))

      const result = await store.createProject({ name: 'Test' })

      expect(result).toBeNull()
      expect(store.error).toBe('Failed to create project')
    })
  })

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const store = useProjectsStore()
      const existingProject: Project = {
        id: '1',
        name: 'Original',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      const updatedProject: Project = {
        ...existingProject,
        name: 'Updated',
        updatedAt: '2024-01-02T00:00:00Z'
      }

      store.projects = [existingProject]
      vi.mocked(api.update).mockResolvedValue(updatedProject)

      const result = await store.updateProject('1', { name: 'Updated' })

      expect(api.update).toHaveBeenCalledWith('1', { name: 'Updated' })
      expect(result).toEqual(updatedProject)
      expect(store.projects[0].name).toBe('Updated')
    })
  })

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const store = useProjectsStore()
      store.projects = [
        {
          id: '1',
          name: 'To Delete',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]

      vi.mocked(api.delete).mockResolvedValue(undefined)

      const result = await store.deleteProject('1')

      expect(api.delete).toHaveBeenCalledWith('1')
      expect(result).toBe(true)
      expect(store.projects).toHaveLength(0)
    })
  })

  describe('Computed Properties', () => {
    it('should return active projects', () => {
      const store = useProjectsStore()
      store.projects = [
        { id: '1', name: 'Active', status: 'active', createdAt: '', updatedAt: '' },
        { id: '2', name: 'Completed', status: 'completed', createdAt: '', updatedAt: '' },
        { id: '3', name: 'Archived', status: 'archived', createdAt: '', updatedAt: '' }
      ]

      expect(store.activeProjects).toHaveLength(1)
      expect(store.activeProjects[0].name).toBe('Active')
    })

    it('should return completed projects', () => {
      const store = useProjectsStore()
      store.projects = [
        { id: '1', name: 'Active', status: 'active', createdAt: '', updatedAt: '' },
        { id: '2', name: 'Completed', status: 'completed', createdAt: '', updatedAt: '' }
      ]

      expect(store.completedProjects).toHaveLength(1)
      expect(store.completedProjects[0].name).toBe('Completed')
    })

    it('should return archived projects', () => {
      const store = useProjectsStore()
      store.projects = [
        { id: '1', name: 'Active', status: 'active', createdAt: '', updatedAt: '' },
        { id: '2', name: 'Archived', status: 'archived', createdAt: '', updatedAt: '' }
      ]

      expect(store.archivedProjects).toHaveLength(1)
      expect(store.archivedProjects[0].name).toBe('Archived')
    })

    it('should calculate total project count', () => {
      const store = useProjectsStore()
      store.projects = [
        { id: '1', name: 'P1', status: 'active', createdAt: '', updatedAt: '' },
        { id: '2', name: 'P2', status: 'completed', createdAt: '', updatedAt: '' }
      ]

      expect(store.projects.length).toBe(2)
    })
  })

  describe('Todos', () => {
    it('should fetch todos for a project', async () => {
      const store = useProjectsStore()
      const mockTodos: Todo[] = [
        {
          id: 't1',
          projectId: '1',
          title: 'Test Todo',
          status: 'pending',
          priority: 'medium',
          createdAt: '',
          updatedAt: ''
        }
      ]

      vi.mocked(api.todos.list).mockResolvedValue(mockTodos)

      await store.fetchTodos('1')

      expect(api.todos.list).toHaveBeenCalledWith('1')
      expect(store.todos).toEqual(mockTodos)
    })

    it('should create a new todo', async () => {
      const store = useProjectsStore()
      const newTodo: Todo = {
        id: 't1',
        projectId: '1',
        title: 'New Todo',
        status: 'pending',
        priority: 'high',
        createdAt: '',
        updatedAt: ''
      }

      vi.mocked(api.todos.create).mockResolvedValue(newTodo)

      const result = await store.createTodo('1', { title: 'New Todo', priority: 'high' })

      expect(api.todos.create).toHaveBeenCalledWith('1', { title: 'New Todo', priority: 'high' })
      expect(result).toEqual(newTodo)
      expect(store.todos).toContain(newTodo)
    })

    it('should update a todo', async () => {
      const store = useProjectsStore()
      const existingTodo: Todo = {
        id: 't1',
        projectId: '1',
        title: 'Original',
        status: 'pending',
        priority: 'medium',
        createdAt: '',
        updatedAt: ''
      }
      const updatedTodo: Todo = {
        ...existingTodo,
        status: 'completed'
      }

      store.todos = [existingTodo]
      vi.mocked(api.todos.update).mockResolvedValue(updatedTodo)

      await store.updateTodo('1', 't1', { status: 'completed' })

      expect(store.todos[0].status).toBe('completed')
    })

    it('should delete a todo', async () => {
      const store = useProjectsStore()
      store.todos = [
        {
          id: 't1',
          projectId: '1',
          title: 'To Delete',
          status: 'pending',
          priority: 'medium',
          createdAt: '',
          updatedAt: ''
        }
      ]

      vi.mocked(api.todos.delete).mockResolvedValue(undefined)

      await store.deleteTodo('1', 't1')

      expect(store.todos).toHaveLength(0)
    })
  })

  describe('Todo Computed Properties', () => {
    it('should return pending todos', () => {
      const store = useProjectsStore()
      store.todos = [
        { id: '1', projectId: 'p1', title: 'T1', status: 'pending', priority: 'medium', createdAt: '', updatedAt: '' },
        { id: '2', projectId: 'p1', title: 'T2', status: 'completed', priority: 'medium', createdAt: '', updatedAt: '' }
      ]

      expect(store.pendingTodos).toHaveLength(1)
    })

    it('should return completed todos', () => {
      const store = useProjectsStore()
      store.todos = [
        { id: '1', projectId: 'p1', title: 'T1', status: 'pending', priority: 'medium', createdAt: '', updatedAt: '' },
        { id: '2', projectId: 'p1', title: 'T2', status: 'completed', priority: 'medium', createdAt: '', updatedAt: '' }
      ]

      expect(store.completedTodos).toHaveLength(1)
    })

    it('should return urgent todos', () => {
      const store = useProjectsStore()
      store.todos = [
        { id: '1', projectId: 'p1', title: 'T1', status: 'pending', priority: 'urgent', createdAt: '', updatedAt: '' },
        { id: '2', projectId: 'p1', title: 'T2', status: 'pending', priority: 'medium', createdAt: '', updatedAt: '' }
      ]

      expect(store.urgentTodos).toHaveLength(1)
    })
  })

  describe('Milestones', () => {
    it('should fetch milestones', async () => {
      const store = useProjectsStore()
      const mockMilestones: Milestone[] = [
        {
          id: 'm1',
          projectId: '1',
          title: 'Milestone 1',
          status: 'upcoming',
          createdAt: '',
          updatedAt: ''
        }
      ]

      vi.mocked(api.milestones.list).mockResolvedValue(mockMilestones)

      await store.fetchMilestones('1')

      expect(store.milestones).toEqual(mockMilestones)
    })

    it('should create a milestone', async () => {
      const store = useProjectsStore()
      const newMilestone: Milestone = {
        id: 'm1',
        projectId: '1',
        title: 'New Milestone',
        status: 'upcoming',
        createdAt: '',
        updatedAt: ''
      }

      vi.mocked(api.milestones.create).mockResolvedValue(newMilestone)

      await store.createMilestone('1', { title: 'New Milestone' })

      expect(store.milestones).toContain(newMilestone)
    })
  })

  describe('Marketing Plans', () => {
    it('should fetch marketing plans', async () => {
      const store = useProjectsStore()
      const mockPlans: MarketingPlan[] = [
        {
          id: 'mp1',
          projectId: '1',
          title: 'Marketing Plan',
          status: 'draft',
          createdAt: '',
          updatedAt: ''
        }
      ]

      vi.mocked(api.marketingPlans.list).mockResolvedValue(mockPlans)

      await store.fetchMarketingPlans('1')

      expect(store.marketingPlans).toEqual(mockPlans)
    })
  })

  describe('AI Copilot Actions', () => {
    it('should get todo suggestions', async () => {
      const store = useProjectsStore()
      const suggestions = ['Todo 1', 'Todo 2', 'Todo 3']

      vi.mocked(api.copilot.suggestTodos).mockResolvedValue({ suggestions })

      const result = await store.suggestTodos('1', 'Build a web app')

      expect(api.copilot.suggestTodos).toHaveBeenCalledWith('1', 'Build a web app')
      expect(result).toEqual(suggestions)
    })

    it('should get milestone suggestions', async () => {
      const store = useProjectsStore()
      const suggestions = ['MVP Release', 'Beta Launch']

      vi.mocked(api.copilot.suggestMilestones).mockResolvedValue({ suggestions })

      const result = await store.suggestMilestones('1')

      expect(result).toEqual(suggestions)
    })

    it('should generate marketing plan', async () => {
      const store = useProjectsStore()
      const plan: MarketingPlan = {
        id: 'mp1',
        projectId: '1',
        title: 'AI Generated Plan',
        status: 'draft',
        content: { strategy: 'test' },
        createdAt: '',
        updatedAt: ''
      }

      vi.mocked(api.copilot.generateMarketingPlan).mockResolvedValue(plan)

      await store.generateMarketingPlan('1', 'Increase brand awareness')

      expect(api.copilot.generateMarketingPlan).toHaveBeenCalledWith('1', 'Increase brand awareness')
      expect(store.marketingPlans).toContain(plan)
    })

    it('should handle AI suggestion errors gracefully', async () => {
      const store = useProjectsStore()
      vi.mocked(api.copilot.suggestTodos).mockRejectedValue(new Error('AI service unavailable'))

      const result = await store.suggestTodos('1')

      expect(result).toEqual([])
    })
  })

  describe('Clear Methods', () => {
    it('should clear current project data', () => {
      const store = useProjectsStore()
      store.currentProject = {
        id: '1',
        name: 'Test',
        status: 'active',
        createdAt: '',
        updatedAt: ''
      }
      store.todos = [{ id: 't1', projectId: '1', title: 'T', status: 'pending', priority: 'medium', createdAt: '', updatedAt: '' }]
      store.milestones = [{ id: 'm1', projectId: '1', title: 'M', status: 'upcoming', createdAt: '', updatedAt: '' }]
      store.marketingPlans = [{ id: 'mp1', projectId: '1', title: 'MP', status: 'draft', createdAt: '', updatedAt: '' }]

      store.clearCurrentProject()

      expect(store.currentProject).toBeNull()
      expect(store.todos).toEqual([])
      expect(store.milestones).toEqual([])
      expect(store.marketingPlans).toEqual([])
    })
  })
})
