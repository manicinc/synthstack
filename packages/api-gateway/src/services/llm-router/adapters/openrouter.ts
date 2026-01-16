/**
 * OpenRouter Adapter
 * 
 * LLM adapter for OpenRouter API - provides access to multiple models
 * via a single API with cost optimization and fallback routing.
 * 
 * OpenRouter supports models from:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - Meta (Llama)
 * - Mistral
 * - Google (Gemini)
 * - And many more
 * 
 * @see https://openrouter.ai/docs
 */

import { config } from '../../../config/index.js';
import { BaseLLMAdapter } from './base.js';
import type {
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamEvent,
  ModelConfig,
  ToolCall,
} from '../types.js';

// OpenRouter API base URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: string | null;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAdapter extends BaseLLMAdapter {
  readonly provider: LLMProvider = 'openrouter';
  private appName: string;
  private siteUrl: string;

  constructor(apiKey?: string) {
    super(apiKey || (config as any).openrouterApiKey);
    this.appName = 'SynthStack';
    this.siteUrl = config.frontendUrl || 'https://synthstack.io';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(options: LLMRequestOptions, model: ModelConfig): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw this.createError('OpenRouter not configured', model.id, 'invalid_api_key');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.appName,
        },
        body: JSON.stringify({
          model: model.id,
          messages: this.formatMessages(options.messages),
          max_tokens: options.maxTokens || model.maxOutputTokens,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP,
          stop: options.stop,
          tools: options.tools?.map((tool) => ({
            type: 'function',
            function: tool.function,
          })),
          stream: false,
        }),
        signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      const choice = data.choices[0];

      if (!choice) {
        throw this.createError('No response from OpenRouter', model.id, 'provider_error');
      }

      const latencyMs = Date.now() - startTime;
      const usage = {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      };

      // Parse tool calls if present
      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

      return {
        content: choice.message.content || '',
        model: data.model,
        provider: this.provider,
        toolCalls,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage,
        latencyMs,
        estimatedCost: this.calculateCost(model, usage.promptTokens, usage.completionTokens),
      };
    } catch (error) {
      const code = this.parseErrorCode(error);
      throw this.createError(
        (error as Error).message,
        model.id,
        code,
        this.isRetryable(code),
        error as Error
      );
    }
  }

  async *streamChat(
    options: LLMRequestOptions,
    model: ModelConfig
  ): AsyncGenerator<LLMStreamEvent> {
    if (!this.apiKey) {
      yield { type: 'error', error: 'OpenRouter not configured' };
      return;
    }

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.appName,
        },
        body: JSON.stringify({
          model: model.id,
          messages: this.formatMessages(options.messages),
          max_tokens: options.maxTokens || model.maxOutputTokens,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP,
          stop: options.stop,
          tools: options.tools?.map((tool) => ({
            type: 'function',
            function: tool.function,
          })),
          stream: true,
        }),
        signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        yield { type: 'error', error: error.error?.message || `HTTP ${response.status}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const toolCallsInProgress: Map<number, Partial<ToolCall>> = new Map();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            yield { type: 'done' };
            continue;
          }

          try {
            const chunk: OpenRouterStreamChunk = JSON.parse(data);
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              yield { type: 'content', content: delta.content };
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCallsInProgress.get(tc.index) || {
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: '', arguments: '' },
                };

                if (tc.function?.name) {
                  existing.function!.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  existing.function!.arguments += tc.function.arguments;
                }

                toolCallsInProgress.set(tc.index, existing);
                yield { type: 'tool_call', toolCall: existing };
              }
            }

            // Check for finish
            if (chunk.choices[0]?.finish_reason) {
              yield {
                type: 'done',
                usage: chunk.usage ? {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                } : undefined,
              };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      yield { type: 'error', error: (error as Error).message };
    }
  }

  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}


