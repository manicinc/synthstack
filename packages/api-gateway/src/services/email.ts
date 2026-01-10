/**
 * @file services/email.ts
 * @description Contact form email service using Resend API
 */

import { getResendService } from './email/resend.js';

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'team@manic.agency';

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

  try {
    const result = await resendService.sendEmail({
      to: CONTACT_TO_EMAIL,
      subject: `Contact Form: ${contact.subject || 'No subject'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${contact.name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Subject:</strong> ${contact.subject || 'N/A'}</p>
        <h3>Message:</h3>
        <p>${contact.message.replace(/\n/g, '<br>')}</p>
      `,
      text: `Name: ${contact.name}\nEmail: ${contact.email}\nSubject: ${contact.subject || 'N/A'}\n\nMessage:\n${contact.message}`,
      replyTo: contact.email
    });

    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
