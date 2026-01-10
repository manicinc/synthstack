import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface PricingTier {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceDisplay: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  billingType: 'recurring' | 'one_time' | 'custom';
  currency: string;
  features: string[];
  badge: string | null;
  badgeColor: string | null;
  isFeatured: boolean;
  isEnterprise: boolean;
  ctaLabel: string;
  ctaUrl: string | null;
  ctaStyle: 'primary' | 'outline' | 'secondary';
  creditsMonthly: number | null;
  creditsIncluded: string | null;
}

interface PricingQueryParams {
  region?: string;
  audience?: string;
  billingType?: string;
}

/**
 * Pricing routes - public pricing tier information
 */
export default async function pricingRoutes(fastify: FastifyInstance) {
  /**
   * GET /pricing/tiers - Get all published pricing tiers
   *
   * Query params:
   * - region: Filter by region (e.g., 'US', 'EU')
   * - audience: Filter by audience (e.g., 'new_users')
   * - billingType: Filter by billing type ('recurring', 'one_time', 'custom')
   */
  fastify.get('/tiers', {
    schema: {
      tags: ['Pricing'],
      summary: 'Get pricing tiers',
      description: 'Returns all published pricing tiers, optionally filtered by region or audience',
      querystring: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Filter by region code' },
          audience: { type: 'string', description: 'Filter by target audience' },
          billingType: { type: 'string', enum: ['recurring', 'one_time', 'custom'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  slug: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  priceDisplay: { type: 'string', nullable: true },
                  priceMonthly: { type: 'number', nullable: true },
                  priceYearly: { type: 'number', nullable: true },
                  billingType: { type: 'string' },
                  currency: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                  badge: { type: 'string', nullable: true },
                  badgeColor: { type: 'string', nullable: true },
                  isFeatured: { type: 'boolean' },
                  isEnterprise: { type: 'boolean' },
                  ctaLabel: { type: 'string' },
                  ctaUrl: { type: 'string', nullable: true },
                  ctaStyle: { type: 'string' },
                  creditsMonthly: { type: 'number', nullable: true },
                  creditsIncluded: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: PricingQueryParams }>, reply: FastifyReply) => {
    const { region, audience, billingType } = request.query;

    try {
      let query = `
        SELECT
          id,
          slug,
          name,
          description,
          price_display,
          price_monthly,
          price_yearly,
          billing_type,
          currency,
          features,
          badge,
          badge_color,
          is_featured,
          is_enterprise,
          cta_label,
          cta_url,
          cta_style,
          credits_monthly,
          credits_included
        FROM pricing_tiers
        WHERE status = 'published'
      `;

      const params: (string | null)[] = [];
      let paramIndex = 1;

      // Filter by region (null matches global)
      if (region) {
        query += ` AND (region = $${paramIndex} OR region IS NULL)`;
        params.push(region);
        paramIndex++;
      } else {
        query += ` AND region IS NULL`;
      }

      // Filter by audience
      if (audience) {
        query += ` AND (audience = $${paramIndex} OR audience IS NULL)`;
        params.push(audience);
        paramIndex++;
      } else {
        query += ` AND audience IS NULL`;
      }

      // Filter by billing type
      if (billingType) {
        query += ` AND billing_type = $${paramIndex}`;
        params.push(billingType);
        paramIndex++;
      }

      query += ` ORDER BY sort ASC, name ASC`;

      const result = await fastify.pg.query(query, params);

      const tiers: PricingTier[] = result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        priceDisplay: row.price_display,
        priceMonthly: row.price_monthly ? parseFloat(row.price_monthly) : null,
        priceYearly: row.price_yearly ? parseFloat(row.price_yearly) : null,
        billingType: row.billing_type,
        currency: row.currency || 'USD',
        features: row.features || [],
        badge: row.badge,
        badgeColor: row.badge_color,
        isFeatured: row.is_featured || false,
        isEnterprise: row.is_enterprise || false,
        ctaLabel: row.cta_label || 'Get Started',
        ctaUrl: row.cta_url,
        ctaStyle: row.cta_style || 'primary',
        creditsMonthly: row.credits_monthly,
        creditsIncluded: row.credits_included,
      }));

      return reply.send({ tiers });
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to fetch pricing tiers');
      return reply.status(500).send({ error: 'Failed to load pricing information' });
    }
  });

  /**
   * GET /pricing/tiers/:slug - Get a specific pricing tier by slug
   */
  fastify.get('/tiers/:slug', {
    schema: {
      tags: ['Pricing'],
      summary: 'Get pricing tier by slug',
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
        },
        required: ['slug'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = request.params;

    try {
      const result = await fastify.pg.query(
        `SELECT
          id, slug, name, description, price_display, price_monthly, price_yearly,
          billing_type, currency, features, badge, badge_color, is_featured,
          is_enterprise, cta_label, cta_url, cta_style, credits_monthly, credits_included,
          stripe_price_id_monthly, stripe_price_id_yearly
        FROM pricing_tiers
        WHERE slug = $1 AND status = 'published'`,
        [slug]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Pricing tier not found' });
      }

      const row = result.rows[0];
      const tier: PricingTier & { stripePriceIdMonthly?: string; stripePriceIdYearly?: string } = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        priceDisplay: row.price_display,
        priceMonthly: row.price_monthly ? parseFloat(row.price_monthly) : null,
        priceYearly: row.price_yearly ? parseFloat(row.price_yearly) : null,
        billingType: row.billing_type,
        currency: row.currency || 'USD',
        features: row.features || [],
        badge: row.badge,
        badgeColor: row.badge_color,
        isFeatured: row.is_featured || false,
        isEnterprise: row.is_enterprise || false,
        ctaLabel: row.cta_label || 'Get Started',
        ctaUrl: row.cta_url,
        ctaStyle: row.cta_style || 'primary',
        creditsMonthly: row.credits_monthly,
        creditsIncluded: row.credits_included,
        // Include Stripe IDs for checkout
        stripePriceIdMonthly: row.stripe_price_id_monthly,
        stripePriceIdYearly: row.stripe_price_id_yearly,
      };

      return reply.send({ tier });
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to fetch pricing tier');
      return reply.status(500).send({ error: 'Failed to load pricing tier' });
    }
  });
}
