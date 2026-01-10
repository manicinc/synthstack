import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmbeddingsService } from './embeddings.service';
import {
  EmbeddingRequestDto,
  BatchEmbeddingRequestDto,
  SimilarityRequestDto,
  EmbeddingResponseDto,
  BatchEmbeddingResponseDto,
  SimilarityResponseDto,
} from './dto/embedding.dto';

@ApiTags('Embeddings')
@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate embedding',
    description: 'Generate embedding vector for a single text using OpenAI models'
  })
  @ApiResponse({ status: 201, description: 'Embedding generated successfully', type: EmbeddingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Embedding generation failed' })
  async generateEmbedding(
    @Body() dto: EmbeddingRequestDto,
  ): Promise<EmbeddingResponseDto> {
    try {
      const result = await this.embeddingsService.generateEmbedding(
        dto.text,
        dto.model,
      );
      return {
        success: true,
        embedding: result.embedding,
        model: result.model,
        dimensions: result.dimensions,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Batch generate embeddings',
    description: 'Generate embeddings for multiple texts in a single request (max 100 texts)'
  })
  @ApiResponse({ status: 201, description: 'Embeddings generated successfully', type: BatchEmbeddingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or exceeded batch limit' })
  @ApiResponse({ status: 500, description: 'Embedding generation failed' })
  async batchGenerateEmbeddings(
    @Body() dto: BatchEmbeddingRequestDto,
  ): Promise<BatchEmbeddingResponseDto> {
    if (dto.texts.length > 100) {
      throw new HttpException(
        {
          success: false,
          error: 'Maximum 100 texts per batch request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.embeddingsService.generateEmbeddings(
        dto.texts,
        dto.model,
      );
      return {
        success: true,
        embeddings: result.embeddings,
        model: result.model,
        dimensions: result.dimensions,
        count: result.embeddings.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('similarity')
  @ApiOperation({
    summary: 'Calculate similarity',
    description: 'Calculate cosine similarity between two texts using their embeddings'
  })
  @ApiResponse({ status: 201, description: 'Similarity calculated successfully', type: SimilarityResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Similarity calculation failed' })
  async calculateSimilarity(
    @Body() dto: SimilarityRequestDto,
  ): Promise<SimilarityResponseDto> {
    try {
      const result = await this.embeddingsService.calculateSimilarity(
        dto.text1,
        dto.text2,
        dto.model,
      );
      return {
        success: true,
        similarity: result.similarity,
        model: result.model,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  @ApiOperation({
    summary: 'List embedding models',
    description: 'Get list of available embedding models'
  })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  listModels() {
    return {
      success: true,
      models: this.embeddingsService.getAvailableModels(),
    };
  }
}
