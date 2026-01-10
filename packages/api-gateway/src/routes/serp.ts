/**
 * SERP Tracking Routes
 *
 * API endpoints for SerpAPI integration and keyword ranking tracking.
 * Includes quota management, ranking history, and competitor monitoring.
 */

import { FastifyPluginAsync } from 'fastify';
import { serpApiService } from '../services/serpapi.js';
import { directusClient } from '../services/directus.js';

const serpRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // Quota Management
  // ============================================

  /**
   * GET /api/v1/serp/quota - Get current API quota status
   */
  fastify.get(
    '/serp/quota',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Get API quota status',
        description: 'Returns current month SerpAPI usage and remaining quota',
      },
    },
    async (request, reply) => {
      const quota = await serpApiService.getQuotaStatus();
      return quota;
    }
  );

  // ============================================
  // Keyword Ranking Check
  // ============================================

  /**
   * POST /api/v1/serp/check/:keywordId - Check SERP ranking for a keyword
   */
  fastify.post(
    '/serp/check/:keywordId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Check keyword ranking',
        description: 'Performs a live SERP check for a keyword and records the ranking',
        params: {
          type: 'object',
          properties: {
            keywordId: { type: 'string', format: 'uuid' },
          },
          required: ['keywordId'],
        },
        body: {
          type: 'object',
          properties: {
            targetDomain: { type: 'string' },
            competitorDomains: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { keywordId } = request.params as { keywordId: string };
      const user = request.user as { id: string };
      const body = request.body as { targetDomain?: string; competitorDomains?: string[] } || {};

      // Default target domain (should come from user settings)
      const targetDomain = body.targetDomain || 'synthstack.app';

      // Get user's competitor domains if not provided
      let competitorDomains = body.competitorDomains;
      if (!competitorDomains || competitorDomains.length === 0) {
        const competitors = await directusClient.items('serp_competitors').readByQuery({
          filter: { user_id: { _eq: user.id }, is_active: { _eq: true } },
          fields: ['domain'],
        } as any);
        competitorDomains = (competitors.data || []).map((c: { domain: string }) => c.domain);
      }

      try {
        const result = await serpApiService.checkKeywordRanking(
          keywordId,
          user.id,
          targetDomain,
          competitorDomains
        );

        // Update next check time
        await serpApiService.updateNextCheckTime(keywordId);

        return result;
      } catch (error: any) {
        if (error.message.includes('quota')) {
          return reply.status(429).send({
            error: 'Quota exceeded',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /api/v1/serp/check-batch - Check multiple keywords
   */
  fastify.post(
    '/serp/check-batch',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Batch check keyword rankings',
        description: 'Check rankings for multiple keywords (respects quota limits)',
        body: {
          type: 'object',
          properties: {
            keywordIds: { type: 'array', items: { type: 'string' } },
            targetDomain: { type: 'string' },
          },
          required: ['keywordIds'],
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      const { keywordIds, targetDomain } = request.body as {
        keywordIds: string[];
        targetDomain?: string;
      };

      // Check quota first
      const quota = await serpApiService.getQuotaStatus();
      if (quota.remaining < keywordIds.length) {
        return reply.status(429).send({
          error: 'Insufficient quota',
          message: `Need ${keywordIds.length} searches but only ${quota.remaining} remaining`,
          quota,
        });
      }

      const results = [];
      const errors = [];

      for (const keywordId of keywordIds) {
        try {
          const result = await serpApiService.checkKeywordRanking(
            keywordId,
            user.id,
            targetDomain || 'synthstack.app',
            []
          );
          await serpApiService.updateNextCheckTime(keywordId);
          results.push(result);
        } catch (error: any) {
          errors.push({ keywordId, error: error.message });
          // Stop if quota exceeded
          if (error.message.includes('quota')) {
            break;
          }
        }
      }

      return {
        results,
        errors,
        checked: results.length,
        failed: errors.length,
      };
    }
  );

  // ============================================
  // Ranking History
  // ============================================

  /**
   * GET /api/v1/serp/history/:keywordId - Get ranking history
   */
  fastify.get(
    '/serp/history/:keywordId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Get ranking history',
        description: 'Returns historical SERP positions for a keyword',
        params: {
          type: 'object',
          properties: {
            keywordId: { type: 'string', format: 'uuid' },
          },
          required: ['keywordId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { keywordId } = request.params as { keywordId: string };
      const user = request.user as { id: string };
      const { limit } = request.query as { limit?: number };

      const history = await serpApiService.getRankingHistory(keywordId, user.id, limit || 30);
      return { history };
    }
  );

  // ============================================
  // Competitor Management
  // ============================================

  /**
   * GET /api/v1/serp/competitors - List competitors
   */
  fastify.get(
    '/serp/competitors',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'List competitors',
        description: 'Returns all tracked competitor domains',
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };

      const competitors = await directusClient.items('serp_competitors').readByQuery({
        filter: { user_id: { _eq: user.id } },
        sort: ['domain'],
      });

      return {
        competitors: competitors.data || [],
      };
    }
  );

  /**
   * POST /api/v1/serp/competitors - Add competitor
   */
  fastify.post(
    '/serp/competitors',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Add competitor',
        body: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['domain'],
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      const { domain, name, description } = request.body as {
        domain: string;
        name?: string;
        description?: string;
      };

      // Normalize domain
      const normalizedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

      const competitor = await directusClient.items('serp_competitors').createOne({
        user_id: user.id,
        domain: normalizedDomain,
        name: name || normalizedDomain,
        description,
        is_active: true,
      });

      return competitor;
    }
  );

  /**
   * DELETE /api/v1/serp/competitors/:id - Remove competitor
   */
  fastify.delete(
    '/serp/competitors/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Remove competitor',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string };

      // Verify ownership
      const competitor = await directusClient.items('serp_competitors').readOne(id);
      if (!competitor || competitor.user_id !== user.id) {
        return reply.status(404).send({ error: 'Competitor not found' });
      }

      await directusClient.items('serp_competitors').deleteOne(id);
      return { success: true };
    }
  );

  // ============================================
  // Dashboard Data
  // ============================================

  /**
   * GET /api/v1/serp/dashboard - Get SERP dashboard data
   */
  fastify.get(
    '/serp/dashboard',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['SERP'],
        summary: 'Get dashboard data',
        description: 'Returns aggregated SERP tracking data for the dashboard',
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };

      // Get quota
      const quota = await serpApiService.getQuotaStatus();

      // Get keywords with rankings
      const keywords = await directusClient.items('seo_keywords').readByQuery({
        filter: { user_id: { _eq: user.id } },
        fields: ['id', 'keyword', 'current_position', 'best_position', 'last_serp_check_at', 'check_frequency', 'priority'],
        sort: ['priority', '-last_serp_check_at'],
      } as any);

      // Get keywords due for check
      const dueForCheck = await serpApiService.getKeywordsDueForCheck(user.id, 10);

      // Calculate stats
      type KeywordData = {
        id?: string;
        keyword?: string;
        current_position?: number | null;
        best_position?: number | null;
        last_serp_check_at?: string | null;
        check_frequency?: string;
        priority?: number;
      };
      const keywordData: KeywordData[] = keywords.data || [];
      const stats = {
        totalKeywords: keywordData.length,
        trackedKeywords: keywordData.filter((k: KeywordData) => k.current_position !== null).length,
        avgPosition: 0,
        topTenCount: 0,
        topThreeCount: 0,
        improvingCount: 0,
        decliningCount: 0,
      };

      const positions = keywordData
        .filter((k: KeywordData) => k.current_position !== null)
        .map((k: KeywordData) => k.current_position as number);

      if (positions.length > 0) {
        stats.avgPosition = Math.round(positions.reduce((a: number, b: number) => a + b, 0) / positions.length);
        stats.topTenCount = positions.filter((p: number) => p <= 10).length;
        stats.topThreeCount = positions.filter((p: number) => p <= 3).length;
      }

      // Get recent position changes
      const recentChanges = [];
      for (const keyword of keywordData.slice(0, 5)) {
        if (!keyword.id) continue;
        const history = await serpApiService.getRankingHistory(keyword.id as string, user.id, 2);
        if (history.length >= 2 && history[0].position !== null && history[1].position !== null) {
          const change = history[1].position - history[0].position;
          recentChanges.push({
            keywordId: keyword.id,
            keyword: keyword.keyword,
            currentPosition: history[0].position,
            previousPosition: history[1].position,
            change,
          });
          if (change > 0) stats.improvingCount++;
          if (change < 0) stats.decliningCount++;
        }
      }

      // Get competitor count
      const competitors = await directusClient.items('serp_competitors').readByQuery({
        filter: { user_id: { _eq: user.id }, is_active: { _eq: true } },
        aggregate: { count: '*' },
      });

      return {
        quota,
        stats,
        dueForCheck,
        recentChanges,
        competitorCount: Number(competitors.data?.[0]?.count || 0),
        keywords: keywordData.slice(0, 20),
      };
    }
  );

  // ============================================
  // Scheduled Check (Internal/Cron)
  // ============================================

  /**
   * POST /api/v1/serp/scheduled-check - Run scheduled keyword checks
   * Internal endpoint for cron jobs
   */
  fastify.post(
    '/serp/scheduled-check',
    {
      schema: {
        tags: ['SERP'],
        summary: 'Run scheduled checks (internal)',
        headers: {
          type: 'object',
          properties: {
            'x-cron-secret': { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      // Verify cron secret
      const cronSecret = (request.headers as any)['x-cron-secret'];
      if (cronSecret !== process.env.CRON_SECRET && cronSecret !== process.env.ADMIN_SECRET) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Get keywords due for check
      const quota = await serpApiService.getQuotaStatus();
      const maxChecks = Math.min(quota.remaining, 10); // Max 10 per run

      if (maxChecks === 0) {
        return {
          message: 'No quota remaining',
          quota,
          checked: 0,
        };
      }

      const keywordIds = await serpApiService.getKeywordsDueForCheck(undefined, maxChecks);

      if (keywordIds.length === 0) {
        return {
          message: 'No keywords due for check',
          quota,
          checked: 0,
        };
      }

      // Check each keyword
      const results = [];
      for (const keywordId of keywordIds) {
        try {
          // Get keyword to find user_id
          const keyword = await directusClient.items('seo_keywords').readOne(keywordId);
          if (!keyword) continue;

          const result = await serpApiService.checkKeywordRanking(
            keywordId,
            keyword.user_id as string,
            'synthstack.app',
            []
          );
          await serpApiService.updateNextCheckTime(keywordId);
          results.push({ keywordId, position: result.position });
        } catch (error: any) {
          results.push({ keywordId, error: error.message });
          if (error.message.includes('quota')) break;
        }
      }

      return {
        message: `Checked ${results.length} keywords`,
        results,
        quota: await serpApiService.getQuotaStatus(),
      };
    }
  );
};

export default serpRoutes;
