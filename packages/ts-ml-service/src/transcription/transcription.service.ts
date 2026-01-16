import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  model: string;
}

@Injectable()
export class TranscriptionService implements OnModuleInit {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('openaiApiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn(
        'OpenAI API key not configured - transcription will not be available',
      );
    }
  }

  /**
   * Transcribe audio from a file path
   */
  async transcribeFile(
    filePath: string,
    language?: string,
    model: string = 'whisper-1',
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath);

    const response = await this.openai.audio.transcriptions.create({
      file: fileStream,
      model,
      language,
      response_format: 'verbose_json',
    });

    return {
      text: response.text,
      language: response.language,
      duration: response.duration,
      model,
    };
  }

  /**
   * Transcribe audio from a buffer
   */
  async transcribeBuffer(
    buffer: Buffer,
    filename: string,
    language?: string,
    model: string = 'whisper-1',
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    // Create a Blob and then a File object from the buffer
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: this.getMimeType(filename) });
    const file = new File([blob], filename, {
      type: this.getMimeType(filename),
    });

    const response = await this.openai.audio.transcriptions.create({
      file,
      model,
      language,
      response_format: 'verbose_json',
    });

    return {
      text: response.text,
      language: response.language,
      duration: response.duration,
      model,
    };
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'flac',
      'm4a',
      'mp3',
      'mp4',
      'mpeg',
      'mpga',
      'oga',
      'ogg',
      'wav',
      'webm',
    ];
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): { code: string; name: string }[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
    ];
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      flac: 'audio/flac',
      m4a: 'audio/m4a',
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      mpeg: 'audio/mpeg',
      mpga: 'audio/mpeg',
      oga: 'audio/ogg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      webm: 'audio/webm',
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}
