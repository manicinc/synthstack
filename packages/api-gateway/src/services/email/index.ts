/**
 * @file services/email/index.ts
 * @description Email service exports and utilities
 */

export {
  EmailService,
  initEmailService,
  getEmailService,
  type SendEmailOptions,
  type EmailAttachment,
  type EmailSendResult,
} from './mailer.js';

export {
  EmailQueueService,
  initEmailQueueService,
  getEmailQueueService,
} from './queue.js';

export { renderEmailTemplate, previewTemplate } from './renderer.js';

/**
 * Email template slugs for type safety
 */
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  SUBSCRIPTION_CONFIRMED: 'subscription-confirmed',
  PAYMENT_RECEIPT: 'payment-receipt',
  PAYMENT_FAILED: 'payment-failed',
  TRIAL_ENDING: 'trial-ending',
  SUBSCRIPTION_CANCELED: 'subscription-canceled',
  CREDIT_LOW: 'credit-low',
  CREDIT_PURCHASED: 'credit-purchased',
  DEMO_CREDIT_LOW: 'demo-credit-low',
  // Note: template slug is 'moderation-action' (see migrations/005_email_system.sql)
  MODERATION_WARNING: 'moderation-action',
  ADMIN_REPORT: 'admin-report',
  GENERATION_COMPLETE: 'generation-complete',
  WEEKLY_SUMMARY: 'weekly-summary',
  TEAM_INVITATION: 'team-invitation',
  // Lifetime License templates
  LIFETIME_WELCOME: 'lifetime-welcome',
  LIFETIME_INVITATION_SENT: 'lifetime-invitation-sent',
  LIFETIME_ACCESS_GRANTED: 'lifetime-access-granted',
} as const;

export type EmailTemplateSlug = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];
