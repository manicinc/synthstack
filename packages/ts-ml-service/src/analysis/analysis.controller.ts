import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

class SummarizeDto {
  @ApiProperty({
    description: 'Text to summarize',
    example: 'This is a long document that needs to be summarized into a concise overview.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Maximum length of summary in words',
    example: 100,
    required: false,
    minimum: 10,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxLength?: number;

  @ApiProperty({
    description: 'LLM model to use for summarization',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

class SentimentDto {
  @ApiProperty({
    description: 'Text to analyze sentiment for',
    example: 'I love this product! It works great and exceeded my expectations.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Include aspect-based sentiment analysis',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAspects?: boolean = false;

  @ApiProperty({
    description: 'LLM model to use for sentiment analysis',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

class KeywordsDto {
  @ApiProperty({
    description: 'Text to extract keywords from',
    example: 'Machine learning is a subset of artificial intelligence focused on training algorithms.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Maximum number of keywords to extract',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxKeywords?: number = 10;

  @ApiProperty({
    description: 'LLM model to use for keyword extraction',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

class GenerateDto {
  @ApiProperty({
    description: 'Prompt for content generation',
    example: 'Write a product description for a smart watch',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Additional context for generation',
    example: 'Target audience: tech-savvy professionals',
    required: false,
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({
    description: 'LLM model to use for generation',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Maximum tokens to generate',
    example: 1000,
    required: false,
    minimum: 1,
    maximum: 4000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number = 1000;

  @ApiProperty({
    description: 'Temperature for randomness (0-2)',
    example: 0.7,
    required: false,
    minimum: 0,
    maximum: 2,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number = 0.7;
}

class ClassifyDto {
  @ApiProperty({
    description: 'Text to classify',
    example: 'This movie was absolutely fantastic! The acting was superb.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Possible categories for classification',
    example: ['positive', 'negative', 'neutral'],
    type: [String],
  })
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({
    description: 'Allow multiple category labels',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  multiLabel?: boolean = false;

  @ApiProperty({
    description: 'LLM model to use for classification',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

class AnalyzeTextDto {
  @ApiProperty({
    description: 'Text to analyze',
    example: 'This product is amazing! It exceeded all my expectations and works perfectly.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Types of analyses to perform',
    example: ['sentiment', 'summary', 'keywords'],
    type: [String],
    required: false,
    default: ['sentiment', 'summary', 'keywords'],
  })
  @IsOptional()
  @IsString({ each: true })
  analyses?: string[] = ['sentiment', 'summary', 'keywords'];

  @ApiProperty({
    description: 'LLM model to use for analysis',
    example: 'gpt-4o-mini',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

@ApiTags('Analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('summarize')
  @ApiOperation({
    summary: 'Summarize text',
    description: 'Generate a concise summary of the provided text using AI'
  })
  @ApiResponse({ status: 201, description: 'Text summarized successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Summarization failed' })
  async summarize(@Body() dto: SummarizeDto) {
    try {
      const result = await this.analysisService.summarize(
        dto.text,
        dto.maxLength,
        dto.model,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Summarization failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sentiment')
  @ApiOperation({
    summary: 'Analyze sentiment',
    description: 'Analyze the sentiment (positive/negative/neutral) of text'
  })
  @ApiResponse({ status: 201, description: 'Sentiment analyzed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Sentiment analysis failed' })
  async analyzeSentiment(@Body() dto: SentimentDto) {
    try {
      const result = await this.analysisService.analyzeSentiment(
        dto.text,
        dto.includeAspects,
        dto.model,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Sentiment analysis failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('keywords')
  @ApiOperation({
    summary: 'Extract keywords',
    description: 'Extract key phrases and terms from text using AI'
  })
  @ApiResponse({ status: 201, description: 'Keywords extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Keyword extraction failed' })
  async extractKeywords(@Body() dto: KeywordsDto) {
    try {
      const result = await this.analysisService.extractKeywords(
        dto.text,
        dto.maxKeywords,
        dto.model,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Keyword extraction failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate content',
    description: 'Generate AI content from a prompt with optional context'
  })
  @ApiResponse({ status: 201, description: 'Content generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Content generation failed' })
  async generateContent(@Body() dto: GenerateDto) {
    try {
      const result = await this.analysisService.generateContent(
        dto.prompt,
        dto.context,
        dto.model,
        dto.maxTokens,
        dto.temperature,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Content generation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('classify')
  @ApiOperation({
    summary: 'Classify text',
    description: 'Classify text into provided categories using AI (single or multi-label)'
  })
  @ApiResponse({ status: 201, description: 'Text classified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Classification failed' })
  async classifyText(@Body() dto: ClassifyDto) {
    try {
      const result = await this.analysisService.classify(
        dto.text,
        dto.categories,
        dto.multiLabel,
        dto.model,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Classification failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('text')
  @ApiOperation({
    summary: 'Comprehensive text analysis',
    description: 'Run multiple analyses (sentiment, summary, keywords) on text in one request'
  })
  @ApiResponse({ status: 201, description: 'Text analyzed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Text analysis failed' })
  async analyzeText(@Body() dto: AnalyzeTextDto) {
    try {
      const result = await this.analysisService.analyzeText(
        dto.text,
        dto.analyses || ['sentiment', 'summary', 'keywords'],
        dto.model,
      );
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Text analysis failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
