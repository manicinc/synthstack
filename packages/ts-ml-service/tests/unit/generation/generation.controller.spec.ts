import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GenerationController, ChatController } from '../../../src/generation/generation.controller';
import { GenerationService } from '../../../src/generation/generation.service';

describe('GenerationController', () => {
  let controller: GenerationController;
  let generationService: GenerationService;

  const mockTextResult = {
    id: 'text-123',
    content: 'Generated text content',
    model: 'gpt-3.5-turbo',
    tokens_used: 150,
    processing_time_ms: 500,
  };

  const mockImageResult = {
    id: 'img-456',
    image_url: 'https://example.com/image.png',
    revised_prompt: 'A beautiful sunset over mountains',
    size: '1024x1024',
    processing_time_ms: 3000,
  };

  const mockModels = {
    text: [
      { id: 'gpt-3.5-turbo', credits_per_use: 1 },
      { id: 'gpt-4-turbo', credits_per_use: 3 },
      { id: 'gpt-4', credits_per_use: 5 },
    ],
    image: [
      { id: 'dall-e-3', sizes: ['1024x1024', '1792x1024', '1024x1792'] },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [
        {
          provide: GenerationService,
          useValue: {
            generateText: jest.fn().mockResolvedValue(mockTextResult),
            generateImage: jest.fn().mockResolvedValue(mockImageResult),
            getAvailableModels: jest.fn().mockReturnValue(mockModels),
          },
        },
      ],
    }).compile();

    controller = module.get<GenerationController>(GenerationController);
    generationService = module.get<GenerationService>(GenerationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const result = await controller.generateText({
        prompt: 'Write a poem about AI',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('text-123');
      expect(result.content).toBe('Generated text content');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.tokens_used).toBe(150);
    });

    it('should pass all parameters to service', async () => {
      await controller.generateText({
        prompt: 'Write a poem',
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.8,
        system_prompt: 'You are a poet',
      });

      expect(generationService.generateText).toHaveBeenCalledWith({
        prompt: 'Write a poem',
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.8,
        system_prompt: 'You are a poet',
      });
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(generationService, 'generateText')
        .mockRejectedValue(new Error('API error'));

      await expect(
        controller.generateText({ prompt: 'Test' }),
      ).rejects.toThrow(HttpException);
    });

    it('should include error message in exception', async () => {
      jest
        .spyOn(generationService, 'generateText')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      try {
        await controller.generateText({ prompt: 'Test' });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const result = await controller.generateImage({
        prompt: 'A sunset over mountains',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('img-456');
      expect(result.image_url).toBe('https://example.com/image.png');
      expect(result.size).toBe('1024x1024');
    });

    it('should pass all parameters to service', async () => {
      await controller.generateImage({
        prompt: 'A sunset',
        size: '1792x1024',
        quality: 'hd',
        style: 'vivid',
      });

      expect(generationService.generateImage).toHaveBeenCalledWith({
        prompt: 'A sunset',
        size: '1792x1024',
        quality: 'hd',
        style: 'vivid',
      });
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(generationService, 'generateImage')
        .mockRejectedValue(new Error('Content policy violation'));

      await expect(
        controller.generateImage({ prompt: 'Test' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('listModels', () => {
    it('should return available models', () => {
      const result = controller.listModels();

      expect(result.success).toBe(true);
      expect(result.models).toEqual(mockModels);
    });

    it('should include text and image models', () => {
      const result = controller.listModels();

      expect(result.models).toHaveProperty('text');
      expect(result.models).toHaveProperty('image');
      expect(result.models.text.length).toBeGreaterThan(0);
      expect(result.models.image.length).toBeGreaterThan(0);
    });
  });
});

describe('ChatController', () => {
  let controller: ChatController;
  let generationService: GenerationService;

  const mockChatResult = {
    id: 'chat-789',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello! How can I help?' },
        finish_reason: 'stop',
      },
    ],
    content: 'Hello! How can I help?',
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
    model: 'gpt-3.5-turbo',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: GenerationService,
          useValue: {
            chatCompletions: jest.fn().mockResolvedValue(mockChatResult),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    generationService = module.get<GenerationService>(GenerationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chatCompletions', () => {
    it('should generate chat completion successfully', async () => {
      const result = await controller.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('chat-789');
      expect(result.content).toBe('Hello! How can I help?');
      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should pass all parameters to service', async () => {
      await controller.chatCompletions({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.7,
      });

      expect(generationService.chatCompletions).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.7,
      });
    });

    it('should include usage information', async () => {
      const result = await controller.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.usage).toBeDefined();
      expect(result.usage.prompt_tokens).toBe(10);
      expect(result.usage.completion_tokens).toBe(20);
      expect(result.usage.total_tokens).toBe(30);
    });

    it('should include choices array', async () => {
      const result = await controller.chatCompletions({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.choices).toBeDefined();
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.role).toBe('assistant');
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(generationService, 'chatCompletions')
        .mockRejectedValue(new Error('API error'));

      await expect(
        controller.chatCompletions({
          messages: [{ role: 'user', content: 'Test' }],
        }),
      ).rejects.toThrow(HttpException);
    });
  });
});
