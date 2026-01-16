/**
 * @file services/__tests__/task-dependencies.test.ts
 * @description Tests for task dependency service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const { mockItems } = vi.hoisted(() => ({
  mockItems: {
    readOne: vi.fn(),
    readByQuery: vi.fn(),
    createOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../directus.js', () => ({
  directus: {
    items: vi.fn(() => mockItems),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

// Import after mocks
import { taskDependencyService } from '../task-dependencies.js';

describe('TaskDependencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDependency', () => {
    it('should create a new dependency', async () => {
      // Mock task validation
      mockItems.readOne
        .mockResolvedValueOnce({ id: 'task-1', project_id: 'proj-1' })
        .mockResolvedValueOnce({ id: 'task-2', project_id: 'proj-1' });

      // Mock no existing dependency
      mockItems.readByQuery.mockResolvedValueOnce({ data: [] });

      // Mock create
      mockItems.createOne.mockResolvedValueOnce({});

      const result = await taskDependencyService.createDependency({
        taskId: 'task-1',
        dependsOnId: 'task-2',
        dependencyType: 'blocks',
      });

      expect(result).toHaveProperty('id');
      expect(result.taskId).toBe('task-1');
      expect(result.dependsOnId).toBe('task-2');
      expect(result.dependencyType).toBe('blocks');
    });

    it('should reject self-dependency', async () => {
      await expect(
        taskDependencyService.createDependency({
          taskId: 'task-1',
          dependsOnId: 'task-1',
        })
      ).rejects.toThrow('cannot depend on itself');
    });

    it('should reject if tasks are in different projects', async () => {
      mockItems.readOne
        .mockResolvedValueOnce({ id: 'task-1', project_id: 'proj-1' })
        .mockResolvedValueOnce({ id: 'task-2', project_id: 'proj-2' });

      await expect(
        taskDependencyService.createDependency({
          taskId: 'task-1',
          dependsOnId: 'task-2',
        })
      ).rejects.toThrow(); // Will throw validation error
    });

    it('should reject if dependency already exists', async () => {
      mockItems.readOne
        .mockResolvedValueOnce({ id: 'task-1', project_id: 'proj-1' })
        .mockResolvedValueOnce({ id: 'task-2', project_id: 'proj-1' });

      mockItems.readByQuery.mockResolvedValueOnce({
        data: [{ id: 'existing-dep' }],
      });

      await expect(
        taskDependencyService.createDependency({
          taskId: 'task-1',
          dependsOnId: 'task-2',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('deleteDependency', () => {
    it('should delete a dependency by ID', async () => {
      mockItems.deleteOne.mockResolvedValueOnce({});

      await expect(
        taskDependencyService.deleteDependency('dep-123')
      ).resolves.not.toThrow();

      expect(mockItems.deleteOne).toHaveBeenCalledWith('dep-123');
    });
  });

  describe('getTaskDependencies', () => {
    it('should return dependencies for a task', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-1',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = await taskDependencyService.getTaskDependencies('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-1');
      expect(result[0].dependsOnId).toBe('task-2');
    });

    it('should return empty array if no dependencies', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({ data: [] });

      const result = await taskDependencyService.getTaskDependencies('task-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getTaskDependents', () => {
    it('should return tasks that depend on this task', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-2',
            depends_on_id: 'task-1',
            dependency_type: 'blocks',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = await taskDependencyService.getTaskDependents('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-2');
      expect(result[0].dependsOnId).toBe('task-1');
    });
  });

  describe('isTaskBlocked', () => {
    it('should return blocked=false if no blocking dependencies', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({ data: [] });

      const result = await taskDependencyService.isTaskBlocked('task-1');

      expect(result.blocked).toBe(false);
      expect(result.blockedBy).toHaveLength(0);
    });

    it('should return blocked=true if blocking task is not done', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-1',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      mockItems.readOne.mockResolvedValueOnce({
        id: 'task-2',
        status: 'in_progress',
      });

      const result = await taskDependencyService.isTaskBlocked('task-1');

      expect(result.blocked).toBe(true);
      expect(result.blockedBy).toContain('task-2');
    });

    it('should return blocked=false if blocking task is done', async () => {
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-1',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      mockItems.readOne.mockResolvedValueOnce({
        id: 'task-2',
        status: 'done',
      });

      const result = await taskDependencyService.isTaskBlocked('task-1');

      expect(result.blocked).toBe(false);
      expect(result.blockedBy).toHaveLength(0);
    });
  });

  describe('getProjectDependencyGraph', () => {
    it('should build dependency graph for project', async () => {
      // Mock todos
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          { id: 'task-1', status: 'todo' },
          { id: 'task-2', status: 'todo' },
          { id: 'task-3', status: 'todo' },
        ],
      });

      // Mock dependencies
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-2',
            depends_on_id: 'task-1',
            dependency_type: 'blocks',
          },
          {
            id: 'dep-2',
            task_id: 'task-3',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
          },
        ],
      });

      const result = await taskDependencyService.getProjectDependencyGraph('proj-1');

      expect(result.projectId).toBe('proj-1');
      expect(result.rootTasks).toContain('task-1');
      expect(result.leafTasks).toContain('task-3');
      expect(result.cycles).toHaveLength(0);
    });

    it('should detect cycles in dependency graph', async () => {
      // Mock todos
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          { id: 'task-1', status: 'todo' },
          { id: 'task-2', status: 'todo' },
        ],
      });

      // Mock circular dependencies
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-2',
            depends_on_id: 'task-1',
            dependency_type: 'blocks',
          },
          {
            id: 'dep-2',
            task_id: 'task-1',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
          },
        ],
      });

      const result = await taskDependencyService.getProjectDependencyGraph('proj-1');

      // Should detect the cycle
      expect(result.cycles.length).toBeGreaterThan(0);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return topologically sorted task order', async () => {
      // Mock todos
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          { id: 'task-1', status: 'todo' },
          { id: 'task-2', status: 'todo' },
          { id: 'task-3', status: 'todo' },
        ],
      });

      // Mock dependencies: task-1 -> task-2 -> task-3
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [
          {
            id: 'dep-1',
            task_id: 'task-2',
            depends_on_id: 'task-1',
            dependency_type: 'blocks',
          },
          {
            id: 'dep-2',
            task_id: 'task-3',
            depends_on_id: 'task-2',
            dependency_type: 'blocks',
          },
        ],
      });

      const order = await taskDependencyService.getExecutionOrder('proj-1');

      // task-1 should come before task-2, task-2 before task-3
      expect(order.indexOf('task-1')).toBeLessThan(order.indexOf('task-2'));
      expect(order.indexOf('task-2')).toBeLessThan(order.indexOf('task-3'));
    });
  });
});
