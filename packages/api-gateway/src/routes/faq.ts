import type { FastifyInstance } from 'fastify';

export default async function faqRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  fastify.get('/faq', {
    schema: {
      tags: ['FAQ'],
      summary: 'List FAQ items',
    },
  }, async (request) => {
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, question, answer, category, helpful_count, not_helpful_count
         FROM faq_items
         WHERE status = 'published'
         ORDER BY sort ASC, date_created DESC`);
      
      // Group by category
      const grouped = rows.reduce((acc: any, item: any) => {
        const cat = item.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});
      
      return { items: rows, grouped };
    } finally {
      client.release();
    }
  });

  fastify.post('/faq/:id/helpful', {
    schema: {
      tags: ['FAQ'],
      summary: 'Mark FAQ item as helpful',
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { helpful } = request.body as { helpful: boolean };
    
    const client = await pg.connect();
    try {
      const field = helpful ? 'helpful_count' : 'not_helpful_count';
      await client.query(
        `UPDATE faq_items SET ${field} = ${field} + 1 WHERE id = $1`,
        [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });
}
