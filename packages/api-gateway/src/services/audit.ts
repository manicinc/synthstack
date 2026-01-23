/**
 * Audit Service
 *
 * Provides comprehensive audit logging and knowledge extraction for AI agents.
 * Features:
 * - Log all agent actions with full context provenance
 * - Query activity logs with filtering and pagination
 * - Extract and store knowledge from agent outputs
 * - Track communication patterns between agents
 * - Manage cross-project consent settings
 *
 * @module services/audit
 */

import type { FastifyInstance } from 'fastify';
import { embeddingsService } from './embeddings.js';

// COMMUNITY: Types defined locally (agents service removed)
type AgentSlug = string;
type ContextSource =
  | { type: string; id?: string; name?: string }
  | {
      id?: string;
      sourceType: string;
      content: string;
      relevanceScore?: number;
      metadata: { sourceId: string };
      retrievedAt?: string;
    };

// ============================================
// Types
// ============================================

/**
 * Action types for audit logging
 */
export type AuditActionType = 'chat' | 'suggestion' | 'action' | 'context_share' | 'knowledge_extract';

/**
 * Action categories for classification
 */
export type AuditActionCategory = 'query' | 'generation' | 'analysis' | 'review' | 'research' | 'other';

/**
 * Status of an audit log entry
 */
export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Parameters for logging an agent action
 */
export interface LogAgentActionParams {
  /** Agent ID */
  agentId: string;
  /** Agent slug */
  agentSlug: AgentSlug;
  /** User ID */
  userId: string;
  /** Optional project ID */
  projectId?: string;
  /** Optional session ID */
  sessionId?: string;
  /** Type of action */
  actionType: AuditActionType;
  /** Category of action */
  actionCategory?: AuditActionCategory;
  /** Human-readable description */
  actionDescription?: string;
  /** Context sources used */
  contextSources?: ContextSource[];
  /** Summary of input */
  inputSummary?: string;
  /** Summary of output */
  outputSummary?: string;
  /** Tokens used */
  tokensUsed?: number;
  /** Model used */
  modelUsed?: string;
  /** Status */
  status?: AuditStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** Reasoning trace */
  reasoningTrace?: string[];
  /** Derived insights */
  derivedInsights?: Array<{
    insightType: string;
    content: string;
    confidence: number;
  }>;
  /** Cross-project consent */
  crossProjectConsent?: boolean;
  /** Latency in milliseconds */
  latencyMs?: number;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  agentId: string;
  agentSlug: string;
  agentName?: string;
  userId: string;
  projectId?: string;
  sessionId?: string;
  actionType: AuditActionType;
  actionCategory?: AuditActionCategory;
  actionDescription?: string;
  contextSources: Array<{
    sourceType: string;
    sourceId: string;
    contentPreview: string;
    relevanceScore: number;
    retrievedAt: string;
  }>;
  inputSummary?: string;
  outputSummary?: string;
  tokensUsed?: number;
  modelUsed?: string;
  status: AuditStatus;
  errorMessage?: string;
  reasoningTrace: string[];
  derivedInsights: Array<{
    insightType: string;
    content: string;
    confidence: number;
    extractedAt: string;
  }>;
  crossProjectConsent: boolean;
  latencyMs?: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * Filters for querying activity logs
 */
export interface ActivityLogFilters {
  /** Filter by agent slug */
  agentSlug?: AgentSlug;
  /** Filter by project ID */
  projectId?: string;
  /** Filter by action type */
  actionType?: AuditActionType;
  /** Filter by status */
  status?: AuditStatus;
  /** Filter by date range start */
  startDate?: string;
  /** Filter by date range end */
  endDate?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Communication graph node
 */
export interface CommunicationGraphNode {
  id: string;
  type: 'agent' | 'user' | 'project';
  label: string;
  metadata?: Record<string, unknown>;
}

/**
 * Communication graph edge
 */
export interface CommunicationGraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  metadata?: Record<string, unknown>;
}

/**
 * Communication graph data
 */
export interface CommunicationGraph {
  nodes: CommunicationGraphNode[];
  edges: CommunicationGraphEdge[];
  stats: {
    totalInteractions: number;
    uniqueAgents: number;
    uniqueProjects: number;
    dateRange: { start: string; end: string };
  };
}

/**
 * Knowledge extraction parameters
 */
export interface KnowledgeExtractionParams {
  /** Source audit log ID */
  auditLogId: string;
  /** Agent that created this knowledge */
  sourceAgentId: string;
  /** User ID */
  userId: string;
  /** Project ID */
  projectId?: string;
  /** Knowledge title */
  title: string;
  /** Knowledge content */
  content: string;
  /** Content type */
  contentType: 'insight' | 'decision' | 'pattern' | 'solution' | 'reference' | 'best_practice';
  /** Tags for categorization */
  tags?: string[];
  /** Domain classification */
  domain?: string;
  /** Applicability score (0-1) */
  applicabilityScore?: number;
  /** Is cross-project shareable */
  isCrossProject?: boolean;
  /** Is anonymized */
  anonymized?: boolean;
}

/**
 * Knowledge stats
 */
export interface KnowledgeStats {
  totalEntries: number;
  byContentType: Record<string, number>;
  byDomain: Record<string, number>;
  byAgent: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyUsed: number;
  crossProjectShared: number;
}

// ============================================
// Audit Service
// ============================================

/**
 * Service for audit logging and knowledge extraction.
 */
export class AuditService {
  private server: FastifyInstance;

