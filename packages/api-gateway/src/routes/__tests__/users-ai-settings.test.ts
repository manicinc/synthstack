/**
 * User AI Settings Routes Unit Tests
 *
 * Tests for AI settings endpoints:
 * - GET /api/v1/users/me/ai-settings
 * - PATCH /api/v1/users/me/ai-settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import usersRoutes from '../users.js';
import { TEST_USERS } from '../../__tests__/fixtures/users.js';
import {
  TEST_AI_SETTINGS_DB_ROWS,
  TEST_AI_SETTINGS_UPDATES,
} from '../../__tests__/fixtures/ai-settings.js';

describe('User AI Settings Routes', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify();
    mockPgQuery = vi.fn();

    // Mock pg plugin
    server.decorate('pg', { query: mockPgQuery } as any);

    // Mock authentication
    server.decorate('authenticate', async (request: any, reply: any) => {
      if (!request.headers.authorization) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      const userId = request.headers['x-test-user-id'] || TEST_USERS.pro.id;
      request.user = {
        id: userId,
        email: 'test@example.com',
      };
    });

    await server.register(usersRoutes);
    await server.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await server.close();
  });

  describe('GET /api/v1/users/me/ai-settings', () => {
    it('returns user AI settings when they exist', async () => {
      const dbRow = TEST_AI_SETTINGS_DB_ROWS.existing;
      mockPgQuery.mockResolvedValueOnce({ rows: [dbRow], rowCount: 1 });

      const response = await server.inject({
        method: 'GET',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': dbRow.user_id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');

      expect(body.data).toHaveProperty('globalModel');
      expect(body.data).toHaveProperty('globalModelTier');
      expect(body.data).toHaveProperty('agentModelOverrides');
      expect(body.data).toHaveProperty('defaultTemperature');
      expect(body.data).toHaveProperty('maxContextTokens');
      expect(body.data).toHaveProperty('includeProjectContext');
      expect(body.data).toHaveProperty('streamResponses');
      expect(body.data).toHaveProperty('showReasoning');
    });

    it('returns default values for new user', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await server.inject({
        method: 'GET',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.user.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('success', true);
      expect(body.data.globalModelTier).toBe('standard');
      expect(body.data.defaultTemperature).toBeGreaterThanOrEqual(0);
      expect(body.data.defaultTemperature).toBeLessThanOrEqual(1);
      expect(body.data.maxContextTokens).toBeGreaterThan(0);
    });

    it('requires authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/me/ai-settings',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/me/ai-settings', () => {
    it('updates globalModel', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [TEST_AI_SETTINGS_DB_ROWS.existing], rowCount: 1 }); // SELECT

      const response = await server.inject({
        method: 'PATCH',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.pro.id,
        },
        payload: TEST_AI_SETTINGS_UPDATES.changeModel,
      });

      expect(response.statusCode).toBe(200);
      expect(mockPgQuery).toHaveBeenCalled();
    });

    it('updates temperature within valid range', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [TEST_AI_SETTINGS_DB_ROWS.existing], rowCount: 1 }); // SELECT

      const response = await server.inject({
        method: 'PATCH',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.pro.id,
        },
        payload: { defaultTemperature: 0.5 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('updates agentModelOverrides (with agent validation)', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [{ slug: 'developer' }], rowCount: 1 }) // Agent validation
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [TEST_AI_SETTINGS_DB_ROWS.existing], rowCount: 1 }); // SELECT

      const response = await server.inject({
        method: 'PATCH',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.pro.id,
        },
        payload: TEST_AI_SETTINGS_UPDATES.addOverride,
      });

      expect(response.statusCode).toBe(200);
    });

    it('handles empty payload gracefully', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [TEST_AI_SETTINGS_DB_ROWS.existing], rowCount: 1 });

      const response = await server.inject({
        method: 'PATCH',
        url: '/me/ai-settings',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.pro.id,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

