/**
 * @file onboarding.ts
 * @description API routes for onboarding wizard
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { directus } from '../services/directus';

interface OnboardingPreferences {
  displayName?: string;
  units?: 'metric' | 'imperial';
  theme?: 'light' | 'dark' | 'system';
  contentTypes?: string[];
  aiFeatures?: string[];
}

export async function onboardingRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/onboarding
   * Save user onboarding preferences to Directus
   */
  fastify.post<{ Body: OnboardingPreferences }>('/api/v1/onboarding', async (request, reply) => {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { displayName, units, theme, contentTypes, aiFeatures } = request.body;

      // Check if user already has onboarding preferences
      const existing = await directus.items('user_onboarding_preferences').readByQuery({
        filter: { user_id: { _eq: userId } },
        limit: 1,
      });

      if (existing.data && existing.data.length > 0) {
        // Update existing preferences
        await directus.items('user_onboarding_preferences').updateOne(existing.data[0].id, {
          display_name: displayName,
          units,
          theme,
          content_types: contentTypes,
          ai_features: aiFeatures,
        });
      } else {
        // Create new preferences
        await directus.items('user_onboarding_preferences').createOne({
          user_id: userId,
          display_name: displayName,
          units,
          theme,
          content_types: contentTypes,
          ai_features: aiFeatures,
        });
      }

      return reply.code(200).send({ success: true });
    } catch (error: any) {
      fastify.log.error({ error }, 'Error saving onboarding preferences');
      return reply.code(500).send({ error: 'Failed to save preferences', details: error.message });
    }
  });

  /**
   * GET /api/v1/onboarding
   * Get user onboarding preferences
   */
  fastify.get('/api/v1/onboarding', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const preferences = await directus.items('user_onboarding_preferences').readByQuery({
        filter: { user_id: { _eq: userId } },
        limit: 1,
      });

      if (preferences.data && preferences.data.length > 0) {
        const data = preferences.data[0];
        return reply.code(200).send({
          displayName: data.display_name,
          units: data.units,
          theme: data.theme,
          contentTypes: data.content_types,
          aiFeatures: data.ai_features,
        });
      }

      return reply.code(404).send({ error: 'No preferences found' });
    } catch (error: any) {
      fastify.log.error({ error }, 'Error fetching onboarding preferences');
      return reply.code(500).send({ error: 'Failed to fetch preferences', details: error.message });
    }
  });
}