  constructor(server: FastifyInstance) {
    this.server = server;
  }

  /**
   * Log an agent action to the audit trail.
   *
   * @param params - The action parameters to log
   * @returns The created audit log entry ID
   */
  async logAgentAction(params: LogAgentActionParams): Promise<string> {
    const {
      agentId,
      agentSlug,
      userId,
      projectId,
      sessionId,
      actionType,
      actionCategory = 'other',
      actionDescription,
      contextSources = [],
      inputSummary,
      outputSummary,
      tokensUsed,
      modelUsed,
      status = 'completed',
      errorMessage,
      reasoningTrace = [],
      derivedInsights = [],
      crossProjectConsent = false,
      latencyMs,
    } = params;

    try {
      // Format context sources for storage
      const formattedContextSources = contextSources.map((source) => {
        if ('sourceType' in source) {
          return {
            source_type: source.sourceType,
            source_id: source.metadata?.sourceId || source.id || null,
            content_preview: (source.content || '').slice(0, 200),
            relevance_score: source.relevanceScore ?? null,
            retrieved_at: source.retrievedAt ?? null,
          };
        }

        return {
          source_type: source.type,
          source_id: source.id || null,
          content_preview: (source.name || '').slice(0, 200),
          relevance_score: null,
          retrieved_at: null,
        };
      });

      // Format derived insights with timestamp
      const formattedInsights = derivedInsights.map((insight) => ({
        insight_type: insight.insightType,
        content: insight.content,
        confidence: insight.confidence,
        extracted_at: new Date().toISOString(),
      }));

      const result = await this.server.pg.query(`
        INSERT INTO ai_agent_audit_log (
          agent_id, agent_slug, user_id, project_id, session_id,
          action_type, action_category, action_description,
          context_sources, input_summary, output_summary,
          tokens_used, model_used, status, error_message,
          reasoning_trace, derived_insights, cross_project_consent,
          latency_ms, completed_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9::jsonb, $10, $11,
          $12, $13, $14, $15,
          $16::jsonb, $17::jsonb, $18,
          $19, ${status === 'completed' ? 'NOW()' : 'NULL'}
        )
        RETURNING id
      `, [
        agentId, agentSlug, userId, projectId || null, sessionId || null,
        actionType, actionCategory, actionDescription || null,
        JSON.stringify(formattedContextSources), inputSummary || null, outputSummary || null,
        tokensUsed || null, modelUsed || null, status, errorMessage || null,
        JSON.stringify(reasoningTrace), JSON.stringify(formattedInsights), crossProjectConsent,
        latencyMs || null,
      ]);

      return result.rows[0].id;
    } catch (error) {
      this.server.log.error({ error, params }, 'Error logging agent action');
      throw error;
    }
  }

