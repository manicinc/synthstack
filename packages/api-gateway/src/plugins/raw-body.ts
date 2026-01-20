import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Readable } from 'node:stream';

/**
 * Minimal raw body capture plugin (Stripe/webhook signature verification).
 *
 * Only captures when a route sets `config: { rawBody: true }`.
 * Stores the Buffer on `request.rawBody` and replays the payload to Fastify's body parser.
 */
const rawBodyPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    const rawBodyEnabled = Boolean((request.routeOptions?.config as any)?.rawBody);
    if (!rawBodyEnabled) return payload;

    if (!payload) {
      request.rawBody = Buffer.alloc(0);
      return payload;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of payload as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks);
    request.rawBody = body;

    return Readable.from([body]);
  });
};

export default fp(rawBodyPlugin, { name: 'raw-body' });
