/**
 * Internationalization (i18n) Routes
 *
 * API endpoints for managing locales and translation overrides from CMS.
 * Supports both public endpoints (for all users) and authenticated endpoints
 * (for user preferences).
 */

import { FastifyPluginAsync } from 'fastify';

interface LocaleRow {
  code: string;
  name: string;
  english_name: string;
  flag: string;
  direction: string;
  date_format: string;
  quasar_lang: string;
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

interface TranslationRow {
  locale_code: string;
  translation_key: string;
  value: string;
  category: string;
}

const i18nRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/i18n/locales - Get all supported locales
   * Public endpoint
   */
  fastify.get(
    '/i18n/locales',
    {
      schema: {
        tags: ['i18n'],
        summary: 'List supported locales',
        description: 'Returns all enabled locales with their configuration',
        response: {
          200: {
            type: 'object',
            properties: {
              locales: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    englishName: { type: 'string' },
                    flag: { type: 'string' },
                    direction: { type: 'string' },
                    dateFormat: { type: 'string' },
                    quasarLang: { type: 'string' },
                    isDefault: { type: 'boolean' },
                  },
                },
              },
              defaultLocale: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await fastify.pg.query<LocaleRow>(`
        SELECT code, name, english_name, flag, direction, date_format,
               quasar_lang, is_enabled, is_default, sort_order
        FROM supported_locales
        WHERE is_enabled = true
        ORDER BY sort_order, code
      `);

      const locales = result.rows.map((row) => ({
        code: row.code,
        name: row.name,
        englishName: row.english_name,
        flag: row.flag,
        direction: row.direction,
        dateFormat: row.date_format,
        quasarLang: row.quasar_lang,
        isDefault: row.is_default,
      }));

      const defaultLocale = locales.find((l) => l.isDefault)?.code || 'en-US';

      return {
        locales,
        defaultLocale,
      };
    }
  );

  /**
   * GET /api/v1/i18n/translations/:locale - Get translation overrides for a locale
   * Public endpoint - returns only approved translations
   */
  fastify.get(
    '/i18n/translations/:locale',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get translation overrides',
        description: 'Returns CMS-managed translation overrides for a locale',
        params: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
          },
          required: ['locale'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              locale: { type: 'string' },
              data: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { locale } = request.params as { locale: string };

      // Verify locale exists and is enabled
      const localeCheck = await fastify.pg.query(
        `SELECT code FROM supported_locales WHERE code = $1 AND is_enabled = true`,
        [locale]
      );

      if (localeCheck.rows.length === 0) {
        return reply.status(404).send({
          error: 'Locale not found',
          message: `Locale "${locale}" is not supported or not enabled`,
        });
      }

      // Get approved translation overrides
      const result = await fastify.pg.query<TranslationRow>(
        `
        SELECT translation_key, value
        FROM translation_overrides
        WHERE locale_code = $1 AND status = 'approved'
        ORDER BY translation_key
      `,
        [locale]
      );

      // Convert to key-value map
      const data: Record<string, string> = {};
      for (const row of result.rows) {
        data[row.translation_key] = row.value;
      }

      return {
        locale,
        data,
        count: result.rows.length,
      };
    }
  );

