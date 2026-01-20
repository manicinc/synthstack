/**
 * @file services/email/helpers.ts
 * @description Email helper functions for common email sending patterns
 */

import type { FastifyInstance } from 'fastify';
import { getEmailService, EMAIL_TEMPLATES } from './index.js';
import { config } from '../../config/index.js';

/**
 * Send welcome email to new user
 * @param fastify - Fastify instance
 * @param userId - User ID
 * @param email - User email
 * @param userName - User name
 */
export async function sendWelcomeEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.WELCOME,
    templateData: {
      userName,
      userEmail: email,
      dashboardUrl: `${config.frontendUrl}/app`,
      guidesUrl: `${config.frontendUrl}/guides`,
      communityUrl: `${config.frontendUrl}/community`,
      supportUrl: `${config.frontendUrl}/contact`,
      creditsRemaining: 3,
    },
    userId,
    referenceType: 'user',
    referenceId: userId,
    priority: 8,
  });
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmedEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  planName: string,
  amount: number,
  isYearly: boolean,
  creditsPerDay: number
): Promise<void> {
  const emailService = getEmailService();
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + (isYearly ? 12 : 1));
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED,
    templateData: {
      userName,
      planName,
      amount,
      isYearly,
      creditsPerDay,
      nextBillingDate: nextBillingDate.toLocaleDateString(),
      dashboardUrl: `${config.frontendUrl}/app`,
      billingUrl: `${config.frontendUrl}/app/billing`,
    },
    userId,
    referenceType: 'subscription',
    priority: 9,
  });
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  invoiceNumber: string,
  amount: number,
  description: string,
  invoiceUrl: string,
  last4: string
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    templateSlug: EMAIL_TEMPLATES.PAYMENT_RECEIPT,
    templateData: {
      invoiceNumber,
      amount,
      description,
      paymentDate: new Date().toLocaleDateString(),
      paymentMethod: 'Card',
      last4,
      invoiceUrl,
      billingUrl: `${config.frontendUrl}/app/billing`,
    },
    userId,
    referenceType: 'payment',
    priority: 9,
  });
}

/**
 * Send trial ending reminder
 */
export async function sendTrialEndingEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  daysLeft: number,
  trialEndDate: Date,
  generationsUsed: number
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.TRIAL_ENDING,
    templateData: {
      userName,
      daysLeft,
      trialEndDate: trialEndDate.toLocaleDateString(),
      creditsPerDay: 30,
      generationsUsed,
      upgradeUrl: `${config.frontendUrl}/pricing?promo=TRIAL20`,
      pricingUrl: `${config.frontendUrl}/pricing`,
      contactUrl: `${config.frontendUrl}/contact`,
    },
    userId,
    referenceType: 'subscription',
    priority: 7,
  });
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  planName: string,
  amountDue: number,
  retryDate: Date
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    templateSlug: EMAIL_TEMPLATES.PAYMENT_FAILED,
    templateData: {
      planName,
      amountDue,
      retryDate: retryDate.toLocaleDateString(),
      updatePaymentUrl: `${config.frontendUrl}/app/billing`,
      supportUrl: `${config.frontendUrl}/contact`,
    },
    userId,
    referenceType: 'payment',
    priority: 10,
  });
}

/**
 * Send credit low notification
 */
export async function sendCreditLowEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  creditsLeft: number,
  dailyLimit: number,
  currentPlan: string
): Promise<void> {
  const emailService = getEmailService();
  const resetTime = new Date();
  resetTime.setUTCHours(24, 0, 0, 0);
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.CREDIT_LOW,
    templateData: {
      userName,
      creditsLeft,
      dailyLimit,
      resetTime: resetTime.toLocaleTimeString(),
      currentPlan,
      purchaseUrl: `${config.frontendUrl}/pricing#credits`,
      upgradeUrl: `${config.frontendUrl}/pricing`,
      lifetimeUsed: 0,
    },
    userId,
    referenceType: 'credit',
    priority: 5,
  });
}

/**
 * Send demo credit low notification
 * Only sends to authenticated users with email addresses
 * Automatically schedules email for 1 hour from now
 *
 * @param fastify - Fastify instance
 * @param userId - User ID from app_users table
 * @param email - User's email address
 * @param firstName - User's first name (optional)
 * @param sessionId - Demo session ID
 */
export async function sendDemoCreditLowEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  firstName: string | null,
  sessionId: string
): Promise<void> {
  const emailService = getEmailService();
  const appUrl = config.frontendUrl;

  // Schedule email for 1 hour from now
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);

  await emailService.sendEmail({
    to: email,
    toName: firstName || undefined,
    subject: '⚠️ Only 1 AI Message Remaining - Upgrade or Refer Friends',
    templateSlug: EMAIL_TEMPLATES.DEMO_CREDIT_LOW,
    templateData: {
      firstName,
      upgradeUrl: `${appUrl}/pricing?source=demo_credit_email&session=${sessionId}`,
      referralUrl: `${appUrl}/app?tab=referrals&session=${sessionId}`,
      unsubscribeUrl: `${appUrl}/preferences/email?userId=${userId}&unsubscribe=demo_credits`,
    },
    userId,
    referenceType: 'demo_session',
    referenceId: sessionId,
    priority: 6,
    scheduledAt, // Schedule for 1 hour from now
  });
}

