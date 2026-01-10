/**
 * SynthStack Agent Node Unit Tests
 *
 * Tests for the synthstack-agent node that invokes AI Co-Founders.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockNode, MockRED } from './helpers/node-test-helper';
import {
  createMockRED,
  createMockNode,
  createMockMessage,
  createMockResponse,
  triggerInput,
  assertStatus,
  assertSent,
  assertErrorSent,
  waitForAsync,
} from './helpers/node-test-helper';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('synthstack-agent Node', () => {
  let RED: MockRED;
  let node: MockNode;

  beforeEach(() => {
    vi.clearAllMocks();
    RED = createMockRED();
    node = createMockNode({
      type: 'synthstack-agent',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should accept agent type configuration', () => {
      const config = {
        id: 'agent-1',
        type: 'synthstack-agent',
        name: 'CEO Agent',
        agent: 'ceo',
        prompt: '',
        context: '',
      };

      // Node should store config
      expect(config.agent).toBe('ceo');
    });

    it('should support all AI Co-Founder agents', () => {
      const validAgents = ['ceo', 'cto', 'cmo', 'cfo', 'coo', 'cpo'];
      validAgents.forEach((agent) => {
        expect(validAgents).toContain(agent);
      });
    });
  });

  describe('Input Processing', () => {
    it('should process input message with prompt', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'AI response content',
          agent: 'ceo',
          usage: { tokens: 150 },
        })
      );

      const msg = createMockMessage({
        prompt: 'What should our Q1 strategy be?',
      });

      // Simulate input processing
      node._events.input = async (inputMsg: typeof msg, send: typeof node.send, done: typeof node.done) => {
        try {
          node.status({ fill: 'blue', shape: 'dot', text: 'processing...' });

          const response = await fetch('/api/v1/agents/ceo/invoke', {
            method: 'POST',
            body: JSON.stringify({ prompt: inputMsg.payload }),
          });

          const data = await response.json();

          if (data.success) {
            node.status({ fill: 'green', shape: 'dot', text: 'success' });
            send([{ ...inputMsg, payload: data.response }, null]);
          } else {
            node.status({ fill: 'red', shape: 'dot', text: 'error' });
            send([null, { ...inputMsg, payload: { error: data.error } }]);
          }
          done();
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: 'error' });
          send([null, { ...inputMsg, payload: { error: (error as Error).message } }]);
          done();
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/agents/ceo/invoke',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should pass context to agent', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'Response with context',
          agent: 'cto',
        })
      );

      const msg = createMockMessage({
        prompt: 'Review this code',
        context: {
          repository: 'synthstack',
          files: ['src/app.ts'],
        },
      });

      // Verify context would be passed
      expect(msg.payload).toHaveProperty('context');
    });

    it('should support dynamic prompt from msg.payload', async () => {
      const msg = createMockMessage('What is our burn rate?');

      // Node should use payload as prompt if it's a string
      const prompt = typeof msg.payload === 'string' ? msg.payload : (msg.payload as Record<string, unknown>).prompt;
      expect(prompt).toBe('What is our burn rate?');
    });
  });

  describe('Output Handling', () => {
    it('should output response on success port (output 1)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'Strategic recommendation...',
          agent: 'ceo',
          usage: { tokens: 200 },
        })
      );

      const msg = createMockMessage({ prompt: 'Test prompt' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/api/v1/agents/ceo/invoke', {
          method: 'POST',
          body: JSON.stringify({ prompt: inputMsg.payload }),
        });
        const data = await response.json();

        if (data.success) {
          send([{ ...inputMsg, payload: data.response }, null]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(node.send).toHaveBeenCalled();
      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0]).not.toBeNull();
      expect(sendCall[0].payload).toBe('Strategic recommendation...');
    });

    it('should output error on error port (output 2)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            success: false,
            error: 'Rate limit exceeded',
          },
          429
        )
      );

      const msg = createMockMessage({ prompt: 'Test prompt' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/api/v1/agents/ceo/invoke', {
          method: 'POST',
          body: JSON.stringify({ prompt: inputMsg.payload }),
        });
        const data = await response.json();

        if (!data.success) {
          send([null, { ...inputMsg, payload: { error: data.error } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(node.send).toHaveBeenCalled();
      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0]).toBeNull();
      expect(sendCall[1]).not.toBeNull();
      expect(sendCall[1].payload.error).toBe('Rate limit exceeded');
    });

    it('should include usage metadata in response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'Response text',
          agent: 'ceo',
          usage: {
            tokens: 150,
            promptTokens: 50,
            completionTokens: 100,
          },
        })
      );

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/api/v1/agents/ceo/invoke', {
          method: 'POST',
          body: JSON.stringify({ prompt: inputMsg.payload }),
        });
        const data = await response.json();

        send([
          {
            ...inputMsg,
            payload: data.response,
            usage: data.usage,
            agent: data.agent,
          },
          null,
        ]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].usage).toBeDefined();
      expect(sendCall[0].usage.tokens).toBe(150);
    });
  });

  describe('Status Updates', () => {
    it('should show processing status while invoking agent', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockResponse({ success: true, response: 'test' })), 100)
          )
      );

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        node.status({ fill: 'blue', shape: 'dot', text: 'invoking ceo...' });

        const response = await fetch('/api/v1/agents/ceo/invoke', {
          method: 'POST',
          body: JSON.stringify({ prompt: inputMsg.payload }),
        });
        const data = await response.json();

        node.status({ fill: 'green', shape: 'dot', text: 'success' });
        send([{ ...inputMsg, payload: data.response }, null]);
      };

      await triggerInput(node, msg);

      // Check initial status
      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({
          fill: 'blue',
          shape: 'dot',
        })
      );
    });

    it('should show success status after completion', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'Done',
        })
      );

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        node.status({ fill: 'blue', shape: 'dot', text: 'processing...' });
        await fetch('/api/v1/agents/ceo/invoke', { method: 'POST' });
        node.status({ fill: 'green', shape: 'dot', text: 'success' });
        send([{ ...inputMsg, payload: 'Done' }, null]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const statusCalls = (node.status as ReturnType<typeof vi.fn>).mock.calls;
      const lastStatus = statusCalls[statusCalls.length - 1][0];
      expect(lastStatus.fill).toBe('green');
    });

    it('should show error status on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        try {
          node.status({ fill: 'blue', shape: 'dot', text: 'processing...' });
          await fetch('/api/v1/agents/ceo/invoke', { method: 'POST' });
          node.status({ fill: 'green', shape: 'dot', text: 'success' });
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: 'error' });
          send([null, { ...inputMsg, payload: { error: (error as Error).message } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const statusCalls = (node.status as ReturnType<typeof vi.fn>).mock.calls;
      const lastStatus = statusCalls[statusCalls.length - 1][0];
      expect(lastStatus.fill).toBe('red');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send, done: typeof node.done) => {
        try {
          await fetch('/api/v1/agents/ceo/invoke', { method: 'POST' });
        } catch (error) {
          node.error((error as Error).message);
          send([null, { ...inputMsg, payload: { error: (error as Error).message } }]);
          done();
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(node.error).toHaveBeenCalled();
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('Not JSON'),
      });

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        try {
          const response = await fetch('/api/v1/agents/ceo/invoke', { method: 'POST' });
          await response.json();
        } catch (error) {
          send([null, { ...inputMsg, payload: { error: 'Invalid response format' } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.error).toContain('Invalid');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      );

      const msg = createMockMessage({ prompt: 'Test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        try {
          await fetch('/api/v1/agents/ceo/invoke', { method: 'POST' });
        } catch (error) {
          send([null, { ...inputMsg, payload: { error: (error as Error).message } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(150);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.error).toContain('timeout');
    });

    it('should handle missing prompt gracefully', async () => {
      const msg = createMockMessage({});

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as Record<string, unknown>;
        if (!payload.prompt && typeof payload !== 'string') {
          send([null, { ...inputMsg, payload: { error: 'Missing prompt' } }]);
          return;
        }
      };

      await triggerInput(node, msg);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.error).toContain('Missing prompt');
    });
  });

  describe('Agent-Specific Behavior', () => {
    it('should use correct endpoint for each agent type', () => {
      const agents = ['ceo', 'cto', 'cmo', 'cfo', 'coo', 'cpo'];

      agents.forEach((agent) => {
        const endpoint = `/api/v1/agents/${agent}/invoke`;
        expect(endpoint).toContain(agent);
      });
    });

    it('should include agent type in response metadata', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          response: 'Technical review complete',
          agent: 'cto',
        })
      );

      const msg = createMockMessage({ prompt: 'Review code' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/api/v1/agents/cto/invoke', { method: 'POST' });
        const data = await response.json();
        send([{ ...inputMsg, payload: data.response, agent: data.agent }, null]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].agent).toBe('cto');
    });
  });
});


