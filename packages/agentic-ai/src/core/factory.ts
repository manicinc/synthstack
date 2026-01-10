import type {
  AgenticAIDependencies,
  AgenticAIService,
} from '../types/index.js';
import { LangGraphService } from './langgraph-service.js';
import { createDefaultLogger } from '../utils/logger.js';

/**
 * Create an instance of the Agentic AI service with dependency injection
 *
 * @param dependencies - All required dependencies for the service
 * @returns Configured AgenticAIService instance
 *
 * @example
 * ```typescript
 * const service = await createAgenticAIService({
 *   db: createPostgresAdapter(pool),
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
export async function createAgenticAIService(
  dependencies: AgenticAIDependencies
): Promise<AgenticAIService> {
  // Add default logger if not provided
  const deps = {
    ...dependencies,
    logger: dependencies.logger || createDefaultLogger(),
  };

  // Create service instance
  const service = new LangGraphService(deps);

  // Initialize service (load models, setup connections, etc.)
  await service.initialize();

  return service;
}
