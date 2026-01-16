import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import type { RetrievedContext } from './dto/rag.dto';

interface VectorDocument {
  id: string;
  content: string;
  source: string;
  sourceType: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

@Injectable()
export class RagService implements OnModuleInit {
  private qdrant: QdrantClient | null = null;
  private openai: OpenAI | null = null;
  private vectorSize: number;
  private defaultLlmModel: string;

  constructor(
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
  ) {
    this.vectorSize = this.configService.get<number>('vectorSize', 1536);
    this.defaultLlmModel = this.configService.get<string>(
      'defaultLlmModel',
      'gpt-4o-mini',
    );
  }

  onModuleInit() {
    const qdrantUrl = this.configService.get<string>('qdrantUrl');
    const qdrantApiKey = this.configService.get<string>('qdrantApiKey');

    if (qdrantUrl) {
      this.qdrant = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey,
      });
    }

    const openaiKey = this.configService.get<string>('openaiApiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  /**
   * Ensure a collection exists
   */
  private async ensureCollection(collectionName: string): Promise<void> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === collectionName,
      );

      if (!exists) {
        await this.qdrant.createCollection(collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        console.log(`Created Qdrant collection: ${collectionName}`);
      }
    } catch (error) {
      console.error('Error ensuring collection:', error);
      throw error;
    }
  }

  /**
   * Index a document
   */
  async indexDocument(
    content: string,
    source: string,
    sourceType: string,
    metadata: Record<string, unknown>,
    collection: string,
  ): Promise<{ success: boolean; documentId: string }> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    const collectionName = `synthstack_${collection}`;
    await this.ensureCollection(collectionName);

    // Generate embedding
    const { embedding } = await this.embeddingsService.generateEmbedding(content);

    const documentId = uuidv4();

    await this.qdrant.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: documentId,
          vector: embedding,
          payload: {
            content,
            source,
            source_type: sourceType,
            ...metadata,
          },
        },
      ],
    });

    return { success: true, documentId };
  }

  /**
   * Index a project document with chunking
   */
  async indexProjectDocument(
    documentId: string,
    projectId: string,
    filename: string,
    content: string,
    fileType: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
  ): Promise<{ success: boolean; chunksCreated: number; collection: string }> {
    const collection = `project_${projectId}`;
    const collectionName = `synthstack_${collection}`;
    await this.ensureCollection(collectionName);

    // Chunk the document
    const chunks = this.chunkText(content, chunkSize, chunkOverlap);

    // Index each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { embedding } = await this.embeddingsService.generateEmbedding(chunk);

      const chunkId = `${documentId}_chunk_${i}`;

      await this.qdrant!.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: chunkId,
            vector: embedding,
            payload: {
              content: chunk,
              source: `${filename} (chunk ${i + 1}/${chunks.length})`,
              source_type: 'project_document',
              document_id: documentId,
              project_id: projectId,
              filename,
              file_type: fileType,
              chunk_index: i,
              total_chunks: chunks.length,
            },
          },
        ],
      });
    }

    return {
      success: true,
      chunksCreated: chunks.length,
      collection,
    };
  }

  /**
   * Chunk text with overlap
   */
  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    if (!text) return [];

    const chunks: string[] = [];
    let start = 0;
    const textLength = text.length;

    while (start < textLength) {
      let end = start + chunkSize;

      // Find a good breaking point
      if (end < textLength) {
        const breakPoints = [
          text.lastIndexOf('. ', end),
          text.lastIndexOf('! ', end),
          text.lastIndexOf('? ', end),
          text.lastIndexOf('\n\n', end),
          text.lastIndexOf('\n', end),
          text.lastIndexOf(' ', end),
        ].filter((bp) => bp > start);

        if (breakPoints.length > 0) {
          end = Math.max(...breakPoints) + 1;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      start = end < textLength ? end - overlap : textLength;
    }

    return chunks;
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    collection: string = 'default',
    limit: number = 5,
    minScore: number = 0.5,
    sourceTypes?: string[],
  ): Promise<RetrievedContext[]> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    const collectionName = `synthstack_${collection}`;

    // Check if collection exists
    try {
      await this.qdrant.getCollection(collectionName);
    } catch {
      // Collection doesn't exist, return empty results
      return [];
    }

    const { embedding } = await this.embeddingsService.generateEmbedding(query);

    let filter: Record<string, unknown> | undefined;
    if (sourceTypes && sourceTypes.length > 0) {
      filter = {
        should: sourceTypes.map((type) => ({
          key: 'source_type',
          match: { value: type },
        })),
      };
    }

    const results = await this.qdrant.search(collectionName, {
      vector: embedding,
      limit,
      score_threshold: minScore,
      filter,
      with_payload: true,
    });

    return results.map((result) => ({
      content: (result.payload?.content as string) || '',
      source: (result.payload?.source as string) || '',
      sourceType: (result.payload?.source_type as string) || '',
      relevanceScore: result.score,
      metadata: {
        ...(result.payload as Record<string, unknown>),
        content: undefined,
        source: undefined,
        source_type: undefined,
      },
    }));
  }

  /**
   * RAG query - search and generate response
   */
  async query(
    queryText: string,
    collection: string = 'default',
    contextLimit: number = 5,
    model?: string,
    systemPrompt?: string,
  ): Promise<{
    answer: string;
    sources: RetrievedContext[];
    model: string;
    tokensUsed?: number;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Retrieve relevant context
    const contexts = await this.search(queryText, collection, contextLimit);

    // Format context for LLM
    const contextText = contexts
      .map(
        (ctx, i) =>
          `[Source ${i + 1}: ${ctx.source}]\n${ctx.content}`,
      )
      .join('\n\n---\n\n');

    const llmModel = model || this.defaultLlmModel;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          systemPrompt ||
          `You are a helpful assistant that answers questions based on the provided context.
If the context doesn't contain relevant information, say so.
Always cite your sources when providing information.`,
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\n---\n\nQuestion: ${queryText}`,
      },
    ];

    const response = await this.openai.chat.completions.create({
      model: llmModel,
      messages,
      temperature: 0.7,
    });

    return {
      answer: response.choices[0]?.message?.content || '',
      sources: contexts,
      model: llmModel,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    const collections = await this.qdrant.getCollections();
    return collections.collections
      .filter((col) => col.name.startsWith('synthstack_'))
      .map((col) => col.name.replace('synthstack_', ''));
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collection: string): Promise<void> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    const collectionName = `synthstack_${collection}`;
    await this.qdrant.deleteCollection(collectionName);
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<Record<string, unknown>> {
    if (!this.qdrant) {
      throw new Error('Qdrant client not initialized');
    }

    const collections = await this.qdrant.getCollections();
    const synthstackCollections = collections.collections.filter((col) =>
      col.name.startsWith('synthstack_'),
    );

    const stats: Record<string, unknown> = {
      totalCollections: synthstackCollections.length,
      collections: {},
    };

    for (const col of synthstackCollections) {
      try {
        const info = await this.qdrant.getCollection(col.name);
        (stats.collections as Record<string, unknown>)[
          col.name.replace('synthstack_', '')
        ] = {
          vectorsCount: info.indexed_vectors_count || 0,
          pointsCount: info.points_count || 0,
        };
      } catch {
        // Ignore errors
      }
    }

    return stats;
  }
}
