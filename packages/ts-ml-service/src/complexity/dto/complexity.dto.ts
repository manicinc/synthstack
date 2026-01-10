import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreEstimateRequestDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Add user authentication',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed task description',
    example: 'Implement JWT-based authentication with refresh tokens',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of issue/task',
    example: 'feature',
    required: false,
    enum: ['bug', 'feature', 'enhancement', 'refactor', 'documentation', 'test', 'chore', 'task'],
    default: 'task',
  })
  @IsOptional()
  @IsString()
  issueType?: string = 'task';

  @ApiProperty({
    description: 'Labels/tags for categorization',
    example: ['backend', 'security'],
    type: [String],
    required: false,
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[] = [];

  @ApiProperty({
    description: 'Milestone identifier',
    example: 'v1.0',
    required: false,
  })
  @IsOptional()
  @IsString()
  milestone?: string;

  @ApiProperty({
    description: 'Project context information',
    example: 'E-commerce platform with React frontend',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectContext?: string;

  @ApiProperty({
    description: 'Related file paths',
    example: ['auth.ts', 'users.ts'],
    type: [String],
    required: false,
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedFiles?: string[] = [];
}

export class PostAnalyzeRequestDto {
  @ApiProperty({
    description: 'Number of lines added',
    example: 150,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  linesAdded: number = 0;

  @ApiProperty({
    description: 'Number of lines removed',
    example: 50,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  linesRemoved: number = 0;

  @ApiProperty({
    description: 'Number of files changed',
    example: 5,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  filesChanged: number = 0;

  @ApiProperty({
    description: 'Number of commits',
    example: 3,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  commits: number = 1;

  @ApiProperty({
    description: 'Time taken to merge in hours',
    example: 8.5,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeToMergeHours?: number;

  @ApiProperty({
    description: 'Number of review comments',
    example: 10,
    required: false,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewComments?: number = 0;

  @ApiProperty({
    description: 'Pull request description',
    example: 'Implements new authentication feature',
    required: false,
  })
  @IsOptional()
  @IsString()
  prDescription?: string;

  @ApiProperty({
    description: 'Pre-estimated complexity score (1-5)',
    example: 3,
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  preComplexityScore?: number;

  @ApiProperty({
    description: 'Pre-estimated hours',
    example: 6.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  preEstimatedHours?: number;

  @ApiProperty({
    description: 'Pre-estimation reasoning',
    example: 'Moderate complexity due to authentication integration',
    required: false,
  })
  @IsOptional()
  @IsString()
  preReasoning?: string;
}

export class PointAdjustmentRequestDto {
  @ApiProperty({
    description: 'Pre-estimated complexity level (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  preLevel: number;

  @ApiProperty({
    description: 'Actual complexity level (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  actualLevel: number;
}

export interface PreEstimateResponse {
  complexityScore: number;
  complexityName: string;
  estimatedHours: number;
  estimatedPoints: number;
  factors: Record<string, unknown>;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

export interface PostAnalyzeResponse {
  actualComplexity: number;
  complexityName: string;
  actualPoints: number;
  metrics: Record<string, unknown>;
  accuracyScore?: number;
  pointAdjustment: number;
  adjustmentReason: string;
  analysis: string;
  timestamp: string;
}

export interface ComplexityLevel {
  level: number;
  name: string;
  description: string;
  hoursMin: number;
  hoursMax: number;
  basePoints: number;
  indicators: string[];
}

export interface PointAdjustmentResponse {
  multiplier: number;
  bonusPercent: number;
  reason: string;
}
