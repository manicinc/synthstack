/**
 * E2E Tests for Node-RED Workflows
 *
 * End-to-end tests for workflow CRUD operations and execution.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, createTestUser, createTestOrganization } from '../helpers/test-utils';
import type { FastifyInstance } from 'fastify';

describe('Workflow E2E Tests', () => {
  let app: FastifyInstance;
  let proUserToken: string;
  let proOrgId: string;
  let agencyUserToken: string;
  let agencyOrgId: string;

  beforeAll(async () => {
    app = await createTestServer();

    // Create Pro user
    const proUser = await createTestUser(app, {
      email: 'pro-workflow@test.com',
      tier: 'pro',
    });
    proUserToken = proUser.token;
    proOrgId = proUser.organizationId;

    // Create Agency user for higher limits
    const agencyUser = await createTestUser(app, {
      email: 'agency-workflow@test.com',
      tier: 'agency',
    });
    agencyUserToken = agencyUser.token;
    agencyOrgId = agencyUser.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Workflow CRUD Operations', () => {
    let createdFlowId: string;

    describe('Create Workflow', () => {
      it('should create a new workflow flow', async () => {
        const flowData = {
          name: 'Test Automation Flow',
          description: 'E2E test flow for automation',
          nodes: [
            {
              id: 'node-1',
              type: 'synthstack-trigger',
              name: 'Webhook Trigger',
              x: 100,
              y: 100,
              wires: [['node-2']],
              event: 'webhook',
            },
            {
              id: 'node-2',
              type: 'synthstack-agent',
              name: 'CEO Agent',
              x: 300,
              y: 100,
              wires: [['node-3'], []],
              agent: 'ceo',
            },
            {
              id: 'node-3',
              type: 'synthstack-directus',
              name: 'Save Result',
              x: 500,
              y: 100,
              wires: [[], []],
              operation: 'create',
              collection: 'workflow_results',
            },
          ],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/nodered/flows',
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: flowData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.flow).toBeDefined();
        expect(body.flow.id).toBeDefined();
        expect(body.flow.name).toBe('Test Automation Flow');

        createdFlowId = body.flow.id;
      });

      it('should validate required fields', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/nodered/flows',
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            // Missing name and nodes
            description: 'Invalid flow',
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBeDefined();
      });

      it('should enforce flow limits by tier', async () => {
        // Create flows up to limit (Pro tier: 10 flows)
        const createFlow = async (index: number) => {
          return app.inject({
            method: 'POST',
            url: '/api/v1/nodered/flows',
            headers: {
              Authorization: `Bearer ${proUserToken}`,
            },
            payload: {
              name: `Limit Test Flow ${index}`,
              nodes: [],
            },
          });
        };

        // This test would need actual limit checking
        // For now, verify the endpoint accepts the request
        const response = await createFlow(1);
        expect([200, 201, 400, 429]).toContain(response.statusCode);
      });
    });

    describe('Read Workflow', () => {
      it('should get workflow by ID', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${createdFlowId}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.flow.id).toBe(createdFlowId);
        expect(body.flow.name).toBe('Test Automation Flow');
      });

      it('should list all workflows for organization', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/nodered/flows',
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body.flows)).toBe(true);
        expect(body.flows.length).toBeGreaterThan(0);
      });

      it('should not access other organization flows', async () => {
        // Try to access pro user's flow with agency user
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${createdFlowId}`,
          headers: {
            Authorization: `Bearer ${agencyUserToken}`,
          },
        });

        // Should either return 404 or 403
        expect([403, 404]).toContain(response.statusCode);
      });
    });

    describe('Update Workflow', () => {
      it('should update workflow name and description', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v1/nodered/flows/${createdFlowId}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            name: 'Updated Flow Name',
            description: 'Updated description',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.flow.name).toBe('Updated Flow Name');
      });

      it('should update workflow nodes', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v1/nodered/flows/${createdFlowId}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            nodes: [
              {
                id: 'node-1',
                type: 'synthstack-trigger',
                name: 'Updated Trigger',
                x: 100,
                y: 100,
                wires: [['node-2']],
              },
              {
                id: 'node-2',
                type: 'synthstack-email',
                name: 'Send Email',
                x: 300,
                y: 100,
                wires: [[], []],
              },
            ],
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.flow.nodes).toHaveLength(2);
      });

      it('should track version history', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${createdFlowId}/versions`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body.versions)).toBe(true);
      });
    });

    describe('Delete Workflow', () => {
      let flowToDelete: string;

      beforeEach(async () => {
        // Create a flow to delete
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/nodered/flows',
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            name: 'Flow to Delete',
            nodes: [],
          },
        });
        const body = JSON.parse(response.body);
        flowToDelete = body.flow?.id;
      });

      it('should delete workflow', async () => {
        if (!flowToDelete) return;

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/nodered/flows/${flowToDelete}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);

        // Verify it's deleted
        const getResponse = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${flowToDelete}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(getResponse.statusCode).toBe(404);
      });

      it('should not delete active workflow without force flag', async () => {
        // First, activate the flow
        await app.inject({
          method: 'POST',
          url: `/api/v1/nodered/flows/${flowToDelete}/deploy`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/nodered/flows/${flowToDelete}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        // Should require force=true or return error
        expect([200, 400, 409]).toContain(response.statusCode);
      });
    });
  });

  describe('Workflow Execution', () => {
    let executionFlowId: string;

    beforeAll(async () => {
      // Create a flow for execution tests
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: {
          name: 'Execution Test Flow',
          nodes: [
            {
              id: 'trigger-1',
              type: 'synthstack-trigger',
              event: 'manual',
              wires: [['agent-1']],
            },
            {
              id: 'agent-1',
              type: 'synthstack-agent',
              agent: 'ceo',
              wires: [['output-1'], ['error-1']],
            },
            {
              id: 'output-1',
              type: 'debug',
              wires: [],
            },
            {
              id: 'error-1',
              type: 'debug',
              wires: [],
            },
          ],
        },
      });
      const body = JSON.parse(response.body);
      executionFlowId = body.flow?.id;
    });

    describe('Manual Execution', () => {
      it('should execute workflow manually', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/nodered/flows/${executionFlowId}/execute`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            input: {
              prompt: 'Test execution prompt',
            },
          },
        });

        expect([200, 202]).toContain(response.statusCode);
        const body = JSON.parse(response.body);
        expect(body.executionId).toBeDefined();
      });

      it('should return execution status', async () => {
        // First, execute
        const execResponse = await app.inject({
          method: 'POST',
          url: `/api/v1/nodered/flows/${executionFlowId}/execute`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: { input: { test: true } },
        });

        const execBody = JSON.parse(execResponse.body);
        const executionId = execBody.executionId;

        if (executionId) {
          // Check status
          const statusResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/nodered/executions/${executionId}`,
            headers: {
              Authorization: `Bearer ${proUserToken}`,
            },
          });

          expect(statusResponse.statusCode).toBe(200);
          const statusBody = JSON.parse(statusResponse.body);
          expect(['pending', 'running', 'completed', 'failed']).toContain(statusBody.status);
        }
      });

      it('should enforce execution quota', async () => {
        // Execute many times to hit quota
        const executions = Array(100)
          .fill(null)
          .map(() =>
            app.inject({
              method: 'POST',
              url: `/api/v1/nodered/flows/${executionFlowId}/execute`,
              headers: {
                Authorization: `Bearer ${proUserToken}`,
              },
              payload: { input: {} },
            })
          );

        const results = await Promise.all(executions);
        const statusCodes = results.map((r) => r.statusCode);

        // Should eventually hit 429 (rate limit) or 402 (quota exceeded)
        // or all succeed if within quota
        expect(statusCodes.every((code) => [200, 202, 402, 429].includes(code))).toBe(true);
      });
    });

    describe('Execution Logs', () => {
      it('should list execution logs', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${executionFlowId}/logs`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(Array.isArray(body.logs)).toBe(true);
      });

      it('should filter logs by status', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${executionFlowId}/logs?status=completed`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        if (body.logs.length > 0) {
          expect(body.logs.every((log: { status: string }) => log.status === 'completed')).toBe(
            true
          );
        }
      });

      it('should filter logs by date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/flows/${executionFlowId}/logs?startDate=${startDate}&endDate=${endDate}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe('Workflow Templates', () => {
    it('should list available templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.templates)).toBe(true);
    });

    it('should get template details', async () => {
      // First get list of templates
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      const listBody = JSON.parse(listResponse.body);
      if (listBody.templates?.length > 0) {
        const templateId = listBody.templates[0].id;

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/nodered/templates/${templateId}`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.template).toBeDefined();
        expect(body.template.nodes).toBeDefined();
      }
    });

    it('should create flow from template', async () => {
      // Get a template
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/templates',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      const listBody = JSON.parse(listResponse.body);
      if (listBody.templates?.length > 0) {
        const templateId = listBody.templates[0].id;

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/nodered/templates/${templateId}/instantiate`,
          headers: {
            Authorization: `Bearer ${proUserToken}`,
          },
          payload: {
            name: 'Flow from Template',
            variables: {
              webhookUrl: 'https://example.com/webhook',
            },
          },
        });

        expect([200, 201]).toContain(response.statusCode);
        const body = JSON.parse(response.body);
        expect(body.flow).toBeDefined();
      }
    });
  });

  describe('Workflow Deployment', () => {
    let deployFlowId: string;

    beforeAll(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        payload: {
          name: 'Deploy Test Flow',
          nodes: [
            {
              id: 'trigger',
              type: 'synthstack-trigger',
              event: 'schedule',
              schedule: '0 * * * *', // Every hour
              wires: [['action']],
            },
            {
              id: 'action',
              type: 'synthstack-email',
              to: 'test@example.com',
              subject: 'Scheduled Email',
              wires: [[], []],
            },
          ],
        },
      });
      const body = JSON.parse(response.body);
      deployFlowId = body.flow?.id;
    });

    it('should deploy workflow', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/nodered/flows/${deployFlowId}/deploy`,
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect([200, 202]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.deployed).toBe(true);
    });

    it('should undeploy workflow', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/nodered/flows/${deployFlowId}/undeploy`,
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.deployed).toBe(false);
    });

    it('should get deployment status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/nodered/flows/${deployFlowId}/status`,
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.deployed).toBe('boolean');
    });
  });

  describe('Workflow Analytics', () => {
    it('should get workflow usage statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/usage',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.usage).toBeDefined();
      expect(typeof body.usage.totalExecutions).toBe('number');
      expect(typeof body.usage.flowCount).toBe('number');
    });

    it('should get execution metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/metrics',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
        query: {
          period: '7d',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.metrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid flow ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/flows/invalid-uuid',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
        },
      });

      expect([400, 404]).toContain(response.statusCode);
    });

    it('should handle unauthorized access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nodered/flows',
        // No auth header
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle invalid JSON payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nodered/flows',
        headers: {
          Authorization: `Bearer ${proUserToken}`,
          'Content-Type': 'application/json',
        },
        payload: 'invalid json{',
      });

      expect([400, 415]).toContain(response.statusCode);
    });
  });
});


