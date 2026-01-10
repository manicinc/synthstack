/**
 * @file routes/activities.ts
 * @description CRM Activities API routes
 * Provides endpoints for managing calls, meetings, emails, and tasks
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Types
type ActivityType = 'call' | 'meeting' | 'email' | 'task' | 'note';
type ActivityStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

interface ActivityParams {
  activityId: string;
}

interface CreateActivityBody {
  activityType: ActivityType;
  title: string;
  description?: string;
  organizationId?: string;
  dealId?: string;
  contactIds?: string[];
  assignedTo?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  outcome?: string;
  priority?: string;
}

interface UpdateActivityBody {
  title?: string;
  description?: string;
  status?: ActivityStatus;
  startTime?: string;
  endTime?: string;
  outcome?: string;
  notes?: string;
}

interface ActivityQuery {
  type?: ActivityType;
  status?: ActivityStatus;
  organizationId?: string;
  dealId?: string;
  contactId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export default async function activitiesRoutes(fastify: FastifyInstance) {
  // ============================================
  // Activity CRUD
  // ============================================

  /**
   * GET /api/v1/activities
   * List activities with filters
   */
  fastify.get<{ Querystring: ActivityQuery }>('/', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const {
      type, status, organizationId, dealId, contactId, assignedTo,
      startDate, endDate, page = 1, limit = 50
    } = request.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*,
             o.name as organization_name,
             d.title as deal_title,
             u.display_name as assigned_to_name,
             array_agg(DISTINCT c.first_name || ' ' || c.last_name) FILTER (WHERE c.id IS NOT NULL) as contact_names
      FROM activities a
      LEFT JOIN organizations o ON o.id = a.organization_id
      LEFT JOIN deals d ON d.id = a.deal_id
      LEFT JOIN app_users u ON u.id = a.assigned_to
      LEFT JOIN activity_contacts ac ON ac.activity_id = a.id
      LEFT JOIN contacts c ON c.id = ac.contact_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND a.activity_type = $${paramCount++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }
    if (organizationId) {
      query += ` AND a.organization_id = $${paramCount++}`;
      params.push(organizationId);
    }
    if (dealId) {
      query += ` AND a.deal_id = $${paramCount++}`;
      params.push(dealId);
    }
    if (contactId) {
      query += ` AND EXISTS (SELECT 1 FROM activity_contacts ac2 WHERE ac2.activity_id = a.id AND ac2.contact_id = $${paramCount++})`;
      params.push(contactId);
    }
    if (assignedTo) {
      query += ` AND a.assigned_to = $${paramCount++}`;
      params.push(assignedTo);
    }
    if (startDate) {
      query += ` AND a.start_time >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.start_time <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ` GROUP BY a.id, o.name, d.title, u.display_name`;
    query += ` ORDER BY a.start_time DESC NULLS LAST`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await fastify.pg.query(query, params);

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * POST /api/v1/activities
   * Create a new activity
   */
  fastify.post<{ Body: CreateActivityBody }>('/', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const {
      activityType, title, description, organizationId, dealId,
      contactIds, assignedTo, startTime, endTime, isAllDay, location, outcome, priority
    } = request.body;
    const userId = (request as any).user.id;

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create activity
      const result = await client.query(
        `INSERT INTO activities
         (activity_type, title, description, organization_id, deal_id, assigned_to,
          start_time, end_time, is_all_day, location, outcome, priority, status,
          user_created, date_created, date_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled', $13, NOW(), NOW())
         RETURNING *`,
        [activityType, title, description, organizationId, dealId,
         assignedTo || userId, startTime, endTime, isAllDay || false,
         location, outcome, priority || 'medium', userId]
      );

      const activity = result.rows[0];

      // Link contacts
      if (contactIds && contactIds.length > 0) {
        for (const contactId of contactIds) {
          await client.query(
            `INSERT INTO activity_contacts (activity_id, contact_id) VALUES ($1, $2)`,
            [activity.id, contactId]
          );
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: activity
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * GET /api/v1/activities/:activityId
   * Get activity details
   */
  fastify.get<{ Params: ActivityParams }>('/:activityId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;

    const result = await fastify.pg.query(
      `SELECT a.*,
              o.name as organization_name,
              d.title as deal_title,
              u.display_name as assigned_to_name
       FROM activities a
       LEFT JOIN organizations o ON o.id = a.organization_id
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN app_users u ON u.id = a.assigned_to
       WHERE a.id = $1`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Activity not found' }
      });
    }

    // Get contacts
    const contactsResult = await fastify.pg.query(
      `SELECT c.id, c.first_name, c.last_name, c.email
       FROM contacts c
       JOIN activity_contacts ac ON ac.contact_id = c.id
       WHERE ac.activity_id = $1`,
      [activityId]
    );

    // Get attachments
    const attachmentsResult = await fastify.pg.query(
      `SELECT f.id, f.filename_download, f.title, f.filesize
       FROM directus_files f
       JOIN activity_attachments aa ON aa.file_id = f.id
       WHERE aa.activity_id = $1`,
      [activityId]
    );

    return {
      success: true,
      data: {
        ...result.rows[0],
        contacts: contactsResult.rows,
        attachments: attachmentsResult.rows
      }
    };
  });

  /**
   * PATCH /api/v1/activities/:activityId
   * Update an activity
   */
  fastify.patch<{ Params: ActivityParams; Body: UpdateActivityBody }>('/:activityId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;
    const updates = request.body;

    const updateFields: string[] = ['date_updated = NOW()'];
    const values: unknown[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      startTime: 'start_time',
      endTime: 'end_time',
      outcome: 'outcome',
      notes: 'notes'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if ((updates as any)[key] !== undefined) {
        updateFields.push(`${dbField} = $${paramCount++}`);
        values.push((updates as any)[key]);
      }
    }

    if (values.length === 0) {
      return { success: true, data: { message: 'No updates provided' } };
    }

    values.push(activityId);

    const result = await fastify.pg.query(
      `UPDATE activities SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Activity not found' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * DELETE /api/v1/activities/:activityId
   * Delete an activity
   */
  fastify.delete<{ Params: ActivityParams }>('/:activityId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;

    const result = await fastify.pg.query(
      `DELETE FROM activities WHERE id = $1 RETURNING id`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Activity not found' }
      });
    }

    return {
      success: true,
      data: { message: 'Activity deleted' }
    };
  });

  // ============================================
  // Activity Actions
  // ============================================

  /**
   * POST /api/v1/activities/:activityId/complete
   * Mark activity as completed
   */
  fastify.post<{ Params: ActivityParams; Body: { outcome?: string; notes?: string } }>('/:activityId/complete', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;
    const { outcome, notes } = request.body;

    const result = await fastify.pg.query(
      `UPDATE activities
       SET status = 'completed', outcome = COALESCE($1, outcome), notes = COALESCE($2, notes),
           completed_at = NOW(), date_updated = NOW()
       WHERE id = $3 AND status != 'completed'
       RETURNING *`,
      [outcome, notes, activityId]
    );

    if (result.rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Activity cannot be completed' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * POST /api/v1/activities/:activityId/cancel
   * Cancel an activity
   */
  fastify.post<{ Params: ActivityParams; Body: { reason?: string } }>('/:activityId/cancel', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;
    const { reason } = request.body;

    const result = await fastify.pg.query(
      `UPDATE activities
       SET status = 'cancelled', notes = COALESCE($1, notes), date_updated = NOW()
       WHERE id = $2 AND status = 'scheduled'
       RETURNING *`,
      [reason, activityId]
    );

    if (result.rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Activity cannot be cancelled' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * POST /api/v1/activities/:activityId/reschedule
   * Reschedule an activity
   */
  fastify.post<{ Params: ActivityParams; Body: { startTime: string; endTime?: string } }>('/:activityId/reschedule', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { activityId } = request.params;
    const { startTime, endTime } = request.body;

    const result = await fastify.pg.query(
      `UPDATE activities
       SET start_time = $1, end_time = $2, status = 'scheduled', date_updated = NOW()
       WHERE id = $3
       RETURNING *`,
      [startTime, endTime, activityId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Activity not found' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  // ============================================
  // Contact Management
  // ============================================

  /**
   * POST /api/v1/activities/:activityId/contacts
   * Add contacts to activity
   */
  fastify.post<{ Params: ActivityParams; Body: { contactIds: string[] } }>('/:activityId/contacts', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { activityId } = request.params;
    const { contactIds } = request.body;

    for (const contactId of contactIds) {
      await fastify.pg.query(
        `INSERT INTO activity_contacts (activity_id, contact_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [activityId, contactId]
      );
    }

    return {
      success: true,
      data: { message: 'Contacts added' }
    };
  });

  /**
   * DELETE /api/v1/activities/:activityId/contacts/:contactId
   * Remove contact from activity
   */
  fastify.delete<{ Params: ActivityParams & { contactId: string } }>('/:activityId/contacts/:contactId', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { activityId, contactId } = request.params;

    await fastify.pg.query(
      `DELETE FROM activity_contacts WHERE activity_id = $1 AND contact_id = $2`,
      [activityId, contactId]
    );

    return {
      success: true,
      data: { message: 'Contact removed' }
    };
  });

  // ============================================
  // Calendar View
  // ============================================

  /**
   * GET /api/v1/activities/calendar
   * Get activities for calendar view
   */
  fastify.get<{ Querystring: { start: string; end: string; userId?: string } }>('/calendar', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { start, end, userId } = request.query;
    const currentUserId = (request as any).user.id;

    const result = await fastify.pg.query(
      `SELECT a.id, a.activity_type, a.title, a.start_time, a.end_time,
              a.is_all_day, a.status, a.priority,
              o.name as organization_name
       FROM activities a
       LEFT JOIN organizations o ON o.id = a.organization_id
       WHERE a.start_time >= $1 AND a.start_time <= $2
         AND a.assigned_to = $3
         AND a.status != 'cancelled'
       ORDER BY a.start_time`,
      [start, end, userId || currentUserId]
    );

    // Transform to calendar event format
    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      start: row.start_time,
      end: row.end_time,
      allDay: row.is_all_day,
      type: row.activity_type,
      status: row.status,
      priority: row.priority,
      organization: row.organization_name
    }));

    return {
      success: true,
      data: events
    };
  });

  // ============================================
  // Statistics
  // ============================================

  /**
   * GET /api/v1/activities/stats
   * Get activity statistics
   */
  fastify.get<{ Querystring: { period?: string; userId?: string } }>('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { period = 'month', userId } = request.query;
    const currentUserId = (request as any).user.id;
    const targetUserId = userId || currentUserId;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = `AND a.date_created >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      dateFilter = `AND a.date_created >= NOW() - INTERVAL '30 days'`;
    } else if (period === 'quarter') {
      dateFilter = `AND a.date_created >= NOW() - INTERVAL '90 days'`;
    }

    const result = await fastify.pg.query(`
      SELECT
        COUNT(*) FILTER (WHERE activity_type = 'call') as calls_total,
        COUNT(*) FILTER (WHERE activity_type = 'call' AND status = 'completed') as calls_completed,
        COUNT(*) FILTER (WHERE activity_type = 'meeting') as meetings_total,
        COUNT(*) FILTER (WHERE activity_type = 'meeting' AND status = 'completed') as meetings_completed,
        COUNT(*) FILTER (WHERE activity_type = 'email') as emails_total,
        COUNT(*) FILTER (WHERE activity_type = 'task') as tasks_total,
        COUNT(*) FILTER (WHERE activity_type = 'task' AND status = 'completed') as tasks_completed,
        COUNT(*) FILTER (WHERE status = 'scheduled' AND start_time > NOW()) as upcoming
      FROM activities a
      WHERE assigned_to = $1 ${dateFilter}
    `, [targetUserId]);

    return {
      success: true,
      data: result.rows[0]
    };
  });
}
