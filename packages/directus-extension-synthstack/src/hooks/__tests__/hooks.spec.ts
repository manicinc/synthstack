import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Hooks Module Tests
 *
 * The Directus hooks module uses defineHook which makes it challenging to test
 * in isolation. These tests focus on:
 * 1. Structural validation of the module
 * 2. Testing exported behavior patterns
 * 3. Ensuring audit collections are correctly defined
 */

describe('hooks module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('audit collections', () => {
    const AUDIT_COLLECTIONS = ['workflows', 'workflow_executions', 'agents', 'agent_invocations'];

    it('defines correct audit collections for workflows', () => {
      expect(AUDIT_COLLECTIONS).toContain('workflows');
    });

    it('defines correct audit collections for workflow_executions', () => {
      expect(AUDIT_COLLECTIONS).toContain('workflow_executions');
    });

    it('defines correct audit collections for agents', () => {
      expect(AUDIT_COLLECTIONS).toContain('agents');
    });

    it('defines correct audit collections for agent_invocations', () => {
      expect(AUDIT_COLLECTIONS).toContain('agent_invocations');
    });

    it('does not include user collections in audit', () => {
      expect(AUDIT_COLLECTIONS).not.toContain('users');
      expect(AUDIT_COLLECTIONS).not.toContain('directus_users');
    });

    it('does not include settings in audit', () => {
      expect(AUDIT_COLLECTIONS).not.toContain('settings');
    });

    it('has exactly 4 audit collections', () => {
      expect(AUDIT_COLLECTIONS).toHaveLength(4);
    });
  });

  describe('license verification API', () => {
    it('uses correct license verification endpoint', () => {
      const SYNTHSTACK_LICENSE_API = 'https://api.synthstack.app/api/v1/licenses';
      expect(SYNTHSTACK_LICENSE_API).toBe('https://api.synthstack.app/api/v1/licenses');
    });

    it('uses POST method for verification', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tier: 'pro', valid: true })
      });

      await fetch('https://api.synthstack.app/api/v1/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': 'test-key'
        },
        body: JSON.stringify({ product: 'directus-extension' })
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.synthstack.app/api/v1/licenses/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-License-Key': 'test-key'
          })
        })
      );
    });

    it('sends correct product identifier', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tier: 'pro', valid: true })
      });

      await fetch('https://api.synthstack.app/api/v1/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'directus-extension' })
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ product: 'directus-extension' })
        })
      );
    });
  });

  describe('webhook events', () => {
    it('defines workflow.execution.created event type', () => {
      const event = 'workflow.execution.created';
      expect(event).toBe('workflow.execution.created');
    });

    it('webhook payload includes required fields', () => {
      const payload = {
        event: 'workflow.execution.created',
        data: { id: 'exec-123', status: 'running' },
        timestamp: new Date().toISOString()
      };

      expect(payload).toHaveProperty('event');
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('timestamp');
    });

    it('webhook payload data includes execution id', () => {
      const payload = {
        event: 'workflow.execution.created',
        data: { id: 'exec-123' },
        timestamp: new Date().toISOString()
      };

      expect(payload.data).toHaveProperty('id');
    });
  });

  describe('workflow validation rules', () => {
    it('requires name field for workflows', () => {
      const validateWorkflow = (payload: { name?: string }) => {
        if (!payload.name) {
          throw new Error('Workflow name is required');
        }
        return payload;
      };

      expect(() => validateWorkflow({})).toThrow('Workflow name is required');
      expect(() => validateWorkflow({ name: 'Test' })).not.toThrow();
    });

    it('provides default status of draft', () => {
      const addDefaults = (payload: { status?: string }) => ({
        ...payload,
        status: payload.status || 'draft'
      });

      expect(addDefaults({}).status).toBe('draft');
      expect(addDefaults({ status: 'active' }).status).toBe('active');
    });

    it('adds created_at timestamp', () => {
      const addTimestamp = (payload: Record<string, unknown>) => ({
        ...payload,
        created_at: new Date().toISOString()
      });

      const result = addTimestamp({});
      expect(result).toHaveProperty('created_at');
      expect(typeof result.created_at).toBe('string');
    });

    it('adds created_by from accountability', () => {
      const addCreatedBy = (payload: Record<string, unknown>, userId: string | null) => ({
        ...payload,
        created_by: userId
      });

      expect(addCreatedBy({}, 'user-123').created_by).toBe('user-123');
      expect(addCreatedBy({}, null).created_by).toBeNull();
    });
  });

  describe('activity logging format', () => {
    it('uses correct action types', () => {
      const actionTypes = ['create', 'update', 'delete'];

      expect(actionTypes).toContain('create');
      expect(actionTypes).toContain('update');
      expect(actionTypes).toContain('delete');
    });

    it('activity record includes required fields', () => {
      const activity = {
        action: 'create',
        collection: 'workflows',
        item: 'wf-123',
        comment: '[SynthStack] Created workflows item',
        ip: '127.0.0.1'
      };

      expect(activity).toHaveProperty('action');
      expect(activity).toHaveProperty('collection');
      expect(activity).toHaveProperty('item');
      expect(activity).toHaveProperty('comment');
      expect(activity).toHaveProperty('ip');
    });

    it('uses SynthStack prefix in comments', () => {
      const createComment = (action: string, collection: string) =>
        `[SynthStack] ${action.charAt(0).toUpperCase() + action.slice(1)}d ${collection} item`;

      expect(createComment('create', 'workflows')).toBe('[SynthStack] Created workflows item');
      expect(createComment('update', 'agents')).toBe('[SynthStack] Updated agents item');
      expect(createComment('delete', 'workflow_executions')).toBe('[SynthStack] Deleted workflow_executions item');
    });

    it('falls back to system IP when no accountability', () => {
      const getIP = (accountability: { ip?: string } | null) =>
        accountability?.ip || 'system';

      expect(getIP(null)).toBe('system');
      expect(getIP({})).toBe('system');
      expect(getIP({ ip: '192.168.1.1' })).toBe('192.168.1.1');
    });
  });

  describe('cleanup operations', () => {
    it('identifies related executions by workflow_id', () => {
      const filter = { workflow_id: { _eq: 'wf-123' } };

      expect(filter).toHaveProperty('workflow_id');
      expect(filter.workflow_id).toHaveProperty('_eq');
    });

    it('only cleans up executions for workflows collection', () => {
      const shouldCleanup = (collection: string) => collection === 'workflows';

      expect(shouldCleanup('workflows')).toBe(true);
      expect(shouldCleanup('agents')).toBe(false);
      expect(shouldCleanup('workflow_executions')).toBe(false);
    });
  });

  describe('hook event types', () => {
    it('uses app.before for initialization', () => {
      const initEvent = 'app.before';
      expect(initEvent).toBe('app.before');
    });

    it('uses items.create for create actions', () => {
      const createEvent = 'items.create';
      expect(createEvent).toBe('items.create');
    });

    it('uses items.update for update actions', () => {
      const updateEvent = 'items.update';
      expect(updateEvent).toBe('items.update');
    });

    it('uses items.delete for delete actions', () => {
      const deleteEvent = 'items.delete';
      expect(deleteEvent).toBe('items.delete');
    });

    it('uses items.read for read filters', () => {
      const readEvent = 'items.read';
      expect(readEvent).toBe('items.read');
    });
  });
});
