/**
 * @file services/auth/auth-email.service.ts
 * @description Authentication email service for sending verification and password reset emails
 */

import type { EmailService, EmailSendResult } from '../email/mailer.js';
import { passwordResetTemplate } from '../email/templates/auth/password-reset.js';
import { emailVerificationTemplate } from '../email/templates/auth/email-verification.js';
import { welcomeTemplate } from '../email/templates/auth/welcome.js';
import { magicLinkTemplate } from '../email/templates/auth/magic-link.js';

export interface AuthEmailServiceOptions {
  emailService: EmailService;
  appName?: string;
  supportEmail?: string;
}

/**
 * Authentication email service
 * Handles all auth-related email communications
 */
export class AuthEmailService {
  private emailService: EmailService;
  private appName: string;
  private supportEmail: string;

  constructor(options: AuthEmailServiceOptions) {
    this.emailService = options.emailService;
    this.appName = options.appName || 'SynthStack';
    this.supportEmail = options.supportEmail || 'support@synthstack.io';
  }

  /**
   * Send password reset email
   * @param email - Recipient email address
   * @param token - Password reset token (raw, not hashed)
   * @param resetUrl - Full URL for password reset (without token)
   * @returns Email send result
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    resetUrl: string
  ): Promise<EmailSendResult> {
    const fullResetUrl = `${resetUrl}${resetUrl.includes('?') ? '&' : '?'}token=${token}`;
    const template = passwordResetTemplate({
      resetUrl: fullResetUrl,
      expiresIn: '1 hour',
      appName: this.appName,
      supportEmail: this.supportEmail,
    });

    return this.emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      referenceType: 'auth_password_reset',
      priority: 10, // High priority for auth emails
    });
  }

  /**
   * Send email verification email
   * @param email - Recipient email address
   * @param token - Verification token (raw, not hashed)
   * @param verifyUrl - Full URL for email verification (without token)
   * @returns Email send result
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    verifyUrl: string
  ): Promise<EmailSendResult> {
    const fullVerifyUrl = `${verifyUrl}${verifyUrl.includes('?') ? '&' : '?'}token=${token}`;
    const template = emailVerificationTemplate({
      verifyUrl: fullVerifyUrl,
      expiresIn: '24 hours',
      appName: this.appName,
      supportEmail: this.supportEmail,
    });

    return this.emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      referenceType: 'auth_email_verification',
      priority: 10,
    });
  }

  /**
   * Send welcome email after successful verification
   * @param email - Recipient email address
   * @param displayName - User's display name
   * @returns Email send result
   */
  async sendWelcomeEmail(
    email: string,
    displayName: string
  ): Promise<EmailSendResult> {
    const template = welcomeTemplate({
      displayName,
      appName: this.appName,
      supportEmail: this.supportEmail,
    });

    return this.emailService.sendEmail({
      to: email,
      toName: displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      referenceType: 'auth_welcome',
      priority: 5,
    });
  }

  /**
   * Send magic link email for passwordless sign in
   * @param email - Recipient email address
   * @param token - Magic link token (raw, not hashed)
   * @param loginUrl - Full URL for magic link login (without token)
   * @returns Email send result
   */
  async sendMagicLinkEmail(
    email: string,
    token: string,
    loginUrl: string
  ): Promise<EmailSendResult> {
    const fullLoginUrl = `${loginUrl}${loginUrl.includes('?') ? '&' : '?'}token=${token}`;
    const template = magicLinkTemplate({
      loginUrl: fullLoginUrl,
      expiresIn: '15 minutes',
      appName: this.appName,
      supportEmail: this.supportEmail,
    });

    return this.emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      referenceType: 'auth_magic_link',
      priority: 10, // High priority for auth emails
    });
  }

  /**
   * Check if email service is configured and ready
   */
  isConfigured(): boolean {
    return this.emailService.isConfigured();
  }
}

// Singleton instance
let authEmailServiceInstance: AuthEmailService | null = null;

/**
 * Initialize auth email service singleton
 * @param options - Service options
 * @returns AuthEmailService instance
 */
export function initAuthEmailService(options: AuthEmailServiceOptions): AuthEmailService {
  if (!authEmailServiceInstance) {
    authEmailServiceInstance = new AuthEmailService(options);
  }
  return authEmailServiceInstance;
}

/**
 * Get auth email service singleton
 * @returns AuthEmailService instance
 * @throws Error if not initialized
 */
export function getAuthEmailService(): AuthEmailService {
  if (!authEmailServiceInstance) {
    throw new Error('Auth email service not initialized. Call initAuthEmailService first.');
  }
  return authEmailServiceInstance;
}

export default AuthEmailService;
