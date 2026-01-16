import type { FastifyInstance } from 'fastify';

export default async function blogRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  /**
   * List all published blog posts
   * GET /api/v1/blog
   */
  fastify.get('/', {
    schema: {
      tags: ['Blog'],
      summary: 'List blog posts',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category slug' },
          featured: { type: 'boolean', description: 'Only featured posts' },
          limit: { type: 'number', default: 50, description: 'Max posts to return' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              summary: { type: 'string' },
              image: { type: 'string' },
              category: { type: 'string' },
              category_slug: { type: 'string' },
              category_color: { type: 'string' },
              author: { type: 'string' },
              published_at: { type: 'string' },
              read_time: { type: 'number' },
              featured: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { category, featured, limit = 50 } = request.query as {
      category?: string;
      featured?: boolean;
      limit?: number;
    };

    const client = await pg.connect();
    try {
      let query = `
        SELECT
          bp.id,
          bp.title,
          bp.slug,
          bp.summary,
          COALESCE(
            CASE WHEN df.filename_disk IS NOT NULL
              THEN CONCAT('/assets/', df.filename_disk)
              ELSE NULL
            END,
            bp.hero_image_url
          ) AS image,
          bc.name AS category,
          bc.slug AS category_slug,
          bc.color AS category_color,
          ba.name AS author,
          bp.published_at,
          bp.read_time,
          bp.featured
        FROM blog_posts bp
        LEFT JOIN directus_files df ON bp.hero_image = df.id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        LEFT JOIN blog_authors ba ON bp.author_id = ba.id
        WHERE bp.status = 'published'
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND bc.slug = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (featured !== undefined) {
        query += ` AND bp.featured = $${paramIndex}`;
        params.push(featured);
        paramIndex++;
      }

      query += ` ORDER BY bp.featured DESC, COALESCE(bp.published_at, bp.date_created) DESC`;
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  /**
   * Get blog post by slug
   * GET /api/v1/blog/:slug
   */
  fastify.get('/:slug', {
    schema: {
      tags: ['Blog'],
      summary: 'Get blog post by slug',
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
        },
        required: ['slug'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            summary: { type: 'string' },
            body: { type: 'string' },
            image: { type: 'string' },
            og_image: { type: 'string' },
            category: { type: 'string' },
            category_slug: { type: 'string' },
            category_color: { type: 'string' },
            author: { type: 'string' },
            author_bio: { type: 'string' },
            published_at: { type: 'string' },
            read_time: { type: 'number' },
            featured: { type: 'boolean' },
            seo_title: { type: 'string' },
            seo_description: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(`
        SELECT
          bp.id,
          bp.title,
          bp.slug,
          bp.summary,
          bp.body,
          COALESCE(
            CASE WHEN df.filename_disk IS NOT NULL
              THEN CONCAT('/assets/', df.filename_disk)
              ELSE NULL
            END,
            bp.hero_image_url
          ) AS image,
          COALESCE(
            CASE WHEN og.filename_disk IS NOT NULL
              THEN CONCAT('/assets/', og.filename_disk)
              ELSE NULL
            END,
            bp.og_image_url,
            bp.hero_image_url
          ) AS og_image,
          bc.name AS category,
          bc.slug AS category_slug,
          bc.color AS category_color,
          ba.name AS author,
          ba.bio AS author_bio,
          bp.published_at,
          bp.read_time,
          bp.featured,
          bp.seo_title,
          bp.seo_description
        FROM blog_posts bp
        LEFT JOIN directus_files df ON bp.hero_image = df.id
        LEFT JOIN directus_files og ON bp.og_image = og.id
        LEFT JOIN blog_categories bc ON bp.category_id = bc.id
        LEFT JOIN blog_authors ba ON bp.author_id = ba.id
        WHERE bp.status = 'published' AND bp.slug = $1
        LIMIT 1
      `, [slug]);

      if (!rows.length) {
        return reply.code(404).send({ error: 'Post not found' });
      }

      // Increment view count (fire and forget)
      client.query(
        'UPDATE blog_posts SET views = views + 1 WHERE slug = $1',
        [slug]
      ).catch(() => {});

      return rows[0];
    } finally {
      client.release();
    }
  });

  /**
   * Get blog categories
   * GET /api/v1/blog/categories
   */
  fastify.get('/categories', {
    schema: {
      tags: ['Blog'],
      summary: 'List blog categories',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string' },
              color: { type: 'string' },
              post_count: { type: 'number' },
            },
          },
        },
      },
    },
  }, async () => {
    const client = await pg.connect();
    try {
      const { rows } = await client.query(`
        SELECT
          bc.id,
          bc.name,
          bc.slug,
          bc.description,
          bc.color,
          COUNT(bp.id)::int AS post_count
        FROM blog_categories bc
        LEFT JOIN blog_posts bp ON bc.id = bp.category_id AND bp.status = 'published'
        WHERE bc.status = 'published'
        GROUP BY bc.id
        ORDER BY bc.sort, bc.name
      `);
      return rows;
    } finally {
      client.release();
    }
  });
}
