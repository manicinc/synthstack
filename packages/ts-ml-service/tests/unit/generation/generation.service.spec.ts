import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerationService } from '../../../src/generation/generation.service';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      images: {
        generate: jest.fn(),
      },
    })),
  };
});

describe('GenerationService', () => {
  let service: GenerationService;
  let mockOpenAI: any;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);

    // Access the mocked OpenAI instance
    mockOpenAI = (service as any).openai;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateText', () => {
    const mockChatResponse = {
      choices: [
        {
          message: { content: 'Generated text response' },
        },
      ],
      model: 'gpt-3.5-turbo',
      usage: { total_tokens: 150 },
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockChatResponse);
    });

    it('should generate text with default model', async () => {
      const result = await service.generateText({
        prompt: 'Write a poem',
      });

      expect(result).toHaveProperty('id');
      expect(result.content).toBe('Generated text response');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.tokens_used).toBe(150);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should use specified model', async () => {
      await service.generateText({
        prompt: 'Write a poem',
        model: 'gpt-4',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should include system prompt when provided', async () => {
      await service.generateText({
        prompt: 'Write a poem',
        system_prompt: 'You are a poet',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a poet' },
            { role: 'user', content: 'Write a poem' },
          ]),
        }),
      );
    });

    it('should use default max_tokens of 1000', async () => {
      await service.generateText({
        prompt: 'Write a poem',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
        }),
      );
    });

    it('should use custom max_tokens when provided', async () => {
      await service.generateText({
        prompt: 'Write a poem',
        max_tokens: 500,
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500,
        }),
      );
    });

    it('should use default temperature of 0.7', async () => {
      await service.generateText({
        prompt: 'Write a poem',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        }),
      );
    });

    it('should use custom temperature when provided', async () => {
      await service.generateText({
        prompt: 'Write a poem',
        temperature: 0.9,
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        }),
      );
    });

    it('should generate unique IDs', async () => {
      const result1 = await service.generateText({ prompt: 'Test 1' });
      const result2 = await service.generateText({ prompt: 'Test 2' });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('generateImage', () => {
    const mockImageResponse = {
      data: [
        {
          url: 'https://example.com/image.png',
          revised_prompt: 'A beautiful sunset revised',
        },
      ],
    };

    beforeEach(() => {
      mockOpenAI.images.generate.mockResolvedValue(mockImageResponse);
    });

    it('should generate image with default settings', async () => {
      const result = await service.generateImage({
        prompt: 'A sunset',
      });

      expect(result).toHaveProperty('id');
      expect(result.image_url).toBe('https://example.com/image.png');
      expect(result.revised_prompt).toBe('A beautiful sunset revised');
      expect(result.size).toBe('1024x1024');
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should use specified size', async () => {
      await service.generateImage({
        prompt: 'A sunset',
        size: '1792x1024',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '1792x1024',
        }),
      );
    });

    it('should use specified quality', async () => {
      await service.generateImage({
        prompt: 'A sunset',
        quality: 'hd',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 'hd',
        }),
      );
    });

    it('should use specified style', async () => {
      await service.generateImage({
        prompt: 'A sunset',
        style: 'natural',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'natural',
        }),
      );
    });

    it('should use DALL-E 3 model', async () => {
      await service.generateImage({
        prompt: 'A sunset',
      });

      expect(mockOpenAI.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'dall-e-3',
        }),
      );
    });

    it('should generate unique IDs', async () => {
      const result1 = await service.generateImage({ prompt: 'Test 1' });
      const result2 = await service.generateImage({ prompt: 'Test 2' });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('chatCompletions', () => {
    const mockChatResponse = {
      choices: [
        {
          message: { role: 'assistant', content: 'Hello! How can I help?' },
          finish_reason: 'stop',
        },
      ],
      model: 'gpt-3.5-turbo',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockChatResponse);
    });

    it('should complete chat with messages', async () => {
      const result = await service.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result).toHaveProperty('id');
      expect(result.content).toBe('Hello! How can I help?');
      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should include usage information', async () => {
      const result = await service.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.usage.prompt_tokens).toBe(10);
      expect(result.usage.completion_tokens).toBe(20);
      expect(result.usage.total_tokens).toBe(30);
    });

    it('should include choices array', async () => {
      const result = await service.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.role).toBe('assistant');
      expect(result.choices[0].message.content).toBe('Hello! How can I help?');
      expect(result.choices[0].finish_reason).toBe('stop');
    });

    it('should pass all messages to OpenAI', async () => {
      await service.chatCompletions({
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'How are you?' },
          ],
        }),
      );
    });

    it('should use specified model', async () => {
      await service.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should use default max_tokens of 500', async () => {
      await service.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500,
        }),
      );
    });

    it('should generate unique IDs', async () => {
      const result1 = await service.chatCompletions({
        messages: [{ role: 'user', content: 'Test 1' }],
      });
      const result2 = await service.chatCompletions({
        messages: [{ role: 'user', content: 'Test 2' }],
      });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const result = service.getAvailableModels();

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('image');
    });

    it('should include text models', () => {
      const result = service.getAvailableModels();

      expect(result.text.length).toBeGreaterThan(0);
      expect(result.text.some(m => m.id === 'gpt-3.5-turbo')).toBe(true);
      expect(result.text.some(m => m.id === 'gpt-4-turbo')).toBe(true);
      expect(result.text.some(m => m.id === 'gpt-4')).toBe(true);
    });

    it('should include image models', () => {
      const result = service.getAvailableModels();

      expect(result.image.length).toBeGreaterThan(0);
      expect(result.image.some(m => m.id === 'dall-e-3')).toBe(true);
    });

    it('should include model details', () => {
      const result = service.getAvailableModels();

      expect(result.text[0]).toHaveProperty('id');
      expect(result.text[0]).toHaveProperty('name');
      expect(result.text[0]).toHaveProperty('description');
    });
  });
});
