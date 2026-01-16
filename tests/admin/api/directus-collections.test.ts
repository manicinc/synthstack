/**
 * @file directus-collections.test.ts
 * @description Integration tests for Directus collection CRUD operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'team@manic.agency';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

let accessToken: string;

// Helper to make authenticated requests
async function directusRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const response = await fetch(`${DIRECTUS_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

describe('Directus Collections API', () => {
  beforeAll(async () => {
    // Authenticate
    const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate with Directus');
    }
    
    const loginData = await loginResponse.json();
    accessToken = loginData.data.access_token;
  });

  describe('app_users collection', () => {
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    beforeEach(async () => {
      // Clean up test user if exists
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    afterAll(async () => {
      // Final cleanup
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    it('should create a new user', async () => {
      const userData = {
        id: testUserId,
        email: 'test@example.com',
        display_name: 'Test User',
        subscription_tier: 'free',
        credits_remaining: 10,
      };

      const response = await directusRequest('POST', '/items/app_users', userData);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.email).toBe('test@example.com');
      expect(data.data.subscription_tier).toBe('free');
    });

    it('should read a user by ID', async () => {
      // Create user first
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'test@example.com',
        display_name: 'Test User',
      });

      const response = await directusRequest('GET', `/items/app_users/${testUserId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.id).toBe(testUserId);
    });

    it('should update user credits', async () => {
      // Create user first
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'test@example.com',
        credits_remaining: 10,
      });

      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        credits_remaining: 50,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.credits_remaining).toBe(50);
    });

    it('should ban a user', async () => {
      // Create user first
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'test@example.com',
        is_banned: false,
      });

      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        is_banned: true,
        ban_reason: 'Test ban',
        banned_at: new Date().toISOString(),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.is_banned).toBe(true);
      expect(data.data.ban_reason).toBe('Test ban');
    });

    it('should list all users', async () => {
      const response = await directusRequest('GET', '/items/app_users?limit=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter users by subscription tier', async () => {
      const response = await directusRequest(
        'GET',
        '/items/app_users?filter[subscription_tier][_eq]=pro'
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      data.data.forEach((user: { subscription_tier: string }) => {
        expect(user.subscription_tier).toBe('pro');
      });
    });
  });

  describe('community_comments collection', () => {
    let testCommentId: string;
    const testUserId = '00000000-0000-0000-0000-000000000002';
    const testProfileId = '00000000-0000-0000-0000-000000000003';

    beforeAll(async () => {
      // Create test user
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'commenter@example.com',
        display_name: 'Commenter',
      });

      // Create test profile
      await directusRequest('POST', '/items/print_profiles', {
        id: testProfileId,
        user_id: testUserId,
        name: 'Test Profile',
        settings_json: { layer_height: 0.2 },
      });
    });

    afterAll(async () => {
      if (testCommentId) {
        await directusRequest('DELETE', `/items/community_comments/${testCommentId}`);
      }
      await directusRequest('DELETE', `/items/print_profiles/${testProfileId}`);
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    it('should create a comment', async () => {
      const response = await directusRequest('POST', '/items/community_comments', {
        user_id: testUserId,
        profile_id: testProfileId,
        content: 'Great profile!',
        status: 'pending',
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      testCommentId = data.data.id;
      expect(data.data.content).toBe('Great profile!');
      expect(data.data.status).toBe('pending');
    });

    it('should moderate a comment', async () => {
      // Create comment
      const createResponse = await directusRequest('POST', '/items/community_comments', {
        user_id: testUserId,
        profile_id: testProfileId,
        content: 'Another comment',
        status: 'pending',
      });
      const createData = await createResponse.json();
      const commentId = createData.data.id;

      // Moderate it
      const response = await directusRequest('PATCH', `/items/community_comments/${commentId}`, {
        status: 'approved',
        moderated_at: new Date().toISOString(),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.status).toBe('approved');

      // Cleanup
      await directusRequest('DELETE', `/items/community_comments/${commentId}`);
    });

    it('should list pending comments', async () => {
      const response = await directusRequest(
        'GET',
        '/items/community_comments?filter[status][_eq]=pending'
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('community_reports collection', () => {
    const testReporterId = '00000000-0000-0000-0000-000000000004';
    const testReportedId = '00000000-0000-0000-0000-000000000005';
    let testReportId: string;

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testReporterId,
        email: 'reporter@example.com',
      });
      await directusRequest('POST', '/items/app_users', {
        id: testReportedId,
        email: 'reported@example.com',
      });
    });

    afterAll(async () => {
      if (testReportId) {
        await directusRequest('DELETE', `/items/community_reports/${testReportId}`);
      }
      await directusRequest('DELETE', `/items/app_users/${testReporterId}`);
      await directusRequest('DELETE', `/items/app_users/${testReportedId}`);
    });

    it('should create a report', async () => {
      const response = await directusRequest('POST', '/items/community_reports', {
        reporter_id: testReporterId,
        reported_user_id: testReportedId,
        reported_item_type: 'user',
        reported_item_id: testReportedId,
        reason: 'spam',
        details: 'Sending spam messages',
        status: 'open',
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      testReportId = data.data.id;
      expect(data.data.reason).toBe('spam');
      expect(data.data.status).toBe('open');
    });

    it('should resolve a report', async () => {
      // Create report
      const createResponse = await directusRequest('POST', '/items/community_reports', {
        reporter_id: testReporterId,
        reported_user_id: testReportedId,
        reported_item_type: 'user',
        reported_item_id: testReportedId,
        reason: 'inappropriate',
        status: 'open',
      });
      const createData = await createResponse.json();
      const reportId = createData.data.id;

      // Resolve it
      const response = await directusRequest('PATCH', `/items/community_reports/${reportId}`, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: 'Verified and action taken',
        action_taken: 'warning_issued',
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.status).toBe('resolved');

      // Cleanup
      await directusRequest('DELETE', `/items/community_reports/${reportId}`);
    });

    it('should list open reports', async () => {
      const response = await directusRequest(
        'GET',
        '/items/community_reports?filter[status][_eq]=open'
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('user_warnings collection', () => {
    const testUserId = '00000000-0000-0000-0000-000000000006';
    let testWarningId: string;

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'warned@example.com',
      });
    });

    afterAll(async () => {
      if (testWarningId) {
        await directusRequest('DELETE', `/items/user_warnings/${testWarningId}`);
      }
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    it('should create a warning', async () => {
      const response = await directusRequest('POST', '/items/user_warnings', {
        user_id: testUserId,
        warning_type: 'content',
        severity: 'warning',
        message: 'Please follow community guidelines',
        status: 'active',
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      testWarningId = data.data.id;
      expect(data.data.warning_type).toBe('content');
      expect(data.data.severity).toBe('warning');
    });

    it('should list active warnings for a user', async () => {
      const response = await directusRequest(
        'GET',
        `/items/user_warnings?filter[user_id][_eq]=${testUserId}&filter[status][_eq]=active`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('analytics_daily collection', () => {
    const testDate = '2024-01-01';

    afterAll(async () => {
      await directusRequest('DELETE', `/items/analytics_daily/${testDate}`);
    });

    it('should create daily analytics', async () => {
      const response = await directusRequest('POST', '/items/analytics_daily', {
        date: testDate,
        new_users: 10,
        active_users: 100,
        generations: 500,
        credits_used: 450,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.new_users).toBe(10);
    });

    it('should read daily analytics', async () => {
      const response = await directusRequest('GET', `/items/analytics_daily/${testDate}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.date).toBe(testDate);
    });

    it('should get analytics for date range', async () => {
      const response = await directusRequest(
        'GET',
        '/items/analytics_daily?sort=-date&limit=30'
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('analytics_events collection', () => {
    let testEventId: string;

    afterAll(async () => {
      if (testEventId) {
        await directusRequest('DELETE', `/items/analytics_events/${testEventId}`);
      }
    });

    it('should log an analytics event', async () => {
      const response = await directusRequest('POST', '/items/analytics_events', {
        event_type: 'generation_completed',
        event_category: 'generation',
        metadata: {
          printer: 'Bambu Lab X1 Carbon',
          filament: 'PLA',
        },
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      testEventId = data.data.id;
      expect(data.data.event_type).toBe('generation_completed');
    });

    it('should filter events by type', async () => {
      const response = await directusRequest(
        'GET',
        '/items/analytics_events?filter[event_type][_eq]=generation_completed&limit=10'
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('feature_flags collection', () => {
    const testFlagKey = 'test_feature_flag';

    afterAll(async () => {
      // Find and delete by key
      const listResponse = await directusRequest(
        'GET',
        `/items/feature_flags?filter[key][_eq]=${testFlagKey}`
      );
      const listData = await listResponse.json();
      if (listData.data?.[0]?.id) {
        await directusRequest('DELETE', `/items/feature_flags/${listData.data[0].id}`);
      }
    });

    it('should create a feature flag', async () => {
      const response = await directusRequest('POST', '/items/feature_flags', {
        key: testFlagKey,
        name: 'Test Feature',
        description: 'A test feature flag',
        enabled: false,
        rollout_percentage: 0,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.key).toBe(testFlagKey);
      expect(data.data.enabled).toBe(false);
    });

    it('should toggle a feature flag', async () => {
      // Find the flag
      const listResponse = await directusRequest(
        'GET',
        `/items/feature_flags?filter[key][_eq]=${testFlagKey}`
      );
      const listData = await listResponse.json();
      const flagId = listData.data[0].id;

      // Toggle it
      const response = await directusRequest('PATCH', `/items/feature_flags/${flagId}`, {
        enabled: true,
        rollout_percentage: 50,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.enabled).toBe(true);
      expect(data.data.rollout_percentage).toBe(50);
    });
  });

  describe('system_config collection', () => {
    it('should read system config', async () => {
      const response = await directusRequest('GET', '/items/system_config/credits_per_tier');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.key).toBe('credits_per_tier');
      expect(data.data.value).toBeDefined();
    });

    it('should update system config', async () => {
      const response = await directusRequest('PATCH', '/items/system_config/max_warnings_before_ban', {
        value: 5,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.value).toBe(5);

      // Reset to default
      await directusRequest('PATCH', '/items/system_config/max_warnings_before_ban', {
        value: 3,
      });
    });
  });

  describe('credit_adjustments collection', () => {
    const testUserId = '00000000-0000-0000-0000-000000000007';
    let testAdjustmentId: string;

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'credits@example.com',
        credits_remaining: 10,
      });
    });

    afterAll(async () => {
      if (testAdjustmentId) {
        await directusRequest('DELETE', `/items/credit_adjustments/${testAdjustmentId}`);
      }
      await directusRequest('DELETE', `/items/app_users/${testUserId}`);
    });

    it('should create a credit adjustment', async () => {
      const response = await directusRequest('POST', '/items/credit_adjustments', {
        user_id: testUserId,
        adjustment: 50,
        reason: 'Promotional credit',
        balance_before: 10,
        balance_after: 60,
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      testAdjustmentId = data.data.id;
      expect(data.data.adjustment).toBe(50);
    });

    it('should list adjustments for a user', async () => {
      const response = await directusRequest(
        'GET',
        `/items/credit_adjustments?filter[user_id][_eq]=${testUserId}`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});

