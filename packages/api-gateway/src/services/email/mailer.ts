/**
 * @file services/email/mailer.ts
 * @description Comprehensive email service with Resend API and Nodemailer fallback
 * @module @synthstack/api-gateway/services/email
 */

import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import type { FastifyInstance } from 'fastify';
import ejs from 'ejs';
import { config } from '../../config/index.js';
import { ResendService } from './resend.js';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Email send options with template support
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Recipient name (optional) */
  toName?: string;
  /** CC recipients (optional) */
  cc?: string[];
  /** BCC recipients (optional) */
  bcc?: string[];
  /** Email subject line (required if not using a template) */
  subject?: string;
  /** HTML email body (if not using template) */
  html?: string;
  /** Plain text email body (if not using template) */
  text?: string;
  /** Template slug to use */
  templateSlug?: string;
  /** Template data for rendering */
  templateData?: Record<string, any>;
  /** Email attachments */
  attachments?: EmailAttachment[];
  /** User ID for tracking */
  userId?: string;
  /** Reference type (e.g., 'subscription', 'generation') */
  referenceType?: string;
  /** Reference ID */
  referenceId?: string;
  /** Priority (0-10, higher = more important) */
  priority?: number;
  /** Schedule for future sending */
  scheduledAt?: Date;
  /** Enable tracking (opens, clicks) */
  trackingEnabled?: boolean;
  /** Sender override */
  from?: { email: string; name: string };
  /** Reply-to override */
  replyTo?: string;
}

/**
 * Email attachment structure
 */
export interface EmailAttachment {
  /** Attachment filename */
  filename: string;
  /** File content (Buffer or path) */
  content?: Buffer | string;
  /** File path (alternative to content) */
  path?: string;
  /** Content type */
  contentType?: string;
  /** Content ID for inline images */
  cid?: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  /** Whether send was successful */
  success: boolean;
  /** Email queue ID */
  queueId?: string;
  /** SMTP message ID */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Error code */
  errorCode?: string;
}

/**
 * Email template from database
 */
interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  html_template: string;
  text_template: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  variables: any;
}

// ============================================
// EMAIL SERVICE CLASS
// ============================================

