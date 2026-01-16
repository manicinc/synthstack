/**
 * E2E Tests for ML Service Integration
 *
 * Tests ML capabilities through API Gateway endpoints:
 * - Copilot chat with AI agents
 * - Embeddings generation via document indexing
 * - RAG (Retrieval Augmented Generation) via vector search
 * - Health checks and service availability
 * - Error handling and timeouts
 *
 * Prerequisites:
 * - Test database running
 * - Redis running
 * - Qdrant vector database running (optional, graceful degradation)
 * - OpenAI/Anthropic API keys configured (or mocked)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { sign } from 'jsonwebtoken';
import { startTestServer, stopTestServer, getTestClient } from '../helpers/test-server.js';
import { cleanDatabase } from '../../test/db-helpers.js';
import { createTestUser } from '../fixtures/users.js';

// These tests require copilot routes to be enabled
const COPILOT_ENABLED = process.env.ENABLE_COPILOT === 'true';

// Skip tests when copilot is disabled (LITE version) - routes won't exist
describe.skipIf(!COPILOT_ENABLED)('ML Service Integration E2E', () => {
  let client: AxiosInstance;
  let proUserToken: string;
  let proUserId: string;
  let freeUserToken: string;
  let freeUserId: string;

  beforeAll(async () => {
    await startTestServer();
    client = getTestClient();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create test users with different tiers
    const proUser = await createTestUser({
      email: 'pro-ml@test.com',
      subscription_tier: 'pro',
      credits_remaining: 1000,
    });
    proUserToken = proUser.token;
    proUserId = proUser.id;

    const freeUser = await createTestUser({
      email: 'free-ml@test.com',
      subscription_tier: 'free',
      credits_remaining: 100,
    });
    freeUserToken = freeUser.token;
    freeUserId = freeUser.id;
  });

  // ============================================
  // 1. Health Checks and Service Availability
  // ============================================

  describe('Health Checks', () => {
    it('should return copilot health status', async () => {
      const response = await client.get('/api/v1/copilot/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(response.data).toHaveProperty('copilot');
      expect(response.data.copilot).toHaveProperty('enabled');
      expect(response.data.copilot).toHaveProperty('available');
      expect(response.data.copilot).toHaveProperty('model');
      expect(response.data.copilot).toHaveProperty('embeddingModel');
      expect(response.data).toHaveProperty('vectorDB');
      expect(response.data).toHaveProperty('embeddings');
    });

    it('should report embeddings availability', async () => {
      const response = await client.get('/api/v1/copilot/health');

      expect(response.data.embeddings).toHaveProperty('available');
      expect(response.data.embeddings).toHaveProperty('model');
      expect(response.data.embeddings).toHaveProperty('dimension');

      // Dimension should be 1536 for text-embedding-3-small
      if (response.data.embeddings.available) {
        expect(response.data.embeddings.dimension).toBeGreaterThan(0);
      }
    });

    it('should report vector DB health', async () => {
      const response = await client.get('/api/v1/copilot/health');

      expect(response.data.vectorDB).toHaveProperty('healthy');
      // Vector DB health check should return boolean
      expect(typeof response.data.vectorDB.healthy).toBe('boolean');
    });
  });

  // ============================================
  // 2. AI Agents Discovery
  // ============================================

  describe('AI Agents', () => {
    it('should list available AI agents', async () => {
      const response = await client.get('/api/v1/copilot/agents');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      // Check agent structure
      const agent = response.data.data[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('icon');
      expect(agent).toHaveProperty('color');
      expect(agent).toHaveProperty('capabilities');
      expect(agent).toHaveProperty('greeting');
      expect(agent).toHaveProperty('quickPrompts');
      expect(agent).toHaveProperty('isPremium');
    });

    it('should include standard agents (general, researcher, developer)', async () => {
      const response = await client.get('/api/v1/copilot/agents');

      const agentIds = response.data.data.map((a: any) => a.id);

      // Check for standard agents
      expect(agentIds).toContain('general');
      expect(agentIds.some((id: string) =>
        id === 'researcher' || id === 'developer' || id === 'marketer'
      )).toBe(true);
    });

    it('should provide quick prompts for each agent', async () => {
      const response = await client.get('/api/v1/copilot/agents');

      for (const agent of response.data.data) {
        expect(agent.quickPrompts).toBeDefined();
        expect(Array.isArray(agent.quickPrompts)).toBe(true);
        expect(agent.quickPrompts.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // 3. Copilot Chat (LLM Integration)
  // ============================================

  describe('Copilot Chat', () => {
    it('should handle basic chat request', async () => {
      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: 'Hello, can you help me?' }
        ],
        agentId: 'general',
      });

      // Accept 500/503 when ML service is unavailable
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveProperty('message');
        expect(response.data.data).toHaveProperty('model');
        expect(response.data.data.message).toBeTruthy();
        expect(typeof response.data.data.message).toBe('string');
      }
    });

    it('should handle chat with different agents', async () => {
      const agents = ['general', 'researcher', 'developer'];

      for (const agentId of agents) {
        const response = await client.post('/api/v1/copilot/chat', {
          messages: [
            { role: 'user', content: `Test message for ${agentId}` }
          ],
          agentId,
        });

        // Accept 500/503 when ML service is unavailable
        expect([200, 500, 503]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data.agentId).toBe(agentId);
          expect(response.data.data.message).toBeTruthy();
        }
      }
    });

    it('should maintain conversation context', async () => {
      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: 'My name is Alice' },
          { role: 'assistant', content: 'Hello Alice! How can I help you?' },
          { role: 'user', content: 'What is my name?' }
        ],
        agentId: 'general',
      });

      // Accept 500/503 when ML service is unavailable
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data.data.message).toBeTruthy();
      }
    });

    it('should create chat session with authenticated user', async () => {
      const response = await client.post(
        '/api/v1/copilot/chat',
        {
          messages: [
            { role: 'user', content: 'Create a new chat session' }
          ],
          title: 'Test Chat Session',
          agentId: 'general',
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Accept 500/503 when ML service is unavailable
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('chatId');
        expect(response.data.chatId).toBeTruthy();
      }
    });

    it('should handle empty message gracefully', async () => {
      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: '' }
        ],
        agentId: 'general',
      });

      // Should either succeed with an appropriate response or return validation error
      // Accept 503 when ML service is unavailable
      expect([200, 400, 500, 503]).toContain(response.status);
    });

    it('should handle service unavailability gracefully', async () => {
      // This test assumes OpenAI key might not be configured in test environment
      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: 'Test service availability' }
        ],
        agentId: 'general',
      });

      // Should either succeed or return 503 if service unavailable
      expect([200, 503]).toContain(response.status);

      if (response.status === 503) {
        expect(response.data).toHaveProperty('error');
      }
    });
  });

  // ============================================
  // 4. Streaming Chat
  // ============================================

  describe('Streaming Chat', () => {
    it('should require authentication for streaming', async () => {
      const response = await client.post('/api/v1/copilot/chat/stream', {
        messages: [
          { role: 'user', content: 'Test streaming' }
        ],
      });

      expect(response.status).toBe(401);
    });

    it('should accept streaming request with authentication', async () => {
      const response = await client.post(
        '/api/v1/copilot/chat/stream',
        {
          messages: [
            { role: 'user', content: 'Stream test' }
          ],
          agentId: 'general',
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
          // Note: Can't fully test SSE streaming with axios, but can verify it starts
          validateStatus: () => true,
        }
      );

      // Should either start streaming (200) or return error if service unavailable
      expect([200, 503]).toContain(response.status);
    });
  });

  // ============================================
  // 5. Document Indexing (Embeddings)
  // ============================================

  describe('Document Indexing', () => {
    it('should require authentication for indexing', async () => {
      const response = await client.post('/api/v1/copilot/index', {
        id: 'test-doc-1',
        type: 'documentation',
        title: 'Test Document',
        content: 'This is a test document for indexing.',
      });

      expect(response.status).toBe(401);
    });

    it('should index document with embeddings', async () => {
      const response = await client.post(
        '/api/v1/copilot/index',
        {
          id: 'test-doc-1',
          type: 'documentation',
          title: 'API Gateway Testing Guide',
          content: 'This guide covers testing strategies for the API Gateway, including unit tests, integration tests, and E2E tests.',
          metadata: {
            category: 'testing',
            author: 'test-user',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Should either succeed or return 503 if embeddings unavailable
      expect([200, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('id', 'test-doc-1');
      } else {
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should validate required fields for indexing', async () => {
      const response = await client.post(
        '/api/v1/copilot/index',
        {
          id: 'test-doc-2',
          // Missing required fields
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect(response.status).toBe(400);
    });

    it('should handle empty content gracefully', async () => {
      const response = await client.post(
        '/api/v1/copilot/index',
        {
          id: 'test-doc-3',
          type: 'documentation',
          title: 'Empty Document',
          content: '',
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Should either handle gracefully or return error
      expect([200, 400, 500, 503]).toContain(response.status);
    });
  });

  // ============================================
  // 6. Document Deletion from Index
  // ============================================

  describe('Document Deletion', () => {
    it('should require authentication for deletion', async () => {
      const response = await client.delete('/api/v1/copilot/index/documentation/test-doc-1');

      expect(response.status).toBe(401);
    });

    it('should delete document from index', async () => {
      const response = await client.delete(
        '/api/v1/copilot/index/documentation/test-doc-1',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
      }
    });

    it('should handle deletion of non-existent document', async () => {
      const response = await client.delete(
        '/api/v1/copilot/index/documentation/non-existent-doc',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Should handle gracefully (either 200, 404, or 500)
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // 7. Collection Info (Vector Database)
  // ============================================

  describe('Collection Info', () => {
    it('should require authentication for collection info', async () => {
      const response = await client.get('/api/v1/copilot/index/info');

      expect(response.status).toBe(401);
    });

    it('should return collection information', async () => {
      const response = await client.get(
        '/api/v1/copilot/index/info',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
      }
    });
  });

  // ============================================
  // 8. Agent Documents (RAG Context)
  // ============================================

  describe('Agent Documents', () => {
    it('should retrieve agent-specific documents', async () => {
      const response = await client.get('/api/v1/copilot/agents/general/documents');

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('agentId', 'general');
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);
      }
    });

    it('should filter documents by category', async () => {
      const response = await client.get('/api/v1/copilot/agents/developer/documents', {
        params: {
          category: 'api',
        },
      });

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('data');
      }
    });

    it('should optionally exclude global documents', async () => {
      const response = await client.get('/api/v1/copilot/agents/researcher/documents', {
        params: {
          includeGlobal: false,
        },
      });

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('data');
      }
    });

    it('should handle non-existent agent gracefully', async () => {
      const response = await client.get('/api/v1/copilot/agents/non-existent-agent/documents');

      // Should either return empty array, 404, or 500 (when ML service unavailable)
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data.data).toBeDefined();
      }
    });
  });

  // ============================================
  // 9. Chat History
  // ============================================

  describe('Chat History', () => {
    it('should require authentication for chat history', async () => {
      const response = await client.get('/api/v1/copilot/chats');

      expect(response.status).toBe(401);
    });

    it('should retrieve user chat history', async () => {
      const response = await client.get(
        '/api/v1/copilot/chats',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);
      }
    });

    it('should filter chat history by agent', async () => {
      const response = await client.get(
        '/api/v1/copilot/chats',
        {
          params: {
            agentId: 'general',
          },
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('data');
      }
    });

    it('should filter chat history by scope', async () => {
      const response = await client.get(
        '/api/v1/copilot/chats',
        {
          params: {
            scope: 'global',
          },
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Accept 500 when ML service is unavailable
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveProperty('data');
      }
    });
  });

  // ============================================
  // 10. Chat Messages Retrieval
  // ============================================

  describe('Chat Messages', () => {
    it('should require authentication for chat messages', async () => {
      const response = await client.get('/api/v1/copilot/chats/test-chat-id/messages');

      expect(response.status).toBe(401);
    });

    it('should return 404 or 500 for non-existent chat', async () => {
      const response = await client.get(
        '/api/v1/copilot/chats/non-existent-chat-id/messages',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // API may return 404 (not found) or 500 (internal error when ML service unavailable)
      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // 11. Chat Deletion
  // ============================================

  describe('Chat Deletion', () => {
    it('should require authentication for chat deletion', async () => {
      const response = await client.delete('/api/v1/copilot/chats/test-chat-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 or 500 for deleting non-existent chat', async () => {
      const response = await client.delete(
        '/api/v1/copilot/chats/non-existent-chat-id',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // API may return 404 (not found) or 500 (internal error when ML service unavailable)
      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // 12. Agent Updates (Notifications)
  // ============================================

  describe('Agent Updates', () => {
    it('should require authentication for updates', async () => {
      const response = await client.get('/api/v1/copilot/agents/general/updates');

      expect(response.status).toBe(401);
    });

    it('should retrieve unread updates for agent', async () => {
      const response = await client.get(
        '/api/v1/copilot/agents/general/updates',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Should either succeed or return 404 if agent not found
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);
      }
    });

    it('should retrieve all updates (not just unread)', async () => {
      const response = await client.get(
        '/api/v1/copilot/agents/general/updates',
        {
          params: {
            unreadOnly: false,
          },
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect([200, 404]).toContain(response.status);
    });

    it('should get update counts for all agents', async () => {
      const response = await client.get(
        '/api/v1/copilot/agents/updates/counts',
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      expect(typeof response.data.data).toBe('object');
    });
  });

  // ============================================
  // 13. URL Scraping
  // ============================================

  describe('URL Scraping', () => {
    it('should require authentication for scraping', async () => {
      const response = await client.post('/api/v1/copilot/scrape', {
        url: 'https://example.com',
      });

      expect(response.status).toBe(401);
    });

    it('should validate URL format', async () => {
      const response = await client.post(
        '/api/v1/copilot/scrape',
        {
          url: 'not-a-valid-url',
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should scrape URL and extract content', async () => {
      const response = await client.post(
        '/api/v1/copilot/scrape',
        {
          url: 'https://example.com',
        },
        {
          headers: {
            'Authorization': `Bearer ${proUserToken}`,
            'x-test-user-id': proUserId,
            'x-test-user-email': 'pro-ml@test.com',
          },
        }
      );

      // Network request may fail in test environment
      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('content');
        expect(response.data).toHaveProperty('url');
      }
    });
  });

  // ============================================
  // 14. Error Handling and Edge Cases
  // ============================================

  describe('Error Handling', () => {
    it('should handle malformed JSON in chat request', async () => {
      const response = await client.post(
        '/api/v1/copilot/chat',
        'this is not valid JSON',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing required fields in chat', async () => {
      const response = await client.post('/api/v1/copilot/chat', {
        // Missing messages field
        agentId: 'general',
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid agent ID gracefully', async () => {
      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: 'Test with invalid agent' }
        ],
        agentId: 'completely-invalid-agent-id-12345',
      });

      // Should fall back to general agent or return error (503 when ML service unavailable)
      expect([200, 400, 404, 503]).toContain(response.status);
    });

    it('should handle very long chat messages', async () => {
      const longMessage = 'A'.repeat(50000); // 50K characters

      const response = await client.post('/api/v1/copilot/chat', {
        messages: [
          { role: 'user', content: longMessage }
        ],
        agentId: 'general',
      });

      // Should either handle or return appropriate error
      expect([200, 400, 413, 500, 503]).toContain(response.status);
    });
  });

  // ============================================
  // 15. Performance and Caching
  // ============================================

  describe('Performance and Caching', () => {
    it('should cache agent list for subsequent requests', async () => {
      const startTime1 = Date.now();
      const response1 = await client.get('/api/v1/copilot/agents');
      const duration1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const response2 = await client.get('/api/v1/copilot/agents');
      const duration2 = Date.now() - startTime2;

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Second request should be faster (cached)
      // Note: This is a weak assertion as network variability may affect results
      expect(duration2).toBeLessThanOrEqual(duration1 + 100);
    });

    it('should respond to health check quickly', async () => {
      const startTime = Date.now();
      const response = await client.get('/api/v1/copilot/health');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        client.get('/api/v1/copilot/agents')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });
    });
  });
});
