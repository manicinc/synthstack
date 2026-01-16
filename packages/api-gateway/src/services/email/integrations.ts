/**
 * @file services/email/integrations.ts
 * @description Email integration hooks for existing services
 * 
 * This module provides email sending functions that can be called
 * from existing routes (webhooks, auth, billing) to send transactional emails.
 */

import type { FastifyInstance } from 'fastify';
import { sendWelcomeEmail, sendSubscriptionConfirmedEmail, sendPaymentReceiptEmail,
         sendPaymentFailedEmail, sendCreditsPurchasedEmail, sendSubscriptionCanceledEmail,
         sendTrialEndingEmail } from './helpers.js';

/**
 * Integration: Send emails for Stripe webhook events
 * Call this from stripe-webhooks.ts after processing events
 */
export async function handleStripeEmailNotifications(
  fastify: FastifyInstance,
  eventType: string,
  data: any
): Promise<void> {
  try {
    switch (eventType) {
      case 'subscription.created':
        if (data.userId && data.email && data.tier) {
          await sendSubscriptionConfirmedEmail(
            fastify,
            data.userId,
            data.email,
            data.userName || 'User',
            data.tier,
            data.amount || 0,
            data.isYearly || false,
            data.creditsPerDay || 30
          );
        }
        break;

      case 'payment.succeeded':
        if (data.userId && data.email && data.invoiceNumber) {
          await sendPaymentReceiptEmail(
            fastify,
            data.userId,
            data.email,
            data.invoiceNumber,
            data.amount || 0,
            data.description || 'Subscription payment',
            data.invoiceUrl || '',
            data.last4 || '****'
          );
        }
        break;

      case 'payment.failed':
        if (data.userId && data.email) {
          await sendPaymentFailedEmail(
            fastify,
            data.userId,
            data.email,
            data.planName || 'Your plan',
            data.amountDue || 0,
            data.retryDate || new Date()
          );
        }
        break;

      case 'credit.purchased':
        if (data.userId && data.email) {
          await sendCreditsPurchasedEmail(
            fastify,
            data.userId,
            data.email,
            data.userName || 'User',
            data.credits || 0,
            data.amount || 0,
            data.packageName || 'Credits',
            data.transactionId || '',
            data.newBalance || 0
          );
        }
        break;

      case 'subscription.canceled':
        if (data.userId && data.email) {
          await sendSubscriptionCanceledEmail(
            fastify,
            data.userId,
            data.email,
            data.userName || 'User',
            data.planName || 'Your plan',
            data.endDate || new Date()
          );
        }
        break;

      case 'trial.ending':
        if (data.userId && data.email) {
          await sendTrialEndingEmail(
            fastify,
            data.userId,
            data.email,
            data.userName || 'User',
            data.daysLeft || 3,
            data.trialEndDate || new Date(),
            data.generationsUsed || 0
          );
        }
        break;
    }
  } catch (error) {
    fastify.log.error({ error, eventType }, 'Failed to send email for webhook event');
  }
}

/**
 * Integration: Send welcome email after user signup
 * Call this from auth routes after successful registration
 */
export async function handleUserSignupEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string
): Promise<void> {
  try {
    await sendWelcomeEmail(fastify, userId, email, userName);
  } catch (error) {
    fastify.log.error({ error, userId }, 'Failed to send welcome email');
  }
}

/**
 * Integration: Check and send low credit warnings
 * Call this after credit deduction
 */
export async function checkAndSendCreditWarning(
  fastify: FastifyInstance,
  userId: string,
  creditsRemaining: number,
  dailyLimit: number
): Promise<void> {
  try {
    const threshold = Math.ceil(dailyLimit * 0.2); // 20% of daily limit
    
    if (creditsRemaining <= threshold && creditsRemaining > 0) {
      const user = await fastify.pg.query(
        'SELECT email, display_name, subscription_tier FROM app_users WHERE id = $1',
        [userId]
      );

      if (user.rows.length > 0) {
        const { sendCreditLowEmail } = await import('./helpers.js');
        await sendCreditLowEmail(
          fastify,
          userId,
          user.rows[0].email,
          user.rows[0].display_name || 'User',
          creditsRemaining,
          dailyLimit,
          user.rows[0].subscription_tier
        );
      }
    }
  } catch (error) {
    fastify.log.error({ error, userId }, 'Failed to send credit warning');
  }
}

/**
 * Helper to send any email using template
 */
export async function sendTemplateEmail(
  fastify: FastifyInstance,
  options: {
    to: string;
    templateSlug: string;
    templateData: Record<string, any>;
    userId?: string;
    priority?: number;
  }
): Promise<void> {
  try {
    const { getEmailService } = await import('./index.js');
    const emailService = getEmailService();
    
    await emailService.sendEmail({
      to: options.to,
      templateSlug: options.templateSlug,
      templateData: options.templateData,
      userId: options.userId,
      priority: options.priority || 5,
    });
  } catch (error) {
    fastify.log.error({ error }, 'Failed to send template email');
  }
}

export default {
  handleStripeEmailNotifications,
  handleUserSignupEmail,
  checkAndSendCreditWarning,
  sendTemplateEmail,
};
