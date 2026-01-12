/**
 * @file services/vector-db.ts
 * @description Vector database stub for Community Edition
 * 
 * Vector database features are disabled in Community Edition.
 * Upgrade to Pro for AI-powered semantic search and RAG capabilities.
 */

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
  async ensureCollection(): Promise<void> {
    console.log('VectorDB disabled in Community Edition');
  }

  async upsertDocuments(_documents: VectorDocument[]): Promise<void> {
    console.log('VectorDB disabled in Community Edition');
  }

  async search(
    _embedding: number[],
    _limit: number = 5,
    _filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    return [];
  }

  async deleteDocument(_id: string): Promise<void> {}

  async deleteByFilter(_filter: Record<string, any>): Promise<void> {}

  async getCollectionInfo(): Promise<null> {
    return null;
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

// Singleton instance
export const vectorDB = new VectorDB();