  /**
   * GET /api/v1/i18n/translations/:locale/all - Get all translations (including pending)
   * Admin endpoint - requires authentication
   */
  fastify.get(
    '/i18n/translations/:locale/all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Get all translation overrides (admin)',
        description: 'Returns all CMS translations including drafts and pending',
        params: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
          },
          required: ['locale'],
        },
      },
    },
    async (request, reply) => {
      const { locale } = request.params as { locale: string };

      const result = await fastify.pg.query(
        `
        SELECT id, translation_key, value, original_value, context,
               category, status, created_at, updated_at
        FROM translation_overrides
        WHERE locale_code = $1
        ORDER BY category, translation_key
      `,
        [locale]
      );

      return {
        locale,
        translations: result.rows,
        count: result.rows.length,
      };
    }
  );

  /**
   * POST /api/v1/i18n/translations - Create/update a translation override
   * Admin endpoint - requires authentication
   */
  fastify.post(
    '/i18n/translations',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Create or update translation',
        body: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
            key: { type: 'string' },
            value: { type: 'string' },
            originalValue: { type: 'string' },
            context: { type: 'string' },
            category: { type: 'string' },
          },
          required: ['locale', 'key', 'value'],
        },
      },
    },
    async (request, reply) => {
      const { locale, key, value, originalValue, context, category } = request.body as {
        locale: string;
        key: string;
        value: string;
        originalValue?: string;
        context?: string;
        category?: string;
      };

      // Upsert translation
      const result = await fastify.pg.query(
        `
        INSERT INTO translation_overrides (locale_code, translation_key, value, original_value, context, category, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft')
        ON CONFLICT (locale_code, translation_key) DO UPDATE SET
          value = EXCLUDED.value,
          original_value = COALESCE(EXCLUDED.original_value, translation_overrides.original_value),
          context = COALESCE(EXCLUDED.context, translation_overrides.context),
          category = COALESCE(EXCLUDED.category, translation_overrides.category),
          status = CASE WHEN translation_overrides.status = 'approved' THEN 'pending_review' ELSE translation_overrides.status END,
          updated_at = NOW()
        RETURNING id, locale_code, translation_key, value, status
      `,
        [locale, key, value, originalValue || null, context || null, category || 'general']
      );

      return {
        success: true,
        translation: result.rows[0],
      };
    }
  );

  /**
   * POST /api/v1/i18n/translations/:id/approve - Approve a translation
   * Admin endpoint
   */
  fastify.post(
    '/i18n/translations/:id/approve',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Approve translation',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string };

      const result = await fastify.pg.query(
        `
        UPDATE translation_overrides
        SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
        WHERE id = $1
        RETURNING id, translation_key, status
      `,
        [id, user.id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      return {
        success: true,
        translation: result.rows[0],
      };
    }
  );

  /**
   * DELETE /api/v1/i18n/translations/:id - Delete a translation override
   * Admin endpoint
   */
  fastify.delete(
    '/i18n/translations/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Delete translation override',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await fastify.pg.query(
        `DELETE FROM translation_overrides WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      return { success: true, deleted: id };
    }
  );

  /**
   * GET /api/v1/i18n/user/preference - Get user's locale preference
   * Requires authentication
   */
  fastify.get(
    '/i18n/user/preference',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Get user locale preference',
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };

      const result = await fastify.pg.query(
        `SELECT preferred_locale FROM app_users WHERE id = $1`,
        [user.id]
      );

      return {
        locale: result.rows[0]?.preferred_locale || null,
      };
    }
  );

  /**
   * PUT /api/v1/i18n/user/preference - Set user's locale preference
   * Requires authentication
   */
  fastify.put(
    '/i18n/user/preference',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Set user locale preference',
        body: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
          },
          required: ['locale'],
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      const { locale } = request.body as { locale: string };

      // Validate locale is supported
      const localeCheck = await fastify.pg.query(
        `SELECT code FROM supported_locales WHERE code = $1 AND is_enabled = true`,
        [locale]
      );

      if (localeCheck.rows.length === 0) {
        return reply.status(400).send({
          error: 'Invalid locale',
          message: `Locale "${locale}" is not supported`,
        });
      }

      // Update user preference
      await fastify.pg.query(
        `UPDATE app_users SET preferred_locale = $1 WHERE id = $2`,
        [locale, user.id]
      );

      return {
        success: true,
        locale,
      };
    }
  );

  /**
   * GET /api/v1/i18n/categories - Get translation categories
   * Public endpoint
   */
  fastify.get(
    '/i18n/categories',
    {
      schema: {
        tags: ['i18n'],
        summary: 'List translation categories',
      },
    },
    async (request, reply) => {
      const result = await fastify.pg.query(`
        SELECT key, name, description, icon, parent_key, sort_order
        FROM translation_categories
        ORDER BY sort_order, key
      `);

      return {
        categories: result.rows,
      };
    }
  );

  /**
   * GET /api/v1/i18n/stats - Get translation statistics
   * Admin endpoint
   */
  fastify.get(
    '/i18n/stats',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Get translation statistics',
      },
    },
    async (request, reply) => {
      // Get counts by locale and status
      const statsResult = await fastify.pg.query(`
        SELECT
          locale_code,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'pending_review') as pending_count,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
          COUNT(*) as total_count
        FROM translation_overrides
        GROUP BY locale_code
        ORDER BY locale_code
      `);

      // Get total locale count
      const localesResult = await fastify.pg.query(`
        SELECT COUNT(*) as count FROM supported_locales WHERE is_enabled = true
      `);

      return {
        localeCount: parseInt(localesResult.rows[0].count),
        byLocale: statsResult.rows,
      };
    }
  );

  /**
   * GET /api/v1/i18n/content/:collection/:id - Get translated content for a CMS item
   * Public endpoint - returns content with locale fallback
   */
  fastify.get(
    '/i18n/content/:collection/:id',
    {
      schema: {
        tags: ['i18n'],
        summary: 'Get translated content',
        description: 'Returns CMS content with translations applied for specified locale',
        params: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['collection', 'id'],
        },
        querystring: {
          type: 'object',
          properties: {
            locale: { type: 'string', default: 'en-US' },
            fields: { type: 'string', description: 'Comma-separated list of fields to translate' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              collection: { type: 'string' },
              id: { type: 'string' },
              locale: { type: 'string' },
              data: { type: 'object' },
              translations: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { collection, id } = request.params as { collection: string; id: string };
      const { locale = 'en-US', fields } = request.query as { locale?: string; fields?: string };

      // Validate collection name (whitelist allowed collections)
      const allowedCollections = ['pages', 'posts', 'faq', 'features', 'testimonials', 'pricing_plans'];
      if (!allowedCollections.includes(collection)) {
        return reply.status(400).send({
          error: 'Invalid collection',
          message: `Collection "${collection}" is not translatable`,
        });
      }

      // Get content translations for this item
      const translationsResult = await fastify.pg.query(
        `
        SELECT field_name, translated_value
        FROM content_translations
        WHERE collection = $1 AND item_id = $2::uuid AND locale_code = $3 AND status = 'approved'
      `,
        [collection, id, locale]
      );

      // Build translations map
      const translations: Record<string, string> = {};
      for (const row of translationsResult.rows) {
        translations[row.field_name] = row.translated_value;
      }

      // If no translations found, try fallback to default locale
      if (Object.keys(translations).length === 0 && locale !== 'en-US') {
        const fallbackResult = await fastify.pg.query(
          `
          SELECT field_name, translated_value
          FROM content_translations
          WHERE collection = $1 AND item_id = $2::uuid AND locale_code = 'en-US' AND status = 'approved'
        `,
          [collection, id]
        );

        for (const row of fallbackResult.rows) {
          translations[row.field_name] = row.translated_value;
        }
      }

      return {
        collection,
        id,
        locale,
        translations,
        hasTranslations: Object.keys(translations).length > 0,
      };
    }
  );

  /**
   * POST /api/v1/i18n/content/:collection/:id - Create/update content translation
   * Admin endpoint - requires authentication
   */
  fastify.post(
    '/i18n/content/:collection/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Create or update content translation',
        params: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['collection', 'id'],
        },
        body: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
            field: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['locale', 'field', 'value'],
        },
      },
    },
    async (request, reply) => {
      const { collection, id } = request.params as { collection: string; id: string };
      const { locale, field, value } = request.body as {
        locale: string;
        field: string;
        value: string;
      };

      // Validate collection
      const allowedCollections = ['pages', 'posts', 'faq', 'features', 'testimonials', 'pricing_plans'];
      if (!allowedCollections.includes(collection)) {
        return reply.status(400).send({
          error: 'Invalid collection',
          message: `Collection "${collection}" is not translatable`,
        });
      }

      // Upsert translation
      const result = await fastify.pg.query(
        `
        INSERT INTO content_translations (collection, item_id, locale_code, field_name, translated_value, status)
        VALUES ($1, $2::uuid, $3, $4, $5, 'draft')
        ON CONFLICT (collection, item_id, locale_code, field_name) DO UPDATE SET
          translated_value = EXCLUDED.translated_value,
          status = CASE WHEN content_translations.status = 'approved' THEN 'pending_review' ELSE content_translations.status END,
          updated_at = NOW()
        RETURNING id, collection, item_id, locale_code, field_name, status
      `,
        [collection, id, locale, field, value]
      );

      return {
        success: true,
        translation: result.rows[0],
      };
    }
  );

  /**
   * POST /api/v1/i18n/content/:collection/:id/approve - Approve content translation
   * Admin endpoint
   */
  fastify.post(
    '/i18n/content/:collection/:id/approve',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'Approve content translation',
        params: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['collection', 'id'],
        },
        body: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
            field: { type: 'string' },
          },
          required: ['locale', 'field'],
        },
      },
    },
    async (request, reply) => {
      const { collection, id } = request.params as { collection: string; id: string };
      const { locale, field } = request.body as { locale: string; field: string };
      const user = request.user as { id: string };

      const result = await fastify.pg.query(
        `
        UPDATE content_translations
        SET status = 'approved', reviewed_by = $5, reviewed_at = NOW()
        WHERE collection = $1 AND item_id = $2::uuid AND locale_code = $3 AND field_name = $4
        RETURNING id, status
      `,
        [collection, id, locale, field, user.id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Translation not found' });
      }

      return {
        success: true,
        translation: result.rows[0],
      };
    }
  );

  /**
   * GET /api/v1/i18n/content/:collection - List all translations for a collection
   * Admin endpoint
   */
  fastify.get(
    '/i18n/content/:collection',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['i18n'],
        summary: 'List content translations for collection',
        params: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
          },
          required: ['collection'],
        },
        querystring: {
          type: 'object',
          properties: {
            locale: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'pending_review', 'approved', 'rejected'] },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { collection } = request.params as { collection: string };
      const { locale, status, limit = 50, offset = 0 } = request.query as {
        locale?: string;
        status?: string;
        limit?: number;
        offset?: number;
      };

      let query = `
        SELECT id, collection, item_id, locale_code, field_name, translated_value, status, created_at, updated_at
        FROM content_translations
        WHERE collection = $1
      `;
      const params: (string | number)[] = [collection];
      let paramIndex = 2;

      if (locale) {
        query += ` AND locale_code = $${paramIndex}`;
        params.push(locale);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY item_id, locale_code, field_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await fastify.pg.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM content_translations WHERE collection = $1`;
      const countParams: (string | number)[] = [collection];
      let countParamIndex = 2;

      if (locale) {
        countQuery += ` AND locale_code = $${countParamIndex}`;
        countParams.push(locale);
        countParamIndex++;
      }
      if (status) {
        countQuery += ` AND status = $${countParamIndex}`;
        countParams.push(status);
      }

      const countResult = await fastify.pg.query(countQuery, countParams);

      return {
        collection,
        translations: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      };
    }
  );
};

export default i18nRoutes;
