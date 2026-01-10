/**
 * @file projects.ts
 * @description API routes for the Projects system with todos, milestones, and marketing plans.
 *
 * Provides CRUD operations for:
 * - Projects - Top-level project management
 * - Todos - Task items within projects
 * - Milestones - Key dates and deliverables
 * - Marketing Plans - Strategic plans with budgets
 *
 * Also includes AI Copilot integration for:
 * - Suggesting todos based on project context
 * - Suggesting milestones
 * - Generating marketing plans
 *
 * @module routes/projects
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

/** Project status enum values */
type ProjectStatus = 'active' | 'completed' | 'archived';

/** Todo status enum values */
type TodoStatus = 'pending' | 'in_progress' | 'completed';

/** Todo priority enum values */
type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Milestone status enum values */
type MilestoneStatus = 'upcoming' | 'in_progress' | 'completed' | 'missed';

/** Marketing plan status enum values */
type MarketingPlanStatus = 'draft' | 'active' | 'completed';

/** Tag color options */
type TagColor = 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'dark' | 'grey';

/** Project tag interface */
interface ProjectTag {
  name: string;
  color: TagColor;
}

/** Project entity interface */
interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id?: string;
  is_system?: boolean;
  tags?: ProjectTag[];
  date_created: string;
  date_updated: string;
}

/** Todo entity interface */
interface Todo {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  due_date?: string;
  assignee_id?: string;
  sort: number;
  date_created: string;
  date_updated: string;
}

/** Milestone entity interface */
interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: MilestoneStatus;
  sort: number;
  date_created: string;
  date_updated: string;
}

/** Marketing plan entity interface */
interface MarketingPlan {
  id: string;
  project_id: string;
  title: string;
  content?: Record<string, unknown>;
  status: MarketingPlanStatus;
  budget?: number;
  start_date?: string;
  end_date?: string;
  date_created: string;
  date_updated: string;
}

/** Project document entity interface */
interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  content?: string;
  storage_path?: string;
  rag_indexed: boolean;
  rag_collection?: string;
  metadata?: Record<string, unknown>;
  date_created: string;
  date_updated: string;
  user_created?: string;
  user_updated?: string;
}

/**
 * Register projects routes
 * @param server - Fastify instance
 */
