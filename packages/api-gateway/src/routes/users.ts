import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface UserCheckQuerystring {
  email: string;
}

export default async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/users/check?email=...
   * Check if a user exists by email (used for project member invites)
   */
  fastify.get(
    '/check',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Check if user exists by email',
        querystring: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              exists: { type: 'boolean' },
              userId: { type: 'string', nullable: true },
              name: { type: 'string', nullable: true },
            },
            required: ['exists'],
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: UserCheckQuerystring }>,
      reply: FastifyReply
    ) => {
      const email = (request.query.email || '').trim().toLowerCase();

      if (!email || !email.includes('@')) {
        return reply.status(400).send({ exists: false, userId: null, name: null });
      }

      const result = await fastify.pg.query<{ id: string; display_name: string | null }>(
        `SELECT id, display_name FROM app_users WHERE email = $1 LIMIT 1`,
        [email]
      );

      const row = result.rows[0];
      if (!row) {
        return { exists: false, userId: null, name: null };
      }

      return { exists: true, userId: row.id, name: row.display_name };
    }
  );
}

