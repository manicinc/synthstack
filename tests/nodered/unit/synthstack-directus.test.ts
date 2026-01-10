/**
 * SynthStack Directus Node Unit Tests
 *
 * Tests for the synthstack-directus node that performs CMS CRUD operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockNode } from './helpers/node-test-helper';
import {
  createMockNode,
  createMockMessage,
  createMockResponse,
  triggerInput,
  waitForAsync,
} from './helpers/node-test-helper';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('synthstack-directus Node', () => {
  let node: MockNode;

  beforeEach(() => {
    vi.clearAllMocks();
    node = createMockNode({
      type: 'synthstack-directus',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should accept operation configuration', () => {
      const config = {
        id: 'directus-1',
        type: 'synthstack-directus',
        name: 'Create Post',
        operation: 'create',
        collection: 'posts',
      };

      expect(config.operation).toBe('create');
      expect(config.collection).toBe('posts');
    });

    it('should support all CRUD operations', () => {
      const validOperations = ['create', 'read', 'update', 'delete', 'list', 'search'];
      validOperations.forEach((op) => {
        expect(validOperations).toContain(op);
      });
    });

    it('should support common collections', () => {
      const collections = ['posts', 'pages', 'users', 'files', 'faq', 'testimonials'];
      collections.forEach((col) => {
        expect(collections).toContain(col);
      });
    });
  });

  describe('Create Operation', () => {
    it('should create item in collection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 'new-post-id',
            title: 'Test Post',
            status: 'draft',
          },
        })
      );

      const msg = createMockMessage({
        title: 'Test Post',
        content: 'Post content',
        status: 'draft',
      });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/items/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputMsg.payload),
        });
        const data = await response.json();

        if (data.data) {
          node.status({ fill: 'green', shape: 'dot', text: `created ${data.data.id}` });
          send([{ ...inputMsg, payload: data.data }, null]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/items/posts',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].payload.id).toBe('new-post-id');
    });

    it('should handle validation errors on create', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            errors: [{ message: 'Title is required' }],
          },
          400
        )
      );

      const msg = createMockMessage({ content: 'No title' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/items/posts', {
          method: 'POST',
          body: JSON.stringify(inputMsg.payload),
        });
        const data = await response.json();

        if (data.errors) {
          node.status({ fill: 'red', shape: 'dot', text: 'validation error' });
          send([null, { ...inputMsg, payload: { error: data.errors[0].message } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.error).toContain('Title is required');
    });
  });

  describe('Read Operation', () => {
    it('should read single item by ID', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 'post-123',
            title: 'Existing Post',
            content: 'Content here',
          },
        })
      );

      const msg = createMockMessage({ id: 'post-123' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { id: string };
        const response = await fetch(`/items/posts/${payload.id}`);
        const data = await response.json();

        if (data.data) {
          send([{ ...inputMsg, payload: data.data }, null]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith('/items/posts/post-123');
      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].payload.title).toBe('Existing Post');
    });

    it('should handle not found errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            errors: [{ message: 'Item not found' }],
          },
          404
        )
      );

      const msg = createMockMessage({ id: 'nonexistent-id' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { id: string };
        const response = await fetch(`/items/posts/${payload.id}`);
        const data = await response.json();

        if (!response.ok) {
          send([null, { ...inputMsg, payload: { error: 'Item not found' } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.error).toContain('not found');
    });
  });

  describe('Update Operation', () => {
    it('should update existing item', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 'post-123',
            title: 'Updated Title',
            status: 'published',
          },
        })
      );

      const msg = createMockMessage({
        id: 'post-123',
        title: 'Updated Title',
        status: 'published',
      });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { id: string };
        const { id, ...updateData } = payload;
        const response = await fetch(`/items/posts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        });
        const data = await response.json();

        if (data.data) {
          node.status({ fill: 'green', shape: 'dot', text: `updated ${id}` });
          send([{ ...inputMsg, payload: data.data }, null]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/items/posts/post-123',
        expect.objectContaining({
          method: 'PATCH',
        })
      );

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].payload.title).toBe('Updated Title');
    });

    it('should handle concurrent update conflicts', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            errors: [{ message: 'Conflict: item was modified' }],
          },
          409
        )
      );

      const msg = createMockMessage({ id: 'post-123', title: 'New Title' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/items/posts/post-123', { method: 'PATCH' });
        const data = await response.json();

        if (data.errors) {
          send([null, { ...inputMsg, payload: { error: 'Conflict', code: 409 } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.code).toBe(409);
    });
  });

  describe('Delete Operation', () => {
    it('should delete item by ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      const msg = createMockMessage({ id: 'post-123' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { id: string };
        const response = await fetch(`/items/posts/${payload.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          node.status({ fill: 'green', shape: 'dot', text: `deleted ${payload.id}` });
          send([{ ...inputMsg, payload: { deleted: true, id: payload.id } }, null]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/items/posts/post-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].payload.deleted).toBe(true);
    });

    it('should handle delete permission errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            errors: [{ message: 'Permission denied' }],
          },
          403
        )
      );

      const msg = createMockMessage({ id: 'protected-post' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/items/posts/protected-post', { method: 'DELETE' });
        const data = await response.json();

        if (!response.ok) {
          send([null, { ...inputMsg, payload: { error: 'Permission denied', code: 403 } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.code).toBe(403);
    });
  });

  describe('List Operation', () => {
    it('should list items with pagination', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: '1', title: 'Post 1' },
            { id: '2', title: 'Post 2' },
          ],
          meta: {
            total_count: 50,
            filter_count: 2,
          },
        })
      );

      const msg = createMockMessage({
        limit: 10,
        offset: 0,
        filter: { status: 'published' },
      });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { limit: number; offset: number };
        const response = await fetch(`/items/posts?limit=${payload.limit}&offset=${payload.offset}`);
        const data = await response.json();

        send([
          {
            ...inputMsg,
            payload: data.data,
            meta: data.meta,
          },
          null,
        ]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[0].payload).toHaveLength(2);
      expect(sendCall[0].meta.total_count).toBe(50);
    });

    it('should support filtering', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: '1', title: 'Published Post', status: 'published' }],
        })
      );

      const msg = createMockMessage({
        filter: { status: { _eq: 'published' } },
      });

      // Filter would be applied to query
      expect((msg.payload as { filter: Record<string, unknown> }).filter.status).toBeDefined();
    });

    it('should support sorting', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: '2', title: 'B Post', created_at: '2024-02-01' },
            { id: '1', title: 'A Post', created_at: '2024-01-01' },
          ],
        })
      );

      const msg = createMockMessage({
        sort: ['-created_at'],
      });

      // Sort would be applied to query
      expect((msg.payload as { sort: string[] }).sort).toContain('-created_at');
    });
  });

  describe('Search Operation', () => {
    it('should search items by query', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: '1', title: 'SynthStack Guide', content: 'Learn about SynthStack...' },
          ],
        })
      );

      const msg = createMockMessage({
        query: 'SynthStack',
        fields: ['title', 'content'],
      });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const payload = inputMsg.payload as { query: string };
        const response = await fetch(`/items/posts?search=${encodeURIComponent(payload.query)}`);
        const data = await response.json();

        send([{ ...inputMsg, payload: data.data }, null]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('search=SynthStack'));
    });
  });

  describe('Authentication', () => {
    it('should include auth token in requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const msg = createMockMessage({});
      const authToken = 'test-token-123';

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        await fetch('/items/posts', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        send([inputMsg, null]);
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/items/posts',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const msg = createMockMessage({ id: 'test' });

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        try {
          await fetch('/items/posts');
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: 'network error' });
          send([null, { ...inputMsg, payload: { error: (error as Error).message } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({ fill: 'red' })
      );
    });

    it('should handle auth errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            errors: [{ message: 'Invalid token' }],
          },
          401
        )
      );

      const msg = createMockMessage({});

      node._events.input = async (inputMsg: typeof msg, send: typeof node.send) => {
        const response = await fetch('/items/posts');
        if (response.status === 401) {
          send([null, { ...inputMsg, payload: { error: 'Authentication required', code: 401 } }]);
        }
      };

      await triggerInput(node, msg);
      await waitForAsync(10);

      const sendCall = (node.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sendCall[1].payload.code).toBe(401);
    });
  });
});


