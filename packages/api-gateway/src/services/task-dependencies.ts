/**
 * Task Dependencies Service
 *
 * Manages task dependency relationships for project todos.
 * Supports blocking dependencies, related tasks, and subtasks.
 * Includes cycle detection to prevent circular dependencies.
 */

import { v4 as uuidv4 } from 'uuid';
import { directus } from './directus.js';
import type {
  TaskDependency,
  TaskDependencyType,
  TaskDependencyGraph,
  CreateTaskDependencyRequest,
  ProjectTask,
} from '@synthstack/types';

// ============================================
// Types
// ============================================

interface DependencyRecord {
  id: string;
  task_id: string;
  depends_on_id: string;
  dependency_type: TaskDependencyType;
  created_at: string;
  created_by?: string;
}

// ============================================
// Service Class
// ============================================

class TaskDependencyService {
  private collectionName = 'task_dependencies';

  /**
   * Create a new task dependency
   */
  async createDependency(
    request: CreateTaskDependencyRequest,
    userId?: string
  ): Promise<TaskDependency> {
    const { taskId, dependsOnId, dependencyType = 'blocks' } = request;

    // Validate tasks exist and are in the same project
    await this.validateTasks(taskId, dependsOnId);

    // Check for existing dependency
    const existing = await this.getDependency(taskId, dependsOnId);
    if (existing) {
      throw new Error('Dependency already exists between these tasks');
    }

    // Check for cycles
    if (dependencyType === 'blocks') {
      const wouldCreateCycle = await this.wouldCreateCycle(taskId, dependsOnId);
      if (wouldCreateCycle) {
        throw new Error('Cannot create dependency: would create a circular dependency');
      }
    }

    const dependency: DependencyRecord = {
      id: uuidv4(),
      task_id: taskId,
      depends_on_id: dependsOnId,
      dependency_type: dependencyType,
      created_at: new Date().toISOString(),
      created_by: userId,
    };

    try {
      const items = directus.items(this.collectionName);
      await items.createOne(dependency);

      return this.mapToTaskDependency(dependency);
    } catch (error) {
      console.error('Error creating dependency:', error);
      throw new Error('Failed to create task dependency');
    }
  }

  /**
   * Delete a task dependency
   */
  async deleteDependency(dependencyId: string): Promise<void> {
    try {
      const items = directus.items(this.collectionName);
      await items.deleteOne(dependencyId);
    } catch (error) {
      console.error('Error deleting dependency:', error);
      throw new Error('Failed to delete task dependency');
    }
  }

  /**
   * Delete dependency by task pair
   */
  async deleteDependencyByPair(taskId: string, dependsOnId: string): Promise<void> {
    try {
      const items = directus.items(this.collectionName);
      const result = await items.readByQuery({
        filter: {
          task_id: { _eq: taskId },
          depends_on_id: { _eq: dependsOnId },
        },
        limit: 1,
      });

      if (result.data && result.data.length > 0) {
        await items.deleteOne(result.data[0].id);
      }
    } catch (error) {
      console.error('Error deleting dependency by pair:', error);
      throw new Error('Failed to delete task dependency');
    }
  }

