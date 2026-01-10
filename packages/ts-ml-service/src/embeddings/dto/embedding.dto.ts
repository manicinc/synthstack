import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingRequestDto {
  @ApiProperty({
    description: 'Text to generate embedding for',
    example: 'Hello world',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Embedding model to use',
    example: 'text-embedding-3-small',
    required: false,
    enum: ['text-embedding-3-small', 'text-embedding-3-large'],
    default: 'text-embedding-3-small',
  })
  @IsOptional()
  @IsString()
  model?: string = 'text-embedding-3-small';
}

export class BatchEmbeddingRequestDto {
  @ApiProperty({
    description: 'Array of texts to generate embeddings for',
    example: ['Hello world', 'Machine learning is fascinating'],
    type: [String],
    maxItems: 100,
  })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  texts: string[];

  @ApiProperty({
    description: 'Embedding model to use',
    example: 'text-embedding-3-small',
    required: false,
    enum: ['text-embedding-3-small', 'text-embedding-3-large'],
    default: 'text-embedding-3-small',
  })
  @IsOptional()
  @IsString()
  model?: string = 'text-embedding-3-small';
}

export class SimilarityRequestDto {
  @ApiProperty({
    description: 'First text for similarity comparison',
    example: 'Machine learning is a subset of AI',
  })
  @IsString()
  text1: string;

  @ApiProperty({
    description: 'Second text for similarity comparison',
    example: 'Artificial intelligence includes machine learning',
  })
  @IsString()
  text2: string;

  @ApiProperty({
    description: 'Embedding model to use for comparison',
    example: 'text-embedding-3-small',
    required: false,
    enum: ['text-embedding-3-small', 'text-embedding-3-large'],
    default: 'text-embedding-3-small',
  })
  @IsOptional()
  @IsString()
  model?: string = 'text-embedding-3-small';
}

export class EmbeddingResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Embedding vector',
    example: [0.1, 0.2, 0.3],
    type: [Number],
  })
  embedding: number[];

  @ApiProperty({
    description: 'Model used for embedding generation',
    example: 'text-embedding-3-small',
  })
  model: string;

  @ApiProperty({
    description: 'Number of dimensions in embedding vector',
    example: 1536,
  })
  dimensions: number;
}

export class BatchEmbeddingResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of embedding vectors',
    example: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
  })
  embeddings: number[][];

  @ApiProperty({
    description: 'Model used for embedding generation',
    example: 'text-embedding-3-small',
  })
  model: string;

  @ApiProperty({
    description: 'Number of dimensions in each embedding vector',
    example: 1536,
  })
  dimensions: number;

  @ApiProperty({
    description: 'Number of embeddings generated',
    example: 2,
  })
  count: number;
}

export class SimilarityResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Cosine similarity score between the two texts (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  similarity: number;

  @ApiProperty({
    description: 'Model used for similarity calculation',
    example: 'text-embedding-3-small',
  })
  model: string;
}

export interface EmbeddingModel {
  id: string;
  dimensions: number;
  maxTokens: number;
  provider: string;
  description: string;
}
