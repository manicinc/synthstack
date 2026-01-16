/**
 * Anthropic Adapter
 * 
 * LLM adapter for Anthropic API (Claude models)
 */

import Anthropic from '@anthropic-ai/sdk';
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

export class AnthropicAdapter extends BaseLLMAdapter {
  readonly provider: LLMProvider = 'anthropic';
  private client: Anthropic | null = null;

  constructor(apiKey?: string) {
    super(apiKey || config.anthropicApiKey);
    
    if (this.apiKey) {
      this.client = new Anthropic({
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
      // Anthropic doesn't have a simple validation endpoint
      // Make a minimal request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      // 401 = invalid key, other errors might be rate limits
      return (error as any)?.status !== 401;
    }
  }

  async chat(options: LLMRequestOptions, model: ModelConfig): Promise<LLMResponse> {
    if (!this.client) {
      throw this.createError('Anthropic not configured', model.id, 'invalid_api_key');
    }

    const startTime = Date.now();
    const { systemMessage, otherMessages } = this.extractSystemMessage(options.messages);

    try {
      // Convert tools to Anthropic format
      const tools = options.tools?.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters as Anthropic.Tool.InputSchema,
      }));

      const response = await this.client.messages.create({
        model: model.id,
        system: systemMessage,
        messages: otherMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        max_tokens: options.maxTokens || model.maxOutputTokens,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop_sequences: options.stop,
        tools,
        stream: false,
      });

      const latencyMs = Date.now() - startTime;

      // Extract text content
      let content = '';
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      const usage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      return {
        content,
        model: response.model,
        provider: this.provider,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapStopReason(response.stop_reason),
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
      yield { type: 'error', error: 'Anthropic not configured' };
      return;
    }

    const { systemMessage, otherMessages } = this.extractSystemMessage(options.messages);

    try {
      // Convert tools to Anthropic format
      const tools = options.tools?.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters as Anthropic.Tool.InputSchema,
      }));

      const stream = await this.client.messages.create({
        model: model.id,
        system: systemMessage,
        messages: otherMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        max_tokens: options.maxTokens || model.maxOutputTokens,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop_sequences: options.stop,
        tools,
        stream: true,
      });

      let currentToolCall: Partial<ToolCall> | null = null;
      let toolInputJson = '';

      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              currentToolCall = {
                id: event.content_block.id,
                type: 'function',
                function: {
                  name: event.content_block.name,
                  arguments: '',
                },
              };
              toolInputJson = '';
            }
            break;

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'content', content: event.delta.text };
            } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
              toolInputJson += event.delta.partial_json;
              currentToolCall.function!.arguments = toolInputJson;
              yield { type: 'tool_call', toolCall: currentToolCall };
            }
            break;

          case 'content_block_stop':
            if (currentToolCall) {
              currentToolCall = null;
              toolInputJson = '';
            }
            break;

          case 'message_delta':
            if (event.usage) {
              yield {
                type: 'done',
                usage: {
                  promptTokens: 0, // Not available in delta
                  completionTokens: event.usage.output_tokens,
                  totalTokens: event.usage.output_tokens,
                },
              };
            }
            break;

          case 'message_stop':
            yield { type: 'done' };
            break;
        }
      }
    } catch (error) {
      yield { type: 'error', error: (error as Error).message };
    }
  }

  private mapStopReason(
    reason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }
}


