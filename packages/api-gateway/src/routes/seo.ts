/**
 * SEO Keywords API Routes
 *
 * Endpoints for managing SEO keywords and optimization.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  seoService,
  type KeywordCategory,
  type KeywordStatus,
  type KeywordPriority,
  type ContentType,
} from '../services/seo.js';

// ============================================
// Request Body Types
// ============================================

interface CreateKeywordBody {
  keyword: string;
  category?: KeywordCategory;
  searchIntent?: 'informational' | 'transactional' | 'navigational' | 'commercial';
  volumeEstimate?: string;
  competition?: 'high' | 'medium' | 'low';
  difficultyScore?: number;
  priority?: KeywordPriority;
  targetUrl?: string;
  notes?: string;
  relatedKeywords?: string[];
}

interface UpdateKeywordBody {
  category?: KeywordCategory;
  searchIntent?: 'informational' | 'transactional' | 'navigational' | 'commercial';
  volumeEstimate?: string;
  competition?: 'high' | 'medium' | 'low';
  difficultyScore?: number;
  status?: KeywordStatus;
  priority?: KeywordPriority;
  targetUrl?: string;
  currentPosition?: number;
  notes?: string;
  relatedKeywords?: string[];
}

interface ResearchKeywordsBody {
  topic: string;
  industry: string;
  audience?: string;
  contentType?: string;
  competitors?: string;
  saveResults?: boolean;
}

interface AuditContentBody {
  contentId: string;
  contentType: ContentType;
  keywords: string[];
  contentUrl?: string;
  contentTitle?: string;
  contentMeta?: string;
  contentBody?: string;
}

interface OptimizeContentBody {
  keywordIds: string[];
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  contentBody: string;
}

interface LinkKeywordBody {
  keywordId: string;
  contentType: ContentType;
  contentId: string;
  isPrimary?: boolean;
}

interface BulkStatusBody {
  keywordIds: string[];
  status: KeywordStatus;
}

// ============================================
// Query Parameter Types
// ============================================

interface KeywordQueryParams {
  categories?: string;
  statuses?: string;
  priorities?: string;
  sources?: string;
  search?: string;
  limit?: string;
  offset?: string;
}

// ============================================
// Routes
// ============================================

export default async function seoRoutes(server: FastifyInstance) {
  // ============================================
  // Keywords CRUD
  // ============================================

  /**
   * GET /api/seo/keywords
   * List all keywords for the user
   */
  server.get(
    '/keywords',
    async (request: FastifyRequest<{ Querystring: KeywordQueryParams }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const { categories, statuses, priorities, sources, search, limit, offset } = request.query;

        const filters = {
          categories: categories ? (categories.split(',') as KeywordCategory[]) : undefined,
          statuses: statuses ? (statuses.split(',') as KeywordStatus[]) : undefined,
          priorities: priorities ? (priorities.split(',') as KeywordPriority[]) : undefined,
          sources: sources ? (sources.split(',') as any[]) : undefined,
          search,
        };

        const result = await seoService.getKeywords(
          userId,
          filters,
          limit ? parseInt(limit, 10) : 100,
          offset ? parseInt(offset, 10) : 0
        );

        return reply.send(result);
      } catch (error) {
        console.error('Error listing keywords:', error);
        return reply.status(500).send({ error: 'Failed to list keywords' });
      }
    }
  );

  /**
   * GET /api/seo/keywords/:id
   * Get a specific keyword
   */
  server.get(
    '/keywords/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const keyword = await seoService.getKeyword(request.params.id, userId);

        if (!keyword) {
          return reply.status(404).send({ error: 'Keyword not found' });
        }

        return reply.send(keyword);
      } catch (error) {
        console.error('Error getting keyword:', error);
        return reply.status(500).send({ error: 'Failed to get keyword' });
      }
    }
  );

  /**
   * POST /api/seo/keywords
   * Create a new keyword
   */
  server.post(
    '/keywords',
    {
      schema: {
        body: {
          type: 'object',
          required: ['keyword'],
          properties: {
            keyword: { type: 'string', minLength: 2, maxLength: 255 },
            category: { type: 'string', enum: ['primary', 'secondary', 'long_tail', 'question'] },
            searchIntent: { type: 'string', enum: ['informational', 'transactional', 'navigational', 'commercial'] },
            volumeEstimate: { type: 'string' },
            competition: { type: 'string', enum: ['high', 'medium', 'low'] },
            difficultyScore: { type: 'number', minimum: 0, maximum: 100 },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            targetUrl: { type: 'string' },
            notes: { type: 'string' },
            relatedKeywords: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateKeywordBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const keyword = await seoService.createKeyword(userId, request.body);
        return reply.status(201).send(keyword);
      } catch (error: any) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          return reply.status(409).send({ error: 'Keyword already exists' });
        }
        console.error('Error creating keyword:', error);
        return reply.status(500).send({ error: 'Failed to create keyword' });
      }
    }
  );

  /**
   * PATCH /api/seo/keywords/:id
   * Update a keyword
   */
  server.patch(
    '/keywords/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['primary', 'secondary', 'long_tail', 'question'] },
            searchIntent: { type: 'string', enum: ['informational', 'transactional', 'navigational', 'commercial'] },
            volumeEstimate: { type: 'string' },
            competition: { type: 'string', enum: ['high', 'medium', 'low'] },
            difficultyScore: { type: 'number', minimum: 0, maximum: 100 },
            status: { type: 'string', enum: ['researched', 'targeting', 'optimizing', 'ranking', 'archived'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            targetUrl: { type: 'string' },
            currentPosition: { type: 'number', minimum: 1 },
            notes: { type: 'string' },
            relatedKeywords: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateKeywordBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const keyword = await seoService.updateKeyword(request.params.id, userId, request.body);
        return reply.send(keyword);
      } catch (error: any) {
        if (error.message === 'Keyword not found') {
          return reply.status(404).send({ error: 'Keyword not found' });
        }
        console.error('Error updating keyword:', error);
        return reply.status(500).send({ error: 'Failed to update keyword' });
      }
    }
  );

  /**
   * DELETE /api/seo/keywords/:id
   * Delete a keyword
   */
  server.delete(
    '/keywords/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        await seoService.deleteKeyword(request.params.id, userId);
        return reply.status(204).send();
      } catch (error: any) {
        if (error.message === 'Keyword not found') {
          return reply.status(404).send({ error: 'Keyword not found' });
        }
        console.error('Error deleting keyword:', error);
        return reply.status(500).send({ error: 'Failed to delete keyword' });
      }
    }
  );

  /**
   * POST /api/seo/keywords/bulk-status
   * Bulk update keyword status
   */
  server.post(
    '/keywords/bulk-status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['keywordIds', 'status'],
          properties: {
            keywordIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            status: { type: 'string', enum: ['researched', 'targeting', 'optimizing', 'ranking', 'archived'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BulkStatusBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const { keywordIds, status } = request.body;
        const updated = await seoService.bulkUpdateStatus(keywordIds, userId, status);
        return reply.send({ updated });
      } catch (error) {
        console.error('Error bulk updating keywords:', error);
        return reply.status(500).send({ error: 'Failed to update keywords' });
      }
    }
  );

  // ============================================
  // Keyword-Content Linking
  // ============================================

  /**
   * POST /api/seo/keywords/link
   * Link a keyword to content
   */
  server.post(
    '/keywords/link',
    {
      schema: {
        body: {
          type: 'object',
          required: ['keywordId', 'contentType', 'contentId'],
          properties: {
            keywordId: { type: 'string' },
            contentType: { type: 'string', enum: ['blog_post', 'doc_page', 'landing_page', 'changelog', 'faq'] },
            contentId: { type: 'string' },
            isPrimary: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LinkKeywordBody }>, reply: FastifyReply) => {
      try {
        const { keywordId, contentType, contentId, isPrimary } = request.body;
        const link = await seoService.linkKeywordToContent(keywordId, contentType, contentId, isPrimary);
        return reply.status(201).send(link);
      } catch (error) {
        console.error('Error linking keyword:', error);
        return reply.status(500).send({ error: 'Failed to link keyword' });
      }
    }
  );

  /**
   * GET /api/seo/keywords/:id/content
   * Get content linked to a keyword
   */
  server.get(
    '/keywords/:id/content',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const content = await seoService.getKeywordContent(request.params.id);
        return reply.send(content);
      } catch (error) {
        console.error('Error getting keyword content:', error);
        return reply.status(500).send({ error: 'Failed to get keyword content' });
      }
    }
  );

  /**
   * GET /api/seo/content/:type/:id/keywords
   * Get keywords linked to content
   */
  server.get(
    '/content/:type/:id/keywords',
    async (request: FastifyRequest<{ Params: { type: ContentType; id: string } }>, reply: FastifyReply) => {
      try {
        const keywords = await seoService.getContentKeywords(request.params.type, request.params.id);
        return reply.send(keywords);
      } catch (error) {
        console.error('Error getting content keywords:', error);
        return reply.status(500).send({ error: 'Failed to get content keywords' });
      }
    }
  );

  // ============================================
  // AI-Powered Features
  // ============================================

  /**
   * POST /api/seo/keywords/research
   * Research keywords for a topic using AI
   */
  server.post(
    '/keywords/research',
    {
      schema: {
        body: {
          type: 'object',
          required: ['topic', 'industry'],
          properties: {
            topic: { type: 'string', minLength: 2 },
            industry: { type: 'string', minLength: 2 },
            audience: { type: 'string' },
            contentType: { type: 'string' },
            competitors: { type: 'string' },
            saveResults: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ResearchKeywordsBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const result = await seoService.researchKeywords(userId, request.body);
        return reply.send(result);
      } catch (error: any) {
        console.error('Error researching keywords:', error);
        return reply.status(500).send({ error: error.message || 'Failed to research keywords' });
      }
    }
  );

  /**
   * POST /api/seo/audit
   * Run SEO audit on content
   */
  server.post(
    '/audit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['contentId', 'contentType', 'keywords'],
          properties: {
            contentId: { type: 'string' },
            contentType: { type: 'string', enum: ['blog_post', 'doc_page', 'landing_page', 'changelog', 'faq'] },
            keywords: { type: 'array', items: { type: 'string' }, minItems: 1 },
            contentUrl: { type: 'string' },
            contentTitle: { type: 'string' },
            contentMeta: { type: 'string' },
            contentBody: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AuditContentBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const audit = await seoService.auditContent(userId, request.body);
        return reply.send(audit);
      } catch (error: any) {
        console.error('Error auditing content:', error);
        return reply.status(500).send({ error: error.message || 'Failed to audit content' });
      }
    }
  );

  /**
   * POST /api/seo/optimize
   * Generate optimization suggestions
   */
  server.post(
    '/optimize',
    {
      schema: {
        body: {
          type: 'object',
          required: ['keywordIds', 'contentType', 'contentId', 'contentTitle', 'contentBody'],
          properties: {
            keywordIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            contentType: { type: 'string', enum: ['blog_post', 'doc_page', 'landing_page', 'changelog', 'faq'] },
            contentId: { type: 'string' },
            contentTitle: { type: 'string' },
            contentBody: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: OptimizeContentBody }>, reply: FastifyReply) => {
      try {
        const userId = getUserId(request);
        const { keywordIds, contentType, contentId, contentTitle, contentBody } = request.body;

        const suggestionId = await seoService.generateOptimizationSuggestion(
          userId,
          keywordIds,
          contentType,
          contentId,
          contentTitle,
          contentBody
        );

        return reply.send({ suggestionId });
      } catch (error: any) {
        console.error('Error generating optimization:', error);
        return reply.status(500).send({ error: error.message || 'Failed to generate optimization' });
      }
    }
  );

  // ============================================
  // Statistics
  // ============================================

  /**
   * GET /api/seo/stats
   * Get keyword statistics
   */
  server.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(request);
      const stats = await seoService.getStats(userId);
      return reply.send(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      return reply.status(500).send({ error: 'Failed to get stats' });
    }
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get user ID from request
 * Falls back to demo user if not authenticated
 */
function getUserId(request: FastifyRequest): string {
  const userId = (request as any).user?.id;
  if (!userId) {
    // For development/demo, use a default user ID
    // In production, this should throw an error
    return 'demo-user-id';
  }
  return userId;
}
