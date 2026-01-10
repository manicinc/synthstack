/**
 * @synthstack/agentic-ai
 *
 * Production-grade LangGraph-based agentic AI system
 *
 * @example
 * ```typescript
 * import { createAgenticAIService } from '@synthstack/agentic-ai';
 *
 * const service = await createAgenticAIService({
 *   db: postgresAdapter,
 *   getUserById: async (userId) => { ... },
 *   checkPermission: async (userId, action) => { ... },
 *   chargeCredits: async (userId, amount, reason) => { ... },
 *   ragSearch: async (query, options) => { ... },
 *   executeWorkflow: async (flowId, input) => { ... },
 *   logAuditEvent: async (event) => { ... },
 *   llmClient: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
 * });
 * ```
 */

// Export all types
export * from './types/index.js';

// Export core services (to be implemented)
export { createAgenticAIService } from './core/factory.js';
export { LangGraphService } from './core/langgraph-service.js';

// Export utilities (to be implemented)
export { createDefaultLogger } from './utils/logger.js';
export { createPostgresAdapter } from './utils/postgres-adapter.js';

// Version
export const VERSION = '0.1.0';
