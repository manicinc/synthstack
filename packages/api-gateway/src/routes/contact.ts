import type { FastifyInstance } from 'fastify';
import { sendContactNotification } from '../services/email.js';

export default async function contactRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  fastify.post('/contact', {
    schema: {
      tags: ['Contact'],
      summary: 'Submit contact form',
      body: {
        type: 'object',
        required: ['name', 'email', 'message'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { name, email, subject, message } = request.body as any;
    
    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO contact_submissions (name, email, subject, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name, email, subject, message]);
      
      // Send email notification
      await sendContactNotification({ name, email, subject, message });
      
      return { success: true, id: rows[0].id };
    } finally {
      client.release();
    }
  });
}
