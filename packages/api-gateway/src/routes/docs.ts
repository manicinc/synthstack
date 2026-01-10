/**
 * Documentation API Routes
 *
 * Serves markdown documentation files from /docs/ folder
 * Also provides metadata, search, and RAG-powered semantic search functionality
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { docsIngestionService } from '../services/docs-ingestion.js';
import { embeddingsService } from '../services/embeddings.js';

// Path to docs folder (relative to project root)
const DOCS_DIR = path.resolve(process.cwd(), '..', 'docs');

interface DocFile {
  filename: string;
  title: string;
  slug: string;
  size: number;
  lastModified: string;
}

/**
 * Extract title from markdown content (first H1)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Convert filename to URL-friendly slug
 */
function fileToSlug(filename: string): string {
  return filename
    .replace('.md', '')
    .toLowerCase()
    .replace(/_/g, '-');
}

export default async function docsRoutes(fastify: FastifyInstance) {
  /**
   * List all available documentation files
   * GET /api/v1/docs
   */
  fastify.get('/', {
    schema: {
      tags: ['Docs'],
      summary: 'List all documentation files',
      response: {
        200: {
          type: 'object',
          properties: {
            docs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  title: { type: 'string' },
                  slug: { type: 'string' },
                  size: { type: 'number' },
                  lastModified: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await fs.readdir(DOCS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const docs: DocFile[] = await Promise.all(
        mdFiles.map(async (filename) => {
          const filePath = path.join(DOCS_DIR, filename);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');

          return {
            filename,
            title: extractTitle(content),
            slug: fileToSlug(filename),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        })
      );

      // Sort alphabetically by title
      docs.sort((a, b) => a.title.localeCompare(b.title));

      return { docs };
    } catch (error) {
      fastify.log.error(error, 'Failed to list docs');
      return reply.status(500).send({ error: 'Failed to list documentation files' });
    }
  });

  /**
   * Get a single documentation file by filename or slug
   * GET /api/v1/docs/:identifier
   */
  fastify.get<{
    Params: { identifier: string };
  }>('/:identifier', {
    schema: {
      tags: ['Docs'],
      summary: 'Get documentation file content',
      params: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Filename or slug (e.g., ADMIN_CMS.md or admin-cms)' },
        },
        required: ['identifier'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            content: { type: 'string' },
            lastModified: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { identifier } = request.params;

    // Security: prevent directory traversal
    if (identifier.includes('..') || identifier.includes('/') || identifier.includes('\\')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }

    try {
      // Try direct filename first
      let filename = identifier;

      // If not ending in .md, treat as slug and find matching file
      if (!identifier.endsWith('.md')) {
        const files = await fs.readdir(DOCS_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        // Find file matching the slug
        filename = mdFiles.find(f => fileToSlug(f) === identifier.toLowerCase()) || '';

        if (!filename) {
          return reply.status(404).send({ error: 'Document not found' });
        }
      }

      const filePath = path.join(DOCS_DIR, filename);

      // Check file exists and is in docs directory
      const realPath = await fs.realpath(filePath);
      const realDocsDir = await fs.realpath(DOCS_DIR);

      if (!realPath.startsWith(realDocsDir)) {
        return reply.status(400).send({ error: 'Invalid path' });
      }

      const [content, stats] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath),
      ]);

      return {
        filename,
        title: extractTitle(content),
        slug: fileToSlug(filename),
        content,
        lastModified: stats.mtime.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Document not found' });
      }
      fastify.log.error(error, 'Failed to read doc');
      return reply.status(500).send({ error: 'Failed to read documentation file' });
    }
  });

  /**
   * Search documentation content
   * GET /api/v1/docs/search?q=query
   */
  fastify.get<{
    Querystring: { q: string };
  }>('/search', {
    schema: {
      tags: ['Docs'],
      summary: 'Search documentation content',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2 },
        },
        required: ['q'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  title: { type: 'string' },
                  slug: { type: 'string' },
                  excerpt: { type: 'string' },
                  matches: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { q } = request.query;
    const query = q.toLowerCase();

    try {
      const files = await fs.readdir(DOCS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const results = await Promise.all(
        mdFiles.map(async (filename) => {
          const filePath = path.join(DOCS_DIR, filename);
          const content = await fs.readFile(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();

          // Count matches
          let matches = 0;
          let idx = 0;
          while ((idx = lowerContent.indexOf(query, idx)) !== -1) {
            matches++;
            idx += query.length;
          }

          if (matches === 0) return null;

          // Extract excerpt around first match
          const firstMatch = lowerContent.indexOf(query);
          const start = Math.max(0, firstMatch - 50);
          const end = Math.min(content.length, firstMatch + query.length + 100);
          let excerpt = content.slice(start, end).replace(/\n/g, ' ').trim();

          if (start > 0) excerpt = '...' + excerpt;
          if (end < content.length) excerpt = excerpt + '...';

          return {
            filename,
            title: extractTitle(content),
            slug: fileToSlug(filename),
            excerpt,
            matches,
          };
        })
      );

      // Filter nulls and sort by match count
      const filtered = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.matches - a.matches);

      return { results: filtered };
    } catch (error) {
      fastify.log.error(error, 'Failed to search docs');
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  /**
   * Semantic search using RAG
   * GET /api/v1/docs/rag/search?q=query
   */
  fastify.get<{
    Querystring: { q: string; limit?: number; type?: string };
  }>('/rag/search', {
    schema: {
      tags: ['Docs'],
      summary: 'Semantic search documentation using AI embeddings',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2, description: 'Search query' },
          limit: { type: 'number', default: 5, description: 'Max results' },
          type: { type: 'string', enum: ['documentation', 'blog', 'all'], default: 'all' },
        },
        required: ['q'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  score: { type: 'number' },
                  title: { type: 'string' },
                  section: { type: 'string' },
                  content: { type: 'string' },
                  filename: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
            query: { type: 'string' },
            available: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { q, limit = 5, type = 'all' } = request.query;

    if (!embeddingsService.isAvailable()) {
      return {
        results: [],
        query: q,
        available: false,
      };
    }

    try {
      const results = await docsIngestionService.searchDocs(q, {
        limit,
        type: type as 'documentation' | 'blog' | 'all',
      });

      return {
        results,
        query: q,
        available: true,
      };
    } catch (error) {
      fastify.log.error(error, 'RAG search failed');
      return reply.status(500).send({ error: 'Semantic search failed' });
    }
  });

  /**
   * Trigger documentation re-ingestion
   * POST /api/v1/docs/rag/ingest
   */
  fastify.post('/rag/ingest', {
    schema: {
      tags: ['Docs'],
      summary: 'Re-ingest all documentation into RAG system',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  chunksCreated: { type: 'number' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.requireAdmin],
  }, async (request, reply) => {
    if (!embeddingsService.isAvailable()) {
      return reply.status(503).send({
        success: false,
        error: 'Embeddings service not available - check OPENAI_API_KEY',
      });
    }

    try {
      const results = await docsIngestionService.ingestAll();

      return {
        success: true,
        results,
      };
    } catch (error) {
      fastify.log.error(error, 'Documentation ingestion failed');
      return reply.status(500).send({ error: 'Ingestion failed' });
    }
  });

  /**
   * Get RAG system status
   * GET /api/v1/docs/rag/status
   */
  fastify.get('/rag/status', {
    schema: {
      tags: ['Docs'],
      summary: 'Get RAG system status and stats',
      response: {
        200: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            docsPath: { type: 'string' },
            indexedFiles: { type: 'number' },
            embeddingModel: { type: 'string' },
            vectorDimensions: { type: 'number' },
          },
        },
      },
    },
  }, async () => {
    const stats = await docsIngestionService.getStats();

    return {
      ...stats,
      embeddingModel: embeddingsService.getModel(),
      vectorDimensions: embeddingsService.getDimension(),
    };
  });
}
