import type { FastifyInstance } from 'fastify';

export default async function themesRoutes(fastify: FastifyInstance) {
  const { pg } = fastify;

  /**
   * Get all published themes
   */
  fastify.get('/themes', {
    schema: {
      tags: ['Themes'],
      summary: 'List all published themes',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  description: { type: 'string' },
                  is_default: { type: 'boolean' },
                  is_premium: { type: 'boolean' },
                },
              },
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
          id, status, sort, name, slug, description, preview_image,
          author, version, is_default, is_premium,
          -- Light mode
          light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
          light_text_primary, light_text_secondary, light_text_tertiary,
          light_border_default, light_border_subtle,
          -- Dark mode
          dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
          dark_text_primary, dark_text_secondary, dark_text_tertiary,
          dark_border_default, dark_border_subtle,
          -- Colors
          color_primary, color_primary_hover,
          color_secondary, color_secondary_hover,
          color_accent, color_accent_hover,
          color_success, color_warning, color_error, color_info,
          -- Typography
          font_family_sans, font_family_mono, font_family_display,
          font_size_base, font_weight_normal, font_weight_medium,
          font_weight_semibold, font_weight_bold,
          line_height_tight, line_height_normal, line_height_relaxed,
          -- Spacing
          spacing_unit, border_radius_sm, border_radius_md,
          border_radius_lg, border_radius_xl, border_radius_full,
          -- Shadows
          light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
          dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
          -- Effects
          blur_sm, blur_md, blur_lg, glass_opacity,
          -- Animation
          transition_fast, transition_normal, transition_slow,
          easing_default, easing_bounce,
          -- Components
          button_padding_x, button_padding_y,
          input_padding_x, input_padding_y, card_padding,
          -- Custom CSS
          custom_css_light, custom_css_dark
        FROM themes
        WHERE status = 'published'
        ORDER BY is_default DESC, sort ASC, name ASC
      `);

      return { data: rows };
    } finally {
      client.release();
    }
  });

  /**
   * Get a single theme by slug
   */
  fastify.get('/themes/:slug', {
    schema: {
      tags: ['Themes'],
      summary: 'Get theme by slug',
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
        },
        required: ['slug'],
      },
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const client = await pg.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM themes WHERE slug = $1 AND status = 'published'`,
        [slug]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Theme not found' });
      }

      return { data: rows[0] };
    } finally {
      client.release();
    }
  });

  /**
   * Get site theme settings
   */
  fastify.get('/theme-settings', {
    schema: {
      tags: ['Themes'],
      summary: 'Get site-wide theme settings',
    },
  }, async () => {
    const client = await pg.connect();
    try {
      const { rows } = await client.query(`
        SELECT
          s.*,
          t.slug as default_theme_slug,
          t.name as default_theme_name
        FROM site_theme_settings s
        LEFT JOIN themes t ON s.default_theme_id = t.id
        LIMIT 1
      `);

      if (rows.length === 0) {
        // Return defaults if no settings exist
        return {
          data: {
            default_theme_slug: 'synthstack',
            default_mode: 'system',
            allow_user_themes: true,
            allow_mode_toggle: true,
            show_theme_selector: true,
          },
        };
      }

      return { data: rows[0] };
    } finally {
      client.release();
    }
  });
}
