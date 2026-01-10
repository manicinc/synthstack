/**
 * @file __tests__/integration/version-switching.test.ts
 * @description Integration tests for LITE vs PRO version switching
 *
 * These tests verify that routes are correctly registered/skipped based on
 * ENABLE_COPILOT and ENABLE_REFERRALS environment variables.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import postgres from '@fastify/postgres';
import conditionalFeaturesPlugin from '../../plugins/conditional-features.js';

// Test database configuration
const TEST_DB_CONFIG = {
  connectionString: process.env.DATABASE_URL || 'postgres://synthstack:synthstack_dev_2024@localhost:5432/synthstack_test',
};

describe('Version Switching Integration Tests', () => {
  // ============================================
  // LITE VERSION TESTS
  // ============================================

  describe('LITE Version (ENABLE_COPILOT=false, ENABLE_REFERRALS=false)', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      // Set environment for LITE version
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      // Build app with LITE configuration
      app = Fastify({ logger: false });

      // Register dependencies
      await app.register(postgres, TEST_DB_CONFIG);

      // Register conditional features plugin
      await app.register(conditionalFeaturesPlugin);

      // Register routes conditionally
      if (app.features.copilot) {
        // In real app, this would be: await app.register(copilotRoutes)
        app.get('/api/v1/copilot/chat', async () => ({ message: 'Copilot chat' }));
        app.get('/api/v1/copilot/agents', async () => ({ agents: [] }));
      }

      if (app.features.referrals) {
        // In real app, this would be: await app.register(referralRoutes)
        app.get('/api/v1/referral/stats', async () => ({ stats: {} }));
        app.get('/api/v1/referral/links', async () => ({ links: [] }));
      }

      // Register shared routes (always available)
      app.get('/api/v1/health', async () => ({
        status: 'ok',
        version: app.features.copilot && app.features.referrals ? 'PRO' :
                !app.features.copilot && !app.features.referrals ? 'LITE' : 'CUSTOM',
        features: {
          copilot: app.features.copilot,
          referrals: app.features.referrals,
        },
      }));

      app.get('/api/v1/projects', async () => ({ projects: [] }));
      app.get('/api/v1/invoices', async () => ({ invoices: [] }));

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should have copilot feature disabled', () => {
      expect(app.features.copilot).toBe(false);
    });

    it('should have referrals feature disabled', () => {
      expect(app.features.referrals).toBe(false);
    });

    it('should return 404 for copilot chat route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/copilot/chat',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for copilot agents route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/copilot/agents',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for referral stats route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/referral/stats',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for referral links route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/referral/links',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should allow access to health check route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow access to projects route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow access to invoices route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/invoices',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should report version as LITE in health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      const data = response.json();
      expect(data.version).toBe('LITE');
      expect(data.features.copilot).toBe(false);
      expect(data.features.referrals).toBe(false);
    });
  });

  // ============================================
  // PRO VERSION TESTS
  // ============================================

  describe('PRO Version (ENABLE_COPILOT=true, ENABLE_REFERRALS=true)', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      // Set environment for PRO version
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'true';

      // Build app with PRO configuration
      app = Fastify({ logger: false });

      // Register dependencies
      await app.register(postgres, TEST_DB_CONFIG);

      // Register conditional features plugin
      await app.register(conditionalFeaturesPlugin);

      // Register routes conditionally
      if (app.features.copilot) {
        app.get('/api/v1/copilot/chat', async () => ({ message: 'Copilot chat' }));
        app.get('/api/v1/copilot/agents', async () => ({ agents: [] }));
      }

      if (app.features.referrals) {
        app.get('/api/v1/referral/stats', async () => ({ stats: {} }));
        app.get('/api/v1/referral/links', async () => ({ links: [] }));
      }

      // Register shared routes
      app.get('/api/v1/health', async () => ({
        status: 'ok',
        version: app.features.copilot && app.features.referrals ? 'PRO' :
                !app.features.copilot && !app.features.referrals ? 'LITE' : 'CUSTOM',
        features: {
          copilot: app.features.copilot,
          referrals: app.features.referrals,
        },
      }));

      app.get('/api/v1/projects', async () => ({ projects: [] }));
      app.get('/api/v1/invoices', async () => ({ invoices: [] }));

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should have copilot feature enabled', () => {
      expect(app.features.copilot).toBe(true);
    });

    it('should have referrals feature enabled', () => {
      expect(app.features.referrals).toBe(true);
    });

    it('should allow access to copilot chat route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/copilot/chat',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('message');
    });

    it('should allow access to copilot agents route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/copilot/agents',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('agents');
    });

    it('should allow access to referral stats route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/referral/stats',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('stats');
    });

    it('should allow access to referral links route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/referral/links',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('links');
    });

    it('should allow access to shared routes', async () => {
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      const projectsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      expect(healthResponse.statusCode).toBe(200);
      expect(projectsResponse.statusCode).toBe(200);
    });

    it('should report version as PRO in health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      const data = response.json();
      expect(data.version).toBe('PRO');
      expect(data.features.copilot).toBe(true);
      expect(data.features.referrals).toBe(true);
    });
  });

  // ============================================
  // CUSTOM VERSION TESTS (Mixed Configuration)
  // ============================================

  describe('CUSTOM Version (Mixed configuration)', () => {
    describe('Copilot only (ENABLE_COPILOT=true, ENABLE_REFERRALS=false)', () => {
      let app: FastifyInstance;

      beforeAll(async () => {
        process.env.ENABLE_COPILOT = 'true';
        process.env.ENABLE_REFERRALS = 'false';

        app = Fastify({ logger: false });
        await app.register(postgres, TEST_DB_CONFIG);
        await app.register(conditionalFeaturesPlugin);

        if (app.features.copilot) {
          app.get('/api/v1/copilot/chat', async () => ({ message: 'OK' }));
        }

        if (app.features.referrals) {
          app.get('/api/v1/referral/stats', async () => ({ stats: {} }));
        }

        app.get('/api/v1/health', async () => ({
          version: app.features.copilot && app.features.referrals ? 'PRO' :
                  !app.features.copilot && !app.features.referrals ? 'LITE' : 'CUSTOM',
          features: app.features,
        }));

        await app.ready();
      });

      afterAll(async () => {
        await app.close();
      });

      it('should have copilot enabled and referrals disabled', () => {
        expect(app.features.copilot).toBe(true);
        expect(app.features.referrals).toBe(false);
      });

      it('should allow copilot routes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/copilot/chat',
        });

        expect(response.statusCode).toBe(200);
      });

      it('should block referral routes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/referral/stats',
        });

        expect(response.statusCode).toBe(404);
      });

      it('should report version as CUSTOM', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/health',
        });

        const data = response.json();
        expect(data.version).toBe('CUSTOM');
      });
    });

    describe('Referrals only (ENABLE_COPILOT=false, ENABLE_REFERRALS=true)', () => {
      let app: FastifyInstance;

      beforeAll(async () => {
        process.env.ENABLE_COPILOT = 'false';
        process.env.ENABLE_REFERRALS = 'true';

        app = Fastify({ logger: false });
        await app.register(postgres, TEST_DB_CONFIG);
        await app.register(conditionalFeaturesPlugin);

        if (app.features.copilot) {
          app.get('/api/v1/copilot/chat', async () => ({ message: 'OK' }));
        }

        if (app.features.referrals) {
          app.get('/api/v1/referral/stats', async () => ({ stats: {} }));
        }

        app.get('/api/v1/health', async () => ({
          version: app.features.copilot && app.features.referrals ? 'PRO' :
                  !app.features.copilot && !app.features.referrals ? 'LITE' : 'CUSTOM',
          features: app.features,
        }));

        await app.ready();
      });

      afterAll(async () => {
        await app.close();
      });

      it('should have referrals enabled and copilot disabled', () => {
        expect(app.features.copilot).toBe(false);
        expect(app.features.referrals).toBe(true);
      });

      it('should block copilot routes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/copilot/chat',
        });

        expect(response.statusCode).toBe(404);
      });

      it('should allow referral routes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/referral/stats',
        });

        expect(response.statusCode).toBe(200);
      });

      it('should report version as CUSTOM', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/health',
        });

        const data = response.json();
        expect(data.version).toBe('CUSTOM');
      });
    });
  });

  // ============================================
  // ROUTE AVAILABILITY MATRIX
  // ============================================

  describe('Route Availability Matrix', () => {
    const testCases = [
      {
        name: 'LITE',
        copilot: 'false',
        referrals: 'false',
        expectCopilot: 404,
        expectReferrals: 404,
      },
      {
        name: 'PRO',
        copilot: 'true',
        referrals: 'true',
        expectCopilot: 200,
        expectReferrals: 200,
      },
      {
        name: 'CUSTOM (Copilot only)',
        copilot: 'true',
        referrals: 'false',
        expectCopilot: 200,
        expectReferrals: 404,
      },
      {
        name: 'CUSTOM (Referrals only)',
        copilot: 'false',
        referrals: 'true',
        expectCopilot: 404,
        expectReferrals: 200,
      },
    ];

    for (const testCase of testCases) {
      it(`${testCase.name}: copilot=${testCase.expectCopilot}, referrals=${testCase.expectReferrals}`, async () => {
        process.env.ENABLE_COPILOT = testCase.copilot;
        process.env.ENABLE_REFERRALS = testCase.referrals;

        const app = Fastify({ logger: false });
        await app.register(postgres, TEST_DB_CONFIG);
        await app.register(conditionalFeaturesPlugin);

        if (app.features.copilot) {
          app.get('/api/v1/copilot/test', async () => ({ ok: true }));
        }

        if (app.features.referrals) {
          app.get('/api/v1/referral/test', async () => ({ ok: true }));
        }

        await app.ready();

        const copilotResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/copilot/test',
        });

        const referralResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/referral/test',
        });

        expect(copilotResponse.statusCode).toBe(testCase.expectCopilot);
        expect(referralResponse.statusCode).toBe(testCase.expectReferrals);

        await app.close();
      });
    }
  });
});
