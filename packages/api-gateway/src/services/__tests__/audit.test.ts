/**
 * @file services/__tests__/audit.test.ts
 * @description Tests for audit service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditService,
  createAuditService,
} from '../audit.js';
import { createMockFastify } from '../../test/helpers.js';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockFastify: ReturnType<typeof createMockFastify>;

  beforeEach(() => {
    mockFastify = createMockFastify();
    auditService = new AuditService(mockFastify as any);
  });

  describe('createAuditService', () => {
    it('should create an AuditService instance', () => {
      const service = createAuditService(mockFastify as any);
      expect(service).toBeInstanceOf(AuditService);
    });
  });

  describe('logAgentAction', () => {
    it('should insert audit log entry and return id', async () => {
      const mockId = 'audit-123';
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ id: mockId }],
      });

      const result = await auditService.logAgentAction({
        agentId: 'agent-1',
        agentSlug: 'general',
        userId: 'user-1',
        actionType: 'chat',
      });

      expect(result).toBe(mockId);
      expect(mockFastify.pg.query).toHaveBeenCalledTimes(1);

      const [sql, params] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO ai_agent_audit_log');
      expect(params).toContain('agent-1');
      expect(params).toContain('general'); // agentSlug passed to the function
      expect(params).toContain('user-1');
      expect(params).toContain('chat');
    });

    it('should include optional parameters', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ id: 'audit-456' }],
      });

      await auditService.logAgentAction({
        agentId: 'agent-1',
        agentSlug: 'general',
        userId: 'user-1',
        actionType: 'suggestion',
        projectId: 'project-1',
        sessionId: 'session-1',
        actionCategory: 'generation',
        actionDescription: 'Generated code suggestion',
        inputSummary: 'User asked for help with...',
        outputSummary: 'AI suggested...',
        tokensUsed: 500,
        modelUsed: 'gpt-4',
        status: 'completed',
        latencyMs: 1200,
        crossProjectConsent: true,
        contextSources: [
          {
            id: 'ctx-source-1',
            sourceType: 'rag',
            content: 'Project context...',
            relevanceScore: 0.9,
            metadata: { sourceId: 'source-1' },
            retrievedAt: '2024-01-01T00:00:00Z',
          },
        ],
        derivedInsights: [
          {
            insightType: 'pattern',
            content: 'Found a common pattern',
            confidence: 0.85,
          },
        ],
        reasoningTrace: ['Step 1', 'Step 2'],
      });

      const [, params] = mockFastify.pg.query.mock.calls[0];
      expect(params).toContain('project-1');
      expect(params).toContain('session-1');
      expect(params).toContain('generation');
      expect(params).toContain('Generated code suggestion');
      expect(params).toContain(500);
      expect(params).toContain('gpt-4');
      expect(params).toContain(1200);
      expect(params).toContain(true); // crossProjectConsent
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('Database error');
      mockFastify.pg.query.mockRejectedValueOnce(error);

      await expect(auditService.logAgentAction({
        agentId: 'agent-1',
        agentSlug: 'general',
        userId: 'user-1',
        actionType: 'chat',
      })).rejects.toThrow('Database error');

      expect(mockFastify.log.error).toHaveBeenCalled();
    });
  });

  describe('getActivityLog', () => {
    it('should return paginated activity log', async () => {
      // Mock count query
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ count: '42' }],
      });

      // Mock data query
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1',
            agent_id: 'agent-1',
            agent_slug: 'copilot',
            agent_name: 'AI Copilot',
            user_id: 'user-1',
            project_id: 'project-1',
            session_id: 'session-1',
            action_type: 'chat',
            action_category: 'query',
            action_description: 'Chat message',
            context_sources: [],
            input_summary: 'User input',
            output_summary: 'AI output',
            tokens_used: 100,
            model_used: 'gpt-4',
            status: 'completed',
            error_message: null,
            reasoning_trace: ['Step 1'],
            derived_insights: [],
            cross_project_consent: false,
            latency_ms: 500,
            created_at: '2024-01-01T00:00:00Z',
            completed_at: '2024-01-01T00:00:01Z',
          },
        ],
      });

      const result = await auditService.getActivityLog('user-1');

      expect(result.total).toBe(42);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].agentSlug).toBe('copilot');
      expect(result.entries[0].agentName).toBe('AI Copilot');
    });

    it('should apply filters', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      await auditService.getActivityLog('user-1', {
        agentSlug: 'general',
        projectId: 'project-1',
        actionType: 'chat',
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 2,
        limit: 10,
      });

      const [sql] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('agent_slug');
      expect(sql).toContain('project_id');
      expect(sql).toContain('action_type');
      expect(sql).toContain('status');
      expect(sql).toContain('created_at >=');
      expect(sql).toContain('created_at <=');
    });

    it('should handle empty results', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      const result = await auditService.getActivityLog('user-1');

      expect(result.total).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe('getAuditEntry', () => {
    it('should return audit entry when found', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-1',
            agent_id: 'agent-1',
            agent_slug: 'copilot',
            agent_name: 'AI Copilot',
            user_id: 'user-1',
            project_id: null,
            session_id: null,
            action_type: 'chat',
            action_category: 'query',
            action_description: null,
            context_sources: [],
            input_summary: null,
            output_summary: null,
            tokens_used: 100,
            model_used: 'gpt-4',
            status: 'completed',
            error_message: null,
            reasoning_trace: [],
            derived_insights: [],
            cross_project_consent: false,
            latency_ms: 500,
            created_at: '2024-01-01T00:00:00Z',
            completed_at: '2024-01-01T00:00:01Z',
          },
        ],
      });

      const result = await auditService.getAuditEntry('audit-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('audit-1');
      expect(result?.agentSlug).toBe('copilot');
    });

    it('should return null when not found', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      const result = await auditService.getAuditEntry('nonexistent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('extractAndStoreKnowledge', () => {
    it('should store knowledge entry and return id', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ id: 'knowledge-1' }],
      });

      const result = await auditService.extractAndStoreKnowledge({
        auditLogId: 'audit-1',
        sourceAgentId: 'agent-1',
        userId: 'user-1',
        title: 'Important insight',
        content: 'This is an important pattern...',
        contentType: 'pattern',
        tags: ['typescript', 'patterns'],
        domain: 'software-development',
        applicabilityScore: 0.8,
        isCrossProject: true,
        anonymized: false,
      });

      expect(result).toBe('knowledge-1');
      expect(mockFastify.pg.query).toHaveBeenCalled();
    });

    it('should handle embedding generation failure gracefully', async () => {
      // The service catches embedding errors and continues
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ id: 'knowledge-2' }],
      });

      const result = await auditService.extractAndStoreKnowledge({
        auditLogId: 'audit-1',
        sourceAgentId: 'agent-1',
        userId: 'user-1',
        title: 'Test',
        content: 'Test content',
        contentType: 'insight',
      });

      expect(result).toBe('knowledge-2');
    });
  });

  describe('updateCrossProjectConsent', () => {
    it('should update global consent', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      await auditService.updateCrossProjectConsent('user-1', true);

      const [sql, params] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('user_cross_project_consent');
      expect(sql).toContain('global_consent');
      expect(params).toContain('user-1');
      expect(params).toContain(true);
    });

    it('should update project-specific consent', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      await auditService.updateCrossProjectConsent('user-1', true, 'project-1');

      const [sql, params] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('project_consent');
      expect(params).toContain('project-1');
    });

    it('should handle revocation', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      await auditService.updateCrossProjectConsent('user-1', false);

      const [sql] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('consent_revoked_at');
    });
  });

  describe('hasCrossProjectConsent', () => {
    it('should return true when global consent is given', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ global_consent: true }],
      });

      const result = await auditService.hasCrossProjectConsent('user-1');

      expect(result).toBe(true);
    });

    it('should return false when no consent record exists', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [] });

      const result = await auditService.hasCrossProjectConsent('user-1');

      expect(result).toBe(false);
    });

    it('should check project-specific consent when projectId provided', async () => {
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ has_consent: true }],
      });

      const result = await auditService.hasCrossProjectConsent('user-1', 'project-1');

      expect(result).toBe(true);

      const [sql] = mockFastify.pg.query.mock.calls[0];
      expect(sql).toContain('project_consent');
    });

    it('should return false and log error on database failure', async () => {
      mockFastify.pg.query.mockRejectedValueOnce(new Error('DB error'));

      const result = await auditService.hasCrossProjectConsent('user-1');

      expect(result).toBe(false);
      expect(mockFastify.log.error).toHaveBeenCalled();
    });
  });

  describe('getKnowledgeStats', () => {
    it('should return knowledge statistics', async () => {
      // Total entries
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      // By content type
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [
          { content_type: 'insight', count: '50' },
          { content_type: 'pattern', count: '30' },
        ],
      });
      // By domain
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ domain: 'software', count: '80' }],
      });
      // By agent
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ slug: 'copilot', count: '60' }],
      });
      // Top tags
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [
          { tag: 'typescript', count: '40' },
          { tag: 'patterns', count: '25' },
        ],
      });
      // Recently used
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [{ count: '15' }] });
      // Cross-project shared
      mockFastify.pg.query.mockResolvedValueOnce({ rows: [{ count: '20' }] });

      const result = await auditService.getKnowledgeStats('user-1');

      expect(result.totalEntries).toBe(100);
      expect(result.byContentType.insight).toBe(50);
      expect(result.byContentType.pattern).toBe(30);
      expect(result.byDomain.software).toBe(80);
      expect(result.byAgent.copilot).toBe(60);
      expect(result.topTags).toHaveLength(2);
      expect(result.topTags[0].tag).toBe('typescript');
      expect(result.recentlyUsed).toBe(15);
      expect(result.crossProjectShared).toBe(20);
    });
  });

  describe('getCommunicationGraph', () => {
    it('should return graph with nodes and edges', async () => {
      // Agent interactions
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [
          { agent_slug: 'copilot', interaction_count: '50', project_count: '3', total_tokens: '10000' },
          { agent_slug: 'researcher', interaction_count: '20', project_count: '2', total_tokens: '5000' },
        ],
      });
      // Cross-agent
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ from_agent: 'copilot', to_agent: 'researcher', share_count: '5' }],
      });
      // Projects
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ project_id: 'p1', project_name: 'Project 1', interaction_count: '30' }],
      });
      // Agent-project
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ agent_slug: 'copilot', project_id: 'p1', interaction_count: '25' }],
      });
      // Date range
      mockFastify.pg.query.mockResolvedValueOnce({
        rows: [{ start_date: '2024-01-01', end_date: '2024-12-31' }],
      });

      const result = await auditService.getCommunicationGraph('user-1');

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
      expect(result.stats.totalInteractions).toBe(70);
      expect(result.stats.uniqueAgents).toBe(2);
      expect(result.stats.uniqueProjects).toBe(1);
    });
  });
});
