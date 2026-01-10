import OpenAI from 'openai';
import { config } from '../config/index.js';
import { chunkingService, type Chunk, type ChunkOptions, type ChunkResult } from './chunking.js';

class EmbeddingsService {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    } else {
      console.warn('OpenAI API key not configured - embeddings will not be available');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: config.copilot.embeddingModel,
        input: text.trim(),
        encoding_format: 'float',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - check OPENAI_API_KEY');
    }

    if (texts.length === 0) {
      return [];
    }

    // Filter out empty strings
    const validTexts = texts.filter((text) => text && text.trim().length > 0);

    if (validTexts.length === 0) {
      throw new Error('Cannot generate embeddings for empty texts');
    }

    try {
      // OpenAI allows up to 2048 inputs per request for text-embedding-3-small
      const batchSize = 100;
      const embeddings: number[][] = [];

      for (let i = 0; i < validTexts.length; i += batchSize) {
        const batch = validTexts.slice(i, i + batchSize);

        const response = await this.openai.embeddings.create({
          model: config.copilot.embeddingModel,
          input: batch.map((text) => text.trim()),
          encoding_format: 'float',
        });

        embeddings.push(...response.data.map((item) => item.embedding));
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embedding for a document with chunking support
   * Uses semantic chunking to preserve meaning and context
   */
  async generateDocumentEmbedding(
    content: string,
    chunkSize: number = 4000
  ): Promise<{ chunks: string[]; embeddings: number[][] }> {
    if (!content || content.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty document');
    }

    // Use semantic chunking for better context preservation
    const chunkResult = chunkingService.chunk(content, {
      maxChunkSize: chunkSize,
      strategy: 'hybrid',
    });

    const chunks = chunkResult.chunks.map((c) => c.content);
    const embeddings = await this.generateEmbeddings(chunks);

    return { chunks, embeddings };
  }

  /**
   * Generate embeddings with full chunk metadata
   * Returns detailed chunk information for better RAG retrieval
   */
  async generateDocumentEmbeddingWithMetadata(
    content: string,
    options: Partial<ChunkOptions> = {}
  ): Promise<{ chunks: Chunk[]; embeddings: number[][] }> {
    if (!content || content.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty document');
    }

    const chunkResult = chunkingService.chunk(content, {
      maxChunkSize: 4000,
      strategy: 'hybrid',
      ...options,
    });

    const chunkTexts = chunkResult.chunks.map((c) => c.content);
    const embeddings = await this.generateEmbeddings(chunkTexts);

    return { chunks: chunkResult.chunks, embeddings };
  }

  /**
   * Check if embeddings service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Get the embedding model being used
   */
  getModel(): string {
    return config.copilot.embeddingModel;
  }

  /**
   * Get the embedding dimension (1536 for text-embedding-3-small)
   */
  getDimension(): number {
    // text-embedding-3-small and text-embedding-3-large both support custom dimensions
    // but default to 1536 for small and 3072 for large
    return config.copilot.embeddingModel.includes('small') ? 1536 : 3072;
  }
}

// Singleton instance
export const embeddingsService = new EmbeddingsService();
