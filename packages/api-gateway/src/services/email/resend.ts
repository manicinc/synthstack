/**
 * @file services/email/resend.ts
 * @description Resend email service integration for transactional emails
 */

import { Resend } from 'resend';
import type { FastifyInstance } from 'fastify';

export interface ResendEmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
  /** Extra headers, e.g. List-Unsubscribe and List-Unsubscribe-Post. */
  headers?: Record<string, string>;
}

/** The part of the Resend client this service uses; tests pass a capturing one. */
export interface ResendClientLike {
  emails: {
    send(payload: any): Promise<{ data?: { id?: string } | null; error?: { message: string } | null }>;
  };
}

export interface ResendServiceOptions {
  /** Send through this client instead of one built from RESEND_API_KEY. */
  client?: ResendClientLike;
}

export interface ResendSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Resend email service wrapper
 */
export class ResendService {
  private resend: ResendClientLike | null = null;
  private fastify: FastifyInstance;
  private fromEmail: string;
  private fromName: string;

  constructor(fastify: FastifyInstance, options: ResendServiceOptions = {}) {
    this.fastify = fastify;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'team@manic.agency';
    this.fromName = process.env.RESEND_FROM_NAME || 'SynthStack';

    if (options.client) {
      this.resend = options.client;
    } else if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.fastify.log.info('✅ Resend email service initialized');
    } else {
      this.fastify.log.warn('⚠️ RESEND_API_KEY not configured - emails will not be sent');
    }
  }

  /**
   * Check if Resend is configured
   */
  isConfigured(): boolean {
    return this.resend !== null;
  }

  /**
   * Send email via Resend
   */
  async sendEmail(options: ResendEmailOptions): Promise<ResendSendResult> {
    if (!this.resend) {
      this.fastify.log.error('Resend not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const from = options.from || `${this.fromName} <${this.fromEmail}>`;

      const { data, error } = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        tags: options.tags,
        attachments: options.attachments,
        headers: options.headers,
      });

      if (error) {
        this.fastify.log.error({ error }, 'Resend email send failed');
        return {
          success: false,
          error: error.message
        };
      }

      this.fastify.log.info({ messageId: data?.id }, 'Email sent via Resend');

      return {
        success: true,
        messageId: data?.id
      };
    } catch (error: any) {
      this.fastify.log.error({ error }, 'Resend email send exception');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email with template (helper method)
   */
  async sendTemplateEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
    options?: Partial<ResendEmailOptions>
  ): Promise<ResendSendResult> {
    return this.sendEmail({
      to,
      subject,
      html,
      text,
      ...options
    });
  }
}

// Singleton instance
let resendInstance: ResendService | null = null;

/**
 * Initialize Resend service
 */
export function initResendService(fastify: FastifyInstance, options: ResendServiceOptions = {}): ResendService {
  if (!resendInstance) {
    resendInstance = new ResendService(fastify, options);
  }
  return resendInstance;
}

/**
 * Get Resend service instance
 */
export function getResendService(): ResendService {
  if (!resendInstance) {
    throw new Error('Resend service not initialized');
  }
  return resendInstance;
}
