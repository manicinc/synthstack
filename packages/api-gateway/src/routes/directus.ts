/**
 * Directus Proxy Routes
 *
 * Proxies requests from /directus/* to the actual Directus instance.
 * Handles authentication forwarding, caching for read endpoints, and error handling.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';

// Types
interface DirectusProxyParams {
  '*': string;
}

interface DirectusProxyQuery {
  [key: string]: string | string[] | undefined;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

// In-memory cache for read endpoints (simple TTL cache)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds for public content
const CACHEABLE_PREFIXES = ['items/pages', 'items/guides', 'items/docs', 'items/posts'];

/**
 * Check if a path is cacheable (GET requests to public collections)
 */
function isCacheablePath(path: string, method: string): boolean {
  if (method !== 'GET') return false;
  return CACHEABLE_PREFIXES.some(prefix => path.startsWith(prefix));
}

/**
 * Generate cache key from request
 */
function getCacheKey(path: string, queryString: string): string {
  return `${path}?${queryString}`;
}

/**
 * Clean expired cache entries periodically
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanCache, 5 * 60 * 1000);

export default async function directusRoutes(fastify: FastifyInstance) {
  const directusUrl = config.directusUrl;
  const directusToken = config.directusToken;

  // Log configuration on registration
  fastify.log.info(`Directus proxy configured for: ${directusUrl}`);

  /**
   * Health check for Directus connection
   * GET /directus/health
   */
  fastify.get('/health', {
    schema: {
      tags: ['Directus'],
      summary: 'Check Directus health',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            directusUrl: { type: 'string' },
            available: { type: 'boolean' },
            tokenConfigured: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const response = await fetch(`${directusUrl}/server/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return {
        status: 'ok',
        directusUrl: directusUrl.replace(/:[^:]*@/, ':***@'), // Hide credentials
        available: response.ok,
        tokenConfigured: Boolean(directusToken),
      };
    } catch (error) {
      return {
        status: 'error',
        directusUrl: directusUrl.replace(/:[^:]*@/, ':***@'),
        available: false,
        tokenConfigured: Boolean(directusToken),
      };
    }
  });

  /**
   * Wildcard proxy handler for all Directus routes
   * ALL /directus/*
   */
  fastify.all<{
    Params: DirectusProxyParams;
    Querystring: DirectusProxyQuery;
  }>('/*', {
    schema: {
      tags: ['Directus'],
      summary: 'Proxy to Directus API',
      description: 'Forwards requests to the Directus CMS instance',
      params: {
        type: 'object',
        properties: {
          '*': { type: 'string', description: 'Directus API path' },
        },
      },
    },
  }, async (request, reply) => {
    const path = request.params['*'] || '';
    const method = request.method;
    const queryString = new URLSearchParams(
      request.query as Record<string, string>
    ).toString();

    // Build headers for upstream request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header from request, or use server token
    const authHeader = request.headers.authorization;
    const authMode: 'forwarded' | 'server' | 'none' =
      authHeader ? 'forwarded' : directusToken ? 'server' : 'none';

    // Always expose which auth mode was used (no secrets).
    reply.header('X-Directus-Auth', authMode);

    if (authHeader) {
      // Forward user's auth token
      headers['Authorization'] = authHeader;
    } else if (directusToken) {
      // Use server-side token for public requests
      headers['Authorization'] = `Bearer ${directusToken}`;
    } else if (isCacheablePath(path, method)) {
      // Avoid noisy 401s on public marketing content when token isn't configured.
      return reply.send({
        data: [],
        meta: {},
        error: {
          code: 'DIRECTUS_TOKEN_MISSING',
          message: 'Directus token is not configured on the API gateway',
        },
      });
    }

    // Build target URL
    const targetUrl = queryString
      ? `${directusUrl}/${path}?${queryString}`
      : `${directusUrl}/${path}`;

    // Check cache for GET requests to cacheable paths
    if (isCacheablePath(path, method)) {
      const cacheKey = getCacheKey(path, queryString);
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        fastify.log.debug({ path, cacheHit: true }, 'Directus proxy cache hit');

        // Return cached response with cache headers
        reply.header('X-Cache', 'HIT');
        reply.header('Cache-Control', 'public, max-age=60');
        if (cached.etag) {
          reply.header('ETag', cached.etag);
        }
        return cached.data;
      }
    }

    // Forward relevant headers
    if (request.headers['accept-language']) {
      headers['Accept-Language'] = request.headers['accept-language'] as string;
    }
    if (request.headers['x-request-id']) {
      headers['X-Request-Id'] = request.headers['x-request-id'] as string;
    }

    // Prepare request body for non-GET methods
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD' && request.body) {
      body = JSON.stringify(request.body);
    }

    try {
      fastify.log.debug({
        path,
        method,
        targetUrl: targetUrl.replace(/token=[^&]+/, 'token=***'),
      }, 'Directus proxy request');

      const response = await fetch(targetUrl, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      // Get response data
      const contentType = response.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // For non-JSON responses (e.g., file downloads)
        const buffer = await response.arrayBuffer();
        reply.header('Content-Type', contentType);
        reply.header('Content-Length', buffer.byteLength.toString());
        return reply.send(Buffer.from(buffer));
      }

      // Handle non-OK responses
      if (!response.ok) {
        fastify.log.warn({
          path,
          status: response.status,
          error: data,
        }, 'Directus proxy error response');

        return reply.status(response.status).send({
          success: false,
          error: {
            code: 'DIRECTUS_ERROR',
            message: data?.errors?.[0]?.message || 'Directus API error',
            details: data?.errors,
          },
        });
      }

      // Cache successful GET responses for cacheable paths
      if (isCacheablePath(path, method)) {
        const cacheKey = getCacheKey(path, queryString);
        const etag = response.headers.get('etag') || undefined;

        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          etag,
        });

        reply.header('X-Cache', 'MISS');
        reply.header('Cache-Control', 'public, max-age=60');
        if (etag) {
          reply.header('ETag', etag);
        }
      }

      return data;

    } catch (error: any) {
      // Handle timeout
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        fastify.log.error({ path, error: error.message }, 'Directus proxy timeout');
        return reply.status(504).send({
          success: false,
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Directus server did not respond in time',
          },
        });
      }

      // Handle connection errors
      if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
        fastify.log.error({ path, error: error.message }, 'Directus unavailable');
        return reply.status(503).send({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Directus CMS is currently unavailable',
          },
        });
      }

      // Generic error
      fastify.log.error({ path, error }, 'Directus proxy error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: 'Failed to proxy request to Directus',
        },
      });
    }
  });
}