  /**
   * Get activity log for a user with filtering and pagination.
   *
   * @param userId - The user ID
   * @param filters - Optional filters
   * @returns Paginated activity log entries
   */
  async getActivityLog(
    userId: string,
    filters: ActivityLogFilters = {}
  ): Promise<{ entries: AuditLogEntry[]; total: number; page: number; limit: number }> {
    const {
      agentSlug,
      projectId,
      actionType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    try {
      // Build query with filters
      let query = `
        SELECT
          al.*,
          a.name as agent_name
        FROM ai_agent_audit_log al
        LEFT JOIN ai_agents a ON al.agent_id = a.id
        WHERE al.user_id = $1
      `;
      const params: (string | number)[] = [userId];
      let paramIndex = 2;

      if (agentSlug) {
        query += ` AND al.agent_slug = $${paramIndex++}`;
        params.push(agentSlug);
      }

      if (projectId) {
        query += ` AND al.project_id = $${paramIndex++}`;
        params.push(projectId);
      }

      if (actionType) {
        query += ` AND al.action_type = $${paramIndex++}`;
        params.push(actionType);
      }

      if (status) {
        query += ` AND al.status = $${paramIndex++}`;
        params.push(status);
      }

      if (startDate) {
        query += ` AND al.created_at >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND al.created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      // Get total count
      const countResult = await this.server.pg.query(
        `SELECT COUNT(*) FROM (${query}) as filtered`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated results
      query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const result = await this.server.pg.query(query, params);

      const entries: AuditLogEntry[] = result.rows.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        agentSlug: row.agent_slug,
        agentName: row.agent_name,
        userId: row.user_id,
        projectId: row.project_id,
        sessionId: row.session_id,
        actionType: row.action_type,
        actionCategory: row.action_category,
        actionDescription: row.action_description,
        contextSources: (row.context_sources || []).map((s: any) => ({
          sourceType: s.source_type,
          sourceId: s.source_id,
          contentPreview: s.content_preview,
          relevanceScore: s.relevance_score,
          retrievedAt: s.retrieved_at,
        })),
        inputSummary: row.input_summary,
        outputSummary: row.output_summary,
        tokensUsed: row.tokens_used,
        modelUsed: row.model_used,
        status: row.status,
        errorMessage: row.error_message,
        reasoningTrace: row.reasoning_trace || [],
        derivedInsights: (row.derived_insights || []).map((i: any) => ({
          insightType: i.insight_type,
          content: i.content,
          confidence: i.confidence,
          extractedAt: i.extracted_at,
        })),
        crossProjectConsent: row.cross_project_consent,
        latencyMs: row.latency_ms,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));

      return { entries, total, page, limit };
    } catch (error) {
      this.server.log.error({ error, userId, filters }, 'Error getting activity log');
      throw error;
    }
  }

  /**
   * Get a single audit entry with full context.
   *
   * @param auditId - The audit log entry ID
   * @param userId - The user ID (for authorization)
   * @returns The audit log entry or null if not found
   */
  async getAuditEntry(auditId: string, userId: string): Promise<AuditLogEntry | null> {
    try {
      const result = await this.server.pg.query(`
        SELECT
          al.*,
          a.name as agent_name
        FROM ai_agent_audit_log al
        LEFT JOIN ai_agents a ON al.agent_id = a.id
        WHERE al.id = $1 AND al.user_id = $2
      `, [auditId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        agentId: row.agent_id,
        agentSlug: row.agent_slug,
        agentName: row.agent_name,
        userId: row.user_id,
        projectId: row.project_id,
        sessionId: row.session_id,
        actionType: row.action_type,
        actionCategory: row.action_category,
        actionDescription: row.action_description,
        contextSources: (row.context_sources || []).map((s: any) => ({
          sourceType: s.source_type,
          sourceId: s.source_id,
          contentPreview: s.content_preview,
          relevanceScore: s.relevance_score,
          retrievedAt: s.retrieved_at,
        })),
        inputSummary: row.input_summary,
        outputSummary: row.output_summary,
        tokensUsed: row.tokens_used,
        modelUsed: row.model_used,
        status: row.status,
        errorMessage: row.error_message,
        reasoningTrace: row.reasoning_trace || [],
        derivedInsights: (row.derived_insights || []).map((i: any) => ({
          insightType: i.insight_type,
          content: i.content,
          confidence: i.confidence,
          extractedAt: i.extracted_at,
        })),
        crossProjectConsent: row.cross_project_consent,
        latencyMs: row.latency_ms,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      };
    } catch (error) {
      this.server.log.error({ error, auditId }, 'Error getting audit entry');
      throw error;
    }
  }

  /**
   * Get communication graph data for visualization.
   * Shows interactions between agents and projects.
   *
   * @param userId - The user ID
   * @param filters - Optional filters
   * @returns Graph data with nodes and edges
   */
  async getCommunicationGraph(
    userId: string,
    filters: { startDate?: string; endDate?: string; projectId?: string } = {}
  ): Promise<CommunicationGraph> {
    const { startDate, endDate, projectId } = filters;

    try {
      // Build filter conditions
      let dateFilter = '';
      const params: (string | number)[] = [userId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        dateFilter += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      if (projectId) {
        dateFilter += ` AND project_id = $${paramIndex++}`;
        params.push(projectId);
      }

      // Get agent interaction counts
      const agentQuery = `
        SELECT
          agent_slug,
          COUNT(*) as interaction_count,
          COUNT(DISTINCT project_id) as project_count,
          SUM(tokens_used) as total_tokens
        FROM ai_agent_audit_log
        WHERE user_id = $1 ${dateFilter}
        GROUP BY agent_slug
      `;
      const agentResult = await this.server.pg.query(agentQuery, params);

      // Get cross-agent communication (context sharing)
      const crossAgentQuery = `
        SELECT
          al.agent_slug as from_agent,
          sc.from_agent_id,
          a.slug as to_agent,
          COUNT(*) as share_count
        FROM ai_agent_audit_log al
        JOIN ai_shared_context sc ON al.session_id = sc.user_id::text
        JOIN ai_agents a ON sc.from_agent_id = a.id
        WHERE al.user_id = $1 ${dateFilter}
        GROUP BY al.agent_slug, sc.from_agent_id, a.slug
      `;
      const crossAgentResult = await this.server.pg.query(crossAgentQuery, params);

      // Get project interaction counts
      const projectQuery = `
        SELECT
          project_id,
          p.name as project_name,
          COUNT(*) as interaction_count
        FROM ai_agent_audit_log al
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE al.user_id = $1 AND al.project_id IS NOT NULL ${dateFilter}
        GROUP BY project_id, p.name
      `;
      const projectResult = await this.server.pg.query(projectQuery, params);

      // Build nodes
      const nodes: CommunicationGraphNode[] = [];

      for (const row of agentResult.rows) {
        nodes.push({
          id: `agent-${row.agent_slug}`,
          type: 'agent',
          label: row.agent_slug,
          metadata: {
            interactionCount: parseInt(row.interaction_count),
            projectCount: parseInt(row.project_count),
            totalTokens: parseInt(row.total_tokens || 0),
          },
        });
      }

      for (const row of projectResult.rows) {
        nodes.push({
          id: `project-${row.project_id}`,
          type: 'project',
          label: row.project_name || row.project_id,
          metadata: {
            interactionCount: parseInt(row.interaction_count),
          },
        });
      }

      // Build edges
      const edges: CommunicationGraphEdge[] = [];

      // Agent to agent edges (from context sharing)
      for (const row of crossAgentResult.rows) {
        edges.push({
          source: `agent-${row.from_agent}`,
          target: `agent-${row.to_agent}`,
          weight: parseInt(row.share_count),
          type: 'context_share',
        });
      }

      // Agent to project edges
      const agentProjectQuery = `
        SELECT
          agent_slug,
          project_id,
          COUNT(*) as interaction_count
        FROM ai_agent_audit_log
        WHERE user_id = $1 AND project_id IS NOT NULL ${dateFilter}
        GROUP BY agent_slug, project_id
      `;
      const agentProjectResult = await this.server.pg.query(agentProjectQuery, params);

      for (const row of agentProjectResult.rows) {
        edges.push({
          source: `agent-${row.agent_slug}`,
          target: `project-${row.project_id}`,
          weight: parseInt(row.interaction_count),
          type: 'interaction',
        });
      }

      // Get date range
      const dateRangeQuery = `
        SELECT MIN(created_at) as start_date, MAX(created_at) as end_date
        FROM ai_agent_audit_log
        WHERE user_id = $1 ${dateFilter}
      `;
      const dateRangeResult = await this.server.pg.query(dateRangeQuery, params);
      const dateRange = dateRangeResult.rows[0];

      return {
        nodes,
        edges,
        stats: {
          totalInteractions: agentResult.rows.reduce(
            (sum, row) => sum + parseInt(row.interaction_count),
            0
          ),
          uniqueAgents: agentResult.rows.length,
          uniqueProjects: projectResult.rows.length,
          dateRange: {
            start: dateRange?.start_date || new Date().toISOString(),
            end: dateRange?.end_date || new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.server.log.error({ error, userId, filters }, 'Error getting communication graph');
      throw error;
    }
  }

  /**
   * Extract and store knowledge from agent outputs.
   *
   * @param params - Knowledge extraction parameters
   * @returns The created knowledge entry ID
   */
  async extractAndStoreKnowledge(params: KnowledgeExtractionParams): Promise<string> {
    const {
      auditLogId,
      sourceAgentId,
      userId,
      projectId,
      title,
      content,
      contentType,
      tags = [],
      domain,
      applicabilityScore = 0.5,
      isCrossProject = false,
      anonymized = false,
    } = params;

    try {
      // Generate embedding for the content
      let embedding: number[] | null = null;
      try {
        const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Embedding generation timed out')), timeoutMs);
            promise.then(
              (value) => {
                clearTimeout(timer);
                resolve(value);
              },
              (error) => {
                clearTimeout(timer);
                reject(error);
              }
            );
          });
        };

        embedding = await withTimeout(embeddingsService.generateEmbedding(content), 2500);
      } catch (embedError) {
        this.server.log.warn({ error: embedError }, 'Failed to generate embedding for knowledge entry');
      }

      const embeddingStr = embedding ? '[' + embedding.join(',') + ']' : null;

      const result = await this.server.pg.query(`
        INSERT INTO ai_agent_knowledge_entries (
          source_agent_id, source_user_id, source_project_id, source_audit_log_id,
          title, content, content_type, embedding,
          tags, domain, applicability_score,
          is_cross_project, anonymized
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8::vector,
          $9, $10, $11,
          $12, $13
        )
        RETURNING id
      `, [
        sourceAgentId, userId, projectId || null, auditLogId,
        title, content, contentType, embeddingStr,
        tags, domain || null, applicabilityScore,
        isCrossProject, anonymized,
      ]);

      return result.rows[0].id;
    } catch (error) {
      this.server.log.error({ error, params }, 'Error extracting and storing knowledge');
      throw error;
    }
  }

  /**
   * Update cross-project consent for a user.
   *
   * @param userId - The user ID
   * @param enabled - Whether consent is enabled
   * @param projectId - Optional specific project (null for global)
   */
  async updateCrossProjectConsent(
    userId: string,
    enabled: boolean,
    projectId?: string
  ): Promise<void> {
    try {
      if (projectId) {
        // Project-specific consent
        await this.server.pg.query(`
          INSERT INTO user_cross_project_consent (user_id, project_id, project_consent, consent_given_at)
          VALUES ($1, $2, $3, ${enabled ? 'NOW()' : 'NULL'})
          ON CONFLICT (user_id, project_id)
          DO UPDATE SET
            project_consent = $3,
            consent_given_at = ${enabled ? 'NOW()' : 'user_cross_project_consent.consent_given_at'},
            consent_revoked_at = ${enabled ? 'NULL' : 'NOW()'},
            updated_at = NOW()
        `, [userId, projectId, enabled]);
      } else {
        // Global consent
        await this.server.pg.query(`
          INSERT INTO user_cross_project_consent (user_id, project_id, global_consent, consent_given_at)
          VALUES ($1, NULL, $2, ${enabled ? 'NOW()' : 'NULL'})
          ON CONFLICT (user_id, project_id)
          DO UPDATE SET
            global_consent = $2,
            consent_given_at = ${enabled ? 'NOW()' : 'user_cross_project_consent.consent_given_at'},
            consent_revoked_at = ${enabled ? 'NULL' : 'NOW()'},
            updated_at = NOW()
        `, [userId, enabled]);
      }
    } catch (error) {
      this.server.log.error({ error, userId, projectId, enabled }, 'Error updating cross-project consent');
      throw error;
    }
  }

  /**
   * Get knowledge accumulation statistics.
   *
   * @param userId - The user ID
   * @returns Knowledge statistics
   */
  async getKnowledgeStats(userId: string): Promise<KnowledgeStats> {
    try {
      // Total entries
      const totalResult = await this.server.pg.query(`
        SELECT COUNT(*) FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1
      `, [userId]);
      const totalEntries = parseInt(totalResult.rows[0].count, 10);

      // By content type
      const typeResult = await this.server.pg.query(`
        SELECT content_type, COUNT(*) as count
        FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1
        GROUP BY content_type
      `, [userId]);
      const byContentType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        byContentType[row.content_type] = parseInt(row.count);
      }

      // By domain
      const domainResult = await this.server.pg.query(`
        SELECT domain, COUNT(*) as count
        FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1 AND domain IS NOT NULL
        GROUP BY domain
      `, [userId]);
      const byDomain: Record<string, number> = {};
      for (const row of domainResult.rows) {
        byDomain[row.domain] = parseInt(row.count);
      }

      // By agent
      const agentResult = await this.server.pg.query(`
        SELECT a.slug, COUNT(*) as count
        FROM ai_agent_knowledge_entries ke
        LEFT JOIN ai_agents a ON ke.source_agent_id = a.id
        WHERE ke.source_user_id = $1
        GROUP BY a.slug
      `, [userId]);
      const byAgent: Record<string, number> = {};
      for (const row of agentResult.rows) {
        byAgent[row.slug || 'unknown'] = parseInt(row.count);
      }

      // Top tags
      const tagsResult = await this.server.pg.query(`
        SELECT unnest(tags) as tag, COUNT(*) as count
        FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `, [userId]);
      const topTags = tagsResult.rows.map((row) => ({
        tag: row.tag,
        count: parseInt(row.count),
      }));

      // Recently used (last 7 days)
      const recentResult = await this.server.pg.query(`
        SELECT COUNT(*) FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1 AND last_used_at > NOW() - INTERVAL '7 days'
      `, [userId]);
      const recentlyUsed = parseInt(recentResult.rows[0].count, 10);

      // Cross-project shared
      const crossProjectResult = await this.server.pg.query(`
        SELECT COUNT(*) FROM ai_agent_knowledge_entries
        WHERE source_user_id = $1 AND is_cross_project = true
      `, [userId]);
      const crossProjectShared = parseInt(crossProjectResult.rows[0].count, 10);

      return {
        totalEntries,
        byContentType,
        byDomain,
        byAgent,
        topTags,
        recentlyUsed,
        crossProjectShared,
      };
    } catch (error) {
      this.server.log.error({ error, userId }, 'Error getting knowledge stats');
      throw error;
    }
  }

  /**
   * Check if user has cross-project consent.
   *
   * @param userId - The user ID
   * @param projectId - Optional project ID for project-specific check
   * @returns Whether consent is given
   */
  async hasCrossProjectConsent(userId: string, projectId?: string): Promise<boolean> {
    try {
      if (projectId) {
        // Check project-specific consent first, then global
        const result = await this.server.pg.query(`
          SELECT
            COALESCE(
              (SELECT project_consent FROM user_cross_project_consent
               WHERE user_id = $1 AND project_id = $2),
              (SELECT global_consent FROM user_cross_project_consent
               WHERE user_id = $1 AND project_id IS NULL),
              false
            ) as has_consent
        `, [userId, projectId]);
        return result.rows[0]?.has_consent || false;
      } else {
        // Check global consent
        const result = await this.server.pg.query(`
          SELECT global_consent FROM user_cross_project_consent
          WHERE user_id = $1 AND project_id IS NULL
        `, [userId]);
        return result.rows[0]?.global_consent || false;
      }
    } catch (error) {
      this.server.log.error({ error, userId, projectId }, 'Error checking cross-project consent');
      return false;
    }
  }
}

/**
 * Factory function to create an AuditService instance
 */
export function createAuditService(server: FastifyInstance): AuditService {
  return new AuditService(server);
}
