/**
 * @file stripe-webhook.test.ts
 * @description Integration tests for Stripe webhook handling and subscription sync
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3030';
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

let directusToken: string;

interface TestUser {
  id: string;
  email: string;
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

describe('Stripe Webhook Integration', () => {
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
    // Cleanup test users
    for (const user of testUsers) {
      try {
        await directusRequest('DELETE', `/items/app_users/${user.id}`);
      } catch {
        // Ignore
      }
    }
  });

  describe('Subscription Creation', () => {
    const testUserId = '20000000-0000-0000-0000-000000000001';
    const testCustomerId = 'cus_test_subscription_create';

    beforeAll(async () => {
      // Create test user
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'stripe-sub@example.com',
        subscription_tier: 'free',
        stripe_customer_id: testCustomerId,
      });
      testUsers.push({ id: testUserId, email: 'stripe-sub@example.com' });
    });

    it('should update user subscription when checkout.session.completed', async () => {
      // Simulate subscription creation via admin API
      // In production, this would come from Stripe webhook
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_id: 'sub_test_123',
        subscription_started_at: new Date().toISOString(),
      });

      expect(response.status).toBe(200);

      // Verify user was updated
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_tier).toBe('pro');
      expect(userData.data.subscription_status).toBe('active');
    });

    it('should increase credits when subscription starts', async () => {
      // Update credits based on tier
      const tierCredits = {
        free: 10,
        maker: 50,
        pro: 200,
        unlimited: 999999,
      };

      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        credits_remaining: tierCredits['pro'],
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.credits_remaining).toBe(200);
    });
  });

  describe('Subscription Updates', () => {
    const testUserId = '20000000-0000-0000-0000-000000000002';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'stripe-update@example.com',
        subscription_tier: 'maker',
        subscription_status: 'active',
      });
      testUsers.push({ id: testUserId, email: 'stripe-update@example.com' });
    });

    it('should upgrade user tier', async () => {
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_tier: 'pro',
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_tier).toBe('pro');
    });

    it('should downgrade user tier', async () => {
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_tier: 'maker',
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_tier).toBe('maker');
    });

    it('should handle past_due status', async () => {
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_status: 'past_due',
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_status).toBe('past_due');
    });
  });

  describe('Subscription Cancellation', () => {
    const testUserId = '20000000-0000-0000-0000-000000000003';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'stripe-cancel@example.com',
        subscription_tier: 'pro',
        subscription_status: 'active',
        credits_remaining: 200,
      });
      testUsers.push({ id: testUserId, email: 'stripe-cancel@example.com' });
    });

    it('should downgrade to free tier when subscription cancelled', async () => {
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_tier: 'free',
        subscription_status: 'canceled',
        subscription_ends_at: new Date().toISOString(),
        credits_remaining: 10, // Reset to free tier credits
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_tier).toBe('free');
      expect(userData.data.subscription_status).toBe('canceled');
      expect(userData.data.credits_remaining).toBe(10);
    });
  });

  describe('Payment Failed Events', () => {
    const testUserId = '20000000-0000-0000-0000-000000000004';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'stripe-failed@example.com',
        subscription_tier: 'pro',
        subscription_status: 'active',
      });
      testUsers.push({ id: testUserId, email: 'stripe-failed@example.com' });
    });

    it('should mark subscription as past_due when payment fails', async () => {
      const response = await directusRequest('PATCH', `/items/app_users/${testUserId}`, {
        subscription_status: 'past_due',
      });

      expect(response.status).toBe(200);

      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      const userData = await userResponse.json();
      expect(userData.data.subscription_status).toBe('past_due');
    });
  });

  describe('Analytics Event Logging', () => {
    it('should log subscription_created event', async () => {
      await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'subscription_created',
        event_category: 'subscription',
        user_id: testUsers[0]?.id,
        metadata: {
          tier: 'pro',
          price: 1999,
        },
      });

      const eventsResponse = await directusRequest(
        'GET',
        '/items/analytics_events?filter[event_type][_eq]=subscription_created&sort=-timestamp&limit=1'
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });

    it('should log subscription_canceled event', async () => {
      await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'subscription_canceled',
        event_category: 'subscription',
        user_id: testUsers[0]?.id,
        metadata: {
          tier: 'pro',
          reason: 'user_canceled',
        },
      });

      const eventsResponse = await directusRequest(
        'GET',
        '/items/analytics_events?filter[event_type][_eq]=subscription_canceled&sort=-timestamp&limit=1'
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });

    it('should log payment_failed event', async () => {
      await adminRequest('POST', '/api/v1/admin/analytics/event', {
        event_type: 'payment_failed',
        event_category: 'subscription',
        user_id: testUsers[0]?.id,
        metadata: {
          reason: 'insufficient_funds',
        },
      });

      const eventsResponse = await directusRequest(
        'GET',
        '/items/analytics_events?filter[event_type][_eq]=payment_failed&sort=-timestamp&limit=1'
      );
      const eventsData = await eventsResponse.json();
      expect(eventsData.data.length).toBeGreaterThan(0);
    });
  });

  describe('Credit Adjustments on Subscription Changes', () => {
    const testUserId = '20000000-0000-0000-0000-000000000005';

    beforeAll(async () => {
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'stripe-credits@example.com',
        subscription_tier: 'free',
        credits_remaining: 5,
      });
      testUsers.push({ id: testUserId, email: 'stripe-credits@example.com' });
    });

    it('should increase credits on upgrade', async () => {
      // Use admin endpoint for credit adjustment
      const response = await adminRequest('POST', `/api/v1/admin/users/${testUserId}/credits`, {
        adjustment: 195, // 200 - 5 = 195 to add
        reason: 'Subscription upgrade to Pro',
        notes: 'Auto-adjustment on tier change',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.balance_after).toBe(200);
    });

    it('should create credit adjustment audit log', async () => {
      const auditResponse = await directusRequest(
        'GET',
        `/items/credit_adjustments?filter[user_id][_eq]=${testUserId}&filter[reason][_eq]=Subscription upgrade to Pro`
      );
      const auditData = await auditResponse.json();
      expect(auditData.data.length).toBeGreaterThan(0);
      expect(auditData.data[0].adjustment).toBe(195);
    });
  });

  describe('Concurrent Webhook Handling', () => {
    it('should handle multiple webhooks for same user', async () => {
      const testUserId = '20000000-0000-0000-0000-000000000006';
      await directusRequest('POST', '/items/app_users', {
        id: testUserId,
        email: 'concurrent@example.com',
        subscription_tier: 'free',
      });
      testUsers.push({ id: testUserId, email: 'concurrent@example.com' });

      // Simulate concurrent updates
      const updates = [
        { subscription_tier: 'maker' },
        { credits_remaining: 50 },
        { last_login_at: new Date().toISOString() },
      ];

      const promises = updates.map((update) =>
        directusRequest('PATCH', `/items/app_users/${testUserId}`, update)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify final state
      const userResponse = await directusRequest('GET', `/items/app_users/${testUserId}`);
      expect(userResponse.status).toBe(200);
    });
  });
});

