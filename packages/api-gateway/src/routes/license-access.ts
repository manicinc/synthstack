/**
 * @file routes/license-access.ts
 * @description Lifetime license GitHub access provisioning routes
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance } from 'fastify';
import { GitHubOrgService } from '../services/github-org.js';
import { getEmailService } from '../services/email/index.js';

export default async function licenseAccessRoutes(fastify: FastifyInstance) {
  const githubService = new GitHubOrgService(fastify);
  const emailService = getEmailService();

  /**
   * GET /api/v1/license-access/status
   * Get lifetime license status
   */
  fastify.get<{ Querystring: { session: string } }>('/status', {
    schema: {
      tags: ['License Access'],
      summary: 'Get lifetime license status',
      description: 'Retrieves the current status of a lifetime license purchase and GitHub access provisioning',
      querystring: {
        type: 'object',
        required: ['session'],
        properties: {
          session: {
            type: 'string',
            description: 'Stripe checkout session ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                github_username: { type: 'string', nullable: true },
                github_access_status: { type: 'string' },
                github_username_submitted_at: { type: 'string', nullable: true },
                github_invitation_sent_at: { type: 'string', nullable: true },
                github_invitation_accepted_at: { type: 'string', nullable: true },
              },
            },
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
    const { session } = request.query;

    const result = await fastify.pg.query(`
      SELECT email, github_username, github_access_status,
             github_username_submitted_at, github_invitation_sent_at,
             github_invitation_accepted_at
      FROM lifetime_licenses
      WHERE stripe_session_id = $1
    `, [session]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'License not found' });
    }

    return { success: true, data: result.rows[0] };
  });

  /**
   * POST /api/v1/license-access/submit-username
   * Submit GitHub username for repository access
   */
  fastify.post<{
    Body: { sessionId: string; githubUsername: string }
  }>('/submit-username', {
    schema: {
      tags: ['License Access'],
      summary: 'Submit GitHub username for repository access',
      description: 'Validates GitHub username and sends organization invitation for lifetime license buyers',
      body: {
        type: 'object',
        required: ['sessionId', 'githubUsername'],
        properties: {
          sessionId: {
            type: 'string',
            description: 'Stripe checkout session ID',
          },
          githubUsername: {
            type: 'string',
            pattern: '^[a-zA-Z0-9-]+$',
            minLength: 1,
            maxLength: 39,
            description: 'GitHub username (alphanumeric and hyphens only)',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { sessionId, githubUsername } = request.body;

    // Validate license exists
    const license = await fastify.pg.query(`
      SELECT id, email, github_access_status
      FROM lifetime_licenses
      WHERE stripe_session_id = $1
    `, [sessionId]);

    if (license.rows.length === 0) {
      return reply.code(404).send({ error: 'License not found' });
    }

    const { email, github_access_status } = license.rows[0];

    // Check if already processed
    if (github_access_status === 'active') {
      return reply.code(400).send({ error: 'GitHub access already granted' });
    }

    // Validate GitHub username exists
    const validation = await githubService.validateUsername(githubUsername);
    if (!validation.valid) {
      return reply.code(400).send({ error: validation.error || 'Invalid GitHub username' });
    }

    // Update license record with username
    await fastify.pg.query(`
      UPDATE lifetime_licenses
      SET github_username = $1,
          github_username_submitted_at = NOW(),
          github_access_status = 'username_submitted',
          updated_at = NOW()
      WHERE stripe_session_id = $2
    `, [githubUsername, sessionId]);

    // Send GitHub invitation
    const invitation = await githubService.inviteToOrganization(githubUsername, email);

    if (!invitation.success) {
      fastify.log.error({ error: invitation.error, username: githubUsername }, 'Failed to send GitHub invitation');
      return reply.code(500).send({ error: 'Failed to send GitHub invitation' });
    }

    // Update status to invited
    await fastify.pg.query(`
      UPDATE lifetime_licenses
      SET github_access_status = 'invited',
          github_invitation_sent_at = NOW(),
          updated_at = NOW()
      WHERE stripe_session_id = $1
    `, [sessionId]);

    // Send confirmation email
    try {
      await emailService.sendLifetimeInvitationSentEmail({
        to: email,
        githubUsername,
      });
    } catch (error) {
      fastify.log.error({ error, email }, 'Failed to send invitation confirmation email');
      // Don't fail the request - invitation was sent successfully
    }

    fastify.log.info({ email, githubUsername, sessionId }, 'GitHub invitation sent for lifetime license');

    return {
      success: true,
      message: 'GitHub invitation sent! Check your email to accept.',
    };
  });

  /**
   * POST /api/v1/license-access/check-acceptance
   * Check if GitHub invitation was accepted
   */
  fastify.post<{
    Body: { sessionId: string }
  }>('/check-acceptance', {
    schema: {
      tags: ['License Access'],
      summary: 'Check if GitHub invitation was accepted',
      description: 'Checks GitHub API to see if the user has accepted their organization invitation',
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: {
            type: 'string',
            description: 'Stripe checkout session ID',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { sessionId } = request.body;

    // Get license record
    const license = await fastify.pg.query(`
      SELECT github_username, github_access_status
      FROM lifetime_licenses
      WHERE stripe_session_id = $1
    `, [sessionId]);

    if (license.rows.length === 0) {
      return reply.code(404).send({ error: 'License not found' });
    }

    const { github_username, github_access_status } = license.rows[0];

    if (!github_username) {
      return reply.code(400).send({
        error: 'GitHub username not submitted yet',
      });
    }

    if (github_access_status === 'active') {
      return {
        success: true,
        status: 'active',
        message: 'GitHub access already granted',
      };
    }

    // Check membership status
    const membershipStatus = await githubService.checkMembershipStatus(github_username);

    if (membershipStatus === 'active') {
      // Update database
      await fastify.pg.query(`
        UPDATE lifetime_licenses
        SET github_access_status = 'active',
            github_invitation_accepted_at = NOW(),
            updated_at = NOW()
        WHERE stripe_session_id = $1
      `, [sessionId]);

      // Send access granted email
      try {
        await emailService.sendLifetimeAccessGrantedEmail({
          to: license.rows[0].email,
          githubUsername: github_username,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to send access granted email');
      }

      return {
        success: true,
        status: 'active',
        message: 'GitHub access confirmed! You can now clone the repository.',
      };
    }

    return {
      success: true,
      status: membershipStatus,
      message: membershipStatus === 'pending'
        ? 'Invitation pending - please check your email'
        : 'No invitation found - please contact support',
    };
  });
}
