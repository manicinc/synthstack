/**
 * Task Dependencies Routes
 *
 * API endpoints for managing task dependency relationships.
 *
 * Endpoints:
 * - POST   /projects/:projectId/todos/:todoId/dependencies - Create dependency
 * - GET    /projects/:projectId/todos/:todoId/dependencies - List dependencies
 * - DELETE /projects/:projectId/todos/:todoId/dependencies/:depId - Delete dependency
 * - GET    /projects/:projectId/dependency-graph - Get full dependency graph
 * - GET    /projects/:projectId/execution-order - Get topological sort of tasks
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskDependencyService } from '../services/task-dependencies.js';
import type { TaskDependencyType } from '@synthstack/types';

// ============================================
// Request Types
// ============================================

interface ProjectParams {
  projectId: string;
}

interface TodoParams extends ProjectParams {
  todoId: string;
}

interface DependencyParams extends TodoParams {
  depId: string;
}

interface CreateDependencyBody {
  dependsOnId: string;
  dependencyType?: TaskDependencyType;
}

// ============================================
// Route Registration
// ============================================

export async function taskDependencyRoutes(fastify: FastifyInstance) {
  /**
   * Create a task dependency
   * POST /projects/:projectId/todos/:todoId/dependencies
   */
  fastify.post<{
    Params: TodoParams;
    Body: CreateDependencyBody;
  }>(
    '/projects/:projectId/todos/:todoId/dependencies',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId', 'todoId'],
          properties: {
            projectId: { type: 'string' },
            todoId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['dependsOnId'],
          properties: {
            dependsOnId: { type: 'string' },
            dependencyType: {
              type: 'string',
              enum: ['blocks', 'related', 'subtask'],
              default: 'blocks',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  taskId: { type: 'string' },
                  dependsOnId: { type: 'string' },
                  dependencyType: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { todoId } = request.params;
      const { dependsOnId, dependencyType } = request.body;
      const userId = (request as any).userId;

      try {
        const dependency = await taskDependencyService.createDependency(
          {
            taskId: todoId,
            dependsOnId,
            dependencyType,
          },
          userId
        );

        return reply.status(201).send({
          success: true,
          data: dependency,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create dependency';

        if (message.includes('circular') || message.includes('itself')) {
          return reply.status(400).send({
            success: false,
            error: message,
          });
        }

        if (message.includes('not found')) {
          return reply.status(404).send({
            success: false,
            error: message,
          });
        }

        if (message.includes('already exists')) {
          return reply.status(409).send({
            success: false,
            error: message,
          });
        }

        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    }
  );

  /**
   * Get dependencies for a task
   * GET /projects/:projectId/todos/:todoId/dependencies
   */
  fastify.get<{
    Params: TodoParams;
  }>(
    '/projects/:projectId/todos/:todoId/dependencies',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId', 'todoId'],
          properties: {
            projectId: { type: 'string' },
            todoId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  dependencies: { type: 'array' },
                  dependents: { type: 'array' },
                  isBlocked: { type: 'boolean' },
                  blockedByIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { todoId } = request.params;

      try {
        const [dependencies, dependents, blockStatus] = await Promise.all([
          taskDependencyService.getTaskDependencies(todoId),
          taskDependencyService.getTaskDependents(todoId),
          taskDependencyService.isTaskBlocked(todoId),
        ]);

        return reply.send({
          success: true,
          data: {
            dependencies,
            dependents,
            isBlocked: blockStatus.blocked,
            blockedByIds: blockStatus.blockedBy,
          },
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch dependencies',
        });
      }
    }
  );

  /**
   * Delete a task dependency
   * DELETE /projects/:projectId/todos/:todoId/dependencies/:depId
   */
  fastify.delete<{
    Params: DependencyParams;
  }>(
    '/projects/:projectId/todos/:todoId/dependencies/:depId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId', 'todoId', 'depId'],
          properties: {
            projectId: { type: 'string' },
            todoId: { type: 'string' },
            depId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { depId } = request.params;

      try {
        await taskDependencyService.deleteDependency(depId);

        return reply.send({
          success: true,
          message: 'Dependency deleted successfully',
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete dependency',
        });
      }
    }
  );

  /**
   * Get full dependency graph for a project
   * GET /projects/:projectId/dependency-graph
   */
  fastify.get<{
    Params: ProjectParams;
  }>(
    '/projects/:projectId/dependency-graph',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  projectId: { type: 'string' },
                  dependencies: { type: 'object' },
                  dependents: { type: 'object' },
                  rootTasks: { type: 'array', items: { type: 'string' } },
                  leafTasks: { type: 'array', items: { type: 'string' } },
                  cycles: {
                    type: 'array',
                    items: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const graph = await taskDependencyService.getProjectDependencyGraph(projectId);

        return reply.send({
          success: true,
          data: graph,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to build dependency graph',
        });
      }
    }
  );

  /**
   * Get task execution order (topological sort)
   * GET /projects/:projectId/execution-order
   */
  fastify.get<{
    Params: ProjectParams;
  }>(
    '/projects/:projectId/execution-order',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  order: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const order = await taskDependencyService.getExecutionOrder(projectId);

        return reply.send({
          success: true,
          data: { order },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to determine execution order';

        if (message.includes('circular')) {
          return reply.status(400).send({
            success: false,
            error: message,
          });
        }

        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    }
  );
}

export default taskDependencyRoutes;
