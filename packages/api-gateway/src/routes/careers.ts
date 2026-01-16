import type { FastifyInstance } from 'fastify';

export default async function careersRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  fastify.get('/careers', {
    schema: {
      tags: ['Careers'],
      summary: 'List career openings',
    },
  }, async (request) => {
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, title, slug, department, location, employment_type, salary_min, salary_max,
                posted_at, closes_at, seo_title, seo_description
         FROM career_openings
         WHERE status = 'open'
         ORDER BY posted_at DESC`);
      return rows;
    } finally {
      client.release();
    }
  });

  fastify.get('/careers/:slug', {
    schema: {
      tags: ['Careers'],
      summary: 'Get career opening by slug',
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM career_openings
         WHERE status = 'open' AND slug = $1
         LIMIT 1`, [slug]);
      if (!rows.length) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  fastify.post('/careers/:id/apply', {
    schema: {
      tags: ['Careers'],
      summary: 'Submit job application',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO job_applications 
         (career_opening_id, name, email, phone, linkedin_url, portfolio_url, cover_letter, resume)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [id, body.name, body.email, body.phone, body.linkedin_url, body.portfolio_url, body.cover_letter, body.resume]);
      
      return { success: true, application_id: rows[0].id };
    } finally {
      client.release();
    }
  });
}
