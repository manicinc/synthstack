/**
 * @file routes/proposals.ts
 * @description Proposals API routes
 * Provides endpoints for creating, managing, and signing proposals
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Request types
interface ProposalParams {
  proposalId: string;
}

interface ProposalBlockParams extends ProposalParams {
  blockId: string;
}

interface CreateProposalBody {
  title: string;
  organizationId?: string;
  contactId?: string;
  dealId?: string;
  validUntil?: string;
  blocks?: Array<{
    collection: string;
    data: Record<string, unknown>;
    sort?: number;
  }>;
}

interface UpdateProposalBody {
  title?: string;
  status?: string;
  validUntil?: string;
}

interface CreateBlockBody {
  collection: string;
  data: Record<string, unknown>;
  sort?: number;
}

interface SignProposalBody {
  email: string;
  name: string;
  signatureType: 'text' | 'draw' | 'upload';
  signatureText?: string;
  signatureImage?: string;
  agreedToTerms: boolean;
}

export default async function proposalsRoutes(fastify: FastifyInstance) {
  // ============================================
  // Admin Routes (Authenticated)
  // ============================================

  /**
   * GET /api/v1/proposals
   * List proposals (admin)
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest<{ Querystring: { status?: string; organizationId?: string; page?: number; limit?: number } }>, _reply) => {
    const { status, organizationId, page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.id, p.title, p.status, p.valid_until, p.total_value,
             p.created_at, p.updated_at,
             o.name as organization_name,
             c.first_name, c.last_name, c.email as contact_email
      FROM proposals p
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN contacts c ON c.id = p.contact_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }
    if (organizationId) {
      query += ` AND p.organization_id = $${paramCount++}`;
      params.push(organizationId);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await fastify.pg.query(query, params);

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * POST /api/v1/proposals
   * Create a new proposal
   */
  fastify.post<{ Body: CreateProposalBody }>('/', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { title, organizationId, contactId, dealId, validUntil, blocks } = request.body;
    const userId = (request as any).user.id;

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create proposal
      const result = await client.query(
        `INSERT INTO proposals (title, status, organization_id, contact_id, deal_id, valid_until, user_created, created_at, updated_at)
         VALUES ($1, 'draft', $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [title, organizationId, contactId, dealId, validUntil, userId]
      );
      const proposal = result.rows[0];

      // Add blocks if provided
      if (blocks && blocks.length > 0) {
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];

          // Create block content
          const blockResult = await client.query(
            `INSERT INTO ${block.collection} (${Object.keys(block.data).join(', ')}, date_created)
             VALUES (${Object.keys(block.data).map((_, idx) => `$${idx + 1}`).join(', ')}, NOW())
             RETURNING id`,
            Object.values(block.data)
          );

          // Link block to proposal
          await client.query(
            `INSERT INTO proposal_blocks (proposal_id, collection, item, sort)
             VALUES ($1, $2, $3, $4)`,
            [proposal.id, block.collection, blockResult.rows[0].id, block.sort ?? i]
          );
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: proposal
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * GET /api/v1/proposals/:proposalId
   * Get proposal details (admin)
   */
  fastify.get<{ Params: ProposalParams }>('/:proposalId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId } = request.params;

    const result = await fastify.pg.query(
      `SELECT p.*,
              o.name as organization_name, o.logo as organization_logo,
              c.first_name, c.last_name, c.email as contact_email
       FROM proposals p
       LEFT JOIN organizations o ON o.id = p.organization_id
       LEFT JOIN contacts c ON c.id = p.contact_id
       WHERE p.id = $1`,
      [proposalId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    const proposal = result.rows[0];

    // Get blocks
    const blocksResult = await fastify.pg.query(
      `SELECT pb.id, pb.collection, pb.item, pb.sort
       FROM proposal_blocks pb
       WHERE pb.proposal_id = $1
       ORDER BY pb.sort`,
      [proposalId]
    );

    // Fetch block content
    const blocks = [];
    for (const block of blocksResult.rows) {
      const contentResult = await fastify.pg.query(
        `SELECT * FROM ${block.collection} WHERE id = $1`,
        [block.item]
      );
      blocks.push({
        id: block.id,
        collection: block.collection,
        sort: block.sort,
        content: contentResult.rows[0]
      });
    }

    // Get approvals
    const approvalsResult = await fastify.pg.query(
      `SELECT * FROM proposal_approvals WHERE proposal_id = $1`,
      [proposalId]
    );

    return {
      success: true,
      data: {
        ...proposal,
        blocks,
        approvals: approvalsResult.rows
      }
    };
  });

  /**
   * PATCH /api/v1/proposals/:proposalId
   * Update a proposal
   */
  fastify.patch<{ Params: ProposalParams; Body: UpdateProposalBody }>('/:proposalId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId } = request.params;
    const { title, status, validUntil } = request.body;

    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (validUntil !== undefined) {
      updates.push(`valid_until = $${paramCount++}`);
      values.push(validUntil);
    }

    values.push(proposalId);

    const result = await fastify.pg.query(
      `UPDATE proposals SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * DELETE /api/v1/proposals/:proposalId
   * Delete a proposal
   */
  fastify.delete<{ Params: ProposalParams }>('/:proposalId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId } = request.params;

    const result = await fastify.pg.query(
      `DELETE FROM proposals WHERE id = $1 AND status = 'draft' RETURNING id`,
      [proposalId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found or cannot be deleted' }
      });
    }

    return {
      success: true,
      data: { message: 'Proposal deleted' }
    };
  });

  // ============================================
  // Block Management
  // ============================================

  /**
   * POST /api/v1/proposals/:proposalId/blocks
   * Add a block to proposal
   */
  fastify.post<{ Params: ProposalParams; Body: CreateBlockBody }>('/:proposalId/blocks', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { proposalId } = request.params;
    const { collection, data, sort } = request.body;

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Get max sort order
      const sortResult = await client.query(
        `SELECT COALESCE(MAX(sort), -1) + 1 as next_sort FROM proposal_blocks WHERE proposal_id = $1`,
        [proposalId]
      );
      const blockSort = sort ?? sortResult.rows[0].next_sort;

      // Create block content
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const blockResult = await client.query(
        `INSERT INTO ${collection} (${columns.join(', ')}, date_created) VALUES (${placeholders}, NOW()) RETURNING id`,
        values
      );

      // Link to proposal
      const linkResult = await client.query(
        `INSERT INTO proposal_blocks (proposal_id, collection, item, sort) VALUES ($1, $2, $3, $4) RETURNING id`,
        [proposalId, collection, blockResult.rows[0].id, blockSort]
      );

      // Update proposal
      await client.query(`UPDATE proposals SET updated_at = NOW() WHERE id = $1`, [proposalId]);

      await client.query('COMMIT');

      return {
        success: true,
        data: {
          id: linkResult.rows[0].id,
          collection,
          item: blockResult.rows[0].id,
          sort: blockSort
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * PATCH /api/v1/proposals/:proposalId/blocks/:blockId
   * Update a block
   */
  fastify.patch<{ Params: ProposalBlockParams; Body: { data?: Record<string, unknown>; sort?: number } }>('/:proposalId/blocks/:blockId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId, blockId } = request.params;
    const { data, sort } = request.body;

    // Get block info
    const blockResult = await fastify.pg.query(
      `SELECT collection, item FROM proposal_blocks WHERE id = $1 AND proposal_id = $2`,
      [blockId, proposalId]
    );

    if (blockResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Block not found' }
      });
    }

    const { collection, item } = blockResult.rows[0];

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Update block content if provided
      if (data && Object.keys(data).length > 0) {
        const updates = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = [...Object.values(data), item];
        await client.query(
          `UPDATE ${collection} SET ${updates}, date_updated = NOW() WHERE id = $${values.length}`,
          values
        );
      }

      // Update sort if provided
      if (sort !== undefined) {
        await client.query(
          `UPDATE proposal_blocks SET sort = $1 WHERE id = $2`,
          [sort, blockId]
        );
      }

      // Update proposal timestamp
      await client.query(`UPDATE proposals SET updated_at = NOW() WHERE id = $1`, [proposalId]);

      await client.query('COMMIT');

      return {
        success: true,
        data: { message: 'Block updated' }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * DELETE /api/v1/proposals/:proposalId/blocks/:blockId
   * Remove a block
   */
  fastify.delete<{ Params: ProposalBlockParams }>('/:proposalId/blocks/:blockId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId, blockId } = request.params;

    const result = await fastify.pg.query(
      `DELETE FROM proposal_blocks WHERE id = $1 AND proposal_id = $2 RETURNING collection, item`,
      [blockId, proposalId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Block not found' }
      });
    }

    // Optionally delete block content
    const { collection, item } = result.rows[0];
    await fastify.pg.query(`DELETE FROM ${collection} WHERE id = $1`, [item]);

    // Update proposal
    await fastify.pg.query(`UPDATE proposals SET updated_at = NOW() WHERE id = $1`, [proposalId]);

    return {
      success: true,
      data: { message: 'Block deleted' }
    };
  });

  // ============================================
  // Public View & Signing
  // ============================================

  /**
   * GET /api/v1/proposals/:proposalId/view
   * Public view of proposal (no auth required)
   */
  fastify.get<{ Params: ProposalParams }>('/:proposalId/view', async (request, reply) => {
    const { proposalId } = request.params;

    const result = await fastify.pg.query(
      `SELECT p.id, p.title, p.status, p.valid_until, p.total_value,
              p.terms_and_conditions, p.created_at,
              o.name as organization_name, o.logo as organization_logo,
              o.website as organization_website
       FROM proposals p
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE p.id = $1 AND p.status IN ('sent', 'viewed', 'accepted')`,
      [proposalId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    const proposal = result.rows[0];

    // Check if expired
    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      return reply.status(410).send({
        success: false,
        error: { code: 'EXPIRED', message: 'This proposal has expired' }
      });
    }

    // Update status to viewed
    if (proposal.status === 'sent') {
      await fastify.pg.query(
        `UPDATE proposals SET status = 'viewed', date_viewed = NOW() WHERE id = $1`,
        [proposalId]
      );
      proposal.status = 'viewed';
    }

    // Get blocks
    const blocksResult = await fastify.pg.query(
      `SELECT pb.id, pb.collection, pb.item, pb.sort
       FROM proposal_blocks pb
       WHERE pb.proposal_id = $1
       ORDER BY pb.sort`,
      [proposalId]
    );

    const blocks = [];
    for (const block of blocksResult.rows) {
      const contentResult = await fastify.pg.query(
        `SELECT * FROM ${block.collection} WHERE id = $1`,
        [block.item]
      );
      blocks.push({
        id: block.id,
        collection: block.collection,
        sort: block.sort,
        content: contentResult.rows[0]
      });
    }

    // Get existing approvals
    const approvalsResult = await fastify.pg.query(
      `SELECT email, name, signed_at FROM proposal_approvals WHERE proposal_id = $1`,
      [proposalId]
    );

    return {
      success: true,
      data: {
        ...proposal,
        blocks,
        approvals: approvalsResult.rows,
        requiresSignature: proposal.status !== 'accepted'
      }
    };
  });

  /**
   * POST /api/v1/proposals/:proposalId/sign
   * Sign a proposal (public endpoint)
   */
  fastify.post<{ Params: ProposalParams; Body: SignProposalBody }>('/:proposalId/sign', async (request, reply) => {
    const { proposalId } = request.params;
    const { email, name, signatureType, signatureText, signatureImage, agreedToTerms } = request.body;

    if (!agreedToTerms) {
      return reply.status(400).send({
        success: false,
        error: { code: 'TERMS_REQUIRED', message: 'You must agree to the terms and conditions' }
      });
    }

    // Get proposal
    const proposalResult = await fastify.pg.query(
      `SELECT id, status, valid_until FROM proposals WHERE id = $1`,
      [proposalId]
    );

    if (proposalResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.status === 'accepted') {
      return reply.status(400).send({
        success: false,
        error: { code: 'ALREADY_SIGNED', message: 'This proposal has already been signed' }
      });
    }

    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      return reply.status(410).send({
        success: false,
        error: { code: 'EXPIRED', message: 'This proposal has expired' }
      });
    }

    // Get client IP and user agent
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create approval record
      await client.query(
        `INSERT INTO proposal_approvals
         (proposal_id, email, name, signature_type, signature_text, signature_image,
          ip_address, user_agent, signed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [proposalId, email, name, signatureType, signatureText, signatureImage, ipAddress, userAgent]
      );

      // Update proposal status
      await client.query(
        `UPDATE proposals SET status = 'accepted', date_signed = NOW(), updated_at = NOW() WHERE id = $1`,
        [proposalId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        data: { message: 'Proposal signed successfully' }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/v1/proposals/:proposalId/send
   * Send proposal to client
   */
  fastify.post<{ Params: ProposalParams }>('/:proposalId/send', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { proposalId } = request.params;

    const result = await fastify.pg.query(
      `UPDATE proposals
       SET status = 'sent', date_sent = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [proposalId]
    );

    if (result.rows.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Proposal cannot be sent' }
      });
    }

    // TODO: Send email notification to client

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * POST /api/v1/proposals/:proposalId/duplicate
   * Duplicate a proposal
   */
  fastify.post<{ Params: ProposalParams }>('/:proposalId/duplicate', {
    preHandler: [fastify.authenticate]
  }, async (request, _reply) => {
    const { proposalId } = request.params;
    const userId = (request as any).user.id;

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Get original proposal
      const original = await client.query(
        `SELECT title, organization_id, contact_id, terms_and_conditions
         FROM proposals WHERE id = $1`,
        [proposalId]
      );

      if (original.rows.length === 0) {
        throw new Error('Proposal not found');
      }

      const orig = original.rows[0];

      // Create new proposal
      const newProposal = await client.query(
        `INSERT INTO proposals (title, status, organization_id, contact_id, terms_and_conditions, user_created, created_at, updated_at)
         VALUES ($1, 'draft', $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [`${orig.title} (Copy)`, orig.organization_id, orig.contact_id, orig.terms_and_conditions, userId]
      );

      // Copy blocks
      const blocks = await client.query(
        `SELECT collection, item, sort FROM proposal_blocks WHERE proposal_id = $1 ORDER BY sort`,
        [proposalId]
      );

      for (const block of blocks.rows) {
        // Copy block content
        const content = await client.query(`SELECT * FROM ${block.collection} WHERE id = $1`, [block.item]);
        if (content.rows.length > 0) {
          const { id, date_created, date_updated, ...data } = content.rows[0];
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          const newContent = await client.query(
            `INSERT INTO ${block.collection} (${columns.join(', ')}, date_created) VALUES (${placeholders}, NOW()) RETURNING id`,
            values
          );

          await client.query(
            `INSERT INTO proposal_blocks (proposal_id, collection, item, sort) VALUES ($1, $2, $3, $4)`,
            [newProposal.rows[0].id, block.collection, newContent.rows[0].id, block.sort]
          );
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: newProposal.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}
