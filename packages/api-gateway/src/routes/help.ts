/**
 * @file routes/help.ts
 * @description Help Center API routes
 * Provides endpoints for help articles, collections, search, and feedback
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Types
interface CollectionParams {
  collectionSlug: string;
}

interface ArticleParams {
  articleSlug: string;
}

interface SearchQuery {
  q: string;
  collection?: string;
  limit?: number;
}

interface FeedbackBody {
  rating: number;
  comments?: string;
}

export default async function helpRoutes(fastify: FastifyInstance) {
  // ============================================
  // Public Routes (No Auth Required)
  // ============================================

  /**
   * GET /api/v1/help/collections
   * List all help collections
   */
  fastify.get('/collections', async (_request, _reply) => {
    const result = await fastify.pg.query(
      `SELECT hc.id, hc.title, hc.slug, hc.description, hc.icon, hc.sort,
              COUNT(ha.id) as article_count
       FROM help_collections hc
       LEFT JOIN help_articles ha ON ha.help_collection_id = hc.id AND ha.status = 'published'
       WHERE hc.status = 'published'
       GROUP BY hc.id
       ORDER BY hc.sort, hc.title`
    );

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * GET /api/v1/help/collections/:collectionSlug
   * Get collection with articles
   */
  fastify.get<{ Params: CollectionParams }>('/collections/:collectionSlug', async (request, reply) => {
    const { collectionSlug } = request.params;

    const collectionResult = await fastify.pg.query(
      `SELECT * FROM help_collections WHERE slug = $1 AND status = 'published'`,
      [collectionSlug]
    );

    if (collectionResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' }
      });
    }

    const collection = collectionResult.rows[0];

    // Get articles
    const articlesResult = await fastify.pg.query(
      `SELECT id, title, slug, summary, sort, date_updated
       FROM help_articles
       WHERE help_collection_id = $1 AND status = 'published'
       ORDER BY sort, title`,
      [collection.id]
    );

    return {
      success: true,
      data: {
        ...collection,
        articles: articlesResult.rows
      }
    };
  });

  /**
   * GET /api/v1/help/articles/:articleSlug
   * Get article by slug
   */
  fastify.get<{ Params: ArticleParams }>('/articles/:articleSlug', async (request, reply) => {
    const { articleSlug } = request.params;

    const result = await fastify.pg.query(
      `SELECT ha.*, hc.title as collection_title, hc.slug as collection_slug
       FROM help_articles ha
       JOIN help_collections hc ON hc.id = ha.help_collection_id
       WHERE ha.slug = $1 AND ha.status = 'published'`,
      [articleSlug]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' }
      });
    }

    const article = result.rows[0];

    // Increment view count
    await fastify.pg.query(
      `UPDATE help_articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [article.id]
    );

    // Get related articles
    const relatedResult = await fastify.pg.query(
      `SELECT id, title, slug, summary
       FROM help_articles
       WHERE help_collection_id = $1 AND id != $2 AND status = 'published'
       ORDER BY sort
       LIMIT 5`,
      [article.help_collection_id, article.id]
    );

    // Get feedback summary
    const feedbackResult = await fastify.pg.query(
      `SELECT
         COUNT(*) as total_ratings,
         AVG(rating) as average_rating,
         COUNT(*) FILTER (WHERE rating >= 4) as positive_count
       FROM help_feedback
       WHERE article_id = $1`,
      [article.id]
    );

    return {
      success: true,
      data: {
        ...article,
        relatedArticles: relatedResult.rows,
        feedback: feedbackResult.rows[0]
      }
    };
  });

  /**
   * GET /api/v1/help/search
   * Search help articles
   */
  fastify.get<{ Querystring: SearchQuery }>('/search', async (request, _reply) => {
    const { q, collection, limit = 10 } = request.query;

    if (!q || q.length < 2) {
      return {
        success: true,
        data: []
      };
    }

    // Log search query for analytics
    await fastify.pg.query(
      `INSERT INTO help_search_queries (query, results_count, searched_at)
       VALUES ($1, 0, NOW())`,
      [q]
    ).catch(() => {}); // Ignore errors

    let query = `
      SELECT ha.id, ha.title, ha.slug, ha.summary,
             hc.title as collection_title, hc.slug as collection_slug,
             ts_rank(to_tsvector('english', ha.title || ' ' || COALESCE(ha.content, '')),
                     plainto_tsquery('english', $1)) as rank
      FROM help_articles ha
      JOIN help_collections hc ON hc.id = ha.help_collection_id
      WHERE ha.status = 'published'
        AND (
          to_tsvector('english', ha.title || ' ' || COALESCE(ha.content, '')) @@ plainto_tsquery('english', $1)
          OR ha.title ILIKE '%' || $1 || '%'
        )
    `;
    const params: unknown[] = [q];

    if (collection) {
      query += ` AND hc.slug = $2`;
      params.push(collection);
    }

    query += ` ORDER BY rank DESC, ha.view_count DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await fastify.pg.query(query, params);

    // Update search query with results count
    await fastify.pg.query(
      `UPDATE help_search_queries SET results_count = $1
       WHERE query = $2 AND searched_at = (SELECT MAX(searched_at) FROM help_search_queries WHERE query = $2)`,
      [result.rows.length, q]
    ).catch(() => {});

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * POST /api/v1/help/articles/:articleSlug/feedback
   * Submit feedback for an article
   */
  fastify.post<{ Params: ArticleParams; Body: FeedbackBody }>('/articles/:articleSlug/feedback', async (request, reply) => {
    const { articleSlug } = request.params;
    const { rating, comments } = request.body;

    if (rating < 1 || rating > 5) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' }
      });
    }

    // Get article ID
    const articleResult = await fastify.pg.query(
      `SELECT id FROM help_articles WHERE slug = $1`,
      [articleSlug]
    );

    if (articleResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' }
      });
    }

    const articleId = articleResult.rows[0].id;

    // Get user ID if authenticated
    let userId = null;
    try {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        // Try to get user from token (optional)
        const { getAuthService } = await import('../services/auth/index.js');
        const authService = getAuthService();
        const result = await authService.verifyToken(authHeader.substring(7));
        if (result.valid && result.user) {
          userId = result.user.id;
        }
      }
    } catch {
      // Anonymous feedback is allowed
    }

    await fastify.pg.query(
      `INSERT INTO help_feedback (article_id, user_id, rating, comments, date_created)
       VALUES ($1, $2, $3, $4, NOW())`,
      [articleId, userId, rating, comments]
    );

    return {
      success: true,
      data: { message: 'Feedback submitted successfully' }
    };
  });

  /**
   * GET /api/v1/help/featured
   * Get featured/popular articles
   */
  fastify.get('/featured', async (_request, _reply) => {
    const result = await fastify.pg.query(
      `SELECT ha.id, ha.title, ha.slug, ha.summary,
              hc.title as collection_title, hc.slug as collection_slug
       FROM help_articles ha
       JOIN help_collections hc ON hc.id = ha.help_collection_id
       WHERE ha.status = 'published' AND ha.is_featured = true
       ORDER BY ha.view_count DESC
       LIMIT 6`
    );

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * GET /api/v1/help/popular
   * Get most viewed articles
   */
  fastify.get('/popular', async (_request, _reply) => {
    const result = await fastify.pg.query(
      `SELECT ha.id, ha.title, ha.slug, ha.summary, ha.view_count,
              hc.title as collection_title, hc.slug as collection_slug
       FROM help_articles ha
       JOIN help_collections hc ON hc.id = ha.help_collection_id
       WHERE ha.status = 'published'
       ORDER BY ha.view_count DESC
       LIMIT 10`
    );

    return {
      success: true,
      data: result.rows
    };
  });

  // ============================================
  // Admin Routes (Authenticated)
  // ============================================

  /**
   * POST /api/v1/help/collections
   * Create a help collection (admin)
   */
  fastify.post<{ Body: { title: string; slug: string; description?: string; icon?: string } }>('/collections', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request, _reply) => {
    const { title, slug, description, icon } = request.body;
    const userId = (request as any).user.id;

    // Get next sort order
    const sortResult = await fastify.pg.query(
      `SELECT COALESCE(MAX(sort), -1) + 1 as next_sort FROM help_collections`
    );

    const result = await fastify.pg.query(
      `INSERT INTO help_collections (title, slug, description, icon, sort, status, user_created, date_created, date_updated)
       VALUES ($1, $2, $3, $4, $5, 'published', $6, NOW(), NOW())
       RETURNING *`,
      [title, slug, description, icon, sortResult.rows[0].next_sort, userId]
    );

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * POST /api/v1/help/articles
   * Create a help article (admin)
   */
  fastify.post<{ Body: { collectionId: string; title: string; slug: string; content: string; summary?: string } }>('/articles', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request, _reply) => {
    const { collectionId, title, slug, content, summary } = request.body;
    const userId = (request as any).user.id;

    // Get next sort order
    const sortResult = await fastify.pg.query(
      `SELECT COALESCE(MAX(sort), -1) + 1 as next_sort FROM help_articles WHERE help_collection_id = $1`,
      [collectionId]
    );

    const result = await fastify.pg.query(
      `INSERT INTO help_articles (help_collection_id, title, slug, content, summary, sort, status, user_created, date_created, date_updated)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, NOW(), NOW())
       RETURNING *`,
      [collectionId, title, slug, content, summary, sortResult.rows[0].next_sort, userId]
    );

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * PATCH /api/v1/help/articles/:articleSlug
   * Update a help article (admin)
   */
  fastify.patch<{ Params: ArticleParams; Body: { title?: string; content?: string; summary?: string; status?: string } }>('/articles/:articleSlug', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request, reply) => {
    const { articleSlug } = request.params;
    const updates = request.body;
    const userId = (request as any).user.id;

    const updateFields: string[] = ['date_updated = NOW()', `user_updated = '${userId}'`];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }
    if (updates.summary !== undefined) {
      updateFields.push(`summary = $${paramCount++}`);
      values.push(updates.summary);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    values.push(articleSlug);

    const result = await fastify.pg.query(
      `UPDATE help_articles SET ${updateFields.join(', ')} WHERE slug = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * DELETE /api/v1/help/articles/:articleSlug
   * Delete a help article (admin)
   */
  fastify.delete<{ Params: ArticleParams }>('/articles/:articleSlug', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request, reply) => {
    const { articleSlug } = request.params;

    const result = await fastify.pg.query(
      `DELETE FROM help_articles WHERE slug = $1 RETURNING id`,
      [articleSlug]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' }
      });
    }

    return {
      success: true,
      data: { message: 'Article deleted' }
    };
  });

  /**
   * GET /api/v1/help/admin/analytics
   * Get help center analytics (admin)
   */
  fastify.get('/admin/analytics', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (_request, _reply) => {
    // Get overall stats
    const statsResult = await fastify.pg.query(`
      SELECT
        (SELECT COUNT(*) FROM help_collections WHERE status = 'published') as collection_count,
        (SELECT COUNT(*) FROM help_articles WHERE status = 'published') as article_count,
        (SELECT SUM(view_count) FROM help_articles) as total_views,
        (SELECT COUNT(*) FROM help_feedback) as total_feedback,
        (SELECT AVG(rating) FROM help_feedback) as average_rating
    `);

    // Get top articles
    const topArticles = await fastify.pg.query(
      `SELECT title, slug, view_count
       FROM help_articles
       WHERE status = 'published'
       ORDER BY view_count DESC
       LIMIT 10`
    );

    // Get recent searches
    const recentSearches = await fastify.pg.query(
      `SELECT query, results_count, searched_at
       FROM help_search_queries
       ORDER BY searched_at DESC
       LIMIT 20`
    );

    // Get low-rated articles
    const lowRated = await fastify.pg.query(
      `SELECT ha.title, ha.slug, AVG(hf.rating) as avg_rating, COUNT(hf.id) as feedback_count
       FROM help_articles ha
       JOIN help_feedback hf ON hf.article_id = ha.id
       GROUP BY ha.id
       HAVING AVG(hf.rating) < 3
       ORDER BY avg_rating
       LIMIT 10`
    );

    return {
      success: true,
      data: {
        stats: statsResult.rows[0],
        topArticles: topArticles.rows,
        recentSearches: recentSearches.rows,
        lowRatedArticles: lowRated.rows
      }
    };
  });
}