/**
 * Comprehensive email service for sending transactional and marketing emails
 *
 * Features:
 * - Resend API integration (preferred)
 * - SMTP fallback with Nodemailer
 * - Template rendering with EJS
 * - Email queue with database persistence
 * - Retry logic with exponential backoff
 * - Bounce tracking and suppression
 * - Rate limiting per domain
 * - Delivery tracking (opens, clicks)
 * - Attachment support
 *
 * @example
 * ```typescript
 * const emailService = new EmailService(fastify);
 * await emailService.sendEmail({
 *   to: 'user@example.com',
 *   templateSlug: 'welcome',
 *   templateData: { userName: 'John' },
 *   userId: 'user-123'
 * });
 * ```
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private resendService: ResendService;
  private fastify: FastifyInstance;
  private templateCache: Map<string, EmailTemplate> = new Map();

  /**
   * Creates an instance of EmailService
   * @param fastify - Fastify instance for database access and logging
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.resendService = new ResendService(fastify);
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer SMTP transporter (fallback only)
   * @private
   */
  private initializeTransporter(): void {
    if (!config.smtp?.host || !config.smtp?.user) {
      this.fastify.log.info('SMTP not configured - using Resend only');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });

      this.fastify.log.info('✅ SMTP transporter initialized (fallback)');
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to initialize SMTP transporter');
    }
  }

  /**
   * Check if email service is configured and ready
   * @returns True if Resend or SMTP is configured
   */
  isConfigured(): boolean {
    return this.resendService.isConfigured() || this.transporter !== null;
  }

  /**
   * Verify SMTP connection
   * @returns Promise resolving to true if connection is valid
   * @throws Error if verification fails
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('SMTP not configured');
    }

    try {
      await this.transporter.verify();
      this.fastify.log.info('✅ SMTP connection verified');
      return true;
    } catch (error) {
      this.fastify.log.error({ error }, 'SMTP verification failed');
      throw error;
    }
  }

  /**
   * Send an email (adds to queue and processes if not scheduled)
   * 
   * @param options - Email send options
   * @returns Promise resolving to send result
   * 
   * @example
   * ```typescript
   * const result = await emailService.sendEmail({
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   html: '<h1>Welcome to our platform</h1>',
   *   userId: 'user-123'
   * });
   * 
   * if (result.success) {
   *   console.log('Email queued:', result.queueId);
   * }
   * ```
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      // Check bounce list
      const isBounced = await this.isEmailBounced(options.to);
      if (isBounced) {
        return {
          success: false,
          error: 'Email is in bounce list',
          errorCode: 'EMAIL_BOUNCED',
        };
      }

      // Check rate limits
      const rateLimitOk = await this.checkRateLimit(options.to);
      if (!rateLimitOk) {
        return {
          success: false,
          error: 'Rate limit exceeded for this domain',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        };
      }

      // Get template if specified
      let html = options.html;
      let text = options.text;
      let subject = options.subject;
      let templateId: string | null = null;

      if (options.templateSlug) {
        const template = await this.getTemplate(options.templateSlug);
        if (!template) {
          return {
            success: false,
            error: 'Template not found',
            errorCode: 'TEMPLATE_NOT_FOUND',
          };
        }

        // Render template
        const rendered = await this.renderTemplate(template, options.templateData || {});
        html = rendered.html;
        text = rendered.text;
        subject = rendered.subject;
        templateId = template.id;
      }

      if (!html && !text) {
        return {
          success: false,
          error: 'Email must have html or text content',
          errorCode: 'MISSING_CONTENT',
        };
      }

      // Determine sender
      const from = options.from || {
        email: config.smtp.fromEmail,
        name: config.smtp.fromName,
      };

      // Add to queue
      const result = await this.fastify.pg.query(`
        INSERT INTO email_queue (
          to_email, to_name, from_email, from_name, reply_to,
          subject, html_body, text_body,
          template_id, template_data,
          attachments, user_id, reference_type, reference_id,
          priority, scheduled_at, tracking_enabled,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id
      `, [
        options.to,
        options.toName,
        from.email,
        from.name,
        options.replyTo,
        subject,
        html,
        text,
        templateId,
        options.templateData ? JSON.stringify(options.templateData) : null,
        options.attachments ? JSON.stringify(options.attachments) : null,
        options.userId,
        options.referenceType,
        options.referenceId,
        options.priority || 0,
        options.scheduledAt,
        options.trackingEnabled !== false,
        options.scheduledAt ? 'scheduled' : 'pending',
      ]);

      const queueId = result.rows[0].id;

      // If not scheduled, process immediately
      if (!options.scheduledAt) {
        // Process in background (don't await)
        this.processQueueItem(queueId).catch(error => {
          this.fastify.log.error({ error, queueId }, 'Failed to process email');
        });
      }

      return {
        success: true,
        queueId,
      };
    } catch (error: any) {
      this.fastify.log.error({ error }, 'Failed to queue email');
      return {
        success: false,
        error: error.message,
        errorCode: 'QUEUE_ERROR',
      };
    }
  }

  /**
   * Process a queued email (send via Resend or SMTP fallback)
   *
   * @param queueId - Email queue ID to process
   * @returns Promise resolving to send result
   * @private
   */
  private async processQueueItem(queueId: string): Promise<EmailSendResult> {
    if (!this.resendService.isConfigured() && !this.transporter) {
      this.fastify.log.warn({ queueId }, 'No email service configured, email remains queued');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      // Mark as processing
      await this.fastify.pg.query(
        'UPDATE email_queue SET status = $1, updated_at = NOW() WHERE id = $2',
        ['processing', queueId]
      );

      // Get email from queue
      const result = await this.fastify.pg.query(
        'SELECT * FROM email_queue WHERE id = $1',
        [queueId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Queue item not found' };
      }

      const email = result.rows[0];

      let messageId: string | undefined;

      // Try Resend first (preferred)
      if (this.resendService.isConfigured()) {
        const resendResult = await this.resendService.sendEmail({
          to: email.to_email,
          from: `${email.from_name} <${email.from_email}>`,
          subject: email.subject,
          html: email.html_body,
          text: email.text_body,
          replyTo: email.reply_to,
          attachments: email.attachments ? JSON.parse(email.attachments) : undefined
        });

        if (!resendResult.success) {
          // If Resend fails and SMTP available, try SMTP fallback
          if (this.transporter) {
            this.fastify.log.warn({ queueId }, 'Resend failed, trying SMTP fallback');
            const mailOptions: SendMailOptions = {
              from: `"${email.from_name}" <${email.from_email}>`,
              to: email.to_name ? `"${email.to_name}" <${email.to_email}>` : email.to_email,
              subject: email.subject,
              html: email.html_body,
              text: email.text_body,
              replyTo: email.reply_to,
            };

            if (email.attachments) {
              mailOptions.attachments = JSON.parse(email.attachments);
            }

            const info = await this.transporter.sendMail(mailOptions);
            messageId = info.messageId;
          } else {
            throw new Error(resendResult.error || 'Resend failed');
          }
        } else {
          messageId = resendResult.messageId;
        }
      } else if (this.transporter) {
        // Use SMTP if Resend not configured
        const mailOptions: SendMailOptions = {
          from: `"${email.from_name}" <${email.from_email}>`,
          to: email.to_name ? `"${email.to_name}" <${email.to_email}>` : email.to_email,
          subject: email.subject,
          html: email.html_body,
          text: email.text_body,
          replyTo: email.reply_to,
        };

        if (email.attachments) {
          mailOptions.attachments = JSON.parse(email.attachments);
        }

        const info = await this.transporter.sendMail(mailOptions);
        messageId = info.messageId;
      }

      // Update queue item
      await this.fastify.pg.query(`
        UPDATE email_queue SET
          status = 'sent',
          message_id = $1,
          sent_at = NOW(),
          attempts = attempts + 1,
          last_attempt_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [messageId, queueId]);

      // Update rate limits
      await this.incrementRateLimit(email.to_email);

      this.fastify.log.info({ queueId, messageId }, 'Email sent successfully');

      return {
        success: true,
        queueId,
        messageId,
      };
    } catch (error: any) {
      this.fastify.log.error({ error, queueId }, 'Failed to send email');

      // Get current attempts
      const emailResult = await this.fastify.pg.query(
        'SELECT attempts, max_attempts FROM email_queue WHERE id = $1',
        [queueId]
      );

      const currentEmail = emailResult.rows[0];
      const newAttempts = (currentEmail?.attempts || 0) + 1;
      const maxAttempts = currentEmail?.max_attempts || 3;

      if (newAttempts >= maxAttempts) {
        // Max attempts reached, mark as failed
        await this.fastify.pg.query(`
          UPDATE email_queue SET
            status = 'failed',
            error = $1,
            error_code = $2,
            attempts = $3,
            last_attempt_at = NOW(),
            updated_at = NOW()
          WHERE id = $4
        `, [error.message, error.code || 'SMTP_ERROR', newAttempts, queueId]);
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, newAttempts) * 60000; // 2min, 4min, 8min
        const nextRetry = new Date(Date.now() + retryDelay);

        await this.fastify.pg.query(`
          UPDATE email_queue SET
            status = 'failed',
            error = $1,
            error_code = $2,
            attempts = $3,
            last_attempt_at = NOW(),
            next_retry_at = $4,
            updated_at = NOW()
          WHERE id = $5
        `, [error.message, error.code || 'SMTP_ERROR', newAttempts, nextRetry, queueId]);
      }

      return {
        success: false,
        queueId,
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  /**
   * Process all pending and retry emails in queue
   * Called by worker job
   * 
   * @param limit - Maximum number of emails to process
   * @returns Promise resolving to number of emails processed
   */
  async processQueue(limit: number = 100): Promise<number> {
    if (!this.transporter) {
      this.fastify.log.warn('SMTP not configured, skipping queue processing');
      return 0;
    }

    try {
      // Get pending or retry emails
      const result = await this.fastify.pg.query(`
        SELECT id FROM email_queue
        WHERE (
          status = 'pending'
          OR (status = 'failed' AND next_retry_at <= NOW() AND attempts < max_attempts)
          OR (status = 'scheduled' AND scheduled_at <= NOW())
        )
        ORDER BY priority DESC, created_at ASC
        LIMIT $1
      `, [limit]);

      let processed = 0;
      for (const row of result.rows) {
        await this.processQueueItem(row.id);
        processed++;
        
        // Small delay to avoid overwhelming SMTP server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.fastify.log.info({ processed }, 'Email queue processing completed');
      return processed;
    } catch (error) {
      this.fastify.log.error({ error }, 'Email queue processing failed');
      return 0;
    }
  }

  /**
   * Get email template from database (with caching)
   * 
   * @param slug - Template slug
   * @returns Promise resolving to template or null
   * @private
   */
  private async getTemplate(slug: string): Promise<EmailTemplate | null> {
    // Check cache first
    if (this.templateCache.has(slug)) {
      return this.templateCache.get(slug)!;
    }

    try {
      const result = await this.fastify.pg.query(
        'SELECT * FROM email_templates WHERE slug = $1 AND status = $2',
        [slug, 'published']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const template = result.rows[0] as EmailTemplate;
      
      // Cache template for 5 minutes
      this.templateCache.set(slug, template);
      setTimeout(() => this.templateCache.delete(slug), 300000);

      return template;
    } catch (error) {
      this.fastify.log.error({ error, slug }, 'Failed to get template');
      return null;
    }
  }

  /**
   * Render email template with data
   * 
   * @param template - Email template from database
   * @param data - Template variables
   * @returns Promise resolving to rendered content
   * @private
   */
  private async renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): Promise<{ html: string; text: string; subject: string }> {
    try {
      const html = ejs.render(template.html_template, data);
      const text = template.text_template
        ? ejs.render(template.text_template, data)
        : this.htmlToText(html);
      const subject = ejs.render(template.subject, data);

      return { html, text, subject };
    } catch (error: any) {
      this.fastify.log.error({ error, templateSlug: template.slug }, 'Template rendering failed');
      throw new Error('Failed to render template: ' + error.message);
    }
  }

  /**
   * Convert HTML to plain text (basic implementation)
   * @param html - HTML content
   * @returns Plain text
   * @private
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if email is in bounce list
   * @param email - Email address to check
   * @returns Promise resolving to true if bounced
   * @private
   */
  private async isEmailBounced(email: string): Promise<boolean> {
    try {
      const result = await this.fastify.pg.query(
        'SELECT is_suppressed FROM email_bounce_list WHERE email = $1',
        [email.toLowerCase()]
      );

      return result.rows.length > 0 && result.rows[0].is_suppressed;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check rate limit for email domain
   * @param email - Email address
   * @returns Promise resolving to true if within limits
   * @private
   */
  private async checkRateLimit(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      
      const result = await this.fastify.pg.query(`
        SELECT hourly_sent, hourly_limit, hourly_reset_at
        FROM email_rate_limits
        WHERE limit_type = 'domain' AND target_value = $1
      `, [domain]);

      if (result.rows.length === 0) {
        return true; // No limit configured
      }

      const limit = result.rows[0];
      
      // Check if reset needed
      if (limit.hourly_reset_at && new Date(limit.hourly_reset_at) < new Date()) {
        return true;
      }

      return limit.hourly_sent < limit.hourly_limit;
    } catch (error) {
      return true; // Allow on error
    }
  }

  /**
   * Increment rate limit counter
   * @param email - Email address
   * @private
   */
  private async incrementRateLimit(email: string): Promise<void> {
    try {
      const domain = email.split('@')[1];
      const now = new Date();
      const hourlyReset = new Date(now.getTime() + 3600000);
      const dailyReset = new Date(now);
      dailyReset.setUTCHours(0, 0, 0, 0);
      dailyReset.setDate(dailyReset.getDate() + 1);

      await this.fastify.pg.query(`
        INSERT INTO email_rate_limits (
          limit_type, target_value, hourly_sent, daily_sent,
          hourly_reset_at, daily_reset_at
        ) VALUES ('domain', $1, 1, 1, $2, $3)
        ON CONFLICT ON CONSTRAINT email_rate_limits_pkey
        DO UPDATE SET
          hourly_sent = CASE 
            WHEN email_rate_limits.hourly_reset_at < NOW() THEN 1
            ELSE email_rate_limits.hourly_sent + 1
          END,
          daily_sent = CASE
            WHEN email_rate_limits.daily_reset_at < NOW() THEN 1
            ELSE email_rate_limits.daily_sent + 1
          END,
          hourly_reset_at = CASE
            WHEN email_rate_limits.hourly_reset_at < NOW() THEN $2
            ELSE email_rate_limits.hourly_reset_at
          END
      `, [domain, hourlyReset, dailyReset]);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to increment rate limit');
    }
  }

  /**
   * Add email to bounce list
   * 
   * @param email - Email address to suppress
   * @param bounceType - Type of bounce
   * @param reason - Bounce reason
   */
  async addToBounceList(
    email: string,
    bounceType: 'hard' | 'soft' | 'block' | 'complaint',
    reason?: string
  ): Promise<void> {
    try {
      const expiresAt = bounceType === 'soft'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : null;

      await this.fastify.pg.query(`
        INSERT INTO email_bounce_list (email, bounce_type, bounce_reason, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
          bounce_count = email_bounce_list.bounce_count + 1,
          bounce_type = EXCLUDED.bounce_type,
          bounce_reason = EXCLUDED.bounce_reason,
          last_bounced_at = NOW(),
          is_suppressed = TRUE
      `, [email.toLowerCase(), bounceType, reason, expiresAt]);

      this.fastify.log.info({ email, bounceType }, 'Email added to bounce list');
    } catch (error) {
      this.fastify.log.error({ error, email }, 'Failed to add to bounce list');
    }
  }

  /**
   * Track email open event
   * 
   * @param messageId - Email message ID
   * @param ipAddress - Client IP
   * @param userAgent - Client user agent
   */
  async trackOpen(messageId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Find queue item
      const result = await this.fastify.pg.query(
        'SELECT id FROM email_queue WHERE message_id = $1',
        [messageId]
      );

      if (result.rows.length === 0) return;

      const queueId = result.rows[0].id;

      // Update queue item
      await this.fastify.pg.query(`
        UPDATE email_queue SET
          opened_at = COALESCE(opened_at, NOW()),
          updated_at = NOW()
        WHERE id = $1
      `, [queueId]);

      // Update log
      await this.fastify.pg.query(`
        UPDATE email_logs SET
          opened_count = opened_count + 1,
          first_opened_at = COALESCE(first_opened_at, NOW())
        WHERE message_id = $1
      `, [messageId]);

      // Track event
      const logResult = await this.fastify.pg.query(
        'SELECT id FROM email_logs WHERE message_id = $1',
        [messageId]
      );

      if (logResult.rows.length > 0) {
        await this.fastify.pg.query(`
          INSERT INTO email_tracking_events (log_id, queue_id, event_type, ip_address, user_agent)
          VALUES ($1, $2, 'opened', $3, $4)
        `, [logResult.rows[0].id, queueId, ipAddress, userAgent]);
      }
    } catch (error) {
      this.fastify.log.error({ error, messageId }, 'Failed to track email open');
    }
  }

  /**
   * Track email click event
   * 
   * @param messageId - Email message ID
   * @param linkUrl - Clicked link URL
   * @param ipAddress - Client IP
   * @param userAgent - Client user agent
   */
  async trackClick(
    messageId: string,
    linkUrl: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const result = await this.fastify.pg.query(
        'SELECT id FROM email_queue WHERE message_id = $1',
        [messageId]
      );

      if (result.rows.length === 0) return;

      const queueId = result.rows[0].id;

      await this.fastify.pg.query(`
        UPDATE email_queue SET
          clicked_at = COALESCE(clicked_at, NOW()),
          updated_at = NOW()
        WHERE id = $1
      `, [queueId]);

      await this.fastify.pg.query(`
        UPDATE email_logs SET
          clicked_count = clicked_count + 1,
          last_clicked_at = NOW()
        WHERE message_id = $1
      `, [messageId]);

      const logResult = await this.fastify.pg.query(
        'SELECT id FROM email_logs WHERE message_id = $1',
        [messageId]
      );

      if (logResult.rows.length > 0) {
        await this.fastify.pg.query(`
          INSERT INTO email_tracking_events (log_id, queue_id, event_type, link_url, ip_address, user_agent)
          VALUES ($1, $2, 'clicked', $3, $4, $5)
        `, [logResult.rows[0].id, queueId, linkUrl, ipAddress, userAgent]);
      }
    } catch (error) {
      this.fastify.log.error({ error, messageId }, 'Failed to track email click');
    }
  }

  /**
   * Get email statistics
   * 
   * @param days - Number of days to analyze
   * @returns Promise resolving to email statistics
   */
  async getStats(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.fastify.pg.query(`
        SELECT 
          COUNT(*) as total_sent,
          COUNT(*) FILTER (WHERE status = 'sent') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
          COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
          COUNT(DISTINCT to_email) as unique_recipients
        FROM email_queue
        WHERE sent_at >= $1
      `, [startDate.toISOString()]);

      const stats = result.rows[0];

      return {
        totalSent: parseInt(stats.total_sent),
        delivered: parseInt(stats.delivered),
        failed: parseInt(stats.failed),
        opened: parseInt(stats.opened),
        clicked: parseInt(stats.clicked),
        uniqueRecipients: parseInt(stats.unique_recipients),
        openRate: stats.total_sent > 0 ? (stats.opened / stats.total_sent) * 100 : 0,
        clickRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
        deliveryRate: stats.total_sent > 0 ? (stats.delivered / stats.total_sent) * 100 : 0,
      };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to get email stats');
      return null;
    }
  }

  /**
   * Clear template cache
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
  }

  // ============================================
  // LIFETIME LICENSE EMAILS
  // ============================================

  /**
   * Send lifetime license welcome email with GitHub username submission link
   * @param data - Email data
   * @returns Email send result
   */
  async sendLifetimeWelcomeEmail(data: {
    to: string;
    sessionId: string;
    licenseAccessUrl: string;
  }): Promise<EmailSendResult> {
    const { lifetimeWelcomeTemplate } = await import('./templates/lifetime-welcome.js');
    const template = lifetimeWelcomeTemplate({ licenseAccessUrl: data.licenseAccessUrl, sessionId: data.sessionId });

    return this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      referenceType: 'lifetime_license_welcome',
      referenceId: data.sessionId,
    });
  }

  /**
   * Send GitHub invitation sent confirmation email
   * @param data - Email data
   * @returns Email send result
   */
  async sendLifetimeInvitationSentEmail(data: {
    to: string;
    githubUsername: string;
  }): Promise<EmailSendResult> {
    const { lifetimeInvitationSentTemplate } = await import('./templates/lifetime-invitation-sent.js');
    const template = lifetimeInvitationSentTemplate({ githubUsername: data.githubUsername });

    return this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      referenceType: 'lifetime_license_invitation',
      referenceId: data.githubUsername,
    });
  }

  /**
   * Send GitHub access granted email
   * @param data - Email data
   * @returns Email send result
   */
  async sendLifetimeAccessGrantedEmail(data: {
    to: string;
    githubUsername: string;
  }): Promise<EmailSendResult> {
    const { lifetimeAccessGrantedTemplate } = await import('./templates/lifetime-access-granted.js');
    const template = lifetimeAccessGrantedTemplate({ githubUsername: data.githubUsername });

    return this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      referenceType: 'lifetime_license_access_granted',
      referenceId: data.githubUsername,
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let emailServiceInstance: EmailService | null = null;

/**
 * Initialize email service singleton
 * @param fastify - Fastify instance
 * @returns EmailService instance
 */
export function initEmailService(fastify: FastifyInstance): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(fastify);
  }
  return emailServiceInstance;
}

/**
 * Get email service singleton
 * @returns EmailService instance
 * @throws Error if not initialized
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    throw new Error('Email service not initialized. Call initEmailService first.');
  }
  return emailServiceInstance;
}

export default EmailService;
