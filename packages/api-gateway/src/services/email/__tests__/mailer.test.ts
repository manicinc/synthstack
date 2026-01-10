/**
 * @file services/email/__tests__/mailer.test.ts
 * @description Comprehensive tests for email service
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EmailService } from '../mailer.js';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockFastify: any;

  beforeAll(() => {
    mockFastify = {
      log: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      pg: {
        query: async () => ({ rows: [] }),
      },
    };

    emailService = new EmailService(mockFastify);
  });

  describe('Configuration', () => {
    it('should check if SMTP is configured', () => {
      const isConfigured = emailService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('Email Sending', () => {
    it('should queue email with HTML content', async () => {
      mockFastify.pg.query = async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO email_queue')) {
          return { rows: [{ id: 'test-queue-id' }] };
        }
        return { rows: [] };
      };

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>',
        priority: 5,
      });

      expect(result.success).toBe(true);
      expect(result.queueId).toBe('test-queue-id');
    });

    it('should reject emails on bounce list', async () => {
      mockFastify.pg.query = async (sql: string) => {
        if (sql.includes('email_bounce_list')) {
          return { rows: [{ is_suppressed: true }] };
        }
        return { rows: [] };
      };

      const result = await emailService.sendEmail({
        to: 'bounced@example.com',
        subject: 'Test',
        html: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('EMAIL_BOUNCED');
    });

    it('should require HTML or text content', async () => {
      // Reset mock to not return suppressed bounce entry
      mockFastify.pg.query = async (sql: string) => {
        if (sql.includes('email_bounce_list')) {
          return { rows: [] }; // Not suppressed
        }
        return { rows: [] };
      };

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MISSING_CONTENT');
    });
  });

  describe('Template Handling', () => {
    it('should use template if slug provided', async () => {
      mockFastify.pg.query = async (sql: string) => {
        if (sql.includes('email_templates')) {
          return {
            rows: [{
              id: 'template-id',
              slug: 'welcome',
              subject: 'Welcome <%= userName %>',
              html_template: '<h1>Hi <%= userName %></h1>',
              text_template: 'Hi <%= userName %>',
            }],
          };
        }
        if (sql.includes('INSERT INTO email_queue')) {
          return { rows: [{ id: 'queue-id' }] };
        }
        return { rows: [] };
      };

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        templateSlug: 'welcome',
        templateData: { userName: 'John' },
      });

      expect(result.success).toBe(true);
    });

    it('should handle template not found', async () => {
      mockFastify.pg.query = async (sql: string) => {
        if (sql.includes('email_templates')) {
          return { rows: [] };
        }
        return { rows: [] };
      };

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        templateSlug: 'nonexistent',
        templateData: {},
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('Bounce List', () => {
    it('should add email to bounce list', async () => {
      const executed = { called: false };
      
      mockFastify.pg.query = async (sql: string) => {
        if (sql.includes('email_bounce_list')) {
          executed.called = true;
        }
        return { rows: [] };
      };

      await emailService.addToBounceList('bounced@example.com', 'hard', 'User unknown');
      
      expect(executed.called).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return email statistics', async () => {
      mockFastify.pg.query = async () => ({
        rows: [{
          total_sent: '100',
          delivered: '95',
          failed: '5',
          opened: '60',
          clicked: '20',
          unique_recipients: '80',
        }],
      });

      const stats = await emailService.getStats(7);
      
      expect(stats).toBeDefined();
      expect(stats.totalSent).toBe(100);
      expect(stats.openRate).toBeGreaterThan(0);
    });
  });

  describe('Template Cache', () => {
    it('should clear template cache', () => {
      expect(() => emailService.clearTemplateCache()).not.toThrow();
    });
  });
});

describe('Email Queue Integration', () => {
  it('should handle priority emails', async () => {
    const mockFastify: any = {
      log: { info: () => {}, warn: () => {}, error: () => {} },
      pg: {
        query: async (sql: string) => {
          if (sql.includes('INSERT INTO email_queue')) {
            return { rows: [{ id: 'high-priority-id' }] };
          }
          return { rows: [] };
        },
      },
    };

    const emailService = new EmailService(mockFastify);
    
    const result = await emailService.sendEmail({
      to: 'urgent@example.com',
      subject: 'Urgent Email',
      html: '<h1>Urgent</h1>',
      priority: 10,
    });

    expect(result.success).toBe(true);
  });

  it('should handle scheduled emails', async () => {
    const mockFastify: any = {
      log: { info: () => {}, warn: () => {}, error: () => {} },
      pg: {
        query: async (sql: string) => {
          if (sql.includes('INSERT INTO email_queue')) {
            return { rows: [{ id: 'scheduled-id' }] };
          }
          return { rows: [] };
        },
      },
    };

    const emailService = new EmailService(mockFastify);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const result = await emailService.sendEmail({
      to: 'future@example.com',
      subject: 'Scheduled Email',
      html: '<h1>Future</h1>',
      scheduledAt: tomorrow,
    });

    expect(result.success).toBe(true);
  });
});
