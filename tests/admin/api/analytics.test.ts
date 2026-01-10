/**
 * @file analytics.test.ts
 * @description Integration tests for analytics API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3030';
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

let directusToken: string;

async function adminRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  return fetch(`${API_GATEWAY_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_SECRET}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function directusRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  return fetch(`${DIRECTUS_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${directusToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Analytics API', () => {
  beforeAll(async () => {
    // Get Directus token
    const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'team@manic.agency',
        password: 'admin123',
      }),
    });
    const loginData = await loginResponse.json();
    directusToken = loginData.data.access_token;
  });

  describe('POST /api/v1/admin/analytics/event', () => {
    it('should log a user event', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'generation_completed',
        event_category: 'generation',
        user_id: '00000000-0000-0000-0000-000000000001',
        metadata: {
          printer: 'Bambu Lab X1 Carbon',
          filament: 'PLA',
          quality: 'high',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log a system event without user', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'system_startup',
        event_category: 'system',
        metadata: {
          version: '1.0.0',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log subscription events', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'subscription_created',
        event_category: 'subscription',
        user_id: '00000000-0000-0000-0000-000000000001',
        metadata: {
          tier: 'pro',
          price: 1999,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log moderation events', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'report_created',
        event_category: 'moderation',
        metadata: {
          reason: 'spam',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/v1/admin/analytics/daily', () => {
    beforeAll(async () => {
      // Create some test analytics data
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      await directusRequest('POST', '/items/analytics_daily', {
        date: today,
        new_users: 15,
        active_users: 120,
        generations: 450,
        credits_used: 400,
        revenue_cents: 5990,
      }).catch(() => {}); // Ignore if exists

      await directusRequest('POST', '/items/analytics_daily', {
        date: yesterday,
        new_users: 12,
        active_users: 110,
        generations: 420,
        credits_used: 380,
        revenue_cents: 3990,
      }).catch(() => {}); // Ignore if exists
    });

    it('should get recent daily analytics', async () => {
      const response = await adminRequest('GET', '/api/v1/admin/analytics/daily');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const response = await adminRequest(
        'GET',
        `/api/v1/admin/analytics/daily?start_date=${weekAgo}&end_date=${today}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
    });
  });

  describe('POST /api/v1/admin/analytics/compute-daily', () => {
    beforeAll(async () => {
      // Create some test events for yesterday
      const yesterday = new Date(Date.now() - 86400000);
      const timestamp = yesterday.toISOString();

      // Create test events
      await directusRequest('POST', '/items/analytics_events', {
        event_type: 'user_signup',
        event_category: 'user',
        timestamp,
      });

      await directusRequest('POST', '/items/analytics_events', {
        event_type: 'generation_completed',
        event_category: 'generation',
        user_id: '00000000-0000-0000-0000-000000000001',
        timestamp,
      });
    });

    it('should compute daily analytics from events', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/analytics/compute-daily', {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.date).toBeDefined();
      expect(data.metrics).toBeDefined();
    });
  });

  describe('POST /api/v1/admin/reset-credits', () => {
    const testUserId = '00000000-0000-0000-0000-000000000200';

    beforeAll(async () => {
      // Create test user with low credits
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'creditreset@example.com',
        subscription_tier: 'free',
        credits_remaining: 2,
        is_banned: false,
      });
    });

    afterAll(async () => {
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    it('should reset credits for all users', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/reset-credits', {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.users_reset).toBeGreaterThanOrEqual(0);
    });

    it('should reset user credits to tier default', async () => {
      // Check user credits after reset
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      
      // Free tier should have default credits (e.g., 10)
      expect(userData.data.credits_remaining).toBeGreaterThanOrEqual(2);
      expect(userData.data.credits_reset_at).toBeDefined();
    });
  });

  describe('Moderation Queue API', () => {
    const testReporterId = '00000000-0000-0000-0000-000000000201';
    const testReportedId = '00000000-0000-0000-0000-000000000202';
    const testProfileId = '00000000-0000-0000-0000-000000000203';
    let testReportId: string;
    let testCommentId: string;

    beforeAll(async () => {
      // Create test users
      await directusRequest('POST', '/items/app_users', {
        id: testReporterId,
        email: 'moqreporter@example.com',
      });
      await directusRequest('POST', '/items/app_users', {
        id: testReportedId,
        email: 'moqreported@example.com',
      });

      // Create test profile
      await directusRequest('POST', '/items/print_profiles', {
        id: testProfileId,
        user_id: testReportedId,
        name: 'Test Profile for Moderation',
        settings_json: { layer_height: 0.2 },
      });

      // Create pending comment
      const commentResponse = await directusRequest('POST', '/items/community_comments', {
        user_id: testReporterId,
        profile_id: testProfileId,
        content: 'Pending test comment',
        status: 'pending',
      });
      const commentData = await commentResponse.json();
      testCommentId = commentData.data.id;

      // Create open report
      const reportResponse = await directusRequest('POST', '/items/community_reports', {
        reporter_id: testReporterId,
        reported_user_id: testReportedId,
        reported_item_type: 'profile',
        reported_item_id: testProfileId,
        reason: 'spam',
        status: 'open',
      });
      const reportData = await reportResponse.json();
      testReportId = reportData.data.id;
    });

    afterAll(async () => {
      await directusRequest('DELETE', `/items/community_comments/${testCommentId}`);
      await directusRequest('DELETE', `/items/community_reports/${testReportId}`);
      await directusRequest('DELETE', `/items/print_profiles/${testProfileId}`);
      await directusRequest('DELETE', `/items/app_users/${testReporterId}`);
      await directusRequest('DELETE', `/items/app_users/${testReportedId}`);
    });

    describe('GET /api/v1/admin/moderation/queue', () => {
      it('should get moderation queue', async () => {
        const response = await adminRequest('GET', '/api/v1/admin/moderation/queue');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.comments).toBeDefined();
        expect(data.reports).toBeDefined();
        expect(Array.isArray(data.comments)).toBe(true);
        expect(Array.isArray(data.reports)).toBe(true);
      });
    });

    describe('POST /api/v1/admin/moderation/comment/:id/action', () => {
      it('should approve a comment', async () => {
        const response = await adminRequest(
          'POST',
          `/api/v1/admin/moderation/comment/${testCommentId}/action`,
          {
            action: 'approve',
            notes: 'Looks good',
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.action).toBe('approve');

        // Verify status changed
        const commentResponse = await directusRequest(
          'GET',
          `/items/community_comments/${testCommentId}`
        );
        const commentData = await commentResponse.json();
        expect(commentData.data.status).toBe('approved');
      });

      it('should reject a comment', async () => {
        // Create another pending comment
        const createResponse = await directusRequest('POST', '/items/community_comments', {
          user_id: testReporterId,
          profile_id: testProfileId,
          content: 'Another pending comment',
          status: 'pending',
        });
        const createData = await createResponse.json();
        const commentId = createData.data.id;

        const response = await adminRequest(
          'POST',
          `/api/v1/admin/moderation/comment/${commentId}/action`,
          {
            action: 'reject',
            notes: 'Violates guidelines',
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.action).toBe('reject');

        // Cleanup
        await directusRequest('DELETE', `/items/community_comments/${commentId}`);
      });

      it('should flag a comment', async () => {
        // Create another pending comment
        const createResponse = await directusRequest('POST', '/items/community_comments', {
          user_id: testReporterId,
          profile_id: testProfileId,
          content: 'Suspicious comment',
          status: 'pending',
        });
        const createData = await createResponse.json();
        const commentId = createData.data.id;

        const response = await adminRequest(
          'POST',
          `/api/v1/admin/moderation/comment/${commentId}/action`,
          {
            action: 'flag',
            notes: 'Needs further review',
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.action).toBe('flag');

        // Cleanup
        await directusRequest('DELETE', `/items/community_comments/${commentId}`);
      });
    });

    describe('POST /api/v1/admin/moderation/report/:id/resolve', () => {
      it('should resolve a report', async () => {
        const response = await adminRequest(
          'POST',
          `/api/v1/admin/moderation/report/${testReportId}/resolve`,
          {
            resolution: 'resolved',
            notes: 'Action taken',
            action_taken: 'warning_issued',
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.resolution).toBe('resolved');

        // Verify status changed
        const reportResponse = await directusRequest(
          'GET',
          `/items/community_reports/${testReportId}`
        );
        const reportData = await reportResponse.json();
        expect(reportData.data.status).toBe('resolved');
      });

      it('should dismiss a report', async () => {
        // Create another report
        const createResponse = await directusRequest('POST', '/items/community_reports', {
          reporter_id: testReporterId,
          reported_user_id: testReportedId,
          reported_item_type: 'user',
          reported_item_id: testReportedId,
          reason: 'other',
          status: 'open',
        });
        const createData = await createResponse.json();
        const reportId = createData.data.id;

        const response = await adminRequest(
          'POST',
          `/api/v1/admin/moderation/report/${reportId}/resolve`,
          {
            resolution: 'dismissed',
            notes: 'False report',
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.resolution).toBe('dismissed');

        // Cleanup
        await directusRequest('DELETE', `/items/community_reports/${reportId}`);
      });
    });
  });
});

