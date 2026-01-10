import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/index.js';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

class VectorDB {
  private client: QdrantClient;
  private collectionName = 'synthstack_docs';
  private vectorSize = 1536; // text-embedding-3-small dimension

  private isMissingCollectionError(error: any): boolean {
    const message =
      error?.data?.status?.error ||
      error?.status?.error ||
      error?.message ||
      '';
    return (
      typeof message === 'string' &&
      message.toLowerCase().includes("collection `synthstack_docs` doesn't exist")
    );
  }

  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      // Skip version compatibility check (client v1.16.2, server v1.7.4)
      // The API is stable and compatible despite version difference
      https: false, // Using http in development
    });
  }

  /**
   * Ensure the collection exists with proper configuration
   */
  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('Error ensuring collection:', error);
      throw error;
    }
  }

  /**
   * Upsert documents with embeddings into the vector database
   */
  async upsertDocuments(documents: VectorDocument[]): Promise<void> {
    if (documents.length === 0) return;

    await this.ensureCollection();

    const points = documents.map((doc) => {
      if (!doc.embedding || doc.embedding.length !== this.vectorSize) {
        throw new Error(
          `Document ${doc.id} missing valid embedding (expected ${this.vectorSize} dimensions)`
        );
      }

      return {
        id: doc.id,
        vector: doc.embedding,
        payload: {
          content: doc.content,
          ...doc.metadata,
        },
      };
    });

    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });
      console.log(`Upserted ${documents.length} documents to Qdrant`);
    } catch (error) {
      console.error('Error upserting documents:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async search(
    embedding: number[],
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    if (embedding.length !== this.vectorSize) {
      throw new Error(
        `Invalid embedding size: expected ${this.vectorSize}, got ${embedding.length}`
      );
    }

    await this.ensureCollection();

    try {
      const searchResults = await this.client.search(this.collectionName, {
        vector: embedding,
        limit,
        filter: filter
          ? {
              must: Object.entries(filter).map(([key, value]) => ({
                key,
                match: { value },
              })),
            }
          : undefined,
        with_payload: true,
      });

      return searchResults.map((result) => ({
        id: String(result.id),
        score: result.score,
        content: result.payload?.content as string,
        metadata: {
          ...result.payload,
          content: undefined, // Remove content from metadata to avoid duplication
        },
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Delete a document from the vector database
   */
  async deleteDocument(id: string): Promise<void> {
    await this.ensureCollection();
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });
      console.log(`Deleted document ${id} from Qdrant`);
    } catch (error) {
      if (this.isMissingCollectionError(error)) {
        console.warn(
          `Collection ${this.collectionName} missing while deleting document ${id}, skipping`
        );
        return;
      }
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Delete multiple documents by filter
   */
  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    await this.ensureCollection();
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        },
      });
      console.log(`Deleted documents matching filter from Qdrant`);
    } catch (error) {
      if (this.isMissingCollectionError(error)) {
        console.warn(
          `Collection ${this.collectionName} missing while deleting by filter, skipping`
        );
        return;
      }
      console.error('Error deleting documents by filter:', error);
      throw error;
    }
  }

  /**
   * Get collection info and stats
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('Error getting collection info:', error);
      throw error;
    }
  }

  /**
   * Health check - verify Qdrant is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const vectorDB = new VectorDB();
