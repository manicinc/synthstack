import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from '../../../src/transcription/transcription.service';
import * as fs from 'fs';

jest.mock('fs');

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let configService: ConfigService;

  const mockOpenAI = {
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'Transcribed text',
          language: 'en',
          duration: 5.0,
        }),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'openaiApiKey') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the OpenAI client
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transcribeFile', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({} as any);
    });

    it('should transcribe audio file', async () => {
      const result = await service.transcribeFile('/path/to/audio.mp3');
      expect(result.text).toBe('Transcribed text');
      expect(result.model).toBe('whisper-1');
    });

    it('should pass language parameter to API', async () => {
      await service.transcribeFile('/path/to/audio.mp3', 'es');
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es',
        }),
      );
    });

    it('should pass model parameter to API', async () => {
      await service.transcribeFile('/path/to/audio.mp3', undefined, 'whisper-1');
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
        }),
      );
    });

    it('should use verbose_json response format', async () => {
      await service.transcribeFile('/path/to/audio.mp3');
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: 'verbose_json',
        }),
      );
    });

    it('should throw error for non-existent file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(
        service.transcribeFile('/nonexistent/audio.mp3'),
      ).rejects.toThrow('Audio file not found');
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(
        service.transcribeFile('/path/to/audio.mp3'),
      ).rejects.toThrow('OpenAI client not initialized');
    });

    it('should include duration in result', async () => {
      const result = await service.transcribeFile('/path/to/audio.mp3');
      expect(result.duration).toBe(5.0);
    });

    it('should include language in result', async () => {
      const result = await service.transcribeFile('/path/to/audio.mp3');
      expect(result.language).toBe('en');
    });
  });

  describe('transcribeBuffer', () => {
    it('should transcribe audio buffer', async () => {
      const buffer = Buffer.from('audio data');
      const result = await service.transcribeBuffer(buffer, 'audio.mp3');
      expect(result.text).toBe('Transcribed text');
    });

    it('should pass language parameter to API', async () => {
      const buffer = Buffer.from('audio data');
      await service.transcribeBuffer(buffer, 'audio.mp3', 'fr');
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'fr',
        }),
      );
    });

    it('should pass model parameter to API', async () => {
      const buffer = Buffer.from('audio data');
      await service.transcribeBuffer(buffer, 'audio.mp3', undefined, 'whisper-1');
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
        }),
      );
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(
        service.transcribeBuffer(Buffer.from('test'), 'audio.mp3'),
      ).rejects.toThrow('OpenAI client not initialized');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats).toContain('mp3');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
      expect(formats).toContain('m4a');
      expect(formats).toContain('ogg');
      expect(formats).toContain('webm');
    });

    it('should return exactly 10 formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats).toHaveLength(10);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should include English', () => {
      const languages = service.getSupportedLanguages();
      const english = languages.find((l) => l.code === 'en');
      expect(english).toBeDefined();
      expect(english?.name).toBe('English');
    });

    it('should include Spanish', () => {
      const languages = service.getSupportedLanguages();
      const spanish = languages.find((l) => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish?.name).toBe('Spanish');
    });

    it('should include Chinese', () => {
      const languages = service.getSupportedLanguages();
      const chinese = languages.find((l) => l.code === 'zh');
      expect(chinese).toBeDefined();
      expect(chinese?.name).toBe('Chinese');
    });

    it('should have code and name for each language', () => {
      const languages = service.getSupportedLanguages();
      languages.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang.code.length).toBeGreaterThan(0);
        expect(lang.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getMimeType (private)', () => {
    it('should return correct mime type for mp3', () => {
      const mimeType = (service as any).getMimeType('audio.mp3');
      expect(mimeType).toBe('audio/mpeg');
    });

    it('should return correct mime type for wav', () => {
      const mimeType = (service as any).getMimeType('audio.wav');
      expect(mimeType).toBe('audio/wav');
    });

    it('should return correct mime type for flac', () => {
      const mimeType = (service as any).getMimeType('audio.flac');
      expect(mimeType).toBe('audio/flac');
    });

    it('should return correct mime type for ogg', () => {
      const mimeType = (service as any).getMimeType('audio.ogg');
      expect(mimeType).toBe('audio/ogg');
    });

    it('should return correct mime type for webm', () => {
      const mimeType = (service as any).getMimeType('audio.webm');
      expect(mimeType).toBe('audio/webm');
    });

    it('should return default mime type for unknown extension', () => {
      const mimeType = (service as any).getMimeType('audio.unknown');
      expect(mimeType).toBe('audio/mpeg');
    });

    it('should handle files without extension', () => {
      const mimeType = (service as any).getMimeType('audiofile');
      expect(mimeType).toBe('audio/mpeg');
    });
  });

  describe('isAvailable', () => {
    it('should return true when OpenAI client is initialized', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when OpenAI client is not initialized', () => {
      (service as any).openai = null;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize OpenAI client when API key is present', () => {
      const newService = new TranscriptionService(configService);
      newService.onModuleInit();
      expect((newService as any).openai).toBeDefined();
    });

    it('should not initialize OpenAI client when API key is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newService = new TranscriptionService(configService);
      newService.onModuleInit();

      expect((newService as any).openai).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
