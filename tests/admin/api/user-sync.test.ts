/**
 * @file user-sync.test.ts
 * @description Integration tests for user sync between Supabase and Directus
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3030';
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

let directusToken: string;

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

describe('User Sync API', () => {
  const testUserId = '00000000-0000-0000-0000-000000000100';

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

  afterAll(async () => {
    // Cleanup test user
    await directusRequest('DELETE', `/items/app_users/${testUserId}`);
  });

  describe('POST /api/v1/admin/sync/user', () => {
    it('should sync a new user from Supabase', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'INSERT',
        table: 'users',
        record: {
          id: testUserId,
          email: 'synctest@example.com',
          raw_user_meta_data: {
            display_name: 'Sync Test User',
          },
          created_at: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('created');

      // Verify user exists in Directus
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      expect(userResponse.status).toBe(200);
      const userData = await userResponse.json();
      expect(userData.data.email).toBe('synctest@example.com');
    });

    it('should update an existing user', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'UPDATE',
        table: 'users',
        record: {
          id: testUserId,
          email: 'synctest@example.com',
          raw_user_meta_data: {
            display_name: 'Updated Name',
          },
          last_sign_in_at: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('updated');
    });

    it('should handle user deletion', async () => {
      // Create another test user
      const tempUserId = '00000000-0000-0000-0000-000000000101';
      await directusRequest('POST', '/items/app_users', {
        id: tempUserId,
        email: 'delete@example.com',
      });

      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'DELETE',
        table: 'users',
        old_record: {
          id: tempUserId,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('deleted');

      // Verify user is marked as deleted
      const userResponse = await directusRequest('GET', `/items/app_users/${tempUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.status).toBe('deleted');

      // Cleanup
      await directusRequest('DELETE', `/items/app_users/${tempUserId}`);
    });
  });

  describe('POST /api/v1/admin/sync/directus-update', () => {
    it('should handle subscription tier changes', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'app_users',
        key: testUserId,
        payload: {
          subscription_tier: 'pro',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle ban status changes', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'app_users',
        key: testUserId,
        payload: {
          is_banned: true,
          ban_reason: 'Test ban via sync',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should ignore non-app_users updates', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'printers',
        key: 'some-id',
        payload: {},
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Ignored');
    });
  });

  describe('POST /api/v1/admin/users/:id/credits', () => {
    beforeAll(async () => {
      // Ensure test user exists with known credits
      await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        credits_remaining: 10,
      });
    });

    it('should add credits to a user', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/credits`, {
        adjustment: 50,
        reason: 'Test credit addition',
        notes: 'Automated test',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.balance_after).toBe(60);
    });

    it('should remove credits from a user', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/credits`, {
        adjustment: -20,
        reason: 'Test credit removal',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.balance_after).toBe(40);
    });

    it('should not allow negative balance', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/credits`, {
        adjustment: -1000,
        reason: 'Test large removal',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.balance_after).toBe(0);
    });

    it('should create audit log entry', async () => {
      await adminRequest('POST', `/api/v1/admin/users/${testUserId}/credits`, {
        adjustment: 10,
        reason: 'Audit test',
      });

      // Verify audit log
      const auditResponse = await directusRequest(
        'GET',
        `/items/credit_adjustments?filter[user_id][_eq]=${testUserId}&filter[reason][_eq]=Audit test`
      );
      const auditData = await auditResponse.json();
      expect(auditData.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/admin/users/:id/ban', () => {
    it('should ban a user', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/ban`, {
        ban: true,
        reason: 'Test ban',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.banned).toBe(true);

      // Verify in Directus
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.is_banned).toBe(true);
    });

    it('should unban a user', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/ban`, {
        ban: false,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.banned).toBe(false);

      // Verify in Directus
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.is_banned).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:id/impersonate', () => {
    it('should generate impersonation token', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/impersonate`, {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token).toContain('impersonate_');
      expect(data.expires_at).toBeDefined();
      expect(data.warning).toBeDefined();
    });
  });

  describe('POST /api/v1/admin/users/:id/warn', () => {
    it('should issue a warning to a user', async () => {
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/warn`, {
        warning_type: 'content',
        severity: 'warning',
        message: 'Please follow guidelines',
        expires_days: 30,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should increment warning count', async () => {
      // Get current warning count
      const beforeResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const beforeData = await beforeResponse.json();
      const beforeCount = beforeData.data.warning_count || 0;

      // Issue warning
      await adminRequest('POST', `/api/v1/admin/users/${testUserId}/warn`, {
        warning_type: 'behavior',
        severity: 'strike',
        message: 'Second warning',
      });

      // Check warning count increased
      const afterResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const afterData = await afterResponse.json();
      expect(afterData.data.warning_count).toBe(beforeCount + 1);
    });
  });
});

