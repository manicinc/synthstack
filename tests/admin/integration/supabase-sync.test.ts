/**
 * @file supabase-sync.test.ts
 * @description Integration tests for Supabase ↔ Directus user sync
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3030';
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

let directusToken: string;

interface TestUser {
  id: string;
  email: string;
  display_name?: string;
}

const testUsers: TestUser[] = [];

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

describe('Supabase → Directus User Sync', () => {
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
    // Cleanup all test users
    for (const user of testUsers) {
      try {
        await directusRequest('DELETE', `/items/app_users/${user.id}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('User Creation Sync', () => {
    const testUserId = '10000000-0000-0000-0000-000000000001';

    beforeEach(() => {
      testUsers.push({ id: testUserId, email: 'sync-create@example.com' });
    });

    it('should create user in Directus when Supabase INSERT webhook fires', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'INSERT',
        table: 'users',
        record: {
          id: testUserId,
          email: 'sync-create@example.com',
          raw_user_meta_data: {
            display_name: 'Sync Test User',
            avatar_url: 'https://example.com/avatar.png',
          },
          created_at: new Date().toISOString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('created');

      // Verify user was created in Directus
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      expect(userResponse.status).toBe(200);

      const userData = await userResponse.json();
      expect(userData.data.email).toBe('sync-create@example.com');
      expect(userData.data.display_name).toBe('Sync Test User');
      expect(userData.data.avatar_url).toBe('https://example.com/avatar.png');
      expect(userData.data.subscription_tier).toBe('free');
      expect(userData.data.credits_remaining).toBeGreaterThan(0);
    });

    it('should set default display_name from email if not provided', async () => {
      const userId = '10000000-0000-0000-0000-000000000002';
      testUsers.push({ id: userId, email: 'no-name@example.com' });

      await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'INSERT',
        table: 'users',
        record: {
          id: userId,
          email: 'no-name@example.com',
          raw_user_meta_data: {},
          created_at: new Date().toISOString(),
        },
      });

      const userResponse = await directusRequest('GET', `/items/app_users/${userId}`);
      const userData = await userResponse.json();
      expect(userData.data.display_name).toBe('no-name');
    });

    it('should log user_signup analytics event', async () => {
      const userId = '10000000-0000-0000-0000-000000000003';
      testUsers.push({ id: userId, email: 'analytics@example.com' });

      await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'INSERT',
        table: 'users',
        record: {
          id: userId,
          email: 'analytics@example.com',
          created_at: new Date().toISOString(),
        },
      });

      // Check for analytics event
      const eventsResponse = await directusRequest(
        'GET',
        `/items/analytics_events?filter[event_type][_eq]=user_signup&filter[user_id][_eq]=${userId}&limit=1`
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });
  });

  describe('User Update Sync', () => {
    const testUserId = '10000000-0000-0000-0000-000000000010';

    beforeAll(async () => {
      // Create initial user
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'sync-update@example.com',
        display_name: 'Original Name',
      });
      testUsers.push({ id: testUserId, email: 'sync-update@example.com' });
    });

    it('should update user in Directus when Supabase UPDATE webhook fires', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'UPDATE',
        table: 'users',
        record: {
          id: testUserId,
          email: 'sync-update@example.com',
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

      // Verify user was updated in Directus
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.display_name).toBe('Updated Name');
      expect(userData.data.last_login_at).toBeDefined();
    });

    it('should update synced_at timestamp', async () => {
      const before = new Date();

      await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'UPDATE',
        table: 'users',
        record: {
          id: testUserId,
          email: 'sync-update@example.com',
        },
      });

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      const syncedAt = new Date(userData.data.synced_at);
      expect(syncedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('User Deletion Sync', () => {
    const testUserId = '10000000-0000-0000-0000-000000000020';

    beforeAll(async () => {
      // Create user to delete
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'sync-delete@example.com',
        status: 'active',
      });
      testUsers.push({ id: testUserId, email: 'sync-delete@example.com' });
    });

    it('should mark user as deleted in Directus when Supabase DELETE webhook fires', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/user', {
        type: 'DELETE',
        table: 'users',
        old_record: {
          id: testUserId,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('deleted');

      // Verify user status is deleted
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.status).toBe('deleted');
    });
  });

  describe('Batch User Sync', () => {
    it('should handle multiple rapid sync events', async () => {
      const userIds = [
        '10000000-0000-0000-0000-000000000030',
        '10000000-0000-0000-0000-000000000031',
        '10000000-0000-0000-0000-000000000032',
      ];

      // Create all users rapidly
      const promises = userIds.map((id, index) => {
        testUsers.push({ id, email: `batch${index}@example.com` });
        return adminRequest('POST', '/api/v1/admin/sync/user', {
          type: 'INSERT',
          table: 'users',
          record: {
            id,
            email: `batch${index}@example.com`,
            created_at: new Date().toISOString(),
          },
        });
      });

      const responses = await Promise.all(promises);

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }

      // Verify all users exist
      for (const id of userIds) {
        const userResponse = await directusRequest('GET', `/items/app_users/${id}`);
        expect(userResponse.status).toBe(200);
      }
    });
  });
});

describe('Directus → Supabase Admin Sync', () => {
  beforeAll(async () => {
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

  describe('Subscription Tier Changes', () => {
    const testUserId = '10000000-0000-0000-0000-000000000040';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'tier-change@example.com',
        subscription_tier: 'free',
      });
      testUsers.push({ id: testUserId, email: 'tier-change@example.com' });
    });

    it('should handle subscription tier change webhook from Directus', async () => {
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

    it('should log admin_tier_change analytics event', async () => {
      await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'app_users',
        key: testUserId,
        payload: {
          subscription_tier: 'maker',
        },
      });

      // Check for analytics event
      const eventsResponse = await directusRequest(
        'GET',
        `/items/analytics_events?filter[event_type][_eq]=admin_tier_change&sort=-timestamp&limit=1`
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });
  });

  describe('Ban Status Changes', () => {
    const testUserId = '10000000-0000-0000-0000-000000000050';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'ban-sync@example.com',
        is_banned: false,
      });
      testUsers.push({ id: testUserId, email: 'ban-sync@example.com' });
    });

    it('should handle ban status change webhook from Directus', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'app_users',
        key: testUserId,
        payload: {
          is_banned: true,
          ban_reason: 'Test ban via webhook',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log user_banned analytics event', async () => {
      const eventsResponse = await directusRequest(
        'GET',
        `/items/analytics_events?filter[event_type][_eq]=user_banned&sort=-timestamp&limit=1`
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });

    it('should log user_unbanned analytics event', async () => {
      await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'app_users',
        key: testUserId,
        payload: {
          is_banned: false,
        },
      });

      const eventsResponse = await directusRequest(
        'GET',
        `/items/analytics_events?filter[event_type][_eq]=user_unbanned&sort=-timestamp&limit=1`
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });
  });

  describe('Non-User Collection Updates', () => {
    it('should ignore updates to other collections', async () => {
      const response = await adminRequest('POST', '/api/v1/admin/sync/directus-update', {
        event: 'items.update',
        collection: 'printers',
        key: 'some-printer-id',
        payload: {
          manufacturer: 'Test',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Ignored');
    });
  });
});

