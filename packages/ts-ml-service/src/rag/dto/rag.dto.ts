import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IndexDocumentDto {
  @ApiProperty({
    description: 'Document content to index',
    example: 'This is a sample document about machine learning.',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Source identifier for the document',
    example: 'ml-guide.pdf',
  })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Type of source document',
    example: 'pdf',
    required: false,
    default: 'document',
  })
  @IsOptional()
  @IsString()
  sourceType?: string = 'document';

  @ApiProperty({
    description: 'Additional metadata for the document',
    example: { author: 'John Doe', date: '2024-01-01' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Collection name for organizing documents',
    example: 'knowledge-base',
    required: false,
    default: 'default',
  })
  @IsOptional()
  @IsString()
  collection?: string = 'default';
}

export class IndexProjectDocumentDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc-123',
  })
  @IsString()
  documentId: string;

  @ApiProperty({
    description: 'Project identifier',
    example: 'project-456',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Document filename',
    example: 'user-guide.md',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'Document content to index',
    example: 'This is the user guide for our application...',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'File type/format',
    example: 'markdown',
  })
  @IsString()
  fileType: string;

  @ApiProperty({
    description: 'Size of each text chunk for indexing',
    example: 1000,
    required: false,
    minimum: 100,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  chunkSize?: number = 1000;

  @ApiProperty({
    description: 'Overlap between chunks to maintain context',
    example: 200,
    required: false,
    minimum: 0,
    maximum: 1000,
    default: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  chunkOverlap?: number = 200;
}

export class SearchRequestDto {
  @ApiProperty({
    description: 'Search query text',
    example: 'What is machine learning?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Collection to search in',
    example: 'knowledge-base',
    required: false,
    default: 'default',
  })
  @IsOptional()
  @IsString()
  collection?: string = 'default';

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 5;

  @ApiProperty({
    description: 'Minimum similarity score threshold (0-1)',
    example: 0.7,
    required: false,
    minimum: 0,
    maximum: 1,
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number = 0.5;

  @ApiProperty({
    description: 'Filter by source types',
    example: ['pdf', 'markdown'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceTypes?: string[];
}

export class QueryRequestDto {
  @ApiProperty({
    description: 'Question to ask the knowledge base',
    example: 'How does the authentication system work?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Collection to query',
    example: 'technical-docs',
    required: false,
    default: 'default',
  })
  @IsOptional()
  @IsString()
  collection?: string = 'default';

  @ApiProperty({
    description: 'Maximum number of context documents to retrieve',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  contextLimit?: number = 5;

  @ApiProperty({
    description: 'LLM model to use for generating answers',
    example: 'gpt-4o-mini',
    required: false,
    default: 'gpt-4o-mini',
  })
  @IsOptional()
  @IsString()
  model?: string = 'gpt-4o-mini';

  @ApiProperty({
    description: 'Custom system prompt for the LLM',
    example: 'You are a helpful technical assistant.',
    required: false,
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

export interface RetrievedContext {
  content: string;
  source: string;
  sourceType: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  success: boolean;
  results: RetrievedContext[];
  query: string;
  totalFound: number;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sources: RetrievedContext[];
  model: string;
  tokensUsed?: number;
}
