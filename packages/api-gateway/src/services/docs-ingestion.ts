/**
 * Documentation Ingestion Service
 *
 * Automatically ingests markdown documentation files into the vector database
 * for RAG-powered search and AI context retrieval.
 *
 * @module services/docs-ingestion
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { embeddingsService } from './embeddings.js';
import { vectorDB, type VectorDocument } from './vector-db.js';
import type { FastifyInstance } from 'fastify';

export interface DocChunk {
  id: string;
  filename: string;
  title: string;
  section: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: 'markdown' | 'directus';
    slug: string;
    fileHash: string;
    chunkIndex: number;
    totalChunks: number;
    updatedAt: string;
  };
}

interface IngestionResult {
  filename: string;
  chunksCreated: number;
  status: 'success' | 'skipped' | 'error';
  message?: string;
}

class DocsIngestionService {
  private fastify: FastifyInstance | null = null;
  private docsPath: string;
  private fileHashes: Map<string, string> = new Map();

  constructor() {
    // Default docs path - can be overridden
    this.docsPath = path.join(process.cwd(), '..', '..', 'docs');
  }

  /**
   * Initialize the service with Fastify instance
   */
  init(fastify: FastifyInstance) {
    this.fastify = fastify;
    return this;
  }

  /**
   * Set the docs directory path
   */
  setDocsPath(docsPath: string) {
    this.docsPath = docsPath;
    return this;
  }

  /**
   * Generate a content hash for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Extract title from markdown content
   */
  private extractTitle(content: string, filename: string): string {
    // Try to find first H1
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Fallback to filename
    return filename.replace(/\.md$/, '').replace(/[_-]/g, ' ');
  }

  /**
   * Split content into chunks by headings
   * This creates semantic chunks that preserve context
   */
  private chunkByHeadings(
    content: string,
    filename: string,
    maxChunkSize: number = 4000
  ): Array<{ title: string; section: string; content: string }> {
    const chunks: Array<{ title: string; section: string; content: string }> = [];
    const docTitle = this.extractTitle(content, filename);

    // Split by H2 headings
    const sections = content.split(/(?=^##\s)/m);

    for (const section of sections) {
      if (!section.trim()) continue;

      // Extract section heading
      const headingMatch = section.match(/^##\s+(.+)$/m);
      const sectionTitle = headingMatch ? headingMatch[1].trim() : 'Introduction';

      // If section is too large, split further
      if (section.length > maxChunkSize) {
        // Split by paragraphs
        const paragraphs = section.split(/\n\n+/);
        let currentChunk = '';

        for (const para of paragraphs) {
          if (currentChunk.length + para.length > maxChunkSize && currentChunk) {
            chunks.push({
              title: docTitle,
              section: sectionTitle,
              content: currentChunk.trim(),
            });
            currentChunk = para;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
          }
        }

        if (currentChunk.trim()) {
          chunks.push({
            title: docTitle,
            section: sectionTitle,
            content: currentChunk.trim(),
          });
        }
      } else {
        chunks.push({
          title: docTitle,
          section: sectionTitle,
          content: section.trim(),
        });
      }
    }

    return chunks;
  }

  /**
   * Process a single markdown file
   */
  async processFile(filename: string, content: string): Promise<DocChunk[]> {
    const fileHash = this.hashContent(content);
    const slug = filename.toLowerCase().replace(/\.md$/, '').replace(/_/g, '-');

    // Check if file has changed
    const previousHash = this.fileHashes.get(filename);
    if (previousHash === fileHash) {
      return []; // Skip unchanged files
    }

    const chunks = this.chunkByHeadings(content, filename);
    const docChunks: DocChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `doc_${slug}_${i}`;

      docChunks.push({
        id: chunkId,
        filename,
        title: chunk.title,
        section: chunk.section,
        content: chunk.content,
        metadata: {
          source: 'markdown',
          slug,
          fileHash,
          chunkIndex: i,
          totalChunks: chunks.length,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    this.fileHashes.set(filename, fileHash);
    return docChunks;
  }

  /**
   * Generate embeddings for doc chunks
   */
  async generateEmbeddings(chunks: DocChunk[]): Promise<DocChunk[]> {
    if (!embeddingsService.isAvailable()) {
      throw new Error('Embeddings service not available - check OPENAI_API_KEY');
    }

    // Prepare texts for embedding - include context for better retrieval
    const texts = chunks.map((chunk) => {
      return `# ${chunk.title}\n## ${chunk.section}\n\n${chunk.content}`;
    });

    const embeddings = await embeddingsService.generateEmbeddings(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }

  /**
   * Ingest a single file into the vector database
   */
  async ingestFile(filename: string): Promise<IngestionResult> {
    try {
      const filePath = path.join(this.docsPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');

      const chunks = await this.processFile(filename, content);

      if (chunks.length === 0) {
        return {
          filename,
          chunksCreated: 0,
          status: 'skipped',
          message: 'File unchanged',
        };
      }

      // Generate embeddings
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);

      // Prepare vector documents
      const vectorDocs: VectorDocument[] = chunksWithEmbeddings.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          ...chunk.metadata,
          title: chunk.title,
          section: chunk.section,
          filename: chunk.filename,
          type: 'documentation',
        },
      }));

      // Delete old chunks for this file first
      await vectorDB.deleteByFilter({ filename });

      // Upsert new chunks
      await vectorDB.upsertDocuments(vectorDocs);

      return {
        filename,
        chunksCreated: chunks.length,
        status: 'success',
      };
    } catch (error) {
      console.error(`Error ingesting ${filename}:`, error);
      return {
        filename,
        chunksCreated: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ingest all markdown files from the docs directory
   */
  async ingestAll(): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];

    try {
      // Check if docs directory exists
      await fs.access(this.docsPath);
    } catch {
      console.warn(`Docs directory not found: ${this.docsPath}`);
      return results;
    }

    try {
      const files = await fs.readdir(this.docsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      console.log(`Found ${mdFiles.length} markdown files to process`);

      for (const filename of mdFiles) {
        const result = await this.ingestFile(filename);
        results.push(result);

        if (result.status === 'success') {
          console.log(`✓ Ingested ${filename} (${result.chunksCreated} chunks)`);
        } else if (result.status === 'skipped') {
          console.log(`- Skipped ${filename} (unchanged)`);
        } else {
          console.log(`✗ Failed ${filename}: ${result.message}`);
        }
      }

      const successful = results.filter((r) => r.status === 'success').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      const failed = results.filter((r) => r.status === 'error').length;

      console.log(`\nIngestion complete: ${successful} processed, ${skipped} skipped, ${failed} failed`);
    } catch (error) {
      console.error('Error reading docs directory:', error);
    }

    return results;
  }

  /**
   * Ingest a blog post/tutorial from Directus
   */
  async ingestBlogPost(post: {
    id: string;
    title: string;
    slug: string;
    body: string;
    category?: string;
  }): Promise<IngestionResult> {
    try {
      const fileHash = this.hashContent(post.body);
      const chunks = this.chunkByHeadings(post.body, `${post.slug}.md`);

      const docChunks: DocChunk[] = chunks.map((chunk, i) => ({
        id: `blog_${post.slug}_${i}`,
        filename: `blog/${post.slug}`,
        title: post.title,
        section: chunk.section,
        content: chunk.content,
        metadata: {
          source: 'directus',
          slug: post.slug,
          fileHash,
          chunkIndex: i,
          totalChunks: chunks.length,
          updatedAt: new Date().toISOString(),
        },
      }));

      const chunksWithEmbeddings = await this.generateEmbeddings(docChunks);

      const vectorDocs: VectorDocument[] = chunksWithEmbeddings.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          ...chunk.metadata,
          title: chunk.title,
          section: chunk.section,
          filename: chunk.filename,
          type: 'blog',
          category: post.category,
        },
      }));

      // Delete old chunks first
      await vectorDB.deleteByFilter({ slug: post.slug, source: 'directus' });

      // Upsert new chunks
      await vectorDB.upsertDocuments(vectorDocs);

      return {
        filename: post.slug,
        chunksCreated: chunks.length,
        status: 'success',
      };
    } catch (error) {
      console.error(`Error ingesting blog post ${post.slug}:`, error);
      return {
        filename: post.slug,
        chunksCreated: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search documentation using semantic similarity
   */
  async searchDocs(
    query: string,
    options: {
      limit?: number;
      type?: 'documentation' | 'blog' | 'all';
    } = {}
  ): Promise<
    Array<{
      id: string;
      score: number;
      title: string;
      section: string;
      content: string;
      filename: string;
      type: string;
    }>
  > {
    const { limit = 5, type = 'all' } = options;

    // Generate embedding for query
    const embedding = await embeddingsService.generateEmbedding(query);

    // Build filter
    const filter: Record<string, any> | undefined =
      type !== 'all' ? { type } : undefined;

    // Search vector DB
    const results = await vectorDB.search(embedding, limit, filter);

    return results.map((result) => ({
      id: result.id,
      score: result.score,
      title: result.metadata.title || '',
      section: result.metadata.section || '',
      content: result.content,
      filename: result.metadata.filename || '',
      type: result.metadata.type || 'unknown',
    }));
  }

  /**
   * Get ingestion stats
   */
  async getStats(): Promise<{
    available: boolean;
    docsPath: string;
    indexedFiles: number;
    collectionInfo?: any;
  }> {
    const available = embeddingsService.isAvailable();

    let collectionInfo;
    try {
      collectionInfo = await vectorDB.getCollectionInfo();
    } catch {
      // Collection may not exist yet
    }

    return {
      available,
      docsPath: this.docsPath,
      indexedFiles: this.fileHashes.size,
      collectionInfo,
    };
  }
}

// Singleton instance
export const docsIngestionService = new DocsIngestionService();

/**
 * Initialize docs ingestion service with Fastify
 */
export function initDocsIngestionService(fastify: FastifyInstance) {
  docsIngestionService.init(fastify);

  // Auto-ingest docs on startup if embeddings are available
  if (embeddingsService.isAvailable()) {
    setTimeout(async () => {
      try {
        console.log('Starting automatic docs ingestion...');
        await docsIngestionService.ingestAll();
      } catch (error) {
        console.error('Auto-ingestion failed:', error);
      }
    }, 5000); // Delay to let other services start
  }
}
