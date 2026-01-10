/**
 * LLM Router Service
 * 
 * Unified interface for LLM calls with intelligent routing,
 * fallbacks, and cost optimization.
 * 
 * Features:
 * - Multi-provider support (OpenAI, Anthropic, OpenRouter)
 * - Tier-based routing (cheap, standard, premium)
 * - Automatic fallbacks on failure
 * - Task-based auto-routing
 * - Cost tracking and estimation
 * - Streaming support
 * 
 * @example
 * ```typescript
 * import { llmRouter } from './services/llm-router';
 * 
 * // Simple chat with auto-routing
 * const response = await llmRouter.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   tier: 'standard',
 * });
 * 
 * // Streaming with task hint
 * for await (const event of llmRouter.streamChat({
 *   messages: [...],
 *   taskType: 'coding',
 * })) {
 *   console.log(event.content);
 * }
 * ```
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { llmCostService, type LLMUsageLogInput } from '../llm-cost.js';
import type {
  LLMProvider,
  ModelTier,
  ModelConfig,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamEvent,
  LLMAdapter,
  LLMRouterConfig,
  TaskHint,
  LLMError,
  LLMErrorCode,
} from './types.js';
import { modelRegistry } from './models.js';

// Re-export types
export * from './types.js';
export { modelRegistry, ModelRegistry } from './models.js';

// ============================================
// Router Configuration
// ============================================

const DEFAULT_CONFIG: LLMRouterConfig = {
  defaultTier: 'standard',
  autoRoute: true,
  enableFallbacks: true,
  maxFallbackAttempts: 3,
  defaultTimeout: 60000,
  enableLogging: true,
  enableCostTracking: true,
};

// ============================================
// LLM Router Class
// ============================================

export class LLMRouter {
  private adapters: Map<LLMProvider, LLMAdapter> = new Map();
  private config: LLMRouterConfig;
  private initialized = false;

  constructor(routerConfig: Partial<LLMRouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...routerConfig };
  }

  /**
   * Register a provider adapter
   */
  registerAdapter(adapter: LLMAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    if (this.config.enableLogging) {
      logger.info(`LLM Router: Registered ${adapter.provider} adapter`);
    }
  }

  /**
   * Initialize the router with all available adapters
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Dynamically import and register adapters
    try {
      const { OpenAIAdapter } = await import('./adapters/openai.js');
      const openaiAdapter = new OpenAIAdapter();
      if (openaiAdapter.isAvailable()) {
        this.registerAdapter(openaiAdapter);
      }
    } catch (e) {
      logger.debug('OpenAI adapter not available', e);
    }

    try {
      const { AnthropicAdapter } = await import('./adapters/anthropic.js');
      const anthropicAdapter = new AnthropicAdapter();
      if (anthropicAdapter.isAvailable()) {
        this.registerAdapter(anthropicAdapter);
      }
    } catch (e) {
      logger.debug('Anthropic adapter not available', e);
    }

    try {
      const { OpenRouterAdapter } = await import('./adapters/openrouter.js');
      const openRouterAdapter = new OpenRouterAdapter();
      if (openRouterAdapter.isAvailable()) {
        this.registerAdapter(openRouterAdapter);
      }
    } catch (e) {
      logger.debug('OpenRouter adapter not available', e);
    }

    this.initialized = true;

    const availableProviders = this.getAvailableProviders();
    if (availableProviders.length === 0) {
      logger.warn('LLM Router: No providers available. Add OPENAI_API_KEY to .env');
    } else {
      logger.info(`LLM Router initialized with providers: ${availableProviders.join(', ')}`);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if router has any providers available
   */
  isAvailable(): boolean {
    return this.adapters.size > 0;
  }

  /**
   * Get adapter for a provider
   */
  private getAdapter(provider: LLMProvider): LLMAdapter | undefined {
    return this.adapters.get(provider);
  }

  /**
   * Select the best model for a request
   */
  private selectModel(options: LLMRequestOptions, hint?: TaskHint): ModelConfig {
    const availableProviders = this.getAvailableProviders();

    // If explicit model specified, use it
    if (options.model) {
      const model = modelRegistry.getModel(options.model);
      if (model && availableProviders.includes(model.provider)) {
        return model;
      }
      // If specified model not available, log warning and continue with routing
      logger.warn(`Requested model ${options.model} not available, using routing`);
    }

    // Determine tier
    let tier: ModelTier = options.tier || hint?.tier || this.config.defaultTier;

    // Auto-route based on task type if enabled
    if (this.config.autoRoute && hint?.taskType && !hint.tier) {
      tier = this.inferTierFromTask(hint.taskType, hint.estimatedComplexity);
    }

    // Check for capability requirements
    if (hint?.requiresVision || hint?.requiresTools || hint?.requiresJsonMode) {
      const model = modelRegistry.findCheapestModel(
        {
          requiresVision: hint.requiresVision,
          requiresTools: hint.requiresTools,
          requiresJsonMode: hint.requiresJsonMode,
        },
        availableProviders
      );
      if (model) return model;
    }

    // Prefer specific provider if requested
    if (hint?.preferProvider && availableProviders.includes(hint.preferProvider)) {
      const providerModels = modelRegistry.getModelsByProvider(hint.preferProvider)
        .filter((m) => m.tier === tier);
      if (providerModels.length > 0) {
        return providerModels[0];
      }
    }

    // Get best model for tier
    const model = modelRegistry.getBestModelForTier(tier, availableProviders);
    if (model) return model;

    // Fallback to any available model
    const anyModel = modelRegistry.getBestModelForTier('cheap', availableProviders)
      || modelRegistry.getBestModelForTier('standard', availableProviders)
      || modelRegistry.getBestModelForTier('premium', availableProviders);

    if (!anyModel) {
      throw new Error('No models available. Configure at least OPENAI_API_KEY.');
    }

    return anyModel;
  }

  /**
   * Infer model tier from task type
   */
  private inferTierFromTask(
    taskType: string,
    complexity?: 'low' | 'medium' | 'high'
  ): ModelTier {
    // High complexity always uses premium
    if (complexity === 'high') return 'premium';

    // Task-based defaults
    switch (taskType) {
      case 'classification':
      case 'extraction':
      case 'summarization':
        return complexity === 'medium' ? 'standard' : 'cheap';

      case 'generation':
      case 'conversation':
        return 'standard';

      case 'reasoning':
      case 'coding':
        return complexity === 'low' ? 'standard' : 'premium';

      default:
        return this.config.defaultTier;
    }
  }

  /**
   * Execute chat completion with fallbacks
   */
  async chat(options: LLMRequestOptions, hint?: TaskHint): Promise<LLMResponse> {
    await this.initialize();

    const startTime = Date.now();
    const model = this.selectModel(options, hint);
    const availableProviders = this.getAvailableProviders();

    // Build fallback chain
    const fallbackModels = this.config.enableFallbacks
      ? modelRegistry.getFallbackModels(model, availableProviders)
      : [];

    const modelsToTry = [model, ...fallbackModels.slice(0, this.config.maxFallbackAttempts - 1)];

    let lastError: Error | undefined;

    for (const currentModel of modelsToTry) {
      const adapter = this.getAdapter(currentModel.provider);
      if (!adapter) continue;

      try {
        if (this.config.enableLogging) {
          logger.debug(`LLM Router: Trying ${currentModel.id} via ${currentModel.provider}`);
        }

        const response = await adapter.chat(
          {
            ...options,
            timeout: options.timeout || this.config.defaultTimeout,
          },
          currentModel
        );

        // Log success
        if (this.config.enableLogging) {
          logger.info('LLM Router: Request completed', {
            model: currentModel.id,
            provider: currentModel.provider,
            latencyMs: response.latencyMs,
            tokens: response.usage.totalTokens,
            cost: response.estimatedCost,
          });
        }

        // Track cost if enabled
        if (this.config.enableCostTracking) {
          this.logUsage({
            provider: currentModel.provider,
            model: currentModel.id,
            tier: currentModel.tier,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
            estimatedCostCents: Math.round(response.estimatedCost * 100),
            latencyMs: response.latencyMs,
            success: true,
            requestType: hint?.taskType || options.requestType || 'chat',
            organizationId: options.organizationId,
            userId: options.userId,
            sessionId: options.sessionId,
            metadata: {
              tier: currentModel.tier,
              fallbackAttempt: modelsToTry.indexOf(currentModel),
            },
          });
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (this.config.enableLogging) {
          logger.warn('LLM Router: Request failed, trying fallback', {
            model: currentModel.id,
            provider: currentModel.provider,
            error: (error as Error).message,
          });
        }

        // Check if error is retryable
        if (error instanceof Error && 'retryable' in error && !(error as any).retryable) {
          throw error;
        }
      }
    }

    // All attempts failed
    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Stream chat completion with fallbacks
   */
  async *streamChat(
    options: LLMRequestOptions,
    hint?: TaskHint
  ): AsyncGenerator<LLMStreamEvent> {
    await this.initialize();

    const model = this.selectModel(options, hint);
    const adapter = this.getAdapter(model.provider);

    if (!adapter) {
      yield { type: 'error', error: `No adapter for provider ${model.provider}` };
      return;
    }

    if (this.config.enableLogging) {
      logger.debug(`LLM Router: Streaming with ${model.id} via ${model.provider}`);
    }

    try {
      for await (const event of adapter.streamChat(
        {
          ...options,
          stream: true,
          timeout: options.timeout || this.config.defaultTimeout,
        },
        model
      )) {
        yield event;
      }
    } catch (error) {
      logger.error('LLM Router: Stream error', { error, model: model.id });
      yield { type: 'error', error: (error as Error).message };
    }
  }

  /**
   * Simple completion helper (non-streaming)
   */
  async complete(
    prompt: string,
    options: Partial<LLMRequestOptions> = {},
    hint?: TaskHint
  ): Promise<string> {
    const response = await this.chat(
      {
        messages: [{ role: 'user', content: prompt }],
        ...options,
      },
      hint
    );
    return response.content;
  }

  /**
   * Get router configuration
   */
  getConfig(): LLMRouterConfig {
    return { ...this.config };
  }

  /**
   * Get router status
   */
  getStatus(): {
    initialized: boolean;
    providers: LLMProvider[];
    config: LLMRouterConfig;
  } {
    return {
      initialized: this.initialized,
      providers: this.getAvailableProviders(),
      config: this.config,
    };
  }

  /**
   * Log LLM usage for cost tracking
   * Non-blocking - fires and forgets
   */
  private logUsage(input: LLMUsageLogInput): void {
    // Fire and forget - don't block the response
    llmCostService.logUsage(input).catch((error) => {
      logger.warn('Failed to log LLM usage', { error });
    });
  }

  /**
   * Log failed LLM request
   */
  private logFailedUsage(
    model: ModelConfig,
    error: Error,
    options: LLMRequestOptions,
    hint?: TaskHint
  ): void {
    if (!this.config.enableCostTracking) return;

    llmCostService.logUsage({
      provider: model.provider,
      model: model.id,
      tier: model.tier,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostCents: 0,
      latencyMs: 0,
      success: false,
      errorCode: (error as any).code || 'UNKNOWN',
      errorMessage: error.message,
      requestType: hint?.taskType || options.requestType || 'chat',
      organizationId: options.organizationId,
      userId: options.userId,
      sessionId: options.sessionId,
    }).catch((logError) => {
      logger.warn('Failed to log LLM failure', { error: logError });
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

let routerInstance: LLMRouter | null = null;

/**
 * Get the singleton LLM Router instance
 */
export function getLLMRouter(): LLMRouter {
  if (!routerInstance) {
    routerInstance = new LLMRouter({
      defaultTier: (config as any).llm?.defaultTier || 'standard',
      autoRoute: (config as any).llm?.autoRoute !== false,
      enableLogging: config.nodeEnv !== 'test',
    });
  }
  return routerInstance;
}

/**
 * Initialize the LLM Router
 * Call this during app startup
 */
export async function initializeLLMRouter(): Promise<LLMRouter> {
  const router = getLLMRouter();
  await router.initialize();
  return router;
}

// Export singleton for convenience
export const llmRouter = getLLMRouter();