  /**
   * Get all dependencies for a task (tasks it depends on)
   */
  async getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    try {
      const items = directus.items(this.collectionName);
      const result = await items.readByQuery({
        filter: {
          task_id: { _eq: taskId },
        },
      });

      return (result.data || []).map((r: DependencyRecord) =>
        this.mapToTaskDependency(r)
      );
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      return [];
    }
  }

  /**
   * Get all dependents for a task (tasks that depend on it)
   */
  async getTaskDependents(taskId: string): Promise<TaskDependency[]> {
    try {
      const items = directus.items(this.collectionName);
      const result = await items.readByQuery({
        filter: {
          depends_on_id: { _eq: taskId },
        },
      });

      return (result.data || []).map((r: DependencyRecord) =>
        this.mapToTaskDependency(r)
      );
    } catch (error) {
      console.error('Error fetching dependents:', error);
      return [];
    }
  }

  /**
   * Get a specific dependency between two tasks
   */
  async getDependency(taskId: string, dependsOnId: string): Promise<TaskDependency | null> {
    try {
      const items = directus.items(this.collectionName);
      const result = await items.readByQuery({
        filter: {
          task_id: { _eq: taskId },
          depends_on_id: { _eq: dependsOnId },
        },
        limit: 1,
      });

      if (result.data && result.data.length > 0) {
        return this.mapToTaskDependency(result.data[0] as DependencyRecord);
      }
      return null;
    } catch (error) {
      console.error('Error fetching dependency:', error);
      return null;
    }
  }

  /**
   * Check if a task is blocked by uncompleted dependencies
   */
  async isTaskBlocked(taskId: string): Promise<{ blocked: boolean; blockedBy: string[] }> {
    try {
      // Get blocking dependencies
      const dependencies = await this.getTaskDependencies(taskId);
      const blockingDeps = dependencies.filter((d) => d.dependencyType === 'blocks');

      if (blockingDeps.length === 0) {
        return { blocked: false, blockedBy: [] };
      }

      // Check status of blocking tasks
      const blockedBy: string[] = [];
      const todoItems = directus.items('todos');

      for (const dep of blockingDeps) {
        try {
          const task = await todoItems.readOne(dep.dependsOnId);
          if (task && task.status !== 'done' && task.status !== 'cancelled') {
            blockedBy.push(dep.dependsOnId);
          }
        } catch {
          // Task might not exist
        }
      }

      return { blocked: blockedBy.length > 0, blockedBy };
    } catch (error) {
      console.error('Error checking blocked status:', error);
      return { blocked: false, blockedBy: [] };
    }
  }

  /**
   * Get the full dependency graph for a project
   */
  async getProjectDependencyGraph(projectId: string): Promise<TaskDependencyGraph> {
    try {
      // Get all todos for the project
      const todoItems = directus.items('todos');
      const todosResult = await todoItems.readByQuery({
        filter: { project_id: { _eq: projectId } },
        fields: ['id', 'status'],
      });
      const todos = todosResult.data || [];
      const todoIds = new Set<string>(todos.map((t: { id: string }) => t.id));
      const todoIdArray: string[] = Array.from(todoIds);

      // Get all dependencies for these todos
      const items = directus.items(this.collectionName);
      const depsResult = await items.readByQuery({
        filter: {
          _or: [
            { task_id: { _in: todoIdArray } },
            { depends_on_id: { _in: todoIdArray } },
          ],
        },
      });
      const deps = (depsResult.data || []) as DependencyRecord[];

      // Build graph structures
      const dependencies: Record<string, string[]> = {};
      const dependents: Record<string, string[]> = {};

      for (const taskId of todoIdArray) {
        dependencies[taskId] = [];
        dependents[taskId] = [];
      }

      for (const dep of deps) {
        if (dependencies[dep.task_id]) {
          dependencies[dep.task_id].push(dep.depends_on_id);
        }
        if (dependents[dep.depends_on_id]) {
          dependents[dep.depends_on_id].push(dep.task_id);
        }
      }

      // Find root tasks (no dependencies)
      const rootTasks: string[] = todoIdArray.filter(
        (id: string) => dependencies[id].length === 0
      );

      // Find leaf tasks (no dependents)
      const leafTasks: string[] = todoIdArray.filter(
        (id: string) => dependents[id].length === 0
      );

      // Detect cycles
      const cycles = this.detectCycles(dependencies);

      return {
        projectId,
        dependencies,
        dependents,
        rootTasks,
        leafTasks,
        cycles,
      };
    } catch (error) {
      console.error('Error building dependency graph:', error);
      return {
        projectId,
        dependencies: {},
        dependents: {},
        rootTasks: [],
        leafTasks: [],
        cycles: [],
      };
    }
  }

  /**
   * Get task execution order (topological sort)
   */
  async getExecutionOrder(projectId: string): Promise<string[]> {
    const graph = await this.getProjectDependencyGraph(projectId);

    if (graph.cycles.length > 0) {
      throw new Error('Cannot determine execution order: circular dependencies exist');
    }

    // Kahn's algorithm for topological sort
    const inDegree: Record<string, number> = {};
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const taskId of Object.keys(graph.dependencies)) {
      inDegree[taskId] = graph.dependencies[taskId].length;
      if (inDegree[taskId] === 0) {
        queue.push(taskId);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      result.push(taskId);

      for (const dependent of graph.dependents[taskId] || []) {
        inDegree[dependent]--;
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
        }
      }
    }

    return result;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Validate that both tasks exist and are in the same project
   */
  private async validateTasks(taskId: string, dependsOnId: string): Promise<void> {
    if (taskId === dependsOnId) {
      throw new Error('A task cannot depend on itself');
    }

    try {
      const todoItems = directus.items('todos');
      const [task1, task2] = await Promise.all([
        todoItems.readOne(taskId),
        todoItems.readOne(dependsOnId),
      ]);

      if (!task1) {
        throw new Error(`Task ${taskId} not found`);
      }
      if (!task2) {
        throw new Error(`Task ${dependsOnId} not found`);
      }
      if (task1.project_id !== task2.project_id) {
        throw new Error('Tasks must be in the same project');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to validate tasks');
    }
  }

  /**
   * Check if adding a dependency would create a cycle
   */
  private async wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
    // If dependsOnId already has a path to taskId, adding taskId -> dependsOnId
    // would create a cycle
    const visited = new Set<string>();
    const stack = [dependsOnId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (current === taskId) {
        return true; // Found a path back to taskId
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Get dependencies of current
      const deps = await this.getTaskDependencies(current);
      for (const dep of deps) {
        if (dep.dependencyType === 'blocks') {
          stack.push(dep.dependsOnId);
        }
      }
    }

    return false;
  }

  /**
   * Detect cycles in the dependency graph
   */
  private detectCycles(dependencies: Record<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      for (const dep of dependencies[node] || []) {
        if (!visited.has(dep)) {
          if (dfs(dep)) {
            return true;
          }
        } else if (recStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          cycles.push(cycle);
          return true;
        }
      }

      path.pop();
      recStack.delete(node);
      return false;
    };

    for (const node of Object.keys(dependencies)) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Map database record to TaskDependency type
   */
  private mapToTaskDependency(record: DependencyRecord): TaskDependency {
    return {
      id: record.id,
      taskId: record.task_id,
      dependsOnId: record.depends_on_id,
      dependencyType: record.dependency_type,
      createdAt: record.created_at,
      createdBy: record.created_by,
    };
  }
}

// Singleton instance
export const taskDependencyService = new TaskDependencyService();