/**
 * Send credits purchased confirmation
 */
export async function sendCreditsPurchasedEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  credits: number,
  amount: number,
  packageName: string,
  transactionId: string,
  newBalance: number
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.CREDIT_PURCHASED,
    templateData: {
      userName,
      credits,
      amount,
      packageName,
      transactionId,
      newBalance,
      dashboardUrl: `${config.frontendUrl}/app`,
      purchaseUrl: `${config.frontendUrl}/pricing#credits`,
      upgradeUrl: `${config.frontendUrl}/pricing`,
    },
    userId,
    referenceType: 'purchase',
    priority: 8,
  });
}

/**
 * Send subscription canceled email
 */
export async function sendSubscriptionCanceledEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  planName: string,
  endDate: Date
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.SUBSCRIPTION_CANCELED,
    templateData: {
      userName,
      planName,
      endDate: endDate.toLocaleDateString(),
      reactivateUrl: `${config.frontendUrl}/app/billing`,
      feedbackUrl: `${config.frontendUrl}/feedback?reason=cancellation`,
    },
    userId,
    referenceType: 'subscription',
    priority: 7,
  });
}

/**
 * Send moderation warning email
 */
export async function sendModerationWarningEmail(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  userName: string,
  action: string,
  reason: string,
  details: string,
  warningCount: number
): Promise<void> {
  const emailService = getEmailService();
  
  await emailService.sendEmail({
    to: email,
    toName: userName,
    templateSlug: EMAIL_TEMPLATES.MODERATION_WARNING,
    templateData: {
      userName,
      action,
      reason,
      details,
      warningCount,
      guidelinesUrl: `${config.frontendUrl}/community/guidelines`,
      appealUrl: `${config.frontendUrl}/contact?subject=Appeal`,
    },
    userId,
    referenceType: 'moderation',
    priority: 9,
  });
}

/**
 * Send admin report notification
 */
export async function sendAdminReportEmail(
  fastify: FastifyInstance,
  adminEmail: string,
  reportType: string,
  reporterEmail: string,
  category: string,
  details: string,
  contentId: string,
  reviewUrl: string
): Promise<void> {
  const emailService = getEmailService();

  await emailService.sendEmail({
    to: adminEmail,
    templateSlug: EMAIL_TEMPLATES.ADMIN_REPORT,
    templateData: {
      reportType,
      reporterEmail,
      category,
      details,
      contentId,
      reviewUrl,
      submittedAt: new Date().toLocaleString(),
      priority: 'High',
    },
    referenceType: 'moderation',
    priority: 10,
  });
}

/**
 * Send team invitation email
 * @param fastify - Fastify instance
 * @param inviteEmail - Email address of the person being invited
 * @param inviterUserId - User ID of person sending the invitation
 * @param inviterName - Name of person sending the invitation
 * @param inviterEmail - Email of person sending the invitation
 * @param projectId - Project ID
 * @param projectName - Name of the project
 * @param projectDescription - Optional project description
 * @param role - Role being assigned (admin/member/viewer)
 * @param invitationToken - Unique invitation token
 * @param expiryDate - When the invitation expires
 */
export async function sendTeamInvitationEmail(
  fastify: FastifyInstance,
  inviteEmail: string,
  inviterUserId: string,
  inviterName: string,
  inviterEmail: string,
  projectId: string,
  projectName: string,
  projectDescription: string | undefined,
  role: string,
  invitationToken: string,
  expiryDate: Date
): Promise<void> {
  const emailService = getEmailService();

  // Construct acceptance URL
  const acceptUrl = `${config.frontendUrl}/accept-invite?token=${invitationToken}`;

  // Format expiry date in readable format
  const expiryDateFormatted = expiryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await emailService.sendEmail({
    to: inviteEmail,
    templateSlug: EMAIL_TEMPLATES.TEAM_INVITATION,
    templateData: {
      inviteEmail,
      inviterName,
      inviterEmail,
      projectName,
      projectDescription: projectDescription || undefined,
      role,
      acceptUrl,
      expiryDate: expiryDateFormatted,
      dashboardUrl: `${config.frontendUrl}/app`,
      supportUrl: `${config.frontendUrl}/contact`,
      currentYear: new Date().getFullYear().toString(),
    },
    userId: inviterUserId,
    referenceType: 'invitation',
    referenceId: projectId,
    priority: 9, // High priority - transactional email
  });
}

export default {
  sendWelcomeEmail,
  sendSubscriptionConfirmedEmail,
  sendPaymentReceiptEmail,
  sendTrialEndingEmail,
  sendPaymentFailedEmail,
  sendCreditLowEmail,
  sendDemoCreditLowEmail,
  sendCreditsPurchasedEmail,
  sendSubscriptionCanceledEmail,
  sendModerationWarningEmail,
  sendAdminReportEmail,
  sendTeamInvitationEmail,
};
