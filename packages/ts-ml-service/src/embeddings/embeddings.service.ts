import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { EmbeddingModel } from './dto/embedding.dto';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private openai: OpenAI | null = null;
  private defaultModel: string;

  constructor(private configService: ConfigService) {
    this.defaultModel = this.configService.get<string>(
      'embeddingModel',
      'text-embedding-3-small',
    );
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('openaiApiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn(
        'OpenAI API key not configured - embeddings will not be available',
      );
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    model?: string,
  ): Promise<{ embedding: number[]; model: string; dimensions: number }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const modelToUse = model || this.defaultModel;

    const response = await this.openai.embeddings.create({
      model: modelToUse,
      input: text.trim(),
      encoding_format: 'float',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    const embedding = response.data[0].embedding;
    return {
      embedding,
      model: modelToUse,
      dimensions: embedding.length,
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(
    texts: string[],
    model?: string,
  ): Promise<{ embeddings: number[][]; model: string; dimensions: number }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    if (texts.length === 0) {
      return { embeddings: [], model: model || this.defaultModel, dimensions: 0 };
    }

    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error('Cannot generate embeddings for empty texts');
    }

    const modelToUse = model || this.defaultModel;
    const batchSize = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < validTexts.length; i += batchSize) {
      const batch = validTexts.slice(i, i + batchSize);

      const response = await this.openai.embeddings.create({
        model: modelToUse,
        input: batch.map((text) => text.trim()),
        encoding_format: 'float',
      });

      embeddings.push(...response.data.map((item) => item.embedding));
    }

    return {
      embeddings,
      model: modelToUse,
      dimensions: embeddings[0]?.length || 0,
    };
  }

  /**
   * Calculate cosine similarity between two texts
   */
  async calculateSimilarity(
    text1: string,
    text2: string,
    model?: string,
  ): Promise<{ similarity: number; model: string }> {
    const [result1, result2] = await Promise.all([
      this.generateEmbedding(text1, model),
      this.generateEmbedding(text2, model),
    ]);

    const similarity = this.cosineSimilarity(result1.embedding, result2.embedding);
    return { similarity, model: result1.model };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get available embedding models
   */
  getAvailableModels(): EmbeddingModel[] {
    return [
      {
        id: 'text-embedding-3-small',
        dimensions: 1536,
        maxTokens: 8191,
        provider: 'openai',
        description: 'Most cost-effective embedding model',
      },
      {
        id: 'text-embedding-3-large',
        dimensions: 3072,
        maxTokens: 8191,
        provider: 'openai',
        description: 'Highest accuracy embedding model',
      },
      {
        id: 'text-embedding-ada-002',
        dimensions: 1536,
        maxTokens: 8191,
        provider: 'openai',
        description: 'Legacy embedding model',
      },
    ];
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}
