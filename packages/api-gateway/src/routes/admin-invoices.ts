/**
 * @file routes/admin-invoices.ts
 * @description Admin invoicing routes (Stripe checkout links for client invoices)
 */

import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { config } from '../config/index.js';

export default async function adminInvoicesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/admin/invoices/:invoiceId/checkout
   * Create a Stripe Checkout session for an invoice and store the payment link.
   */
  fastify.post<{ Params: { invoiceId: string } }>('/invoices/:invoiceId/checkout', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Invoices', 'Admin'],
      summary: 'Create Stripe checkout for invoice',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['invoiceId'],
        properties: {
          invoiceId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { invoiceId } = request.params;

    const invoiceResult = await fastify.pg.query(
      `SELECT
         i.id,
         i.invoice_number,
         i.status,
         i.amount_due,
         i.organization_id,
         o.name as organization_name,
         o.billing_email
       FROM invoices i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' },
      });
    }

    const invoice = invoiceResult.rows[0];

    if (!['sent', 'overdue', 'partial'].includes(invoice.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Invoice is ${invoice.status}` },
      });
    }

    const amountDue = typeof invoice.amount_due === 'string'
      ? parseFloat(invoice.amount_due)
      : Number(invoice.amount_due);

    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Invoice has no amount due' },
      });
    }

    const stripeSecretKey = config.stripe.secretKey || process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return reply.status(500).send({
        success: false,
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' });

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
            description: invoice.organization_name,
          },
          unit_amount: Math.round(amountDue * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: invoice.billing_email || undefined,
      client_reference_id: invoiceId,
      metadata: {
        invoice_id: invoiceId,
        organization_id: invoice.organization_id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    const expiresAt = (session.expires_at ? new Date(session.expires_at * 1000) : null);

    // Track the session
    await fastify.pg.query(
      `INSERT INTO payment_sessions (
         invoice_id,
         session_id,
         provider,
         status,
         amount,
         currency,
         customer_email,
         organization_id,
         success_url,
         cancel_url,
         expires_at,
         metadata
       ) VALUES ($1, $2, 'stripe', 'pending', $3, 'usd', $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (session_id) DO NOTHING`,
      [
        invoiceId,
        session.id,
        amountDue,
        invoice.billing_email || null,
        invoice.organization_id,
        successUrl,
        cancelUrl,
        expiresAt,
        JSON.stringify({
          invoice_id: invoiceId,
          organization_id: invoice.organization_id,
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
        sessionId: session.id,
      },
    };
  });
}

