/**
 * @file services/email.ts
 * @description Contact form email service using Resend API
 *
 * The relay goes to the team inbox only; nothing is sent to the visitor.
 * What the visitor typed is escaped. When the visitor's address is on the
 * do-not-contact list, Reply-To is left off and the subject says not to reply.
 */

import { getResendService } from './email/resend.js';
import { escapeHtml } from './email/escape.js';
import { isDoNotContact } from './email/unsubscribe.js';

const CONTACT_TO_EMAIL =
  process.env.CONTACT_TO_EMAIL ||
  process.env.CONTACT_EMAIL ||
  process.env.VITE_CONTACT_EMAIL ||
  'team@manic.agency';

/**
 * Send contact form notification email
 *
 * @param contact - Contact form data
 * @returns Result object with success status
 */
export async function sendContactNotification(contact: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  const resendService = getResendService();

  if (!resendService.isConfigured()) {
    console.warn('Resend not configured, skipping email');
    return { success: false, reason: 'not_configured' };
  }

  const doNotReply = isDoNotContact(contact.email);
  const subject = `${doNotReply ? '[Do not reply] ' : ''}Contact Form: ${contact.subject || 'No subject'}`;

  try {
    const result = await resendService.sendEmail({
      to: CONTACT_TO_EMAIL,
      subject,
      html: `
        <h2>New Contact Form Submission</h2>
        ${doNotReply ? '<p><strong>Do not reply: this sender is on the do-not-contact list.</strong></p>' : ''}
        <p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(contact.subject || 'N/A')}</p>
        <h3>Message:</h3>
        <p>${escapeHtml(contact.message).replace(/\n/g, '<br>')}</p>
      `,
      text: `${doNotReply ? 'Do not reply: this sender is on the do-not-contact list.\n\n' : ''}Name: ${contact.name}\nEmail: ${contact.email}\nSubject: ${contact.subject || 'N/A'}\n\nMessage:\n${contact.message}`,
      replyTo: doNotReply ? undefined : contact.email,
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
