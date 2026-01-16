import type { FastifyInstance } from 'fastify';

export default async function pagesRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  fastify.get('/pages/:slug', {
    schema: {
      tags: ['Pages'],
      summary: 'Get company page by slug',
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, slug, title, content, hero_image, seo_title, seo_description
         FROM company_pages
         WHERE status = 'published' AND slug = $1
         LIMIT 1`, [slug]);
      if (!rows.length) {
        return reply.code(404).send({ error: 'Page not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });
}
