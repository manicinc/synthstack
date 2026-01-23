/**
 * @file routes/client-portal.ts
 * @description Client Portal API routes
 * Provides endpoints for client access to projects, tasks, files, invoices, and messaging
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAuthService } from '../services/auth/index.js';
import { config } from '../config/index.js';
import Stripe from 'stripe';
import PDFDocument from 'pdfkit';

// Request types
interface PortalProjectParams {
  projectId: string;
}

interface ConversationParams {
  conversationId: string;
}

interface MessageBody {
  text: string;
  attachments?: string[];
}

interface ConversationQuery {
  collection?: string;
  item?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export default async function clientPortalRoutes(fastify: FastifyInstance) {
  const authService = getAuthService();

  // Middleware to verify portal access
  const verifyPortalAccess = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization' }
      });
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyToken(token);

    if (!verification.valid || !verification.user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
      });
    }

    // Get user's contact record and portal access
    const contactResult = await fastify.pg.query(
      `SELECT c.id as contact_id, c.organization_id, c.first_name, c.last_name, c.email
       FROM contacts c
       JOIN app_users u ON u.email = c.email
       WHERE u.id = $1`,
      [verification.user.id]
    );

    if (contactResult.rows.length === 0) {
      return reply.status(403).send({
        success: false,
        error: { code: 'NO_PORTAL_ACCESS', message: 'No portal access configured' }
      });
    }

    (request as any).portalUser = {
      userId: verification.user.id,
      contactId: contactResult.rows[0].contact_id,
      organizationId: contactResult.rows[0].organization_id,
      name: `${contactResult.rows[0].first_name} ${contactResult.rows[0].last_name}`.trim(),
      email: contactResult.rows[0].email
    };
  };

  // ============================================
  // Dashboard
  // ============================================

  /**
   * GET /api/portal/dashboard
   * Get portal dashboard data
   */
  fastify.get('/dashboard', {
    preHandler: verifyPortalAccess
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const { contactId, organizationId } = (request as any).portalUser;

    // Get projects count
    const projectsResult = await fastify.pg.query(
      `SELECT COUNT(*) as count FROM project_contacts
       WHERE contact_id = $1`,
      [contactId]
    );

    // Get open tasks count
    const tasksResult = await fastify.pg.query(
      `SELECT COUNT(*) as count FROM todos t
       JOIN project_contacts pc ON pc.project_id = t.project_id
       WHERE pc.contact_id = $1
         AND pc.can_view_tasks = true
         AND t.is_visible_to_client = true
         AND t.status NOT IN ('completed', 'cancelled')`,
      [contactId]
    );

    // Get pending invoices
    const invoicesResult = await fastify.pg.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_due), 0) as total
       FROM invoices
       WHERE organization_id = $1
         AND status IN ('sent', 'overdue', 'partial')
         AND amount_due > 0`,
      [organizationId]
    );

    // Get unread messages
    const messagesResult = await fastify.pg.query(
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.contact_id = $1 AND m.is_read = false AND m.contact_id != $1`,
      [contactId]
    );

    // Get recent activity
    const activityResult = await fastify.pg.query(
      `SELECT 'project_update' as type, p.name as title, p.updated_at as timestamp
       FROM projects p
       JOIN project_contacts pc ON pc.project_id = p.id
       WHERE pc.contact_id = $1
       ORDER BY p.updated_at DESC
       LIMIT 5`,
      [contactId]
    );

    return {
      success: true,
      data: {
        stats: {
          projects: parseInt(projectsResult.rows[0].count),
          openTasks: parseInt(tasksResult.rows[0].count),
          pendingInvoices: parseInt(invoicesResult.rows[0].count),
          pendingAmount: parseFloat(invoicesResult.rows[0].total || 0),
          unreadMessages: parseInt(messagesResult.rows[0].count)
        },
        recentActivity: activityResult.rows
      }
    };
  });

  // ============================================
  // Projects
  // ============================================

  /**
   * GET /api/portal/projects
   * List client's accessible projects
   */
  fastify.get('/projects', {
    preHandler: verifyPortalAccess
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const { contactId } = (request as any).portalUser;

    const result = await fastify.pg.query(
      `SELECT p.id, p.name, p.description, p.status, p.billing,
              pc.role, pc.can_view_tasks, pc.can_view_files, pc.can_view_invoices,
              p.created_at, p.updated_at,
              (SELECT COUNT(*) FROM todos t WHERE t.project_id = p.id AND t.is_visible_to_client = true) as task_count,
              (SELECT COUNT(*) FROM todos t WHERE t.project_id = p.id AND t.is_visible_to_client = true AND t.status = 'completed') as completed_task_count
       FROM projects p
       JOIN project_contacts pc ON pc.project_id = p.id
       WHERE pc.contact_id = $1 AND p.is_client_visible = true
       ORDER BY p.updated_at DESC`,
      [contactId]
    );

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * GET /api/portal/projects/:projectId
   * Get project details
   */
  fastify.get<{ Params: PortalProjectParams }>('/projects/:projectId', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { projectId } = request.params;
    const { contactId } = (request as any).portalUser;

    // Verify access
    const accessResult = await fastify.pg.query(
      `SELECT pc.role, pc.can_view_tasks, pc.can_view_files, pc.can_view_invoices
       FROM project_contacts pc
       WHERE pc.project_id = $1 AND pc.contact_id = $2`,
      [projectId, contactId]
    );

    if (accessResult.rows.length === 0) {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'No access to this project' }
      });
    }

    const permissions = accessResult.rows[0];

    // Get project details
    const projectResult = await fastify.pg.query(
      `SELECT p.id, p.name, p.description, p.status, p.billing,
              p.created_at, p.updated_at
       FROM projects p
       WHERE p.id = $1 AND p.is_client_visible = true`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    const project = projectResult.rows[0];

    // Get milestones
    const milestonesResult = await fastify.pg.query(
      `SELECT id, title, description, target_date, status
       FROM milestones
       WHERE project_id = $1
       ORDER BY target_date ASC`,
      [projectId]
    );

    // Get team members (if visible)
    const teamResult = await fastify.pg.query(
      `SELECT pm.user_id, u.display_name, u.avatar_url, pm.role
       FROM project_members pm
       JOIN app_users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId]
    );

    return {
      success: true,
      data: {
        ...project,
        permissions,
        milestones: milestonesResult.rows,
        team: teamResult.rows
      }
    };
  });

  // ============================================
  // Tasks
  // ============================================

  /**
   * GET /api/portal/projects/:projectId/tasks
   * Get client-visible tasks for a project
   */
  fastify.get<{ Params: PortalProjectParams; Querystring: { status?: string } }>('/projects/:projectId/tasks', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { projectId } = request.params;
    const { status } = request.query;
    const { contactId } = (request as any).portalUser;

    // Verify access
    const accessResult = await fastify.pg.query(
      `SELECT can_view_tasks FROM project_contacts
       WHERE project_id = $1 AND contact_id = $2`,
      [projectId, contactId]
    );

    if (accessResult.rows.length === 0 || !accessResult.rows[0].can_view_tasks) {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Cannot view tasks for this project' }
      });
    }

    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority,
             t.due_date, t.responsibility, t.date_completed,
             t.created_at, t.updated_at
      FROM todos t
      WHERE t.project_id = $1 AND t.is_visible_to_client = true
    `;
    const params: any[] = [projectId];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`;

    const result = await fastify.pg.query(query, params);

    return {
      success: true,
      data: result.rows
    };
  });

  // ============================================
  // Files
  // ============================================

  /**
   * GET /api/portal/projects/:projectId/files
   * Get client-visible files for a project
   */
  fastify.get<{ Params: PortalProjectParams }>('/projects/:projectId/files', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { projectId } = request.params;
    const { contactId } = (request as any).portalUser;

    // Verify access
    const accessResult = await fastify.pg.query(
      `SELECT can_view_files FROM project_contacts
       WHERE project_id = $1 AND contact_id = $2`,
      [projectId, contactId]
    );

    if (accessResult.rows.length === 0 || !accessResult.rows[0].can_view_files) {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Cannot view files for this project' }
      });
    }

    const result = await fastify.pg.query(
      `SELECT f.id, f.filename_download, f.title, f.type, f.filesize,
              f.uploaded_on, f.description
       FROM directus_files f
       JOIN project_files pf ON pf.file_id = f.id
       WHERE pf.project_id = $1 AND pf.is_client_visible = true
       ORDER BY f.uploaded_on DESC`,
      [projectId]
    );

    return {
      success: true,
      data: result.rows
    };
  });

  // ============================================
  // Invoices
  // ============================================

  /**
   * GET /api/portal/invoices
   * Get client's invoices
   */
  fastify.get<{ Querystring: { status?: string; page?: number; limit?: number } }>('/invoices', {
    preHandler: verifyPortalAccess
  }, async (request, _reply) => {
    const { organizationId } = (request as any).portalUser;
    const { status, page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [organizationId];
    const whereClauses: string[] = ['i.organization_id = $1'];

    if (status) {
      whereClauses.push(`i.status = $2`);
      baseParams.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const query = `
      SELECT
        i.id,
        i.invoice_number,
        i.status,
        i.invoice_date as issue_date,
        i.due_date,
        i.paid_date as paid_at,
        i.subtotal,
        i.total_tax as tax_amount,
        i.total,
        i.total as total_amount,
        i.amount_paid,
        i.amount_due,
        'usd'::text as currency,
        i.date_created as created_at,
        CASE
          WHEN p.id IS NULL THEN NULL
          ELSE json_build_object('id', p.id, 'name', p.name)
        END as project
      FROM invoices i
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE ${whereSql}
      ORDER BY i.invoice_date DESC
      LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
    `;

    const countQuery = `SELECT COUNT(*) FROM invoices i WHERE ${whereSql}`;
    const queryParams = [...baseParams, limit, offset];

    const [result, countResult] = await Promise.all([
      fastify.pg.query(query, queryParams),
      fastify.pg.query(countQuery, baseParams)
    ]);

    return {
      success: true,
      data: result.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  });

  /**
   * GET /api/portal/invoices/:invoiceId
   * Get invoice details
   */
  fastify.get<{ Params: { invoiceId: string } }>('/invoices/:invoiceId', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { invoiceId } = request.params;
    const { organizationId } = (request as any).portalUser;

    const result = await fastify.pg.query(
      `SELECT i.*, o.name as organization_name, o.billing_email
       FROM invoices i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.id = $1 AND i.organization_id = $2`,
      [invoiceId, organizationId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' }
      });
    }

    // Get line items
    const itemsResult = await fastify.pg.query(
      `SELECT
         ii.id,
         ii.description,
         ii.quantity,
         ii.unit_price,
         ii.line_amount as amount,
         ii.line_amount as total,
         ii.tax_amount
       FROM invoice_items ii
       WHERE ii.invoice_id = $1
       ORDER BY ii.sort ASC NULLS LAST, ii.date_created ASC`,
      [invoiceId]
    );

    return {
      success: true,
      data: {
        ...result.rows[0],
        items: itemsResult.rows
      }
    };
  });

  /**
   * POST /api/portal/invoices/:invoiceId/pay
   * Create a Stripe Checkout session for invoice payment
   */
  fastify.post<{ Params: { invoiceId: string } }>('/invoices/:invoiceId/pay', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { invoiceId } = request.params;
    const { organizationId, contactId, email } = (request as any).portalUser;

    // Get invoice details
    const invoiceResult = await fastify.pg.query(
      `SELECT i.*, o.name as organization_name
       FROM invoices i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.id = $1 AND i.organization_id = $2`,
      [invoiceId, organizationId]
    );

    if (invoiceResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' }
      });
    }

    const invoice = invoiceResult.rows[0];

    // Check if invoice is payable
    if (!['sent', 'overdue', 'partial'].includes(invoice.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Invoice is ${invoice.status}` }
      });
    }

    const amountDue = typeof invoice.amount_due === 'string'
      ? parseFloat(invoice.amount_due)
      : Number(invoice.amount_due ?? 0);

    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Invoice has no amount due' }
      });
    }

    try {
      // Create Stripe Checkout Session
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2025-02-24.acacia',
      });

      const appUrl = (config.frontendUrl || 'http://localhost:3050').replace(/\/$/, '');
      const successUrl = `${appUrl}/portal/invoices?payment=success&invoice=${invoiceId}`;
      const cancelUrl = `${appUrl}/portal/invoices?payment=cancelled&invoice=${invoiceId}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: invoice.organization_name
            },
            unit_amount: Math.round(amountDue * 100) // Convert to cents
          },
          quantity: 1
        }],
        mode: 'payment',
        customer_email: email,
        client_reference_id: invoiceId,
        metadata: {
          invoice_id: invoiceId,
          organization_id: organizationId,
          contact_id: contactId
        },
        success_url: successUrl,
        cancel_url: cancelUrl
      });

      const expiresAt = (session.expires_at ? new Date(session.expires_at * 1000) : null);

      // Log payment session creation
      await fastify.pg.query(
        `INSERT INTO payment_sessions (
           invoice_id,
           session_id,
           provider,
           status,
           amount,
           currency,
           customer_email,
           contact_id,
           organization_id,
           success_url,
           cancel_url,
           expires_at,
           metadata
         ) VALUES ($1, $2, 'stripe', 'pending', $3, 'usd', $4, $5, $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (session_id) DO NOTHING`,
        [
          invoiceId,
          session.id,
          amountDue,
          email,
          contactId,
          organizationId,
          successUrl,
          cancelUrl,
          expiresAt,
          JSON.stringify({
            invoice_id: invoiceId,
            organization_id: organizationId,
            contact_id: contactId,
          }),
        ]
      );

      if (session.url) {
        await fastify.pg.query(
          `UPDATE invoices
           SET stripe_checkout_url = $1,
               user_updated = NULL,
               date_updated = NOW()
           WHERE id = $2`,
          [session.url, invoiceId]
        );
      }

      return {
        success: true,
        data: {
          paymentUrl: session.url,
          sessionId: session.id
        }
      };
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to create payment session');
      return reply.status(500).send({
        success: false,
        error: { code: 'PAYMENT_ERROR', message: 'Failed to create payment session' }
      });
    }
  });

  /**
   * GET /api/portal/invoices/:invoiceId/pdf
   * Download invoice as PDF
   */
  fastify.get<{ Params: { invoiceId: string } }>('/invoices/:invoiceId/pdf', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { invoiceId } = request.params;
    const { organizationId } = (request as any).portalUser;

    // Get invoice with all details
    const invoiceResult = await fastify.pg.query(
      `SELECT i.*, o.name as organization_name, o.billing_email, o.phone, o.website,
              o.address_line1, o.address_line2, o.city, o.state, o.postal_code, o.country
       FROM invoices i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.id = $1 AND i.organization_id = $2`,
      [invoiceId, organizationId]
    );

    if (invoiceResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' }
      });
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const itemsResult = await fastify.pg.query(
      `SELECT
         ii.description,
         ii.quantity,
         ii.unit_price,
         ii.line_amount,
         ii.tax_amount
       FROM invoice_items ii
       WHERE ii.invoice_id = $1
       ORDER BY ii.sort ASC NULLS LAST, ii.date_created ASC`,
      [invoiceId]
    );

    try {
      // Generate PDF using PDFKit
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers
      reply.type('application/pdf');
      reply.header('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);

      // Pipe PDF to response
      doc.pipe(reply.raw);

      // Add company logo (if available)
      // doc.image('logo.png', 50, 45, { width: 150 });

      // Company info
      doc.fontSize(20)
        .text(invoice.organization_name, 50, 50);

      doc.fontSize(10)
        .text(invoice.address_line1 || '', 50, 80)
        .text(`${invoice.city || ''}, ${invoice.state || ''} ${invoice.postal_code || ''}`, 50, 95)
        .text(invoice.billing_email || '', 50, 110);

      // Invoice title and number
      doc.fontSize(20)
        .text('INVOICE', 400, 50);

      doc.fontSize(10)
        .text(`Invoice #${invoice.invoice_number}`, 400, 80)
        .text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 400, 95)
        .text(`Due: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}`, 400, 110);

      // Status badge
      doc.fontSize(12)
        .fillColor(invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange')
        .text(invoice.status.toUpperCase(), 400, 125);

      doc.fillColor('black');

      // Line items table
      let y = 200;
      doc.fontSize(10)
        .text('Description', 50, y)
        .text('Quantity', 300, y)
        .text('Unit Price', 370, y)
        .text('Amount', 470, y);

      doc.moveTo(50, y + 15)
        .lineTo(550, y + 15)
        .stroke();

      y += 25;

      // Add line items
      itemsResult.rows.forEach((item: any) => {
        doc.fontSize(9)
          .text(item.description || item.item_name, 50, y, { width: 240 })
          .text(item.quantity, 300, y)
          .text(`$${parseFloat(item.unit_price).toFixed(2)}`, 370, y)
          .text(`$${parseFloat(item.line_amount).toFixed(2)}`, 470, y);

        y += 20;
      });

      // Totals section
      y += 20;
      doc.moveTo(350, y)
        .lineTo(550, y)
        .stroke();

      y += 10;
      doc.fontSize(10)
        .text('Subtotal:', 370, y)
        .text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, 470, y);

      y += 20;
      doc.text('Tax:', 370, y)
        .text(`$${parseFloat(invoice.total_tax || 0).toFixed(2)}`, 470, y);

      y += 20;
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 370, y)
        .text(`$${parseFloat(invoice.total).toFixed(2)}`, 470, y);

      // Payment instructions
      if (invoice.status !== 'paid') {
        y += 60;
        doc.fontSize(10)
          .font('Helvetica')
          .text('Payment Instructions:', 50, y);

        y += 20;
        doc.fontSize(9)
          .text('Please pay online via the client portal or contact us for other payment methods.', 50, y, { width: 500 });
      }

      // Footer
      doc.fontSize(8)
        .text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });

      // Finalize PDF
      doc.end();
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to generate PDF');
      return reply.status(500).send({
        success: false,
        error: { code: 'PDF_ERROR', message: 'Failed to generate invoice PDF' }
      });
    }
  });

  // ============================================
  // Conversations & Messages
  // ============================================

  /**
   * GET /api/portal/conversations
   * Get client's conversations
   */
  fastify.get<{ Querystring: ConversationQuery }>('/conversations', {
    preHandler: verifyPortalAccess
  }, async (request, _reply) => {
    const { contactId } = (request as any).portalUser;
    const { collection, item, status, page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.id, c.title, c.status, c.collection, c.item,
             c.created_at, c.updated_at,
             (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false AND m.contact_id != $1) as unread_count,
             (SELECT m.text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.contact_id = $1
    `;
    const params: any[] = [contactId];
    let paramCount = 2;

    if (collection) {
      query += ` AND c.collection = $${paramCount++}`;
      params.push(collection);
    }
    if (item) {
      query += ` AND c.item = $${paramCount++}`;
      params.push(item);
    }
    if (status) {
      query += ` AND c.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY c.updated_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await fastify.pg.query(query, params);

    return {
      success: true,
      data: result.rows
    };
  });

  /**
   * POST /api/portal/conversations
   * Create a new conversation
   */
  fastify.post<{ Body: { title: string; collection?: string; item?: string; message: string } }>('/conversations', {
    preHandler: verifyPortalAccess
  }, async (request, _reply) => {
    const { contactId } = (request as any).portalUser;
    const { title, collection, item, message } = request.body;

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create conversation
      const convResult = await client.query(
        `INSERT INTO conversations (title, status, collection, item, created_at, updated_at)
         VALUES ($1, 'open', $2, $3, NOW(), NOW())
         RETURNING id`,
        [title, collection || null, item || null]
      );
      const conversationId = convResult.rows[0].id;

      // Add participant
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, contact_id, joined_at)
         VALUES ($1, $2, NOW())`,
        [conversationId, contactId]
      );

      // Add initial message
      await client.query(
        `INSERT INTO messages (conversation_id, contact_id, text, is_read, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [conversationId, contactId, message]
      );

      await client.query('COMMIT');

      return {
        success: true,
        data: { id: conversationId, title, status: 'open' }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * GET /api/portal/conversations/:conversationId/messages
   * Get messages in a conversation
   */
  fastify.get<{ Params: ConversationParams; Querystring: { page?: number; limit?: number } }>('/conversations/:conversationId/messages', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { conversationId } = request.params;
    const { contactId } = (request as any).portalUser;
    const { page = 1, limit = 50 } = request.query;
    const offset = (page - 1) * limit;

    // Verify access
    const accessResult = await fastify.pg.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND contact_id = $2`,
      [conversationId, contactId]
    );

    if (accessResult.rows.length === 0) {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'No access to this conversation' }
      });
    }

    // Get messages
    const result = await fastify.pg.query(
      `SELECT m.id, m.text, m.is_read, m.created_at,
              m.contact_id, c.first_name, c.last_name,
              m.user_created, u.display_name as user_name
       FROM messages m
       LEFT JOIN contacts c ON c.id = m.contact_id
       LEFT JOIN app_users u ON u.id = m.user_created
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    // Mark messages as read
    await fastify.pg.query(
      `UPDATE messages SET is_read = true
       WHERE conversation_id = $1 AND contact_id != $2 AND is_read = false`,
      [conversationId, contactId]
    );

    return {
      success: true,
      data: result.rows.reverse() // Return in chronological order
    };
  });

  /**
   * POST /api/portal/conversations/:conversationId/messages
   * Send a message
   */
  fastify.post<{ Params: ConversationParams; Body: MessageBody }>('/conversations/:conversationId/messages', {
    preHandler: verifyPortalAccess
  }, async (request, reply) => {
    const { conversationId } = request.params;
    const { contactId } = (request as any).portalUser;
    const { text, attachments } = request.body;

    // Verify access
    const accessResult = await fastify.pg.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND contact_id = $2`,
      [conversationId, contactId]
    );

    if (accessResult.rows.length === 0) {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'No access to this conversation' }
      });
    }

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create message
      const msgResult = await client.query(
        `INSERT INTO messages (conversation_id, contact_id, text, is_read, created_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING id, created_at`,
        [conversationId, contactId, text]
      );
      const messageId = msgResult.rows[0].id;

      // Add attachments
      if (attachments && attachments.length > 0) {
        for (const fileId of attachments) {
          await client.query(
            `INSERT INTO message_attachments (message_id, file_id) VALUES ($1, $2)`,
            [messageId, fileId]
          );
        }
      }

      // Update conversation timestamp
      await client.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        data: {
          id: messageId,
          conversationId,
          text,
          createdAt: msgResult.rows[0].created_at
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // ============================================
  // Account
  // ============================================

  /**
   * GET /api/portal/account
   * Get client account details
   */
  fastify.get('/account', {
    preHandler: verifyPortalAccess
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const { contactId, organizationId } = (request as any).portalUser;

    const contactResult = await fastify.pg.query(
      `SELECT c.*, o.name as organization_name
       FROM contacts c
       LEFT JOIN organizations o ON o.id = c.organization_id
       WHERE c.id = $1`,
      [contactId]
    );

    return {
      success: true,
      data: {
        contact: contactResult.rows[0],
        organizationId
      }
    };
  });
}
