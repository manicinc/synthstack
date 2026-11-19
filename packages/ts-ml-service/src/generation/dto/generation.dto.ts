import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// Text Generation DTOs
// ============================================

export class TextGenerationRequestDto {
  @ApiProperty({ description: 'The prompt to generate text from' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'System prompt to guide the AI behavior' })
  @IsOptional()
  @IsString()
  system_prompt?: string;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4000)
  max_tokens?: number;

  @ApiPropertyOptional({ description: 'Temperature for randomness (0-2)', default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Model to use',
    enum: ['gpt-6-luna', 'gpt-6.2-sol', 'gpt-6.2-astra'],
    default: 'gpt-6-luna'
  })
  @IsOptional()
  @IsString()
  @IsIn(['gpt-6-luna', 'gpt-6.2-sol', 'gpt-6.2-astra'])
  model?: string;
}

export class TextGenerationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Unique generation ID' })
  id: string;

  @ApiProperty({ description: 'Generated text content' })
  content: string;

  @ApiProperty({ description: 'Model used for generation' })
  model: string;

  @ApiProperty({ description: 'Number of tokens used' })
  tokens_used: number;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processing_time_ms: number;
}

// ============================================
// Image Generation DTOs
// ============================================

export class ImageGenerationRequestDto {
  @ApiProperty({ description: 'The prompt describing the image to generate' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Image size',
    enum: ['1024x1024', '1792x1024', '1024x1792'],
    default: '1024x1024'
  })
  @IsOptional()
  @IsString()
  @IsIn(['1024x1024', '1792x1024', '1024x1792'])
  size?: string;

  @ApiPropertyOptional({
    description: 'Image quality',
    enum: ['standard', 'hd'],
    default: 'standard'
  })
  @IsOptional()
  @IsString()
  @IsIn(['standard', 'hd'])
  quality?: string;

  @ApiPropertyOptional({
    description: 'Image style',
    enum: ['vivid', 'natural'],
    default: 'vivid'
  })
  @IsOptional()
  @IsString()
  @IsIn(['vivid', 'natural'])
  style?: string;
}

export class ImageGenerationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Unique generation ID' })
  id: string;

  @ApiProperty({ description: 'URL of the generated image' })
  image_url: string;

  @ApiPropertyOptional({ description: 'Revised prompt used by the model' })
  revised_prompt?: string;

  @ApiProperty({ description: 'Image size' })
  size: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processing_time_ms: number;
}

// ============================================
// Chat Completions DTOs
// ============================================

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsString()
  @IsIn(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

/**
 * The chat models the gateway forwards here (its chat route's ML_SERVICE_MODELS):
 * the GPT-6 ids and the working gpt-4o-mini, gpt-4o and gpt-5.2.
 */
export const CHAT_MODELS = ['gpt-6-luna', 'gpt-6.2-sol', 'gpt-6.2-astra', 'gpt-4o-mini', 'gpt-4o', 'gpt-5.2'];

export class ChatCompletionsRequestDto {
  @ApiProperty({ type: [ChatMessageDto], description: 'Array of chat messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({
    description: 'Model to use',
    enum: CHAT_MODELS,
    default: 'gpt-6-luna'
  })
  @IsOptional()
  @IsString()
  @IsIn(CHAT_MODELS)
  model?: string;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate', default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4000)
  max_tokens?: number;

  @ApiPropertyOptional({ description: 'Temperature for randomness (0-2)', default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Whether to stream the response', default: false })
  @IsOptional()
  stream?: boolean;
}

export class ChatCompletionChoiceDto {
  @ApiProperty()
  index: number;

  @ApiProperty()
  message: ChatMessageDto;

  @ApiPropertyOptional()
  finish_reason?: string;
}

export class ChatCompletionsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Unique completion ID' })
  id: string;

  @ApiProperty({ type: [ChatCompletionChoiceDto] })
  choices: ChatCompletionChoiceDto[];

  @ApiProperty({ description: 'Generated content (shortcut to first choice)' })
  content: string;

  @ApiProperty()
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  @ApiProperty({ description: 'Model used' })
  model: string;
}
