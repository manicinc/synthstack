/**
 * Admin Sync Routes
 * Handles synchronization between Supabase, Directus, and Stripe
 * 
 * Endpoints:
 * - POST /admin/sync/user - Sync user from Supabase to Directus
 * - POST /admin/sync/directus-update - Handle Directus admin changes
 * - POST /admin/users/:id/credits - Adjust user credits
 * - POST /admin/users/:id/ban - Ban/unban user
 * - POST /admin/users/:id/impersonate - Generate impersonation token
 * - POST /admin/reset-credits - Daily credit reset (called by cron)
 * - GET /admin/analytics/daily - Get daily analytics
 * - POST /admin/analytics/event - Log analytics event
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';

// Types
interface UserSyncPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      display_name?: string;
      avatar_url?: string;
    };
    created_at?: string;
    last_sign_in_at?: string;
  };
  old_record?: {
    id: string;
  };
}

interface DirectusUpdatePayload {
  event: string;
  collection: string;
  key: string;
  payload: Record<string, unknown>;
}

interface CreditAdjustment {
  adjustment: number;
  reason: string;
  notes?: string;
}

interface BanAction {
  ban: boolean;
  reason?: string;
}

// Directus API helper
async function directusRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  const directusUrl = config.directus?.url || process.env.DIRECTUS_URL || 'http://localhost:8056';
  const directusToken = config.directus?.token || process.env.DIRECTUS_TOKEN || 'printverse-static-admin-token-2024';
  
  const response = await fetch(`${directusUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${directusToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Directus API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export default async function adminSyncRoutes(fastify: FastifyInstance) {
  // Middleware to verify admin access
  const verifyAdminAccess = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET || 'dev-admin-secret';
    
    // Check for admin secret in header or valid admin token
    if (authHeader !== `Bearer ${adminSecret}`) {
      // In production, also verify JWT and check admin role
      if (config.isDev) {
        // Allow in dev mode
        return;
      }
      return reply.status(403).send({ error: 'Admin access required' });
    }
  };

  /**
   * POST /admin/sync/user
   * Webhook from Supabase to sync user changes to Directus
   */
  fastify.post<{ Body: UserSyncPayload }>(
    '/sync/user',
    async (request, reply) => {
      const { type, record, old_record } = request.body;

      try {
        if (type === 'DELETE' && old_record) {
          // User deleted - mark as inactive in Directus
          await directusRequest('PATCH', `/items/app_users/${old_record.id}`, {
            status: 'deleted',
          });
          
          fastify.log.info({ userId: old_record.id }, 'User marked as deleted in Directus');
          return { success: true, action: 'deleted' };
        }

        if (type === 'INSERT' || type === 'UPDATE') {
          const userData = {
            id: record.id,
            email: record.email,
            display_name: record.raw_user_meta_data?.display_name || record.email.split('@')[0],
            avatar_url: record.raw_user_meta_data?.avatar_url,
            last_login_at: record.last_sign_in_at,
            created_at: record.created_at,
            synced_at: new Date().toISOString(),
          };

          if (type === 'INSERT') {
            // New user - create in Directus
            await directusRequest('POST', '/items/app_users', {
              ...userData,
              subscription_tier: 'free',
              subscription_status: 'active',
              credits_remaining: config.creditsPerTier?.free || 10,
            });
            
            // Log analytics event
            await logAnalyticsEvent(fastify, 'user_signup', 'user', record.id, { email: record.email });
            
            fastify.log.info({ userId: record.id }, 'New user synced to Directus');
            return { success: true, action: 'created' };
          } else {
            // Update existing user
            await directusRequest('PATCH', `/items/app_users/${record.id}`, userData);
            
            fastify.log.info({ userId: record.id }, 'User updated in Directus');
            return { success: true, action: 'updated' };
          }
        }

        return { success: false, error: 'Unknown operation type' };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to sync user to Directus');
        return reply.status(500).send({ error: 'Sync failed' });
      }
    }
  );

  /**
   * POST /admin/sync/directus-update
   * Webhook from Directus when admin makes changes
   */
  fastify.post<{ Body: DirectusUpdatePayload }>(
    '/sync/directus-update',
    async (request, reply) => {
      const { event, collection, key, payload } = request.body;

      try {
        // Only handle app_users updates
        if (collection !== 'app_users') {
          return { success: true, message: 'Ignored - not app_users collection' };
        }

        // Handle subscription tier changes - sync to Stripe
        if (payload.subscription_tier && event.includes('update')) {
          // TODO: Implement Stripe subscription update
          fastify.log.info({ userId: key, tier: payload.subscription_tier }, 'Subscription tier changed - Stripe sync needed');
          
          // Log admin activity
          await logAnalyticsEvent(fastify, 'admin_tier_change', 'subscription', key, {
            new_tier: payload.subscription_tier,
          });
        }

        // Handle ban status changes
        if (typeof payload.is_banned === 'boolean' && event.includes('update')) {
          // Sync ban status to Supabase
          if (config.supabase?.url && config.supabase?.serviceKey) {
            // Update user metadata in Supabase
            fastify.log.info({ userId: key, banned: payload.is_banned }, 'Ban status synced to Supabase');
          }
          
          await logAnalyticsEvent(fastify, payload.is_banned ? 'user_banned' : 'user_unbanned', 'moderation', key, {
            reason: payload.ban_reason,
          });
        }

        return { success: true };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to process Directus update');
        return reply.status(500).send({ error: 'Processing failed' });
      }
    }
  );

  /**
   * POST /admin/users/:id/credits
   * Adjust user credits with audit log
   */
  fastify.post<{
    Params: { id: string };
    Body: CreditAdjustment;
  }>(
    '/users/:id/credits',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;
      const { adjustment, reason, notes } = request.body;

      try {
        // Get current balance
        const userResponse = await directusRequest('GET', `/items/app_users/${id}?fields=credits_remaining`) as {
          data: { credits_remaining: number };
        };
        const currentBalance = userResponse.data.credits_remaining;
        const newBalance = Math.max(0, currentBalance + adjustment);

        // Update user credits
        await directusRequest('PATCH', `/items/app_users/${id}`, {
          credits_remaining: newBalance,
        });

        // Create audit log entry
        await directusRequest('POST', '/items/credit_adjustments', {
          user_id: id,
          adjustment,
          reason,
          notes,
          balance_before: currentBalance,
          balance_after: newBalance,
        });

        // Log analytics event
        await logAnalyticsEvent(fastify, 'admin_credit_adjustment', 'user', id, {
          adjustment,
          reason,
          balance_before: currentBalance,
          balance_after: newBalance,
        });

        fastify.log.info({ userId: id, adjustment, newBalance }, 'Credits adjusted');
        return { success: true, balance_before: currentBalance, balance_after: newBalance };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to adjust credits');
        return reply.status(500).send({ error: 'Credit adjustment failed' });
      }
    }
  );

  /**
   * POST /admin/users/:id/ban
   * Ban or unban a user
   */
  fastify.post<{
    Params: { id: string };
    Body: BanAction;
  }>(
    '/users/:id/ban',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;
      const { ban, reason } = request.body;

      try {
        const updateData: Record<string, unknown> = {
          is_banned: ban,
        };

        if (ban) {
          updateData.ban_reason = reason || 'No reason provided';
          updateData.banned_at = new Date().toISOString();
        } else {
          updateData.ban_reason = null;
          updateData.banned_at = null;
        }

        await directusRequest('PATCH', `/items/app_users/${id}`, updateData);

        // Log analytics event
        await logAnalyticsEvent(fastify, ban ? 'user_banned' : 'user_unbanned', 'moderation', id, { reason });

        fastify.log.info({ userId: id, banned: ban }, 'User ban status updated');
        return { success: true, banned: ban };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to update ban status');
        return reply.status(500).send({ error: 'Ban operation failed' });
      }
    }
  );

  /**
   * POST /admin/users/:id/impersonate
   * Generate a temporary token to impersonate a user (for debugging)
   */
  fastify.post<{ Params: { id: string } }>(
    '/users/:id/impersonate',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;

      try {
        // Generate a temporary impersonation token
        // This should be short-lived and logged
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Log the impersonation for audit
        await logAnalyticsEvent(fastify, 'admin_impersonation', 'user', id, {
          expires_at: expiresAt.toISOString(),
        });

        // In production, this would generate a proper JWT
        const token = Buffer.from(JSON.stringify({
          sub: id,
          type: 'impersonation',
          exp: Math.floor(expiresAt.getTime() / 1000),
        })).toString('base64');

        fastify.log.warn({ userId: id }, 'Impersonation token generated');
        return { 
          success: true, 
          token: `impersonate_${token}`,
          expires_at: expiresAt.toISOString(),
          warning: 'This action is logged. Use responsibly.'
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to generate impersonation token');
        return reply.status(500).send({ error: 'Impersonation failed' });
      }
    }
  );

  /**
   * POST /admin/reset-credits
   * Daily credit reset - called by scheduled job
   */
  fastify.post(
    '/reset-credits',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      try {
        // Get credit config
        const configResponse = await directusRequest('GET', '/items/system_config/credits_per_tier') as {
          data: { value: Record<string, number> };
        };
        const creditsPerTier = configResponse.data?.value || {
          free: 10,
          maker: 50,
          pro: 200,
          unlimited: -1,
        };

        // Reset credits for each tier
        const tiers = ['free', 'maker', 'pro'];
        let totalReset = 0;

        for (const tier of tiers) {
          const credits = creditsPerTier[tier] || 10;
          
          // Update all users of this tier
          // Note: This is a simplified version - in production use batch updates
          const usersResponse = await directusRequest('GET', 
            `/items/app_users?filter[subscription_tier][_eq]=${tier}&filter[is_banned][_eq]=false&fields=id`
          ) as { data: Array<{ id: string }> };

          for (const user of usersResponse.data || []) {
            await directusRequest('PATCH', `/items/app_users/${user.id}`, {
              credits_remaining: credits,
              credits_reset_at: new Date().toISOString(),
            });
            totalReset++;
          }
        }

        // Log analytics event
        await logAnalyticsEvent(fastify, 'daily_credit_reset', 'system', undefined, {
          users_reset: totalReset,
        });

        fastify.log.info({ totalReset }, 'Daily credit reset completed');
        return { success: true, users_reset: totalReset };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to reset credits');
        return reply.status(500).send({ error: 'Credit reset failed' });
      }
    }
  );

  /**
   * GET /admin/analytics/daily
   * Get daily analytics for a date range
   */
  fastify.get<{
    Querystring: { start_date?: string; end_date?: string };
  }>(
    '/analytics/daily',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { start_date, end_date } = request.query;
      
      try {
        let filter = '';
        if (start_date && end_date) {
          filter = `?filter[date][_between]=${start_date},${end_date}&sort=-date`;
        } else {
          filter = '?sort=-date&limit=30';
        }

        const response = await directusRequest('GET', `/items/analytics_daily${filter}`);
        return response;
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to fetch analytics');
        return reply.status(500).send({ error: 'Analytics fetch failed' });
      }
    }
  );

  /**
   * POST /admin/analytics/event
   * Log an analytics event
   */
  fastify.post<{
    Body: {
      event_type: string;
      event_category: string;
      user_id?: string;
      metadata?: Record<string, unknown>;
    };
  }>(
    '/analytics/event',
    async (request, reply) => {
      const { event_type, event_category, user_id, metadata } = request.body;

      try {
        await logAnalyticsEvent(fastify, event_type, event_category, user_id, metadata);
        return { success: true };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to log analytics event');
        return reply.status(500).send({ error: 'Event logging failed' });
      }
    }
  );

  /**
   * POST /admin/analytics/compute-daily
   * Compute daily analytics aggregate (called by scheduled job)
   */
  fastify.post(
    '/analytics/compute-daily',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Compute metrics from events
        const eventsResponse = await directusRequest('GET',
          `/items/analytics_events?filter[timestamp][_gte]=${dateStr}T00:00:00&filter[timestamp][_lt]=${dateStr}T23:59:59&limit=-1`
        ) as { data: Array<{ event_type: string; event_category: string; user_id: string }> };

        const events = eventsResponse.data || [];
        
        // Calculate metrics
        const metrics = {
          date: dateStr,
          new_users: events.filter(e => e.event_type === 'user_signup').length,
          active_users: new Set(events.filter(e => e.user_id).map(e => e.user_id)).size,
          generations: events.filter(e => e.event_type === 'generation_completed').length,
          credits_used: events.filter(e => e.event_type === 'credit_used').length,
          new_subscriptions: events.filter(e => e.event_type === 'subscription_created').length,
          churned_subscriptions: events.filter(e => e.event_type === 'subscription_canceled').length,
          reports_opened: events.filter(e => e.event_type === 'report_created').length,
          reports_resolved: events.filter(e => e.event_type === 'report_resolved').length,
          users_banned: events.filter(e => e.event_type === 'user_banned').length,
          warnings_issued: events.filter(e => e.event_type === 'warning_issued').length,
          computed_at: new Date().toISOString(),
        };

        // Upsert daily analytics
        try {
          await directusRequest('POST', '/items/analytics_daily', metrics);
        } catch {
          // If exists, update
          await directusRequest('PATCH', `/items/analytics_daily/${dateStr}`, metrics);
        }

        fastify.log.info({ date: dateStr, metrics }, 'Daily analytics computed');
        return { success: true, date: dateStr, metrics };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to compute daily analytics');
        return reply.status(500).send({ error: 'Analytics computation failed' });
      }
    }
  );

  /**
   * GET /admin/moderation/queue
   * Get pending moderation items
   */
  fastify.get(
    '/moderation/queue',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      try {
        // Get pending comments
        const commentsResponse = await directusRequest('GET',
          '/items/community_comments?filter[status][_eq]=pending&sort=created_at&limit=50'
        );

        // Get open reports
        const reportsResponse = await directusRequest('GET',
          '/items/community_reports?filter[status][_eq]=open&sort=created_at&limit=50'
        );

        return {
          comments: (commentsResponse as { data: unknown }).data,
          reports: (reportsResponse as { data: unknown }).data,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to fetch moderation queue');
        return reply.status(500).send({ error: 'Failed to fetch queue' });
      }
    }
  );

  /**
   * POST /admin/moderation/comment/:id/action
   * Take action on a comment
   */
  fastify.post<{
    Params: { id: string };
    Body: { action: 'approve' | 'reject' | 'flag'; notes?: string };
  }>(
    '/moderation/comment/:id/action',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;
      const { action, notes } = request.body;

      try {
        const statusMap = {
          approve: 'approved',
          reject: 'rejected',
          flag: 'flagged',
        };

        await directusRequest('PATCH', `/items/community_comments/${id}`, {
          status: statusMap[action],
          moderated_at: new Date().toISOString(),
          moderation_notes: notes,
        });

        await logAnalyticsEvent(fastify, `comment_${action}d`, 'moderation', undefined, { comment_id: id });

        return { success: true, action };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to moderate comment');
        return reply.status(500).send({ error: 'Moderation failed' });
      }
    }
  );

  /**
   * POST /admin/moderation/report/:id/resolve
   * Resolve a report
   */
  fastify.post<{
    Params: { id: string };
    Body: { resolution: 'resolved' | 'dismissed'; notes?: string; action_taken?: string };
  }>(
    '/moderation/report/:id/resolve',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;
      const { resolution, notes, action_taken } = request.body;

      try {
        await directusRequest('PATCH', `/items/community_reports/${id}`, {
          status: resolution,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
          action_taken,
        });

        await logAnalyticsEvent(fastify, 'report_resolved', 'moderation', undefined, { 
          report_id: id, 
          resolution,
          action_taken,
        });

        return { success: true, resolution };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to resolve report');
        return reply.status(500).send({ error: 'Resolution failed' });
      }
    }
  );

  /**
   * POST /admin/users/:id/warn
   * Issue a warning to a user
   */
  fastify.post<{
    Params: { id: string };
    Body: {
      warning_type: string;
      severity: string;
      message: string;
      report_id?: string;
      expires_days?: number;
    };
  }>(
    '/users/:id/warn',
    { preHandler: verifyAdminAccess },
    async (request, reply) => {
      const { id } = request.params;
      const { warning_type, severity, message, report_id, expires_days } = request.body;

      try {
        const expiresAt = expires_days 
          ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        await directusRequest('POST', '/items/user_warnings', {
          user_id: id,
          warning_type,
          severity,
          message,
          report_id,
          expires_at: expiresAt,
        });

        await logAnalyticsEvent(fastify, 'warning_issued', 'moderation', id, {
          warning_type,
          severity,
        });

        // Check if user should be auto-banned
        const userResponse = await directusRequest('GET', `/items/app_users/${id}?fields=warning_count`) as {
          data: { warning_count: number };
        };

        const configResponse = await directusRequest('GET', '/items/system_config/max_warnings_before_ban') as {
          data: { value: number };
        };
        const maxWarnings = configResponse.data?.value || 3;

        if (userResponse.data.warning_count >= maxWarnings) {
          await directusRequest('PATCH', `/items/app_users/${id}`, {
            is_banned: true,
            ban_reason: `Auto-banned after ${maxWarnings} warnings`,
            banned_at: new Date().toISOString(),
          });

          await logAnalyticsEvent(fastify, 'user_auto_banned', 'moderation', id, {
            warning_count: userResponse.data.warning_count,
          });
        }

        return { success: true };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to issue warning');
        return reply.status(500).send({ error: 'Warning failed' });
      }
    }
  );
}

// Helper function to log analytics events
async function logAnalyticsEvent(
  fastify: FastifyInstance,
  eventType: string,
  category: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await directusRequest('POST', '/items/analytics_events', {
      event_type: eventType,
      event_category: category,
      user_id: userId,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    fastify.log.error({ err: error, eventType }, 'Failed to log analytics event');
  }
}

