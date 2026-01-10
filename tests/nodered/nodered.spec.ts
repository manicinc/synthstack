/**
 * Node-RED Integration Tests
 * 
 * Tests the embedded Node-RED service, tenant isolation,
 * and API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, createTestUser, createTestOrganization } from '../helpers/test-utils';
import type { FastifyInstance } from 'fastify';

describe('Node-RED Integration', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let proUserToken: string;
  let freeUserToken: string;
  let proOrgId: string;
  let freeOrgId: string;

  beforeAll(async () => {
    app = await createTestServer();

    // Create test users with different tiers
    const admin = await createTestUser(app, { role: 'admin', tier: 'agency' });
    adminToken = admin.token;

    const proUser = await createTestUser(app, { email: 'pro@test.com', tier: 'pro' });
    proUserToken = proUser.token;
    proOrgId = proUser.organizationId;

    const freeUser = await createTestUser(app, { email: 'free@test.com', tier: 'free' });
    freeUserToken = freeUser.token;
    freeOrgId = freeUser.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('nodered');
    });
  });

  describe('Tier Access Control', () => {
    it('should deny access for free tier users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/config',
        headers: {
          Authorization: `Bearer ${freeUserToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('TIER_REQUIRED');
    });

    it('should allow access for pro tier users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/config',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Enable Node-RED', () => {
    it('should enable Node-RED for pro organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/enable',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: {
          organization_id: proOrgId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.enabled).toBe(true);
    });

    it('should reject enabling for free organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/enable',
        headers: {
          Authorization: `Bearer ${freeUserToken}`,
        },
        payload: {
          organization_id: freeOrgId,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Flow Management', () => {
    const testFlow = [
      {
        id: 'test-tab',
        type: 'tab',
        label: 'Test Flow',
        info: 'A test flow',
      },
      {
        id: 'test-inject',
        type: 'inject',
        z: 'test-tab',
        name: 'Start',
        x: 100,
        y: 100,
        wires: [['test-debug']],
      },
      {
        id: 'test-debug',
        type: 'debug',
        z: 'test-tab',
        name: 'Output',
        x: 300,
        y: 100,
        wires: [],
      },
    ];

    it('should save flows for enabled organization', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: {
          flows: testFlow,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should load saved flows', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.flows).toHaveLength(3);
      expect(body.data.flows[0].type).toBe('tab');
    });

    it('should enforce flow limits', async () => {
      // Get current limits
      const configResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/config',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      const config = JSON.parse(configResponse.body);
      const maxFlows = config.data.limits.maxFlows;

      // Create flows exceeding limit
      const tooManyFlows = Array.from({ length: maxFlows + 5 }, (_, i) => ({
        id: `tab-${i}`,
        type: 'tab',
        label: `Flow ${i}`,
      }));

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: {
          flows: tooManyFlows,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('SAVE_FAILED');
      expect(body.error.message).toContain('limit');
    });
  });

  describe('Execution Logs', () => {
    it('should return execution logs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/logs',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.logs)).toBe(true);
    });

    it('should filter logs by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/logs?status=failed',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      // All returned logs should be failed status
      body.data.logs.forEach((log: any) => {
        expect(log.status).toBe('failed');
      });
    });
  });

  describe('Usage Statistics', () => {
    it('should return usage stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/usage',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('flowCount');
      expect(body.data).toHaveProperty('maxFlows');
      expect(body.data).toHaveProperty('dailyExecutions');
      expect(body.data).toHaveProperty('successRate');
    });
  });

  describe('SSO Token', () => {
    it('should generate SSO token for editor access', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/sso-token',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.expiresIn).toBe(300);
      expect(body.data.editorUrl).toContain('/flows?access_token=');
    });
  });

  describe('Templates', () => {
    it('should list available templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.templates)).toBe(true);
    });

    it('should filter templates by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates?category=ai-agents',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      body.data.templates.forEach((t: any) => {
        expect(t.category).toBe('ai-agents');
      });
    });

    it('should get template by slug', async () => {
      // First get list to find a template
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates?limit=1',
      });
      
      const templates = JSON.parse(listResponse.body).data.templates;
      if (templates.length === 0) {
        // Skip if no templates
        return;
      }

      const slug = templates[0].slug;
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/nodered/templates/${slug}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe(slug);
    });

    it('should install template for enabled org', async () => {
      // Get a template
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates?limit=1',
      });
      
      const templates = JSON.parse(listResponse.body).data.templates;
      if (templates.length === 0) {
        return;
      }

      const templateId = templates[0].id;
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/nodered/templates/${templateId}/install`,
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Admin Routes', () => {
    it('should get platform stats for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/admin/stats',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('tenants');
      expect(body.data).toHaveProperty('executions');
    });

    it('should deny admin routes for non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/admin/stats',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should list all tenants for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/admin/tenants',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('Tenant Isolation', () => {
    let secondProToken: string;
    let secondProOrgId: string;

    beforeAll(async () => {
      const secondPro = await createTestUser(app, { 
        email: 'pro2@test.com', 
        tier: 'pro' 
      });
      secondProToken = secondPro.token;
      secondProOrgId = secondPro.organizationId;

      // Enable for second org
      await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/enable',
        headers: {
          Authorization: `Bearer ${secondProToken}`,
        },
        payload: {
          organization_id: secondProOrgId,
        },
      });
    });

    it('should keep flows separate between tenants', async () => {
      // Save flow for org 1
      const flow1 = [
        { id: 'org1-tab', type: 'tab', label: 'Org 1 Flow' },
      ];

      await app.inject({
        method: 'PUT',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: { flows: flow1 },
      });

      // Save flow for org 2
      const flow2 = [
        { id: 'org2-tab', type: 'tab', label: 'Org 2 Flow' },
      ];

      await app.inject({
        method: 'PUT',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${secondProToken}`,
        },
        payload: { flows: flow2 },
      });

      // Verify org 1 only sees their flow
      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      const body1 = JSON.parse(response1.body);
      expect(body1.data.flows.some((f: any) => f.label === 'Org 1 Flow')).toBe(true);
      expect(body1.data.flows.some((f: any) => f.label === 'Org 2 Flow')).toBe(false);

      // Verify org 2 only sees their flow
      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${secondProToken}`,
        },
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.data.flows.some((f: any) => f.label === 'Org 2 Flow')).toBe(true);
      expect(body2.data.flows.some((f: any) => f.label === 'Org 1 Flow')).toBe(false);
    });

    it('should keep execution logs separate', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/logs',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/logs',
        headers: {
          Authorization: `Bearer ${secondProToken}`,
        },
      });

      const logs1 = JSON.parse(response1.body).data.logs;
      const logs2 = JSON.parse(response2.body).data.logs;

      // Verify no cross-contamination of logs
      logs1.forEach((log: any) => {
        expect(log.organization_id).not.toBe(secondProOrgId);
      });
      logs2.forEach((log: any) => {
        expect(log.organization_id).not.toBe(proOrgId);
      });
    });
  });
});


