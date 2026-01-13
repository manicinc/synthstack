import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GenerationService } from './generation.service';
import {
  TextGenerationRequestDto,
  TextGenerationResponseDto,
  ImageGenerationRequestDto,
  ImageGenerationResponseDto,
  ChatCompletionsRequestDto,
  ChatCompletionsResponseDto,
} from './dto/generation.dto';

@ApiTags('Generation')
@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('text')
  @ApiOperation({
    summary: 'Generate text',
    description: 'Generate text using OpenAI GPT models',
  })
  @ApiResponse({
    status: 201,
    description: 'Text generated successfully',
    type: TextGenerationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  async generateText(
    @Body() dto: TextGenerationRequestDto,
  ): Promise<TextGenerationResponseDto> {
    try {
      const result = await this.generationService.generateText(dto);
      return {
        success: true,
        id: result.id,
        content: result.content,
        model: result.model,
        tokens_used: result.tokens_used,
        processing_time_ms: result.processing_time_ms,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Text generation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('image')
  @ApiOperation({
    summary: 'Generate image',
    description: 'Generate image using OpenAI DALL-E',
  })
  @ApiResponse({
    status: 201,
    description: 'Image generated successfully',
    type: ImageGenerationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  async generateImage(
    @Body() dto: ImageGenerationRequestDto,
  ): Promise<ImageGenerationResponseDto> {
    try {
      const result = await this.generationService.generateImage(dto);
      return {
        success: true,
        id: result.id,
        image_url: result.image_url,
        revised_prompt: result.revised_prompt,
        size: result.size,
        processing_time_ms: result.processing_time_ms,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Image generation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  @ApiOperation({
    summary: 'List available models',
    description: 'Get list of available models for text and image generation',
  })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  listModels() {
    return {
      success: true,
      models: this.generationService.getAvailableModels(),
    };
  }
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('completions')
  @ApiOperation({
    summary: 'Chat completions',
    description: 'Generate chat completions using OpenAI GPT models',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat completion generated successfully',
    type: ChatCompletionsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  async chatCompletions(
    @Body() dto: ChatCompletionsRequestDto,
  ): Promise<ChatCompletionsResponseDto> {
    try {
      const result = await this.generationService.chatCompletions(dto);
      return {
        success: true,
        id: result.id,
        choices: result.choices,
        content: result.content,
        usage: result.usage,
        model: result.model,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Chat completion failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
