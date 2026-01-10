/**
 * @file routes/profiles.ts
 * @description Print profile routes
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

async function fetchFromDirectus(path: string, options: RequestInit = {}) {
  const response = await fetch(`${config.directusUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(config.directusToken && { Authorization: `Bearer ${config.directusToken}` }),
      ...options.headers,
    },
  });
  return response.json();
}

export default async function profilesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/profiles
   * List community profiles
   */
  fastify.get<{
    Querystring: {
      printer_id?: string;
      filament_id?: string;
      source?: string;
      sort?: string;
      page?: number;
      limit?: number;
    };
  }>('/', async (request) => {
    const { printer_id, filament_id, source, sort = '-votes_up', page = 1, limit = 20 } = request.query;
    
    const filters: string[] = ['filter[is_public][_eq]=true'];
    if (printer_id) filters.push(`filter[printer_id][_eq]=${printer_id}`);
    if (filament_id) filters.push(`filter[filament_id][_eq]=${filament_id}`);
    if (source) filters.push(`filter[source][_eq]=${source}`);
    
    const offset = (page - 1) * limit;
    const query = [
      ...filters,
      `limit=${limit}`,
      `offset=${offset}`,
      `sort=${sort}`,
      'fields=*,printer.manufacturer,printer.model,filament.name,filament.material_type,user.display_name',
      'meta=filter_count',
    ].join('&');

    const result = await fetchFromDirectus(`/items/print_profiles?${query}`);
    
    return {
      success: true,
      data: result.data || [],
      meta: {
        page,
        per_page: limit,
        total: result.meta?.filter_count || 0,
        total_pages: Math.ceil((result.meta?.filter_count || 0) / limit),
      },
    };
  });

  /**
   * GET /api/v1/profiles/:id
   * Get a single profile
   */
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const result = await fetchFromDirectus(
      `/items/print_profiles/${id}?fields=*,printer.*,filament.*,user.display_name,user.avatar_url`
    );
    
    if (!result.data) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    }
    
    return {
      success: true,
      data: result.data,
    };
  });

  /**
   * POST /api/v1/profiles/:id/vote
   * Vote on a profile
   */
  fastify.post<{
    Params: { id: string };
    Body: { vote: 'up' | 'down' };
  }>('/:id/vote', async (request, reply) => {
    const { id } = request.params;
    const { vote } = request.body;
    
    // Get current profile
    const current = await fetchFromDirectus(`/items/print_profiles/${id}`);
    if (!current.data) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      });
    }
    
    // Update vote count
    const field = vote === 'up' ? 'votes_up' : 'votes_down';
    const newValue = (current.data[field] || 0) + 1;
    
    await fetchFromDirectus(`/items/print_profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: newValue }),
    });
    
    return {
      success: true,
      data: { message: 'Vote recorded' },
    };
  });

  /**
   * GET /api/v1/profiles/check
   * Check if a user exists by email (for team invites)
   */
  fastify.get<{
    Querystring: { email: string };
  }>('/check', async (request, reply) => {
    const { email } = request.query;

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email is required' },
      });
    }

    try {
      // Check in directus_users
      const result = await fetchFromDirectus(
        `/users?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,first_name,last_name,email&limit=1`
      );

      const user = result.data?.[0];

      return {
        success: true,
        exists: !!user,
        name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || null : null,
      };
    } catch (error) {
      // If we can't check, assume user doesn't exist
      return {
        success: true,
        exists: false,
        name: null,
      };
    }
  });

  /**
   * GET /api/v1/profiles/mine
   * Get user's own profiles (requires auth)
   */
  fastify.get('/mine', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    
    const result = await fetchFromDirectus(
      `/items/print_profiles?filter[user_id][_eq]=${user.id}&sort=-created_at&fields=*,printer.manufacturer,printer.model,filament.name`
    );
    
    return {
      success: true,
      data: result.data || [],
    };
  });
}

