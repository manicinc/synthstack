/**
 * Integration Credentials & OAuth Routes
 * 
 * Handles OAuth flows and BYOK credential management for Node-RED integrations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { config } from '../config/index.js';

interface IntegrationType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  auth_type: 'oauth2' | 'api_key' | 'basic';
  oauth_authorize_url?: string;
  oauth_token_url?: string;
  default_scopes?: string[];
  documentation_url?: string;
}

interface IntegrationCredential {
  id: string;
  organization_id: string;
  integration_type: string;
  credential_name: string;
  is_active: boolean;
  scopes?: string[];
  last_used_at?: string;
  error_message?: string;
  created_at: string;
}

export default async function integrationRoutes(fastify: FastifyInstance) {
  const pg = fastify.pg;

  // ============================================
  // Integration Types (Read-only reference)
  // ============================================

  /**
   * List all supported integration types
   */
  fastify.get('/types', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'List all supported integration types',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                types: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      icon: { type: 'string' },
                      color: { type: 'string' },
                      auth_type: { type: 'string' },
                      documentation_url: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const result = await pg.query(`
      SELECT id, name, description, icon, color, auth_type, documentation_url
      FROM integration_types
      WHERE is_active = true
      ORDER BY name
    `);

    return {
      success: true,
      data: { types: result.rows }
    };
  });

  // ============================================
  // Credentials Management
  // ============================================

  /**
   * List credentials for the current organization
   */
  fastify.get('/credentials', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'List integration credentials for the organization',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          integration_type: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { integration_type } = request.query as { integration_type?: string };

    let query = `
      SELECT 
        ic.id, ic.integration_type, ic.credential_name, ic.is_active,
        ic.scopes, ic.last_used_at, ic.error_message, ic.created_at,
        it.name as integration_name, it.icon, it.color
      FROM integration_credentials ic
      JOIN integration_types it ON ic.integration_type = it.id
      WHERE ic.organization_id = $1
    `;
    const params: any[] = [user.organizationId];

    if (integration_type) {
      query += ' AND ic.integration_type = $2';
      params.push(integration_type);
    }

    query += ' ORDER BY ic.created_at DESC';

    const result = await pg.query(query, params);

    return {
      success: true,
      data: { credentials: result.rows }
    };
  });

  /**
   * Create API key credential (for non-OAuth integrations like Twilio, Stripe)
   */
  fastify.post('/credentials/api-key', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Create an API key credential',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['integration_type', 'credential_name', 'api_key'],
        properties: {
          integration_type: { type: 'string' },
          credential_name: { type: 'string' },
          api_key: { type: 'string' },
          api_secret: { type: 'string' },
          config: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { integration_type, credential_name, api_key, api_secret, config } = request.body as any;

    // Verify integration type exists and uses api_key auth
    const typeResult = await pg.query(
      'SELECT auth_type FROM integration_types WHERE id = $1 AND is_active = true',
      [integration_type]
    );

    if (typeResult.rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INTEGRATION_TYPE', message: 'Unknown or inactive integration type' }
      });
    }

    if (typeResult.rows[0].auth_type !== 'api_key') {
      return reply.status(400).send({
        success: false,
        error: { code: 'WRONG_AUTH_TYPE', message: 'This integration requires OAuth, not API key' }
      });
    }

    // Insert credential (in production, encrypt api_key and api_secret)
    const result = await pg.query(`
      INSERT INTO integration_credentials 
        (organization_id, integration_type, credential_name, api_key, api_secret, config, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, integration_type, credential_name) 
      DO UPDATE SET api_key = $4, api_secret = $5, config = $6, updated_at = NOW()
      RETURNING id, integration_type, credential_name, is_active, created_at
    `, [user.organizationId, integration_type, credential_name, api_key, api_secret, config || {}, user.id]);

    return {
      success: true,
      data: { credential: result.rows[0] }
    };
  });

  /**
   * Delete a credential
   */
  fastify.delete('/credentials/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Delete an integration credential',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { id } = request.params as { id: string };

    const result = await pg.query(
      'DELETE FROM integration_credentials WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, user.organizationId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Credential not found' }
      });
    }

    return { success: true };
  });

  /**
   * Test a credential
   */
  fastify.post('/credentials/:id/test', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Test an integration credential',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { id } = request.params as { id: string };

    const result = await pg.query(`
      SELECT ic.*, it.name as integration_name
      FROM integration_credentials ic
      JOIN integration_types it ON ic.integration_type = it.id
      WHERE ic.id = $1 AND ic.organization_id = $2
    `, [id, user.organizationId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Credential not found' }
      });
    }

    const credential = result.rows[0];
    let testResult: { success: boolean; message: string };

    try {
      // Test based on integration type
      switch (credential.integration_type) {
        case 'slack':
          testResult = await testSlackCredential(credential);
          break;
        case 'twilio':
          testResult = await testTwilioCredential(credential);
          break;
        case 'stripe':
          testResult = await testStripeCredential(credential);
          break;
        case 'notion':
          testResult = await testNotionCredential(credential);
          break;
        case 'google':
          testResult = await testGoogleCredential(credential);
          break;
        case 'jira':
          testResult = await testJiraCredential(credential);
          break;
        case 'discord':
          testResult = await testDiscordCredential(credential);
          break;
        case 'github':
          testResult = await testGitHubCredential(credential);
          break;
        default:
          testResult = { success: false, message: 'Test not implemented for this integration' };
      }

      // Update last_used_at and error_message
      await pg.query(`
        UPDATE integration_credentials 
        SET last_used_at = NOW(), error_message = $1
        WHERE id = $2
      `, [testResult.success ? null : testResult.message, id]);

      return {
        success: true,
        data: testResult
      };
    } catch (error: any) {
      await pg.query(`
        UPDATE integration_credentials 
        SET error_message = $1
        WHERE id = $2
      `, [error.message, id]);

      return {
        success: false,
        error: { code: 'TEST_FAILED', message: error.message }
      };
    }
  });

  // ============================================
  // OAuth Flows
  // ============================================

  /**
   * Start OAuth flow - generates authorization URL
   */
  fastify.post('/oauth/authorize', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Start OAuth authorization flow',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['integration_type'],
        properties: {
          integration_type: { type: 'string' },
          credential_name: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { integration_type, credential_name, scopes } = request.body as any;

    // Get integration type config
    const typeResult = await pg.query(
      'SELECT * FROM integration_types WHERE id = $1 AND is_active = true',
      [integration_type]
    );

    if (typeResult.rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INTEGRATION_TYPE', message: 'Unknown or inactive integration type' }
      });
    }

    const integrationType = typeResult.rows[0] as IntegrationType;

    if (integrationType.auth_type !== 'oauth2') {
      return reply.status(400).send({
        success: false,
        error: { code: 'NOT_OAUTH', message: 'This integration does not use OAuth' }
      });
    }

    // Generate state token for CSRF protection
    const stateToken = randomBytes(32).toString('hex');
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/integrations/oauth/callback`;
    const finalScopes = scopes || integrationType.default_scopes || [];

    // Store state
    await pg.query(`
      INSERT INTO oauth_states (organization_id, user_id, integration_type, state_token, redirect_uri, scopes, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '10 minutes')
    `, [user.organizationId, user.id, integration_type, stateToken, redirectUri, finalScopes]);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: getClientId(integration_type),
      redirect_uri: redirectUri,
      state: stateToken,
      response_type: 'code'
    });

    if (finalScopes.length > 0) {
      params.set('scope', finalScopes.join(' '));
    }

    // Integration-specific params
    if (integration_type === 'slack') {
      params.set('user_scope', ''); // Use bot scope only
    } else if (integration_type === 'notion') {
      params.set('owner', 'user');
    } else if (integration_type === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    const authUrl = `${integrationType.oauth_authorize_url}?${params.toString()}`;

    return {
      success: true,
      data: {
        authorization_url: authUrl,
        state: stateToken,
        expires_in: 600 // 10 minutes
      }
    };
  });

  /**
   * OAuth callback - exchanges code for tokens
   */
  fastify.get('/oauth/callback', {
    schema: {
      description: 'OAuth callback endpoint',
      tags: ['Integrations'],
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          error: { type: 'string' },
          error_description: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, state, error, error_description } = request.query as any;

    // Handle OAuth error
    if (error) {
      return reply.redirect(`${config.frontendUrl}/app/settings/integrations?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${config.frontendUrl}/app/settings/integrations?error=missing_params`);
    }

    // Lookup state
    const stateResult = await pg.query(`
      SELECT * FROM oauth_states 
      WHERE state_token = $1 AND expires_at > NOW()
    `, [state]);

    if (stateResult.rows.length === 0) {
      return reply.redirect(`${config.frontendUrl}/app/settings/integrations?error=invalid_state`);
    }

    const oauthState = stateResult.rows[0];

    // Get integration type config
    const typeResult = await pg.query(
      'SELECT * FROM integration_types WHERE id = $1',
      [oauthState.integration_type]
    );
    const integrationType = typeResult.rows[0];

    try {
      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForTokens(
        oauthState.integration_type,
        code,
        oauthState.redirect_uri,
        integrationType.oauth_token_url
      );

      // Store credentials
      await pg.query(`
        INSERT INTO integration_credentials 
          (organization_id, integration_type, credential_name, access_token, refresh_token, 
           token_expires_at, scopes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (organization_id, integration_type, credential_name)
        DO UPDATE SET 
          access_token = $4, 
          refresh_token = COALESCE($5, integration_credentials.refresh_token),
          token_expires_at = $6,
          scopes = $7,
          updated_at = NOW(),
          error_message = NULL
      `, [
        oauthState.organization_id,
        oauthState.integration_type,
        `${integrationType.name} Connection`,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_at,
        oauthState.scopes,
        oauthState.user_id
      ]);

      // Delete used state
      await pg.query('DELETE FROM oauth_states WHERE id = $1', [oauthState.id]);

      return reply.redirect(`${config.frontendUrl}/app/settings/integrations?success=${oauthState.integration_type}`);
    } catch (error: any) {
      fastify.log.error({ error }, 'OAuth token exchange failed');
      return reply.redirect(`${config.frontendUrl}/app/settings/integrations?error=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * Refresh OAuth token
   */
  fastify.post('/credentials/:id/refresh', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Refresh OAuth token',
      tags: ['Integrations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as any).user!;
    const { id } = request.params as { id: string };

    const result = await pg.query(`
      SELECT ic.*, it.oauth_token_url
      FROM integration_credentials ic
      JOIN integration_types it ON ic.integration_type = it.id
      WHERE ic.id = $1 AND ic.organization_id = $2
    `, [id, user.organizationId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Credential not found' }
      });
    }

    const credential = result.rows[0];

    if (!credential.refresh_token) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token available' }
      });
    }

    try {
      const tokenResponse = await refreshOAuthToken(
        credential.integration_type,
        credential.refresh_token,
        credential.oauth_token_url
      );

      await pg.query(`
        UPDATE integration_credentials
        SET access_token = $1, 
            refresh_token = COALESCE($2, refresh_token),
            token_expires_at = $3,
            last_refreshed_at = NOW(),
            error_message = NULL
        WHERE id = $4
      `, [
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_at,
        id
      ]);

      return {
        success: true,
        data: { message: 'Token refreshed successfully' }
      };
    } catch (error: any) {
      await pg.query(`
        UPDATE integration_credentials
        SET error_message = $1
        WHERE id = $2
      `, [error.message, id]);

      return reply.status(500).send({
        success: false,
        error: { code: 'REFRESH_FAILED', message: error.message }
      });
    }
  });

  // ============================================
  // Helper Functions
  // ============================================

  function getClientId(integrationType: string): string {
    const envKey = `${integrationType.toUpperCase()}_CLIENT_ID`;
    return process.env[envKey] || '';
  }

  function getClientSecret(integrationType: string): string {
    const envKey = `${integrationType.toUpperCase()}_CLIENT_SECRET`;
    return process.env[envKey] || '';
  }

  async function exchangeCodeForTokens(
    integrationType: string,
    code: string,
    redirectUri: string,
    tokenUrl: string
  ) {
    const clientId = getClientId(integrationType);
    const clientSecret = getClientSecret(integrationType);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null
    };
  }

  async function refreshOAuthToken(
    integrationType: string,
    refreshToken: string,
    tokenUrl: string
  ) {
    const clientId = getClientId(integrationType);
    const clientSecret = getClientSecret(integrationType);

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_description || errorData.error || 'Token refresh failed');
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null
    };
  }

  // Test functions for each integration
  async function testSlackCredential(credential: any) {
    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(credential.access_token);
    const result = await client.auth.test();
    return { success: true, message: `Connected as ${result.user} in ${result.team}` };
  }

  async function testTwilioCredential(credential: any) {
    const twilio = await import('twilio');
    const client = twilio.default(credential.api_key, credential.api_secret);
    const account = await client.api.accounts(credential.api_key).fetch();
    return { success: true, message: `Connected to account: ${account.friendlyName}` };
  }

  async function testStripeCredential(credential: any) {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(credential.api_key);
    const account = await stripe.accounts.retrieve();
    return { success: true, message: `Connected to Stripe account` };
  }

  async function testNotionCredential(credential: any) {
    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: credential.access_token });
    const response = await notion.users.me({});
    return { success: true, message: `Connected as ${response.name || 'Notion user'}` };
  }

  async function testGoogleCredential(credential: any) {
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: credential.access_token });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    return { success: true, message: `Connected as ${userInfo.data.email}` };
  }

  async function testJiraCredential(credential: any) {
    const response = await fetch('https://api.atlassian.com/me', {
      headers: { 'Authorization': `Bearer ${credential.access_token}` }
    });
    if (!response.ok) throw new Error('Jira auth failed');
    const data = await response.json();
    return { success: true, message: `Connected as ${data.name || data.email}` };
  }

  async function testDiscordCredential(credential: any) {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bot ${credential.access_token}` }
    });
    if (!response.ok) throw new Error('Discord auth failed');
    const data = await response.json();
    return { success: true, message: `Connected as ${data.username}` };
  }

  async function testGitHubCredential(credential: any) {
    const response = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${credential.access_token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (!response.ok) throw new Error('GitHub auth failed');
    const data = await response.json();
    return { success: true, message: `Connected as ${data.login}` };
  }
}
