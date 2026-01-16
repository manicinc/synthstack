import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { TranscriptionService } from './transcription.service';
import { IsString, IsOptional, IsBase64 } from 'class-validator';

class TranscribeFileDto {
  @ApiProperty({
    description: 'Path to audio file to transcribe',
    example: '/tmp/recording.mp3',
  })
  @IsString()
  filePath: string;

  @ApiProperty({
    description: 'Language code for transcription (ISO-639-1)',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Whisper model to use',
    example: 'whisper-1',
    required: false,
    default: 'whisper-1',
  })
  @IsOptional()
  @IsString()
  model?: string = 'whisper-1';
}

class TranscribeBase64Dto {
  @ApiProperty({
    description: 'Base64-encoded audio data',
    example: 'SGVsbG8gV29ybGQh',
  })
  @IsBase64()
  audio: string;

  @ApiProperty({
    description: 'Original filename (used for format detection)',
    example: 'recording.mp3',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'Language code for transcription (ISO-639-1)',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Whisper model to use',
    example: 'whisper-1',
    required: false,
    default: 'whisper-1',
  })
  @IsOptional()
  @IsString()
  model?: string = 'whisper-1';
}

@ApiTags('Transcription')
@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post('audio')
  @ApiOperation({
    summary: 'Transcribe audio file',
    description: 'Transcribe audio from file path using OpenAI Whisper'
  })
  @ApiResponse({ status: 201, description: 'Audio transcribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Transcription failed' })
  async transcribeFile(@Body() dto: TranscribeFileDto) {
    try {
      const result = await this.transcriptionService.transcribeFile(
        dto.filePath,
        dto.language,
        dto.model,
      );
      return {
        success: true,
        transcription: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Transcription failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('audio/base64')
  @ApiOperation({
    summary: 'Transcribe base64 audio',
    description: 'Transcribe audio from base64-encoded data using OpenAI Whisper'
  })
  @ApiResponse({ status: 201, description: 'Audio transcribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or invalid base64' })
  @ApiResponse({ status: 500, description: 'Transcription failed' })
  async transcribeBase64(@Body() dto: TranscribeBase64Dto) {
    try {
      const buffer = Buffer.from(dto.audio, 'base64');
      const result = await this.transcriptionService.transcribeBuffer(
        buffer,
        dto.filename,
        dto.language,
        dto.model,
      );
      return {
        success: true,
        transcription: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Transcription failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('formats')
  @ApiOperation({
    summary: 'Get supported formats',
    description: 'List all supported audio formats for transcription'
  })
  @ApiResponse({ status: 200, description: 'Formats retrieved successfully' })
  getSupportedFormats() {
    return {
      success: true,
      formats: this.transcriptionService.getSupportedFormats(),
    };
  }

  @Get('languages')
  @ApiOperation({
    summary: 'Get supported languages',
    description: 'List all supported languages for transcription'
  })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  getSupportedLanguages() {
    return {
      success: true,
      languages: this.transcriptionService.getSupportedLanguages(),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Transcription service health',
    description: 'Check if transcription service is available and operational'
  })
  @ApiResponse({ status: 200, description: 'Service health status' })
  checkHealth() {
    const available = this.transcriptionService.isAvailable();
    return {
      status: available ? 'ok' : 'unavailable',
      backend: 'whisper-api',
      model: 'whisper-1',
      available,
    };
  }
}
