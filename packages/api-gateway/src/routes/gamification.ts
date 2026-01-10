/**
 * @file gamification.ts
 * @description API routes for the Gamification system - points, achievements, sprints, retrospectives.
 *
 * Provides endpoints for:
 * - User gamification stats (points, level, streaks)
 * - Achievements listing and progress
 * - Leaderboards
 * - Point history
 * - Sprint CRUD and lifecycle
 * - Retrospectives
 *
 * @module routes/gamification
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GamificationService } from '../services/gamification.js';

/** Sprint duration type enum */
type SprintDurationType = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

/** Sprint status enum */
type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

/**
 * Register gamification routes
 * @param server - Fastify instance
 */
export default async function gamificationRoutes(server: FastifyInstance): Promise<void> {
  const gamificationService = new GamificationService(server);

  // =========================================
  // User Stats
  // =========================================

  /**
   * GET /gamification/stats/:projectId - Get user's gamification stats for a project
   */
  server.get('/stats/:projectId', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get user gamification stats for a project',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalPoints: { type: 'number' },
                pointsThisWeek: { type: 'number' },
                pointsThisMonth: { type: 'number' },
                currentStreak: { type: 'number' },
                longestStreak: { type: 'number' },
                level: { type: 'number' },
                levelTitle: { type: 'string' },
                xpCurrent: { type: 'number' },
                xpToNextLevel: { type: 'number' },
                xpProgress: { type: 'number' },
                tasksCompleted: { type: 'number' },
                tasksCompletedEarly: { type: 'number' },
                sprintsCompleted: { type: 'number' },
                bestDailyPoints: { type: 'number' },
                bestWeeklyPoints: { type: 'number' },
                rank: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const { projectId } = request.params;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const stats = await gamificationService.getUserStats(userId, projectId);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      server.log.error({ error, userId, projectId }, 'Failed to get gamification stats');
      return reply.status(500).send({ success: false, error: { code: 'STATS_ERROR', message: error.message } });
    }
  });

  /**
   * GET /gamification/stats - Get user's global gamification stats (across all projects)
   */
  server.get('/stats', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get user global gamification stats'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const stats = await gamificationService.getUserStats(userId);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      server.log.error({ error, userId }, 'Failed to get global gamification stats');
      return reply.status(500).send({ success: false, error: { code: 'STATS_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Achievements
  // =========================================

  /**
   * GET /gamification/achievements - Get all achievements with user's unlock status
   */
  server.get('/achievements', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get all achievements with user progress',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          category: { type: 'string' },
          unlockedOnly: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { projectId?: string; category?: string; unlockedOnly?: boolean }
  }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    const { projectId, category, unlockedOnly } = request.query;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const achievements = await gamificationService.getAchievements(userId, projectId);

      // Filter if needed
      const filtered = unlockedOnly ? achievements.filter((a: any) => a.isUnlocked) : achievements;

      return reply.send({
        success: true,
        data: filtered,
        meta: {
          total: achievements.length,
          unlocked: achievements.filter((a: any) => a.isUnlocked).length
        }
      });
    } catch (error: any) {
      server.log.error({ error, userId, projectId }, 'Failed to get achievements');
      return reply.status(500).send({ success: false, error: { code: 'ACHIEVEMENTS_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Leaderboard
  // =========================================

  /**
   * GET /gamification/leaderboard/:projectId - Get project leaderboard
   */
  server.get('/leaderboard/:projectId', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get project leaderboard',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          period: { type: 'string', enum: ['all', 'week', 'month', 'sprint'], default: 'all' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string };
    Querystring: { limit?: number; period?: string }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params;
    const { limit = 10, period = 'all' } = request.query;
    const userId = (request as any).user?.id;

    try {
      const leaderboard = await gamificationService.getLeaderboard(projectId, userId, limit);
      return reply.send({ success: true, data: leaderboard });
    } catch (error: any) {
      server.log.error({ error, projectId }, 'Failed to get leaderboard');
      return reply.status(500).send({ success: false, error: { code: 'LEADERBOARD_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Point History
  // =========================================

  /**
   * GET /gamification/point-history - Get user's point history
   */
  server.get('/point-history', {
    schema: {
      tags: ['Gamification'],
      summary: 'Get user point history',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { projectId?: string; limit?: number; offset?: number }
  }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    const { projectId, limit = 50, offset = 0 } = request.query;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const history = await gamificationService.getPointHistory(userId, projectId, limit, offset);
      return reply.send({
        success: true,
        data: history,
        meta: { limit, offset }
      });
    } catch (error: any) {
      server.log.error({ error, userId, projectId }, 'Failed to get point history');
      return reply.status(500).send({ success: false, error: { code: 'HISTORY_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Sprints
  // =========================================

  /**
   * GET /gamification/sprints/:projectId - List sprints for a project
   */
  server.get('/sprints/:projectId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'List sprints for a project',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['planning', 'active', 'completed', 'cancelled', 'all'], default: 'all' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string };
    Querystring: { status?: string; limit?: number }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params;
    const { status = 'all', limit = 20 } = request.query;

    try {
      let query = `
        SELECT s.*,
          (SELECT COUNT(*) FROM todos t WHERE t.sprint_id = s.id) as task_count,
          (SELECT COUNT(*) FROM todos t WHERE t.sprint_id = s.id AND t.status = 'completed') as completed_count
        FROM sprints s
        WHERE s.project_id = $1
      `;
      const params: (string | number)[] = [projectId];

      if (status !== 'all') {
        query += ` AND s.status = $2`;
        params.push(status);
        query += ` ORDER BY s.start_date DESC LIMIT $3`;
        params.push(limit);
      } else {
        query += ` ORDER BY s.start_date DESC LIMIT $2`;
        params.push(limit);
      }

      const result = await server.pg.query(query, params);
      return reply.send({ success: true, data: result.rows });
    } catch (error: any) {
      server.log.error({ error, projectId }, 'Failed to get sprints');
      return reply.status(500).send({ success: false, error: { code: 'SPRINTS_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/sprints/:projectId - Create a new sprint
   */
  server.post('/sprints/:projectId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Create a new sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          goal: { type: 'string' },
          duration_type: { type: 'string', enum: ['weekly', 'biweekly', 'monthly', 'yearly', 'custom'], default: 'biweekly' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          point_goal: { type: 'integer', minimum: 0, default: 0 }
        },
        required: ['name', 'start_date', 'end_date']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string };
    Body: {
      name: string;
      goal?: string;
      duration_type?: SprintDurationType;
      start_date: string;
      end_date: string;
      point_goal?: number;
    }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params;
    const { name, goal, duration_type = 'biweekly', start_date, end_date, point_goal = 0 } = request.body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const sprint = await gamificationService.createSprint(projectId, userId, {
        name,
        goal,
        durationType: duration_type,
        startDate: start_date,
        endDate: end_date,
        pointGoal: point_goal
      });
      return reply.status(201).send({ success: true, data: sprint });
    } catch (error: any) {
      server.log.error({ error, projectId }, 'Failed to create sprint');
      return reply.status(500).send({ success: false, error: { code: 'CREATE_SPRINT_ERROR', message: error.message } });
    }
  });

  /**
   * GET /gamification/sprints/:projectId/:sprintId - Get sprint details
   */
  server.get('/sprints/:projectId/:sprintId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Get sprint details',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;

    try {
      const result = await server.pg.query(`
        SELECT s.*,
          (SELECT COUNT(*) FROM todos t WHERE t.sprint_id = s.id) as task_count,
          (SELECT COUNT(*) FROM todos t WHERE t.sprint_id = s.id AND t.status = 'completed') as completed_count,
          (SELECT SUM(t.points_awarded) FROM todos t WHERE t.sprint_id = s.id AND t.status = 'completed') as points_earned
        FROM sprints s
        WHERE s.id = $1 AND s.project_id = $2
      `, [sprintId, projectId]);

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Sprint not found' } });
      }

      return reply.send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to get sprint');
      return reply.status(500).send({ success: false, error: { code: 'SPRINT_ERROR', message: error.message } });
    }
  });

  /**
   * PUT /gamification/sprints/:projectId/:sprintId - Update a sprint
   */
  server.put('/sprints/:projectId/:sprintId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Update a sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          goal: { type: 'string' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          point_goal: { type: 'integer', minimum: 0 },
          velocity_predicted: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string };
    Body: {
      name?: string;
      goal?: string;
      start_date?: string;
      end_date?: string;
      point_goal?: number;
      velocity_predicted?: number;
    }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const body = request.body;
    const userId = (request as any).user?.id;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      goal: 'goal',
      start_date: 'start_date',
      end_date: 'end_date',
      point_goal: 'point_goal',
      velocity_predicted: 'velocity_predicted'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if ((body as any)[key] !== undefined) {
        updates.push(`${column} = $${paramIndex++}`);
        params.push((body as any)[key]);
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    updates.push(`date_updated = NOW()`);
    updates.push(`user_updated = $${paramIndex++}`);
    params.push(userId || null);

    params.push(sprintId, projectId);

    try {
      const result = await server.pg.query(`
        UPDATE sprints SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Sprint not found' } });
      }

      return reply.send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to update sprint');
      return reply.status(500).send({ success: false, error: { code: 'UPDATE_SPRINT_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/sprints/:projectId/:sprintId/start - Start a sprint
   */
  server.post('/sprints/:projectId/:sprintId/start', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Start a sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const userId = (request as any).user?.id;

    try {
      const sprint = await gamificationService.startSprint(sprintId);
      return reply.send({ success: true, data: sprint });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to start sprint');
      return reply.status(500).send({ success: false, error: { code: 'START_SPRINT_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/sprints/:projectId/:sprintId/complete - Complete a sprint
   */
  server.post('/sprints/:projectId/:sprintId/complete', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Complete a sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const userId = (request as any).user?.id;

    try {
      const result = await gamificationService.completeSprint(sprintId, projectId);
      return reply.send({
        success: true,
        data: result.sprint,
        velocity: result.velocity
      });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to complete sprint');
      return reply.status(500).send({ success: false, error: { code: 'COMPLETE_SPRINT_ERROR', message: error.message } });
    }
  });

  /**
   * GET /gamification/velocity/:projectId - Get velocity data for a project
   */
  server.get('/velocity/:projectId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Get project velocity data',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string };
    Querystring: { limit?: number }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params;
    const { limit = 10 } = request.query;

    try {
      const velocityData = await gamificationService.getVelocityData(projectId, limit);
      return reply.send({ success: true, data: velocityData });
    } catch (error: any) {
      server.log.error({ error, projectId }, 'Failed to get velocity data');
      return reply.status(500).send({ success: false, error: { code: 'VELOCITY_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Retrospectives
  // =========================================

  /**
   * GET /gamification/sprints/:projectId/:sprintId/retrospective - Get retrospective for a sprint
   */
  server.get('/sprints/:projectId/:sprintId/retrospective', {
    schema: {
      tags: ['Gamification', 'Retrospectives'],
      summary: 'Get sprint retrospective',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;

    try {
      const result = await server.pg.query(`
        SELECT r.*, u.first_name, u.last_name, u.email
        FROM retrospectives r
        LEFT JOIN directus_users u ON r.user_created = u.id
        WHERE r.sprint_id = $1
        ORDER BY r.date_created DESC
      `, [sprintId]);

      return reply.send({ success: true, data: result.rows });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to get retrospective');
      return reply.status(500).send({ success: false, error: { code: 'RETRO_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/sprints/:projectId/:sprintId/retrospective - Add retrospective entry
   */
  server.post('/sprints/:projectId/:sprintId/retrospective', {
    schema: {
      tags: ['Gamification', 'Retrospectives'],
      summary: 'Add sprint retrospective entry',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      },
      body: {
        type: 'object',
        properties: {
          went_well: {
            type: 'array',
            items: { type: 'string' },
            description: 'Things that went well'
          },
          needs_improvement: {
            type: 'array',
            items: { type: 'string' },
            description: 'Things that need improvement'
          },
          action_items: {
            type: 'array',
            items: { type: 'string' },
            description: 'Action items for next sprint'
          },
          sentiment_rating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Overall sprint sentiment (1-5)'
          },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string };
    Body: {
      went_well?: string[];
      needs_improvement?: string[];
      action_items?: string[];
      sentiment_rating?: number;
      notes?: string;
    }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const { went_well, needs_improvement, action_items, sentiment_rating, notes } = request.body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const result = await server.pg.query(`
        INSERT INTO retrospectives (
          sprint_id, went_well, needs_improvement, action_items,
          sentiment_rating, notes, user_created
        )
        VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7)
        RETURNING *
      `, [
        sprintId,
        JSON.stringify(went_well || []),
        JSON.stringify(needs_improvement || []),
        JSON.stringify(action_items || []),
        sentiment_rating || null,
        notes || null,
        userId
      ]);

      return reply.status(201).send({ success: true, data: result.rows[0] });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to create retrospective');
      return reply.status(500).send({ success: false, error: { code: 'CREATE_RETRO_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/sprints/:projectId/:sprintId/retrospective/complete - Mark retrospective complete
   */
  server.post('/sprints/:projectId/:sprintId/retrospective/complete', {
    schema: {
      tags: ['Gamification', 'Retrospectives'],
      summary: 'Mark retrospective as complete',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const userId = (request as any).user?.id;

    try {
      // Update all retrospectives for this sprint as completed
      await server.pg.query(`
        UPDATE retrospectives
        SET is_completed = true, date_updated = NOW(), user_updated = $1
        WHERE sprint_id = $2
      `, [userId, sprintId]);

      return reply.send({ success: true, message: 'Retrospective marked as complete' });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to complete retrospective');
      return reply.status(500).send({ success: false, error: { code: 'COMPLETE_RETRO_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Task Points (Award on Completion)
  // =========================================

  /**
   * POST /gamification/tasks/:todoId/complete - Complete a task and award points
   */
  server.post('/tasks/:todoId/complete', {
    schema: {
      tags: ['Gamification'],
      summary: 'Complete a task and award points',
      params: {
        type: 'object',
        properties: {
          todoId: { type: 'string', format: 'uuid' }
        },
        required: ['todoId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { todoId: string }
  }>, reply: FastifyReply) => {
    const { todoId } = request.params;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      // Get the todo
      const todoResult = await server.pg.query('SELECT * FROM todos WHERE id = $1', [todoId]);

      if (todoResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Todo not found' } });
      }

      const todo = todoResult.rows[0];

      // Check if already completed
      if (todo.status === 'completed') {
        return reply.status(400).send({ success: false, error: { code: 'ALREADY_COMPLETED', message: 'Task already completed' } });
      }

      // Award points
      const result = await gamificationService.awardTaskPoints(userId, todoId, todo.project_id);

      // Update the todo status
      await server.pg.query(`
        UPDATE todos
        SET status = 'completed',
            completed_at = NOW(),
            completed_by = $1,
            points_awarded = $2,
            date_updated = NOW()
        WHERE id = $3
      `, [userId, result.pointsAwarded, todoId]);

      return reply.send({
        success: true,
        data: {
          pointsAwarded: result.pointsAwarded,
          breakdown: result.breakdown,
          levelUp: result.levelUp,
          newAchievements: result.newAchievements,
          streak: result.newStreak
        }
      });
    } catch (error: any) {
      server.log.error({ error, todoId, userId }, 'Failed to complete task with points');
      return reply.status(500).send({ success: false, error: { code: 'POINTS_ERROR', message: error.message } });
    }
  });

  // =========================================
  // Assign Tasks to Sprints
  // =========================================

  /**
   * POST /gamification/sprints/:projectId/:sprintId/tasks - Add tasks to a sprint
   */
  server.post('/sprints/:projectId/:sprintId/tasks', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Add tasks to a sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId']
      },
      body: {
        type: 'object',
        properties: {
          task_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' }
          }
        },
        required: ['task_ids']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string };
    Body: { task_ids: string[] }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId } = request.params;
    const { task_ids } = request.body;
    const userId = (request as any).user?.id;

    try {
      // Verify sprint exists
      const sprintResult = await server.pg.query(
        'SELECT id FROM sprints WHERE id = $1 AND project_id = $2',
        [sprintId, projectId]
      );

      if (sprintResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Sprint not found' } });
      }

      // Update tasks
      await server.pg.query(`
        UPDATE todos
        SET sprint_id = $1, date_updated = NOW(), user_updated = $2
        WHERE id = ANY($3::uuid[]) AND project_id = $4
      `, [sprintId, userId, task_ids, projectId]);

      return reply.send({ success: true, message: `${task_ids.length} tasks added to sprint` });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId }, 'Failed to add tasks to sprint');
      return reply.status(500).send({ success: false, error: { code: 'ADD_TASKS_ERROR', message: error.message } });
    }
  });

  /**
   * DELETE /gamification/sprints/:projectId/:sprintId/tasks/:todoId - Remove task from sprint
   */
  server.delete('/sprints/:projectId/:sprintId/tasks/:todoId', {
    schema: {
      tags: ['Gamification', 'Sprints'],
      summary: 'Remove task from sprint',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          sprintId: { type: 'string', format: 'uuid' },
          todoId: { type: 'string', format: 'uuid' }
        },
        required: ['projectId', 'sprintId', 'todoId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { projectId: string; sprintId: string; todoId: string }
  }>, reply: FastifyReply) => {
    const { projectId, sprintId, todoId } = request.params;
    const userId = (request as any).user?.id;

    try {
      await server.pg.query(`
        UPDATE todos
        SET sprint_id = NULL, date_updated = NOW(), user_updated = $1
        WHERE id = $2 AND sprint_id = $3 AND project_id = $4
      `, [userId, todoId, sprintId, projectId]);

      return reply.send({ success: true, message: 'Task removed from sprint' });
    } catch (error: any) {
      server.log.error({ error, projectId, sprintId, todoId }, 'Failed to remove task from sprint');
      return reply.status(500).send({ success: false, error: { code: 'REMOVE_TASK_ERROR', message: error.message } });
    }
  });

  // =========================================
  // LLM Complexity Estimation
  // =========================================

  /**
   * POST /gamification/estimate - Pre-estimate task complexity using LLM
   */
  server.post('/estimate', {
    schema: {
      tags: ['Gamification', 'Complexity'],
      summary: 'Pre-estimate task complexity using LLM',
      body: {
        type: 'object',
        properties: {
          todoId: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          issue_type: { type: 'string', enum: ['bug', 'feature', 'enhancement', 'refactor', 'documentation', 'test', 'chore', 'task'] },
          labels: { type: 'array', items: { type: 'string' } },
          project_context: { type: 'string' }
        },
        required: ['title']
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      todoId?: string;
      title: string;
      description?: string;
      issue_type?: string;
      labels?: string[];
      project_context?: string;
    }
  }>, reply: FastifyReply) => {
    const { todoId, title, description, issue_type, labels, project_context } = request.body;
    const userId = (request as any).user?.id;

    try {
      // Call ML service for estimation
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

      const response = await fetch(`${mlServiceUrl}/complexity/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || '',
          issue_type: issue_type || 'task',
          labels: labels || [],
          project_context: project_context || ''
        })
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const estimate = await response.json();

      // Store estimate if todoId provided
      if (todoId && userId) {
        await gamificationService.storePreEstimate(todoId, userId, estimate);
      }

      return reply.send({ success: true, data: estimate });
    } catch (error: any) {
      server.log.error({ error, title }, 'Failed to estimate task complexity');
      return reply.status(500).send({ success: false, error: { code: 'ESTIMATE_ERROR', message: error.message } });
    }
  });

  /**
   * POST /gamification/analyze - Post-mortem analysis after PR merge
   */
  server.post('/analyze', {
    schema: {
      tags: ['Gamification', 'Complexity'],
      summary: 'Analyze actual complexity after PR merge',
      body: {
        type: 'object',
        properties: {
          todoId: { type: 'string', format: 'uuid' },
          lines_added: { type: 'integer', minimum: 0 },
          lines_removed: { type: 'integer', minimum: 0 },
          files_changed: { type: 'integer', minimum: 0 },
          commits: { type: 'integer', minimum: 1 },
          time_to_merge_hours: { type: 'number', minimum: 0 },
          review_comments: { type: 'integer', minimum: 0 },
          pr_description: { type: 'string' },
          github_pr_id: { type: 'string' },
          github_issue_id: { type: 'string' }
        },
        required: ['todoId', 'lines_added', 'files_changed']
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      todoId: string;
      lines_added: number;
      lines_removed?: number;
      files_changed: number;
      commits?: number;
      time_to_merge_hours?: number;
      review_comments?: number;
      pr_description?: string;
      github_pr_id?: string;
      github_issue_id?: string;
    }
  }>, reply: FastifyReply) => {
    const {
      todoId, lines_added, lines_removed, files_changed,
      commits, time_to_merge_hours, review_comments, pr_description,
      github_pr_id, github_issue_id
    } = request.body;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      // Get pre-estimate if exists
      const preEstimate = await gamificationService.getPreEstimate(todoId);

      // Call ML service for post-mortem analysis
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

      const response = await fetch(`${mlServiceUrl}/complexity/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines_added,
          lines_removed: lines_removed || 0,
          files_changed,
          commits: commits || 1,
          time_to_merge_hours: time_to_merge_hours || 0,
          review_comments: review_comments || 0,
          pr_description: pr_description || '',
          pre_complexity_score: preEstimate?.complexity_score,
          pre_estimated_hours: preEstimate?.estimated_hours,
          pre_reasoning: preEstimate?.reasoning
        })
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const analysis = await response.json();

      // Store analysis
      await gamificationService.storePostAnalysis(
        todoId,
        analysis,
        github_pr_id,
        github_issue_id
      );

      // Get todo for project context
      const todoResult = await server.pg.query('SELECT project_id FROM todos WHERE id = $1', [todoId]);
      const projectId = todoResult.rows[0]?.project_id;

      // Update user accuracy stats if we had a pre-estimate
      if (preEstimate && analysis.accuracy_score !== null) {
        const bonusPoints = analysis.actual_points - (preEstimate.estimated_points || 0);
        await gamificationService.updateUserEstimationAccuracy(
          userId,
          projectId,
          preEstimate.complexity_score,
          analysis.actual_complexity,
          bonusPoints > 0 ? bonusPoints : 0
        );
      }

      return reply.send({
        success: true,
        data: {
          analysis,
          preEstimate,
          pointsAdjustment: {
            multiplier: analysis.point_adjustment,
            reason: analysis.adjustment_reason,
            accuracyScore: analysis.accuracy_score
          }
        }
      });
    } catch (error: any) {
      server.log.error({ error, todoId }, 'Failed to analyze task complexity');
      return reply.status(500).send({ success: false, error: { code: 'ANALYZE_ERROR', message: error.message } });
    }
  });

  /**
   * GET /gamification/accuracy - Get user's estimation accuracy stats
   */
  server.get('/accuracy', {
    schema: {
      tags: ['Gamification', 'Complexity'],
      summary: 'Get user estimation accuracy statistics',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { projectId?: string }
  }>, reply: FastifyReply) => {
    const { projectId } = request.query;
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    try {
      const accuracy = await gamificationService.getUserEstimationAccuracy(userId, projectId);
      return reply.send({ success: true, data: accuracy });
    } catch (error: any) {
      server.log.error({ error, userId }, 'Failed to get estimation accuracy');
      return reply.status(500).send({ success: false, error: { code: 'ACCURACY_ERROR', message: error.message } });
    }
  });

  /**
   * GET /gamification/complexity-scale - Get complexity scale definitions
   */
  server.get('/complexity-scale', {
    schema: {
      tags: ['Gamification', 'Complexity'],
      summary: 'Get complexity scale definitions (1-5)'
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await server.pg.query(
        'SELECT * FROM complexity_scale ORDER BY level'
      );

      return reply.send({ success: true, data: result.rows });
    } catch (error: any) {
      // Return default scale if table doesn't exist
      return reply.send({
        success: true,
        data: [
          { level: 1, name: 'Trivial', base_points: 5, description: 'Simple task, single file change' },
          { level: 2, name: 'Simple', base_points: 10, description: 'Straightforward task, few files' },
          { level: 3, name: 'Moderate', base_points: 20, description: 'Standard feature work' },
          { level: 4, name: 'Complex', base_points: 35, description: 'Significant effort required' },
          { level: 5, name: 'Epic', base_points: 50, description: 'Major undertaking' }
        ]
      });
    }
  });
}
