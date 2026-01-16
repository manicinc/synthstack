/**
 * Base LLM Adapter
 * 
 * Abstract base class for LLM provider adapters.
 * Provides common functionality and utility methods.
 */

import type {
  LLMAdapter,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamEvent,
  ModelConfig,
  ChatMessage,
  LLMErrorCode,
} from '../types.js';
import { LLMError } from '../types.js';
import { modelRegistry } from '../models.js';

/**
 * Abstract base class for LLM adapters
 */
export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract readonly provider: LLMProvider;
  protected apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if adapter is available (has API key configured)
   */
  abstract isAvailable(): boolean;

  /**
   * Get list of models supported by this provider
   */
  getSupportedModels(): string[] {
    return modelRegistry
      .getModelsByProvider(this.provider)
      .map((m) => m.id);
  }

  /**
   * Execute a chat completion
   */
  abstract chat(options: LLMRequestOptions, model: ModelConfig): Promise<LLMResponse>;

  /**
   * Stream a chat completion
   */
  abstract streamChat(
    options: LLMRequestOptions,
    model: ModelConfig
  ): AsyncGenerator<LLMStreamEvent>;

  /**
   * Validate the API key
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Create an LLMError from a provider error
   */
  protected createError(
    message: string,
    model: string,
    code: LLMErrorCode,
    retryable: boolean = false,
    cause?: Error
  ): LLMError {
    return new LLMError(message, this.provider, model, code, retryable, cause);
  }

  /**
   * Parse error code from provider error
   */
  protected parseErrorCode(error: Error | any): LLMErrorCode {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status;

    if (status === 429 || message.includes('rate limit')) {
      return 'rate_limit';
    }
    if (status === 401 || message.includes('unauthorized') || message.includes('invalid api key')) {
      return 'invalid_api_key';
    }
    if (status === 403 || message.includes('quota') || message.includes('billing')) {
      return 'quota_exceeded';
    }
    if (status === 404 || message.includes('model not found')) {
      return 'model_not_found';
    }
    if (message.includes('context length') || message.includes('token limit')) {
      return 'context_length_exceeded';
    }
    if (message.includes('content filter') || message.includes('safety')) {
      return 'content_filter';
    }
    if (message.includes('timeout') || error?.code === 'ETIMEDOUT') {
      return 'timeout';
    }
    if (message.includes('network') || error?.code === 'ECONNREFUSED') {
      return 'network_error';
    }

    return 'provider_error';
  }

  /**
   * Check if error is retryable
   */
  protected isRetryable(code: LLMErrorCode): boolean {
    return ['rate_limit', 'timeout', 'network_error'].includes(code);
  }

  /**
   * Calculate estimated cost
   */
  protected calculateCost(
    model: ModelConfig,
    promptTokens: number,
    completionTokens: number
  ): number {
    return modelRegistry.estimateCost(model, promptTokens, completionTokens);
  }

  /**
   * Format messages for the provider
   */
  protected formatMessages(messages: ChatMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.toolCallId && { tool_call_id: msg.toolCallId }),
    }));
  }

  /**
   * Extract system message from messages array
   */
  protected extractSystemMessage(messages: ChatMessage[]): {
    systemMessage?: string;
    otherMessages: ChatMessage[];
  } {
    const systemMsg = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');
    return {
      systemMessage: systemMsg?.content,
      otherMessages,
    };
  }
}


