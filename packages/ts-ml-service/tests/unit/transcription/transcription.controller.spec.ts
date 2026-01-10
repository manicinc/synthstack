import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { TranscriptionController } from '../../../src/transcription/transcription.controller';
import { TranscriptionService, TranscriptionResult } from '../../../src/transcription/transcription.service';

describe('TranscriptionController', () => {
  let controller: TranscriptionController;
  let transcriptionService: TranscriptionService;

  const mockTranscriptionResult: TranscriptionResult = {
    text: 'Hello, this is a transcription.',
    language: 'en',
    duration: 5.5,
    model: 'whisper-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranscriptionController],
      providers: [
        {
          provide: TranscriptionService,
          useValue: {
            transcribeFile: jest.fn().mockResolvedValue(mockTranscriptionResult),
            transcribeBuffer: jest.fn().mockResolvedValue(mockTranscriptionResult),
            getSupportedFormats: jest.fn().mockReturnValue(['mp3', 'wav', 'flac']),
            getSupportedLanguages: jest.fn().mockReturnValue([
              { code: 'en', name: 'English' },
              { code: 'es', name: 'Spanish' },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<TranscriptionController>(TranscriptionController);
    transcriptionService = module.get<TranscriptionService>(TranscriptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('transcribeFile', () => {
    it('should transcribe audio file successfully', async () => {
      const result = await controller.transcribeFile({
        filePath: '/path/to/audio.mp3',
      });
      expect(result.success).toBe(true);
      expect(result.transcription.text).toBe('Hello, this is a transcription.');
    });

    it('should pass all parameters to service', async () => {
      await controller.transcribeFile({
        filePath: '/path/to/audio.mp3',
        language: 'es',
        model: 'whisper-1',
      });

      expect(transcriptionService.transcribeFile).toHaveBeenCalledWith(
        '/path/to/audio.mp3',
        'es',
        'whisper-1',
      );
    });

    it('should use default model when not specified', async () => {
      await controller.transcribeFile({
        filePath: '/path/to/audio.mp3',
      });

      expect(transcriptionService.transcribeFile).toHaveBeenCalledWith(
        '/path/to/audio.mp3',
        undefined,
        undefined,
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(transcriptionService, 'transcribeFile')
        .mockRejectedValue(new Error('Transcription failed'));

      await expect(
        controller.transcribeFile({ filePath: '/path/to/audio.mp3' }),
      ).rejects.toThrow(HttpException);
    });

    it('should include transcription result in response', async () => {
      const result = await controller.transcribeFile({
        filePath: '/path/to/audio.mp3',
      });
      expect(result.transcription).toEqual(mockTranscriptionResult);
    });
  });

  describe('transcribeBase64', () => {
    it('should transcribe base64 audio successfully', async () => {
      const base64Audio = Buffer.from('test audio').toString('base64');
      const result = await controller.transcribeBase64({
        audio: base64Audio,
        filename: 'audio.mp3',
      });
      expect(result.success).toBe(true);
      expect(result.transcription.text).toBe('Hello, this is a transcription.');
    });

    it('should convert base64 to buffer', async () => {
      const base64Audio = Buffer.from('test audio').toString('base64');
      await controller.transcribeBase64({
        audio: base64Audio,
        filename: 'audio.mp3',
      });

      expect(transcriptionService.transcribeBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio.mp3',
        undefined,
        undefined,
      );
    });

    it('should pass language and model parameters', async () => {
      const base64Audio = Buffer.from('test').toString('base64');
      await controller.transcribeBase64({
        audio: base64Audio,
        filename: 'audio.mp3',
        language: 'fr',
        model: 'whisper-1',
      });

      expect(transcriptionService.transcribeBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio.mp3',
        'fr',
        'whisper-1',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(transcriptionService, 'transcribeBuffer')
        .mockRejectedValue(new Error('Buffer transcription failed'));

      await expect(
        controller.transcribeBase64({
          audio: Buffer.from('test').toString('base64'),
          filename: 'audio.mp3',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const result = controller.getSupportedFormats();
      expect(result.success).toBe(true);
      expect(result.formats).toEqual(['mp3', 'wav', 'flac']);
    });

    it('should call service getSupportedFormats', () => {
      controller.getSupportedFormats();
      expect(transcriptionService.getSupportedFormats).toHaveBeenCalled();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', () => {
      const result = controller.getSupportedLanguages();
      expect(result.success).toBe(true);
      expect(result.languages).toHaveLength(2);
    });

    it('should include language codes and names', () => {
      const result = controller.getSupportedLanguages();
      expect(result.languages[0]).toHaveProperty('code');
      expect(result.languages[0]).toHaveProperty('name');
    });

    it('should call service getSupportedLanguages', () => {
      controller.getSupportedLanguages();
      expect(transcriptionService.getSupportedLanguages).toHaveBeenCalled();
    });
  });
});
