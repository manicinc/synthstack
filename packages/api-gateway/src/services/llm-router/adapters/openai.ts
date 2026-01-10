/**
 * OpenAI Adapter
 * 
 * LLM adapter for OpenAI API (GPT-4, GPT-4o, GPT-4o-mini, etc.)
 */

import OpenAI from 'openai';
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

export class OpenAIAdapter extends BaseLLMAdapter {
  readonly provider: LLMProvider = 'openai';
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    super(apiKey || config.openaiApiKey);
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async chat(options: LLMRequestOptions, model: ModelConfig): Promise<LLMResponse> {
    if (!this.client) {
      throw this.createError('OpenAI not configured', model.id, 'invalid_api_key');
    }

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: model.id,
        messages: this.formatMessages(options.messages),
        max_tokens: options.maxTokens || model.maxOutputTokens,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop: options.stop,
        tools: options.tools?.map((tool) => ({
          type: 'function' as const,
          function: tool.function,
        })),
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        stream: false,
        user: options.userId,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw this.createError('No response from OpenAI', model.id, 'provider_error');
      }

      const latencyMs = Date.now() - startTime;
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      // Parse tool calls if present
      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: (tc as any).function.name,
          arguments: (tc as any).function.arguments,
        },
      }));

      return {
        content: choice.message.content || '',
        model: response.model,
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
    if (!this.client) {
      yield { type: 'error', error: 'OpenAI not configured' };
      return;
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: model.id,
        messages: this.formatMessages(options.messages),
        max_tokens: options.maxTokens || model.maxOutputTokens,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop: options.stop,
        tools: options.tools?.map((tool) => ({
          type: 'function' as const,
          function: tool.function,
        })),
        stream: true,
        user: options.userId,
      });

      let totalContent = '';
      const toolCallsInProgress: Map<number, Partial<ToolCall>> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          totalContent += delta.content;
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


