/**
 * Fastify Adapter for Agentic AI
 *
 * Example adapter showing how to integrate with Fastify-based applications
 * like the SynthStack api-gateway.
 *
 * @example
 * ```typescript
 * import { createFastifyAdapter } from '@synthstack/agentic-ai/adapters/fastify-adapter';
 * import { createAgenticAIService } from '@synthstack/agentic-ai';
 *
 * // In your Fastify application
 * const dependencies = createFastifyAdapter(fastify, {
 *   agentService,
 *   contextService,
 *   suggestionsService,
 *   nodeRedService,
 * });
 *
 * const agenticAI = await createAgenticAIService(dependencies);
 * ```
 */

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { OpenAI } from 'openai';
import type {
  AgenticAIDependencies,
  DatabaseAdapter,
  User,
  RAGOptions,
  RAGResult,
  WorkflowResult,
  AuditEvent,
  Logger,
} from '../types/index.js';
import { createPostgresAdapter } from '../utils/postgres-adapter.js';
import { createDefaultLogger } from '../utils/logger.js';

/**
 * Extended FastifyInstance with @fastify/postgres plugin
 */
interface FastifyWithPostgres extends FastifyInstance {
  pg: {
    pool: Pool;
  };
}

/**
 * External services required by the adapter
 */
export interface FastifyAdapterServices {
  /**
   * Agent service for user management and permissions
   * @example agentService from api-gateway
   */
  agentService: {
    getUserById(userId: string): Promise<User | null>;
    checkPermission(userId: string, action: string): Promise<boolean>;
  };

  /**
   * Context service for RAG search
   * @example AgentContextService from api-gateway
   */
  contextService: {
    searchContext(query: string, options: RAGOptions): Promise<RAGResult[]>;
  };

  /**
   * Credits service for billing
   * @example creditsService from api-gateway
   */
  creditsService?: {
    chargeCredits(userId: string, amount: number, reason: string): Promise<void>;
    getBalance(userId: string): Promise<number>;
  };

  /**
   * Workflow service for Node-RED integration
   * @example NodeRedService from api-gateway
   */
  workflowService?: {
    executeWorkflow(flowId: string, input: any): Promise<WorkflowResult>;
    validateWorkflow(flowId: string): Promise<boolean>;
  };

  /**
   * Audit service for event logging
   * @example AuditService from api-gateway
   */
  auditService?: {
    logEvent(event: AuditEvent): Promise<void>;
  };

  /**
   * LLM client (OpenAI or Anthropic)
   */
  llmClient: OpenAI;

  /**
   * Optional custom logger
   */
  logger?: Logger;
}

/**
 * Create Fastify adapter for Agentic AI dependencies
 */
export function createFastifyAdapter(
  fastify: FastifyWithPostgres,
  services: FastifyAdapterServices
): AgenticAIDependencies {
  // Create database adapter from Fastify's pg pool
  const db: DatabaseAdapter = createPostgresAdapter(fastify.pg.pool);

  // Logger (use Fastify's logger or custom)
  const logger: Logger = services.logger || {
    info: (msg, ...args) => fastify.log.info({ ...args }, msg),
    warn: (msg, ...args) => fastify.log.warn({ ...args }, msg),
    error: (msg, ...args) => fastify.log.error({ ...args }, msg),
    debug: (msg, ...args) => fastify.log.debug({ ...args }, msg),
  };

  return {
    // Database
    db,

    // User & Auth
    async getUserById(userId: string) {
      return services.agentService.getUserById(userId);
    },

    async checkPermission(userId: string, action: string) {
      return services.agentService.checkPermission(userId, action);
    },

    // Credits & Billing
    async chargeCredits(userId: string, amount: number, reason: string) {
      if (!services.creditsService) {
        logger.warn('Credits service not available, skipping charge', {
          userId,
          amount,
          reason,
        });
        return;
      }
      await services.creditsService.chargeCredits(userId, amount, reason);
    },

    async getCreditsBalance(userId: string) {
      if (!services.creditsService) {
        logger.warn('Credits service not available, returning unlimited balance');
        return Number.MAX_SAFE_INTEGER;
      }
      return services.creditsService.getBalance(userId);
    },

    // RAG
    async ragSearch(query: string, options: RAGOptions) {
      return services.contextService.searchContext(query, options);
    },

    // Workflow
    async executeWorkflow(flowId: string, input: any) {
      if (!services.workflowService) {
        throw new Error('Workflow service not available');
      }
      return services.workflowService.executeWorkflow(flowId, input);
    },

    async validateWorkflow(flowId: string) {
      if (!services.workflowService) {
        return false;
      }
      return services.workflowService.validateWorkflow(flowId);
    },

    // Audit
    async logAuditEvent(event: AuditEvent) {
      if (!services.auditService) {
        logger.debug('Audit service not available, logging to console', event);
        return;
      }
      await services.auditService.logEvent(event);
    },

    // LLM
    llmClient: services.llmClient,

    // Logger
    logger,
  };
}

/**
 * Utility: Create adapter from environment and services
 *
 * @example
 * ```typescript
 * const dependencies = await createFastifyAdapterFromEnv(fastify, {
 *   agentService,
 *   contextService,
 *   creditsService,
 *   workflowService,
 *   auditService,
 * });
 * ```
 */
export async function createFastifyAdapterFromEnv(
  fastify: FastifyWithPostgres,
  services: Omit<FastifyAdapterServices, 'llmClient' | 'logger'>
): Promise<AgenticAIDependencies> {
  // Import OpenAI
  const { default: OpenAI } = await import('openai');

  // Create LLM client from environment
  const llmClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  return createFastifyAdapter(fastify, {
    ...services,
    llmClient,
    logger: createDefaultLogger(),
  });
}