export default async function projectsRoutes(server: FastifyInstance): Promise<void> {
  // =========================================
  // Projects CRUD
  // =========================================

  /**
   * GET /projects - List all projects
   * @query status - Filter by status (active, completed, archived)
   * @query page - Page number for pagination
   * @query limit - Items per page (default 20)
   */
  server.get('/', {
    schema: {
      tags: ['Projects'],
      summary: 'List all projects',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'completed', 'archived'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  owner_id: { type: 'string' },
                  is_system: { type: 'boolean' },
                  date_created: { type: 'string' },
                  date_updated: { type: 'string' },
                  todo_count: { type: 'integer' },
                  completed_todo_count: { type: 'integer' },
                  milestone_count: { type: 'integer' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { status?: ProjectStatus; page?: number; limit?: number }
  }>, reply: FastifyReply) => {
    const { status, page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        p.*,
        COUNT(t.id) FILTER (WHERE t.id IS NOT NULL) as todo_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_todo_count,
        COUNT(m.id) as milestone_count
      FROM projects p
      LEFT JOIN todos t ON t.project_id = p.id
      LEFT JOIN milestones m ON m.project_id = p.id
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` WHERE p.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` GROUP BY p.id ORDER BY p.date_created DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await server.pg.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM projects';
    const countParams: string[] = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await server.pg.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    return reply.send({
      success: true,
      data: result.rows,
      meta: { page, limit, total }
    });
  });

  /**
   * GET /projects/:id - Get a single project by ID
   */
  server.get('/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Get project by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = (request as any).user?.id;

    const result = await server.pg.query(`
      SELECT
        p.*,
        COUNT(t.id) FILTER (WHERE t.id IS NOT NULL) as todo_count,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_todo_count,
        COUNT(m.id) as milestone_count
      FROM projects p
      LEFT JOIN todos t ON t.project_id = p.id
      LEFT JOIN milestones m ON m.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const project = result.rows[0];

    // Auto-sync GitHub if enabled and if last sync was more than 5 minutes ago
    if (
      userId &&
      project.github_repo &&
      project.github_sync_enabled
    ) {
      const lastSyncedAt = project.github_last_synced_at ? new Date(project.github_last_synced_at) : null;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Only sync if never synced or last sync was more than 5 minutes ago
      if (!lastSyncedAt || lastSyncedAt < fiveMinutesAgo) {
        // Fire and forget - don't wait for sync to complete
        const { GitHubService } = await import('../services/github.js');
        const githubService = new GitHubService(server);

        githubService.syncProjectGitHub(id, userId, project.github_repo).catch((err: Error) => {
          server.log.error({ err, projectId: id, repo: project.github_repo }, 'Auto-sync GitHub failed');
        });

        server.log.info({ projectId: id, repo: project.github_repo }, 'Auto-sync GitHub triggered');
      }
    }

    return reply.send({ success: true, data: project });
  });

  /**
   * POST /projects - Create a new project
   */
  server.post('/', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a new project',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'completed', 'archived'], default: 'active' },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 50 },
                color: { type: 'string', enum: ['primary', 'secondary', 'accent', 'positive', 'negative', 'info', 'warning', 'dark', 'grey'] }
              },
              required: ['name', 'color']
            }
          }
        },
        required: ['name']
      }
    }
  }, async (request: FastifyRequest<{
    Body: { name: string; description?: string; status?: ProjectStatus; tags?: ProjectTag[] }
  }>, reply: FastifyReply) => {
    const { name, description, status = 'active', tags = [] } = request.body;
    const userId = (request as any).user?.id;

    const result = await server.pg.query(`
      INSERT INTO projects (name, description, status, tags, owner_id, user_created)
      VALUES ($1, $2, $3, $4::jsonb, $5, $5)
      RETURNING *
    `, [name, description || null, status, JSON.stringify(tags), userId || null]);

    return reply.status(201).send({ success: true, data: result.rows[0] });
  });

  /**
   * PUT /projects/:id - Update a project
   */
  server.put('/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Update a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'completed', 'archived'] },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 50 },
                color: { type: 'string', enum: ['primary', 'secondary', 'accent', 'positive', 'negative', 'info', 'warning', 'dark', 'grey'] }
              },
              required: ['name', 'color']
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: Partial<Project> & { tags?: ProjectTag[] }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { name, description, status, tags } = request.body;
    const userId = (request as any).user?.id;

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(tags));
    }

    if (updates.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    updates.push(`date_updated = NOW()`);
    updates.push(`user_updated = $${paramIndex++}`);
    params.push(userId || null);

    params.push(id);

    const result = await server.pg.query(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    return reply.send({ success: true, data: result.rows[0] });
  });

  /**
   * DELETE /projects/:id - Delete a project
   * Note: System projects (is_system=true) cannot be deleted by regular users
   */
  server.delete('/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Delete a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const user = (request as any).user;

    // Check if project exists and if it's a system project
    const checkResult = await server.pg.query('SELECT id, is_system FROM projects WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const project = checkResult.rows[0];

    // Protect system projects from deletion (only admins can delete)
    if (project.is_system && (!user || !user.is_admin)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'System projects cannot be deleted. This is a protected example project.'
        }
      });
    }

    await server.pg.query('DELETE FROM projects WHERE id = $1', [id]);

    return reply.status(204).send();
  });

  // =========================================
  // Todos CRUD
  // =========================================

  /**
   * GET /projects/:id/todos - List todos for a project
   */
  server.get('/:id/todos', {
    schema: {
      tags: ['Projects'],
      summary: 'List todos for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { status?: TodoStatus }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { status } = request.query;

    let query = 'SELECT * FROM todos WHERE project_id = $1';
    const params: string[] = [id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY sort ASC, date_created DESC';

    const result = await server.pg.query(query, params);
    return reply.send({ success: true, data: result.rows });
  });

  /**
   * POST /projects/:id/todos - Create a todo
   */
  server.post('/:id/todos', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a todo for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
          due_date: { type: 'string', format: 'date-time' },
          assignee_id: { type: 'string', format: 'uuid' }
        },
        required: ['title']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { title: string; description?: string; priority?: TodoPriority; due_date?: string; assignee_id?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { title, description, priority = 'medium', due_date, assignee_id } = request.body;
    const userId = (request as any).user?.id;

    // Get max sort value
    const sortResult = await server.pg.query('SELECT COALESCE(MAX(sort), 0) + 1 as next_sort FROM todos WHERE project_id = $1', [id]);
    const nextSort = sortResult.rows[0].next_sort;

    const result = await server.pg.query(`
      INSERT INTO todos (project_id, title, description, priority, due_date, assignee_id, sort, user_created)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, title, description || null, priority, due_date || null, assignee_id || null, nextSort, userId || null]);

    return reply.status(201).send({ success: true, data: result.rows[0] });
  });

  /**
   * PUT /projects/:projectId/todos/:todoId - Update a todo
   */
  server.put('/:projectId/todos/:todoId', {
    schema: {
      tags: ['Projects'],
      summary: 'Update a todo',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          todoId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'todoId']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          due_date: { type: 'string', format: 'date-time' },
          assignee_id: { type: 'string', format: 'uuid' },
          sort: { type: 'integer' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; todoId: string };
    Body: Partial<Todo>
  }>, reply: FastifyReply) => {
    const { projectId, todoId } = request.params;
    const body = request.body;
    const userId = (request as any).user?.id;

    // Check if we're completing the task - need to check current status first
    let oldStatus: string | null = null;
    if (body.status === 'completed') {
      const existingTodo = await server.pg.query(
        'SELECT status, points_awarded FROM todos WHERE id = $1 AND project_id = $2',
        [todoId, projectId]
      );
      if (existingTodo.rows.length > 0) {
        oldStatus = existingTodo.rows[0].status;
      }
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    const allowedFields = ['title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'sort'];
    for (const field of allowedFields) {
      if ((body as any)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push((body as any)[field]);
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    // If completing a task that wasn't already completed, track completion time
    if (body.status === 'completed' && oldStatus && oldStatus !== 'completed') {
      updates.push(`completed_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
      updates.push(`completed_by = $${paramIndex++}`);
      params.push(userId || null);
    }

    updates.push(`date_updated = NOW()`);
    updates.push(`user_updated = $${paramIndex++}`);
    params.push(userId || null);

    params.push(projectId, todoId);

    const result = await server.pg.query(`
      UPDATE todos SET ${updates.join(', ')}
      WHERE project_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Todo not found' } });
    }

    const updatedTodo = result.rows[0];
    let gamificationResult = null;

    // Award points if task was just completed and user is authenticated
    if (body.status === 'completed' && oldStatus && oldStatus !== 'completed' && userId) {
      try {
        const { GamificationService } = await import('../services/gamification.js');
        const gamificationService = new GamificationService(server);
        gamificationResult = await gamificationService.awardTaskPoints(userId, todoId, projectId);

        // Update the todo with awarded points
        if (gamificationResult.pointsAwarded > 0) {
          await server.pg.query(
            'UPDATE todos SET points_awarded = $1 WHERE id = $2',
            [gamificationResult.pointsAwarded, todoId]
          );
          updatedTodo.points_awarded = gamificationResult.pointsAwarded;
        }
      } catch (error) {
        server.log.error({ error, todoId, userId }, 'Failed to award task points');
        // Don't fail the whole request if gamification fails
      }
    }

    return reply.send({
      success: true,
      data: updatedTodo,
      gamification: gamificationResult
    });
  });

  /**
   * DELETE /projects/:projectId/todos/:todoId - Delete a todo
   */
  server.delete('/:projectId/todos/:todoId', {
    schema: {
      tags: ['Projects'],
      summary: 'Delete a todo',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          todoId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'todoId']
      }
    }
  }, async (request: FastifyRequest<{ Params: { projectId: string; todoId: string } }>, reply: FastifyReply) => {
    const { projectId, todoId } = request.params;

    const result = await server.pg.query('DELETE FROM todos WHERE project_id = $1 AND id = $2 RETURNING id', [projectId, todoId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Todo not found' } });
    }

    return reply.status(204).send();
  });

  // =========================================
  // Milestones CRUD
  // =========================================

  /**
   * GET /projects/:id/milestones - List milestones for a project
   */
  server.get('/:id/milestones', {
    schema: {
      tags: ['Projects'],
      summary: 'List milestones for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const result = await server.pg.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY sort ASC, target_date ASC', [id]);
    return reply.send({ success: true, data: result.rows });
  });

  /**
   * POST /projects/:id/milestones - Create a milestone
   */
  server.post('/:id/milestones', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a milestone for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          target_date: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['upcoming', 'in_progress', 'completed', 'missed'], default: 'upcoming' }
        },
        required: ['title']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { title: string; description?: string; target_date?: string; status?: MilestoneStatus }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { title, description, target_date, status = 'upcoming' } = request.body;
    const userId = (request as any).user?.id;

    // Get max sort value
    const sortResult = await server.pg.query('SELECT COALESCE(MAX(sort), 0) + 1 as next_sort FROM milestones WHERE project_id = $1', [id]);
    const nextSort = sortResult.rows[0].next_sort;

    const result = await server.pg.query(`
      INSERT INTO milestones (project_id, title, description, target_date, status, sort, user_created)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, title, description || null, target_date || null, status, nextSort, userId || null]);

    return reply.status(201).send({ success: true, data: result.rows[0] });
  });

  /**
   * PUT /projects/:projectId/milestones/:milestoneId - Update a milestone
   */
  server.put('/:projectId/milestones/:milestoneId', {
    schema: {
      tags: ['Projects'],
      summary: 'Update a milestone',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          milestoneId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'milestoneId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; milestoneId: string };
    Body: Partial<Milestone>
  }>, reply: FastifyReply) => {
    const { projectId, milestoneId } = request.params;
    const body = request.body;
    const userId = (request as any).user?.id;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    const allowedFields = ['title', 'description', 'target_date', 'status', 'sort'];
    for (const field of allowedFields) {
      if ((body as any)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push((body as any)[field]);
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    updates.push(`date_updated = NOW()`);
    updates.push(`user_updated = $${paramIndex++}`);
    params.push(userId || null);

    params.push(projectId, milestoneId);

    const result = await server.pg.query(`
      UPDATE milestones SET ${updates.join(', ')}
      WHERE project_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });
    }

    return reply.send({ success: true, data: result.rows[0] });
  });

  /**
   * DELETE /projects/:projectId/milestones/:milestoneId - Delete a milestone
   */
  server.delete('/:projectId/milestones/:milestoneId', {
    schema: {
      tags: ['Projects'],
      summary: 'Delete a milestone',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          milestoneId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'milestoneId']
      }
    }
  }, async (request: FastifyRequest<{ Params: { projectId: string; milestoneId: string } }>, reply: FastifyReply) => {
    const { projectId, milestoneId } = request.params;

    const result = await server.pg.query('DELETE FROM milestones WHERE project_id = $1 AND id = $2 RETURNING id', [projectId, milestoneId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });
    }

    return reply.status(204).send();
  });

  // =========================================
  // Marketing Plans CRUD
  // =========================================

  /**
   * GET /projects/:id/marketing-plans - List marketing plans for a project
   */
  server.get('/:id/marketing-plans', {
    schema: {
      tags: ['Projects'],
      summary: 'List marketing plans for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const result = await server.pg.query('SELECT * FROM marketing_plans WHERE project_id = $1 ORDER BY date_created DESC', [id]);
    return reply.send({ success: true, data: result.rows });
  });

  /**
   * POST /projects/:id/marketing-plans - Create a marketing plan
   */
  server.post('/:id/marketing-plans', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a marketing plan for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          content: { type: 'object' },
          status: { type: 'string', enum: ['draft', 'active', 'completed'], default: 'draft' },
          budget: { type: 'number' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' }
        },
        required: ['title']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title: string;
      content?: Record<string, unknown>;
      status?: MarketingPlanStatus;
      budget?: number;
      start_date?: string;
      end_date?: string
    }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { title, content, status = 'draft', budget, start_date, end_date } = request.body;
    const userId = (request as any).user?.id;

    const result = await server.pg.query(`
      INSERT INTO marketing_plans (project_id, title, content, status, budget, start_date, end_date, user_created)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, title, JSON.stringify(content || {}), status, budget || null, start_date || null, end_date || null, userId || null]);

    return reply.status(201).send({ success: true, data: result.rows[0] });
  });

  /**
   * PUT /projects/:projectId/marketing-plans/:planId - Update a marketing plan
   */
  server.put('/:projectId/marketing-plans/:planId', {
    schema: {
      tags: ['Projects'],
      summary: 'Update a marketing plan',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          planId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'planId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; planId: string };
    Body: Partial<MarketingPlan>
  }>, reply: FastifyReply) => {
    const { projectId, planId } = request.params;
    const body = request.body;
    const userId = (request as any).user?.id;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(body.title);
    }
    if (body.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(JSON.stringify(body.content));
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(body.status);
    }
    if (body.budget !== undefined) {
      updates.push(`budget = $${paramIndex++}`);
      params.push(body.budget);
    }
    if (body.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      params.push(body.start_date);
    }
    if (body.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(body.end_date);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    updates.push(`date_updated = NOW()`);
    updates.push(`user_updated = $${paramIndex++}`);
    params.push(userId || null);

    params.push(projectId, planId);

    const result = await server.pg.query(`
      UPDATE marketing_plans SET ${updates.join(', ')}
      WHERE project_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Marketing plan not found' } });
    }

    return reply.send({ success: true, data: result.rows[0] });
  });

  /**
   * DELETE /projects/:projectId/marketing-plans/:planId - Delete a marketing plan
   */
  server.delete('/:projectId/marketing-plans/:planId', {
    schema: {
      tags: ['Projects'],
      summary: 'Delete a marketing plan',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          planId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'planId']
      }
    }
  }, async (request: FastifyRequest<{ Params: { projectId: string; planId: string } }>, reply: FastifyReply) => {
    const { projectId, planId } = request.params;

    const result = await server.pg.query('DELETE FROM marketing_plans WHERE project_id = $1 AND id = $2 RETURNING id', [projectId, planId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Marketing plan not found' } });
    }

    return reply.status(204).send();
  });

  // =========================================
  // AI Copilot Integration
  // =========================================

  /**
   * POST /projects/:id/copilot/suggest-todos - AI suggests todos based on project context
   */
  server.post('/:id/copilot/suggest-todos', {
    schema: {
      tags: ['Projects', 'Copilot'],
      summary: 'AI suggests todos for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'Additional context for suggestions' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { context?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { context } = request.body;

    // Get project details
    const projectResult = await server.pg.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const project = projectResult.rows[0];

    // Get existing todos for context
    const todosResult = await server.pg.query('SELECT title, status FROM todos WHERE project_id = $1', [id]);

    // For now, return placeholder suggestions - in production, this would call the ML service
    const suggestions = [
      `Set up development environment for ${project.name}`,
      `Create initial documentation for ${project.name}`,
      `Define acceptance criteria for key features`,
      `Set up CI/CD pipeline`,
      `Create test suite foundation`
    ];

    // Filter out suggestions that already exist
    const existingTitles = todosResult.rows.map((t: any) => t.title.toLowerCase());
    const filteredSuggestions = suggestions.filter(s => !existingTitles.includes(s.toLowerCase()));

    return reply.send({
      success: true,
      data: {
        suggestions: filteredSuggestions,
        context: context || null
      }
    });
  });

  /**
   * POST /projects/:id/copilot/suggest-milestones - AI suggests milestones
   */
  server.post('/:id/copilot/suggest-milestones', {
    schema: {
      tags: ['Projects', 'Copilot'],
      summary: 'AI suggests milestones for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { context?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    // Get project details
    const projectResult = await server.pg.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // Placeholder suggestions
    const suggestions = [
      'MVP Complete - Core features functional',
      'Alpha Release - Internal testing ready',
      'Beta Launch - Public beta available',
      'Production Launch - Full public release',
      'First Revenue Milestone'
    ];

    return reply.send({
      success: true,
      data: { suggestions }
    });
  });

  /**
   * POST /projects/:id/copilot/generate-marketing-plan - AI generates a marketing plan
   */
  server.post('/:id/copilot/generate-marketing-plan', {
    schema: {
      tags: ['Projects', 'Copilot'],
      summary: 'AI generates a marketing plan for a project',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          goals: { type: 'string', description: 'Marketing goals and objectives' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { goals?: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { goals } = request.body;

    // Get project details
    const projectResult = await server.pg.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const project = projectResult.rows[0];

    // Generate a placeholder marketing plan - in production, this would call the ML service
    const generatedPlan = {
      title: `Marketing Plan for ${project.name}`,
      content: {
        goals: goals || 'Increase awareness and drive signups',
        channels: ['Social Media', 'Content Marketing', 'Email', 'Partnerships'],
        tactics: [
          'Launch on ProductHunt',
          'Create technical blog posts',
          'Build email list with lead magnet',
          'Partner with complementary tools'
        ],
        metrics: ['Website traffic', 'Signup rate', 'Activation rate', 'MRR'],
        timeline: '90 days'
      },
      status: 'draft',
      budget: 5000
    };

    return reply.send({
      success: true,
      data: generatedPlan
    });
  });

  // =========================================
  // Project Documents
  // =========================================

  /**
   * POST /projects/:id/documents - Upload a document to a project
   */
  server.post('/:id/documents', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const userId = (request as any).user?.id;

    // Verify project exists
    const projectResult = await server.pg.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // Get uploaded file
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
    }

    // Get file buffer and metadata
    const buffer = await data.toBuffer();
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileSize = buffer.length;
    const fileName = data.filename;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    // Validate file type - support text files, PDFs, markdown
    const allowedTypes = ['txt', 'pdf', 'md', 'markdown', 'doc', 'docx', 'json', 'csv'];
    if (!allowedTypes.includes(fileType)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }
      });
    }

    // Check file size (10MB max for documents)
    const maxSize = 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return reply.status(400).send({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File too large. Max 10MB' }
      });
    }

    // Check for duplicate file in this project
    const existingDoc = await server.pg.query(
      'SELECT id FROM project_documents WHERE project_id = $1 AND file_hash = $2',
      [projectId, fileHash]
    );

    if (existingDoc.rows.length > 0) {
      return reply.status(409).send({
        success: false,
        error: { code: 'DUPLICATE_FILE', message: 'This file already exists in the project' }
      });
    }

    // Extract text content from buffer
    let content = '';
    try {
      if (['txt', 'md', 'markdown', 'json', 'csv'].includes(fileType)) {
        content = buffer.toString('utf-8');
      }
      // TODO: Add PDF text extraction when pdf-parse is available
    } catch (error) {
      console.error('Failed to extract text content:', error);
    }

    // Generate RAG collection name for this project
    const ragCollection = `project_${projectId}`;

    // Insert document into database
    const result = await server.pg.query(`
      INSERT INTO project_documents (
        project_id, filename, file_type, file_size, file_hash,
        content, rag_indexed, rag_collection, user_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [projectId, fileName, fileType, fileSize, fileHash, content, false, ragCollection, userId]);

    const document = result.rows[0];

    // Index document in RAG service (fire and forget - don't block response)
    if (content) {
      const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

      fetch(`${ML_SERVICE_URL}/rag/index-project-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: document.id,
          project_id: projectId,
          filename: fileName,
          content: content,
          file_type: fileType,
          chunk_size: 1000,
          chunk_overlap: 200
        })
      })
        .then(async (response) => {
          if (response.ok) {
            // Update document as indexed
            await server.pg.query(
              'UPDATE project_documents SET rag_indexed = true WHERE id = $1',
              [document.id]
            );
            console.log(`Document ${document.id} indexed successfully`);
          } else {
            console.error('Failed to index document:', await response.text());
          }
        })
        .catch((error) => {
          console.error('Failed to index document:', error);
        });
    }

    return reply.status(201).send({
      success: true,
      data: document
    });
  });

  /**
   * GET /projects/:id/documents - List all documents for a project
   */
  server.get('/:id/documents', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { page?: number; limit?: number }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    // Verify project exists
    const projectResult = await server.pg.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // Get documents for this project
    const result = await server.pg.query(`
      SELECT
        id, project_id, filename, file_type, file_size, file_hash,
        rag_indexed, rag_collection, metadata,
        date_created, date_updated, user_created
      FROM project_documents
      WHERE project_id = $1
      ORDER BY date_created DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);

    // Get total count
    const countResult = await server.pg.query(
      'SELECT COUNT(*) FROM project_documents WHERE project_id = $1',
      [projectId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    return reply.send({
      success: true,
      data: result.rows,
      meta: { page, limit, total }
    });
  });

  /**
   * GET /projects/:projectId/documents/:docId - Get a single document
   */
  server.get('/:projectId/documents/:docId', async (request: FastifyRequest<{
    Params: { projectId: string; docId: string }
  }>, reply: FastifyReply) => {
    const { projectId, docId } = request.params;

    const result = await server.pg.query(
      'SELECT * FROM project_documents WHERE id = $1 AND project_id = $2',
      [docId, projectId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    return reply.send({
      success: true,
      data: result.rows[0]
    });
  });

  /**
   * DELETE /projects/:projectId/documents/:docId - Delete a document
   */
  server.delete('/:projectId/documents/:docId', async (request: FastifyRequest<{
    Params: { projectId: string; docId: string }
  }>, reply: FastifyReply) => {
    const { projectId, docId } = request.params;

    // Check if document exists
    const docResult = await server.pg.query(
      'SELECT id, rag_collection FROM project_documents WHERE id = $1 AND project_id = $2',
      [docId, projectId]
    );

    if (docResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const ragCollection = docResult.rows[0].rag_collection;

    // Delete from database
    await server.pg.query('DELETE FROM project_documents WHERE id = $1', [docId]);

    // Remove from RAG index (fire and forget)
    if (ragCollection) {
      const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

      // Delete all chunks for this document from RAG
      fetch(`${ML_SERVICE_URL}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: docId,
          collection: ragCollection,
          limit: 100
        })
      })
        .then(async (response) => {
          if (response.ok) {
            console.log(`Removed document ${docId} from RAG collection ${ragCollection}`);
          }
        })
        .catch((error) => {
          console.error('Failed to remove document from RAG:', error);
        });
    }

    return reply.send({
      success: true,
      message: 'Document deleted successfully'
    });
  });

  // =========================================
  // GitHub Integration
  // =========================================

  /**
   * POST /projects/:id/github/link - Link GitHub repository to project
   * Supports both global PAT (from user's github_integrations) and project-specific PAT
   */
  server.post('/:id/github/link', {
    schema: {
      tags: ['Projects'],
      summary: 'Link GitHub repository to project with PAT',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          pat: { type: 'string', description: 'GitHub Personal Access Token (required if use_global_pat is false)' },
          repo: { type: 'string', description: 'Full repository name (owner/repo)' },
          default_branch: { type: 'string', default: 'main' },
          sync_issues: { type: 'boolean', default: true },
          sync_prs: { type: 'boolean', default: true },
          sync_enabled: { type: 'boolean', default: true },
          use_global_pat: { type: 'boolean', default: true, description: 'Use global PAT from Integrations instead of project-specific PAT' }
        },
        required: ['repo']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      pat?: string;
      repo: string;
      default_branch?: string;
      sync_issues?: boolean;
      sync_prs?: boolean;
      sync_enabled?: boolean;
      use_global_pat?: boolean;
    }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const {
      pat,
      repo,
      default_branch = 'main',
      sync_issues = true,
      sync_prs = true,
      sync_enabled = true,
      use_global_pat = true
    } = request.body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    // Validate repo format (owner/repo)
    if (!/^[\w-]+\/[\w.-]+$/.test(repo)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REPO', message: 'Repository must be in format: owner/repo' }
      });
    }

    try {
      const { Octokit } = await import('@octokit/rest');
      let actualPat: string;
      let encryptedPat: string | null = null;
      let github_username: string;
      let scopes: string[] = [];

      if (use_global_pat) {
        // Use global PAT from github_integrations
        const integrationResult = await server.pg.query(
          `SELECT github_pat_encrypted, github_username
           FROM github_integrations
           WHERE user_id = $1 AND is_active = true`,
          [userId]
        );

        if (integrationResult.rows.length === 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'NO_GLOBAL_PAT',
              message: 'No global GitHub PAT configured. Please connect your GitHub account in Integrations settings first.'
            }
          });
        }

        // Decrypt global PAT using the github service encryption (different from project encryption)
        const { decryptPAT } = await import('../services/github.js');
        const globalPat = integrationResult.rows[0].github_pat_encrypted;
        actualPat = decryptPAT(globalPat);
        github_username = integrationResult.rows[0].github_username;

        // Don't store PAT on project when using global
        encryptedPat = null;
      } else {
        // Use project-specific PAT
        if (!pat || !/^(ghp_|github_pat_|gho_)[\w]+$/.test(pat)) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PAT', message: 'Invalid GitHub Personal Access Token format' }
          });
        }

        actualPat = pat;

        // Verify PAT by testing GitHub API
        const octokit = new Octokit({ auth: actualPat });
        const { data: user } = await octokit.rest.users.getAuthenticated();
        github_username = user.login;

        // Get PAT scopes from response headers
        const scopesHeader = (user as any).headers?.['x-oauth-scopes'] || '';
        scopes = scopesHeader ? scopesHeader.split(',').map((s: string) => s.trim()) : [];

        // Encrypt the PAT for project storage
        const { encrypt } = await import('../services/encryption.js');
        encryptedPat = encrypt(actualPat);
      }

      // Verify repository access with the resolved PAT
      const octokit = new Octokit({ auth: actualPat });
      const [owner, repoName] = repo.split('/');
      try {
        await octokit.rest.repos.get({ owner, repo: repoName });
      } catch (repoError: any) {
        if (repoError.status === 404) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'REPO_NOT_FOUND',
              message: `Repository ${repo} not found or not accessible with this PAT`
            }
          });
        }
        throw repoError;
      }

      // Update project with GitHub info
      // If using global PAT, clear the project-specific PAT fields
      const result = await server.pg.query(`
        UPDATE projects
        SET
          github_repo = $1,
          github_sync_enabled = $2,
          github_default_branch = $3,
          github_sync_issues = $4,
          github_sync_prs = $5,
          github_pat_encrypted = $6,
          github_username = $7,
          github_pat_scopes = $8::jsonb,
          github_pat_verified_at = NOW(),
          github_pat_verification_error = NULL,
          github_last_synced_at = NULL,
          use_global_pat = $9,
          date_updated = NOW(),
          user_updated = $10
        WHERE id = $11
        RETURNING id, name, github_repo, github_sync_enabled, github_default_branch,
                  github_username, github_pat_scopes, github_pat_verified_at, use_global_pat
      `, [repo, sync_enabled, default_branch, sync_issues, sync_prs, encryptedPat, github_username, JSON.stringify(scopes), use_global_pat, userId, projectId]);

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      // Trigger initial sync if enabled
      if (sync_enabled) {
        const { GitHubService } = await import('../services/github.js');
        const githubService = new GitHubService(server);

        // Fire and forget - don't wait for sync to complete
        githubService.syncProjectGitHub(projectId, userId, repo).catch((err: Error) => {
          server.log.error({ err, projectId, repo }, 'Initial GitHub sync failed');
        });
      }

      return reply.send({
        success: true,
        data: result.rows[0],
        message: sync_enabled ? 'Repository linked and sync started' : 'Repository linked'
      });
    } catch (error: any) {
      server.log.error({ error, projectId, repo }, 'Failed to link GitHub repository');

      // Handle GitHub API errors
      if (error.status === 401) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_PAT', message: 'GitHub Personal Access Token is invalid or expired' }
        });
      }

      return reply.status(500).send({
        success: false,
        error: { code: 'LINK_FAILED', message: error.message || 'Failed to link repository' }
      });
    }
  });

  /**
   * PATCH /projects/:id/github/settings - Update GitHub PAT settings (use_global_pat toggle)
   */
  server.patch('/:id/github/settings', {
    schema: {
      tags: ['Projects'],
      summary: 'Update GitHub PAT settings for project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          use_global_pat: { type: 'boolean', description: 'Use global PAT from Integrations instead of project-specific PAT' }
        },
        required: ['use_global_pat']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { use_global_pat: boolean }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const { use_global_pat } = request.body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      // Verify user has access to this project
      const checkResult = await server.pg.query(
        `SELECT id FROM projects WHERE id = $1 AND (user_created = $2 OR id IN (
          SELECT project_id FROM project_members WHERE user_id = $2
        ))`,
        [projectId, userId]
      );

      if (checkResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found or access denied' }
        });
      }

      // If switching to global PAT, verify user has one configured
      if (use_global_pat) {
        const integrationResult = await server.pg.query(
          `SELECT id FROM github_integrations WHERE user_id = $1 AND is_active = true`,
          [userId]
        );

        if (integrationResult.rows.length === 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'NO_GLOBAL_PAT',
              message: 'No global GitHub PAT configured. Please connect your GitHub account in Integrations settings first.'
            }
          });
        }
      }

      // Update the setting
      const result = await server.pg.query(`
        UPDATE projects
        SET use_global_pat = $1, date_updated = NOW(), user_updated = $2
        WHERE id = $3
        RETURNING id, name, use_global_pat
      `, [use_global_pat, userId, projectId]);

      return reply.send({
        success: true,
        data: result.rows[0],
        message: use_global_pat ? 'Now using global GitHub PAT' : 'Now using project-specific GitHub PAT'
      });
    } catch (error: any) {
      server.log.error({ error, projectId }, 'Failed to update GitHub settings');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' }
      });
    }
  });

  /**
   * DELETE /projects/:id/github/unlink - Unlink GitHub repository from project
   */
  server.delete('/:id/github/unlink', {
    schema: {
      tags: ['Projects'],
      summary: 'Unlink GitHub repository from project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const userId = (request as any).user?.id;

    // Clear GitHub fields and delete cached data
    await server.pg.query('BEGIN');

    try {
      await server.pg.query(`
        UPDATE projects
        SET
          github_repo = NULL,
          github_sync_enabled = false,
          github_last_synced_at = NULL,
          github_default_branch = 'main',
          github_sync_issues = true,
          github_sync_prs = true,
          github_pat_encrypted = NULL,
          github_pat_iv = NULL,
          github_username = NULL,
          github_pat_scopes = '[]'::jsonb,
          github_pat_verified_at = NULL,
          github_pat_verification_error = NULL,
          date_updated = NOW(),
          user_updated = $1
        WHERE id = $2
      `, [userId, projectId]);

      // Delete cached issues and PRs
      await server.pg.query('DELETE FROM project_github_issues WHERE project_id = $1', [projectId]);
      await server.pg.query('DELETE FROM project_github_prs WHERE project_id = $1', [projectId]);

      await server.pg.query('COMMIT');

      return reply.send({
        success: true,
        message: 'GitHub repository unlinked and cache cleared'
      });
    } catch (error) {
      await server.pg.query('ROLLBACK');
      server.log.error({ error, projectId }, 'Failed to unlink GitHub repository');
      return reply.status(500).send({
        success: false,
        error: { code: 'UNLINK_FAILED', message: 'Failed to unlink repository' }
      });
    }
  });

  /**
   * GET /projects/:id/github/status - Get GitHub sync status
   */
  server.get('/:id/github/status', {
    schema: {
      tags: ['Projects'],
      summary: 'Get GitHub sync status',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;

    const result = await server.pg.query(`
      SELECT
        github_repo,
        github_sync_enabled,
        github_last_synced_at,
        github_default_branch,
        github_sync_issues,
        github_sync_prs
      FROM projects
      WHERE id = $1
    `, [projectId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const project = result.rows[0];

    if (!project.github_repo) {
      return reply.send({
        success: true,
        data: {
          linked: false
        }
      });
    }

    // Get counts of cached issues and PRs
    const issuesResult = await server.pg.query(
      'SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE state = \'open\') as open_count FROM project_github_issues WHERE project_id = $1',
      [projectId]
    );

    const prsResult = await server.pg.query(
      'SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE state = \'open\') as open_count FROM project_github_prs WHERE project_id = $1',
      [projectId]
    );

    return reply.send({
      success: true,
      data: {
        linked: true,
        repo: project.github_repo,
        sync_enabled: project.github_sync_enabled,
        last_synced_at: project.github_last_synced_at,
        default_branch: project.github_default_branch,
        sync_issues: project.github_sync_issues,
        sync_prs: project.github_sync_prs,
        cached_issues: {
          total: parseInt(issuesResult.rows[0].count),
          open: parseInt(issuesResult.rows[0].open_count)
        },
        cached_prs: {
          total: parseInt(prsResult.rows[0].count),
          open: parseInt(prsResult.rows[0].open_count)
        }
      }
    });
  });

  /**
   * POST /projects/:id/github/sync - Manually trigger GitHub sync
   */
  server.post('/:id/github/sync', {
    schema: {
      tags: ['Projects'],
      summary: 'Manually trigger GitHub sync',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    // Get project GitHub settings
    const projectResult = await server.pg.query(`
      SELECT github_repo, github_sync_enabled
      FROM projects
      WHERE id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const { github_repo, github_sync_enabled } = projectResult.rows[0];

    if (!github_repo) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_REPO_LINKED', message: 'No GitHub repository linked to this project' }
      });
    }

    if (!github_sync_enabled) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SYNC_DISABLED', message: 'GitHub sync is disabled for this project' }
      });
    }

    // Trigger sync
    const { GitHubService } = await import('../services/github.js');
    const githubService = new GitHubService(server);

    try {
      await githubService.syncProjectGitHub(projectId, userId, github_repo);

      return reply.send({
        success: true,
        message: 'GitHub sync completed successfully'
      });
    } catch (error) {
      server.log.error({ error, projectId, github_repo }, 'GitHub sync failed');
      return reply.status(500).send({
        success: false,
        error: { code: 'SYNC_FAILED', message: 'GitHub sync failed', details: (error as Error).message }
      });
    }
  });

  /**
   * GET /projects/:id/github/issues - Get cached GitHub issues
   */
  server.get('/:id/github/issues', {
    schema: {
      tags: ['Projects'],
      summary: 'Get cached GitHub issues',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { state?: string; limit?: number; offset?: number }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const { state = 'all', limit = 50, offset = 0 } = request.query;

    let query = `
      SELECT *
      FROM project_github_issues
      WHERE project_id = $1
    `;
    const params: (string | number)[] = [projectId];

    if (state !== 'all') {
      query += ` AND state = $2`;
      params.push(state);
      query += ` ORDER BY github_created_at DESC LIMIT $3 OFFSET $4`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY github_created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const result = await server.pg.query(query, params);

    return reply.send({
      success: true,
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit,
        offset
      }
    });
  });

  /**
   * GET /projects/:id/github/prs - Get cached GitHub pull requests
   */
  server.get('/:id/github/prs', {
    schema: {
      tags: ['Projects'],
      summary: 'Get cached GitHub pull requests',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['open', 'closed', 'merged', 'all'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { state?: string; limit?: number; offset?: number }
  }>, reply: FastifyReply) => {
    const { id: projectId } = request.params;
    const { state = 'all', limit = 50, offset = 0 } = request.query;

    let query = `
      SELECT *
      FROM project_github_prs
      WHERE project_id = $1
    `;
    const params: (string | number)[] = [projectId];

    if (state === 'merged') {
      query += ` AND merged = true`;
    } else if (state !== 'all') {
      query += ` AND state = $2`;
      params.push(state);
    }

    query += ` ORDER BY github_created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await server.pg.query(query, params);

    return reply.send({
      success: true,
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit,
        offset
      }
    });
  });
}
