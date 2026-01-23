/**
 * Documentation API Routes - Community Edition
 *
 * Serves markdown documentation files from /docs/ folder
 * Provides metadata and keyword search functionality
 * 
 * Note: RAG/semantic search requires Pro Edition (Qdrant + embeddings)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveDocsDir } from '../utils/docsPath.js';

// Path to docs folder (works in Docker + local dev)
const DOCS_DIR = resolveDocsDir();

const DEFAULT_EXCLUDED_DIRS = new Set(['internal', 'archived']);

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
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/[_/]/g, '-');
}

async function listMarkdownFiles(
  rootDir: string,
  options: { excludeDirs?: Set<string> } = {}
): Promise<string[]> {
  const excludeDirs = options.excludeDirs ?? new Set<string>();
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        const topLevelDir = relativePath.split('/')[0];
        if (excludeDirs.has(topLevelDir)) continue;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

function normalizeRequestedPath(rawIdentifier: string): string {
  let decoded = rawIdentifier;
  try {
    decoded = decodeURIComponent(rawIdentifier);
  } catch {
    // Keep raw if decode fails (Fastify already decoded most cases)
  }

  const normalized = decoded.replace(/\\/g, '/').trim();

  // Basic safety: no null bytes, no absolute paths, no traversal segments
  if (!normalized || normalized.includes('\0')) return '';
  if (normalized.startsWith('/') || normalized.startsWith('..')) return '';
  if (normalized.split('/').some((part) => part === '..')) return '';

  return normalized;
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
      const mdFiles = await listMarkdownFiles(DOCS_DIR, { excludeDirs: DEFAULT_EXCLUDED_DIRS });

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
    const { identifier: rawIdentifier } = request.params;
    const identifier = normalizeRequestedPath(rawIdentifier);

    if (!identifier) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }

    try {
      // Try direct filename first
      let filename = identifier;

      // If not ending in .md, treat as slug and find matching file
      if (!identifier.endsWith('.md')) {
        const mdFiles = await listMarkdownFiles(DOCS_DIR, { excludeDirs: DEFAULT_EXCLUDED_DIRS });

        // Find file matching the slug
        filename = mdFiles.find((f) => fileToSlug(f) === identifier.toLowerCase()) || '';

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
   * Search documentation content (keyword search)
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
      const mdFiles = await listMarkdownFiles(DOCS_DIR, { excludeDirs: DEFAULT_EXCLUDED_DIRS });

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

  // RAG/semantic search routes removed - Community Edition
  // Upgrade to Pro for AI-powered semantic search with Qdrant
}
