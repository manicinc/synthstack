/**
 * Model Registry
 * 
 * Centralized configuration for all supported LLM models.
 * Includes pricing, capabilities, and routing priorities.
 */

import type { ModelConfig, ModelTier, LLMProvider } from './types.js';

// ============================================
// Model Definitions
// ============================================

/**
 * OpenAI Models
 */
export const OPENAI_MODELS: ModelConfig[] = [
  // Cheap tier
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'cheap',
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.0006,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true,
    priority: 1,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    tier: 'cheap',
    inputCostPer1kTokens: 0.0005,
    outputCostPer1kTokens: 0.0015,
    maxContextTokens: 16385,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsJsonMode: true,
    priority: 2,
  },
  // Standard tier
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'standard',
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.01,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true,
    priority: 1,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    tier: 'standard',
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true,
    priority: 2,
  },
  // Premium tier (o1 models)
  {
    id: 'o1',
    name: 'O1',
    provider: 'openai',
    tier: 'premium',
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.06,
    maxContextTokens: 200000,
    maxOutputTokens: 100000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true,
    priority: 1,
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    provider: 'openai',
    tier: 'premium',
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.012,
    maxContextTokens: 128000,
    maxOutputTokens: 65536,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true,
    priority: 2,
  },
];

/**
 * Anthropic Models
 */
export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Cheap tier
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    tier: 'cheap',
    inputCostPer1kTokens: 0.00025,
    outputCostPer1kTokens: 0.00125,
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 1,
  },
  // Standard tier
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'standard',
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxContextTokens: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 1,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    tier: 'standard',
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 2,
  },
  // Premium tier
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    tier: 'premium',
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 1,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'standard',
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxContextTokens: 200000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 0, // Highest priority in standard tier
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    tier: 'premium',
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    maxContextTokens: 200000,
    maxOutputTokens: 32768,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: false,
    priority: 0, // Highest priority in premium tier
  },
];

/**
 * OpenRouter Models (access to multiple providers via single API)
 */
export const OPENROUTER_MODELS: ModelConfig[] = [
  // Cheap tier - cost-optimized routing
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    provider: 'openrouter',
    tier: 'cheap',
    inputCostPer1kTokens: 0.0001, // Variable, estimated low
    outputCostPer1kTokens: 0.0004,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsJsonMode: false,
    priority: 3, // Lower priority fallback
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    provider: 'openrouter',
    tier: 'cheap',
    inputCostPer1kTokens: 0.00006,
    outputCostPer1kTokens: 0.00006,
    maxContextTokens: 131072,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsJsonMode: false,
    priority: 2,
  },
  {
    id: 'mistralai/mistral-7b-instruct',
    name: 'Mistral 7B',
    provider: 'openrouter',
    tier: 'cheap',
    inputCostPer1kTokens: 0.00006,
    outputCostPer1kTokens: 0.00006,
    maxContextTokens: 32768,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsJsonMode: false,
    priority: 3,
  },
  // Standard tier via OpenRouter
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'openrouter',
    tier: 'standard',
    inputCostPer1kTokens: 0.00035,
    outputCostPer1kTokens: 0.0004,
    maxContextTokens: 131072,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsJsonMode: false,
    priority: 3,
  },
];

// ============================================
// Model Registry
// ============================================

/**
 * All available models
 */
export const ALL_MODELS: ModelConfig[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...OPENROUTER_MODELS,
];

/**
 * Model Registry class for querying models
 */
export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private modelsByTier: Map<ModelTier, ModelConfig[]> = new Map();
  private modelsByProvider: Map<LLMProvider, ModelConfig[]> = new Map();

  constructor(models: ModelConfig[] = ALL_MODELS) {
    this.registerModels(models);
  }

  /**
   * Register models in the registry
   */
  private registerModels(models: ModelConfig[]): void {
    for (const model of models) {
      this.models.set(model.id, model);

      // Index by tier
      const tierModels = this.modelsByTier.get(model.tier) || [];
      tierModels.push(model);
      this.modelsByTier.set(model.tier, tierModels);

      // Index by provider
      const providerModels = this.modelsByProvider.get(model.provider) || [];
      providerModels.push(model);
      this.modelsByProvider.set(model.provider, providerModels);
    }

    // Sort by priority within each tier
    for (const [tier, tierModels] of this.modelsByTier) {
      this.modelsByTier.set(
        tier,
        tierModels.sort((a, b) => a.priority - b.priority)
      );
    }
  }

  /**
   * Get model by ID
   */
  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  /**
   * Get all models for a tier
   */
  getModelsByTier(tier: ModelTier): ModelConfig[] {
    return this.modelsByTier.get(tier) || [];
  }

  /**
   * Get all models for a provider
   */
  getModelsByProvider(provider: LLMProvider): ModelConfig[] {
    return this.modelsByProvider.get(provider) || [];
  }

  /**
   * Get the best model for a tier from available providers
   */
  getBestModelForTier(
    tier: ModelTier,
    availableProviders: LLMProvider[]
  ): ModelConfig | undefined {
    const tierModels = this.getModelsByTier(tier);
    return tierModels.find((model) => availableProviders.includes(model.provider));
  }

  /**
   * Get fallback models for a given model
   */
  getFallbackModels(
    model: ModelConfig,
    availableProviders: LLMProvider[]
  ): ModelConfig[] {
    const fallbacks: ModelConfig[] = [];
    
    // Same tier, different providers (sorted by priority)
    const sameTierModels = this.getModelsByTier(model.tier)
      .filter((m) => m.id !== model.id && availableProviders.includes(m.provider));
    fallbacks.push(...sameTierModels);

    // Downgrade tier as last resort
    if (model.tier === 'premium') {
      const standardModels = this.getModelsByTier('standard')
        .filter((m) => availableProviders.includes(m.provider));
      fallbacks.push(...standardModels);
    }
    if (model.tier === 'standard' || model.tier === 'premium') {
      const cheapModels = this.getModelsByTier('cheap')
        .filter((m) => availableProviders.includes(m.provider));
      fallbacks.push(...cheapModels);
    }

    return fallbacks;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    model: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): number {
    return (
      (inputTokens / 1000) * model.inputCostPer1kTokens +
      (outputTokens / 1000) * model.outputCostPer1kTokens
    );
  }

  /**
   * Find cheapest model that meets requirements
   */
  findCheapestModel(
    requirements: {
      minContextTokens?: number;
      minOutputTokens?: number;
      requiresTools?: boolean;
      requiresVision?: boolean;
      requiresJsonMode?: boolean;
    },
    availableProviders: LLMProvider[]
  ): ModelConfig | undefined {
    const eligibleModels = Array.from(this.models.values())
      .filter((model) => {
        if (!availableProviders.includes(model.provider)) return false;
        if (requirements.minContextTokens && model.maxContextTokens < requirements.minContextTokens) return false;
        if (requirements.minOutputTokens && model.maxOutputTokens < requirements.minOutputTokens) return false;
        if (requirements.requiresTools && !model.supportsTools) return false;
        if (requirements.requiresVision && !model.supportsVision) return false;
        if (requirements.requiresJsonMode && !model.supportsJsonMode) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by average cost per 1k tokens
        const avgCostA = (a.inputCostPer1kTokens + a.outputCostPer1kTokens) / 2;
        const avgCostB = (b.inputCostPer1kTokens + b.outputCostPer1kTokens) / 2;
        return avgCostA - avgCostB;
      });

    return eligibleModels[0];
  }

  /**
   * Get all registered model IDs
   */
  getAllModelIds(): string[] {
    return Array.from(this.models.keys());
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();


