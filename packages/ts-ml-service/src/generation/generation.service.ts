import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  TextGenerationRequestDto,
  ImageGenerationRequestDto,
  ChatCompletionsRequestDto,
  ChatMessageDto,
} from './dto/generation.dto';

export interface TextGenerationResult {
  id: string;
  content: string;
  model: string;
  tokens_used: number;
  processing_time_ms: number;
}

export interface ImageGenerationResult {
  id: string;
  image_url: string;
  revised_prompt?: string;
  size: string;
  processing_time_ms: number;
}

export interface ChatCompletionResult {
  id: string;
  content: string;
  choices: {
    index: number;
    message: ChatMessageDto;
    finish_reason?: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not configured - generation features will fail');
    }
  }

  /**
   * Generate text using OpenAI GPT models
   */
  async generateText(dto: TextGenerationRequestDto): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const model = dto.model || 'gpt-3.5-turbo';

    this.logger.log(`Generating text with model: ${model}`);

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (dto.system_prompt) {
      messages.push({ role: 'system', content: dto.system_prompt });
    }

    messages.push({ role: 'user', content: dto.prompt });

    const response = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: dto.max_tokens || 1000,
      temperature: dto.temperature ?? 0.7,
    });

    const processingTime = Date.now() - startTime;

    return {
      id: uuidv4(),
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      tokens_used: response.usage?.total_tokens || 0,
      processing_time_ms: processingTime,
    };
  }

  /**
   * Generate image using OpenAI DALL-E
   */
  async generateImage(dto: ImageGenerationRequestDto): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    this.logger.log(`Generating image with size: ${dto.size || '1024x1024'}`);

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: dto.prompt,
      n: 1,
      size: (dto.size as '1024x1024' | '1792x1024' | '1024x1792') || '1024x1024',
      quality: (dto.quality as 'standard' | 'hd') || 'standard',
      style: (dto.style as 'vivid' | 'natural') || 'vivid',
    });

    const processingTime = Date.now() - startTime;

    return {
      id: uuidv4(),
      image_url: response.data[0]?.url || '',
      revised_prompt: response.data[0]?.revised_prompt,
      size: dto.size || '1024x1024',
      processing_time_ms: processingTime,
    };
  }

  /**
   * Chat completions (for copilot functionality)
   */
  async chatCompletions(dto: ChatCompletionsRequestDto): Promise<ChatCompletionResult> {
    const startTime = Date.now();
    const model = dto.model || 'gpt-3.5-turbo';

    this.logger.log(`Chat completion with model: ${model}, messages: ${dto.messages.length}`);

    const response = await this.openai.chat.completions.create({
      model,
      messages: dto.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: dto.max_tokens || 500,
      temperature: dto.temperature ?? 0.7,
    });

    const processingTime = Date.now() - startTime;

    const assistantMessage = response.choices[0]?.message;

    return {
      id: uuidv4(),
      content: assistantMessage?.content || '',
      choices: response.choices.map((choice, index) => ({
        index,
        message: {
          role: choice.message.role as 'user' | 'assistant' | 'system',
          content: choice.message.content || '',
        },
        finish_reason: choice.finish_reason || undefined,
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return {
      text: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest GPT-4 with improved performance' },
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
      ],
      image: [
        { id: 'dall-e-3', name: 'DALL-E 3', description: 'Latest image generation model' },
      ],
    };
  }
}
