/**
 * @file plugins/__tests__/conditional-features.test.ts
 * @description Tests for conditional features plugin (LITE vs PRO version switching)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyPostgres from '@fastify/postgres';

// Save original environment
const originalEnv = process.env;

describe('Conditional Features Plugin', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    server = Fastify({ logger: false });

    // Register postgres plugin (required dependency for conditional-features)
    await server.register(fastifyPostgres, {
      connectionString: 'postgresql://test:test@localhost:5432/test'
    });
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Close server
    if (server) {
      await server.close();
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  // ============================================
  // FEATURE FLAG DETECTION
  // ============================================

  describe('Feature Flag Detection', () => {
    it('should detect PRO version when both flags enabled', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'true';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server.features).toBeDefined();
      expect(server.features.copilot).toBe(true);
      expect(server.features.referrals).toBe(true);
    });

    it('should detect LITE version when both flags disabled', async () => {
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server.features).toBeDefined();
      expect(server.features.copilot).toBe(false);
      expect(server.features.referrals).toBe(false);
    });

    it('should default to false when env vars not set', async () => {
      delete process.env.ENABLE_COPILOT;
      delete process.env.ENABLE_REFERRALS;

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server.features.copilot).toBe(false);
      expect(server.features.referrals).toBe(false);
    });

    it('should support CUSTOM version (mixed flags)', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server.features.copilot).toBe(true);
      expect(server.features.referrals).toBe(false);
    });
  });

  // ============================================
  // FASTIFY DECORATION
  // ============================================

  describe('Fastify Instance Decoration', () => {
    it('should decorate fastify instance with features object', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'true';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server).toHaveProperty('features');
      expect(server.features).toHaveProperty('copilot');
      expect(server.features).toHaveProperty('referrals');
    });

    it('should make features accessible to routes', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);

      // Add test route that uses features
      server.get('/test-features', async (request, reply) => {
        return {
          copilot: server.features.copilot,
          referrals: server.features.referrals,
        };
      });

      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test-features',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        copilot: true,
        referrals: false,
      });
    });
  });

  // ============================================
  // SERVICE INITIALIZATION (MOCKED)
  // ============================================

  describe('Service Initialization', () => {
    it('should skip copilot initialization when disabled', async () => {
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      // Plugin should register without trying to load copilot
      expect(server.features.copilot).toBe(false);
    });

    it('should skip referral initialization when disabled', async () => {
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      // Plugin should register without trying to load referrals
      expect(server.features.referrals).toBe(false);
    });

    // Note: Testing actual service initialization would require mocking
    // the langgraph and referral service imports, which is complex.
    // Integration tests cover this better.
  });

  // ============================================
  // PLUGIN DEPENDENCIES
  // ============================================

  describe('Plugin Dependencies', () => {
    it('should require @fastify/postgres plugin', async () => {
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      // Create a fresh server WITHOUT postgres plugin
      const freshServer = Fastify({ logger: false });

      const plugin = await import('../conditional-features.js');

      // Should fail when postgres plugin not registered
      await expect(
        freshServer.register(plugin.default)
      ).rejects.toThrow();

      await freshServer.close();
    });
  });

  // ============================================
  // ENVIRONMENT VARIABLE PARSING
  // ============================================

  describe('Environment Variable Parsing', () => {
    it('should only accept "true" as truthy (strict parsing)', async () => {
      // Test various truthy-looking values
      const falsyValues = ['1', 'yes', 'TRUE', 'True', 'enabled', ''];

      for (const value of falsyValues) {
        const testServer = Fastify({ logger: false });
        process.env.ENABLE_COPILOT = value;
        process.env.ENABLE_REFERRALS = 'false';

        // Register postgres plugin
        await testServer.register(fastifyPostgres, {
          connectionString: 'postgresql://test:test@localhost:5432/test'
        });

        const plugin = await import('../conditional-features.js');
        await testServer.register(plugin.default);
        await testServer.ready();

        // Should be false for all non-"true" values
        expect(testServer.features.copilot).toBe(false);

        await testServer.close();
      }
    });

    it('should accept "true" as truthy', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'true';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      expect(server.features.copilot).toBe(true);
      expect(server.features.referrals).toBe(true);
    });
  });

  // ============================================
  // VERSION DETECTION
  // ============================================

  describe('Version Detection', () => {
    it('should identify as LITE when both disabled', async () => {
      process.env.ENABLE_COPILOT = 'false';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      const isLite = !server.features.copilot && !server.features.referrals;
      expect(isLite).toBe(true);
    });

    it('should identify as PRO when both enabled', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'true';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      const isPro = server.features.copilot && server.features.referrals;
      expect(isPro).toBe(true);
    });

    it('should identify as CUSTOM for mixed configuration', async () => {
      process.env.ENABLE_COPILOT = 'true';
      process.env.ENABLE_REFERRALS = 'false';

      const plugin = await import('../conditional-features.js');
      await server.register(plugin.default);
      await server.ready();

      const isPro = server.features.copilot && server.features.referrals;
      const isLite = !server.features.copilot && !server.features.referrals;
      const isCustom = !isPro && !isLite;

      expect(isCustom).toBe(true);
    });
  });
});
