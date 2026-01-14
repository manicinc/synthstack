/**
 * @file templates/auth/email-verification.ts
 * @description Email verification template
 */

export interface EmailVerificationTemplateData {
  verifyUrl: string;
  expiresIn: string;
  appName: string;
  supportEmail: string;
}

export const emailVerificationTemplate = (data: EmailVerificationTemplateData) => ({
  subject: `Verify your ${data.appName} email address`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 24px;">Verify Your Email</h1>
        <p style="color: #666; font-size: 16px;">Thanks for signing up! Please verify your email to get started.</p>
      </div>

      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <p style="color: white; margin-bottom: 20px; font-size: 16px;">Click the button below to verify your email address:</p>
        <a href="${data.verifyUrl}" style="display: inline-block; background: white; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #1a1a1a; margin-top: 0; margin-bottom: 15px;">What happens next?</h3>
        <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Your email will be verified instantly</li>
          <li>You'll get full access to all ${data.appName} features</li>
          <li>You can start generating content right away</li>
        </ul>
      </div>

      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 30px;">
        <p style="color: #92400E; font-size: 14px; margin: 0;">
          <strong>Note:</strong> This link expires in ${data.expiresIn}. If you didn't create an account with ${data.appName}, please ignore this email.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">
        <p style="color: #999; font-size: 13px;">
          Need help? Contact us at <a href="mailto:${data.supportEmail}" style="color: #6366F1;">${data.supportEmail}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 15px;">
          - The ${data.appName} Team
        </p>
      </div>
    </div>
  `,
  text: `
Verify Your Email

Thanks for signing up! Please verify your email to get started with ${data.appName}.

Click the link below to verify your email address:
${data.verifyUrl}

What happens next?
- Your email will be verified instantly
- You'll get full access to all ${data.appName} features
- You can start generating content right away

Note: This link expires in ${data.expiresIn}. If you didn't create an account with ${data.appName}, please ignore this email.

Need help? Contact us at ${data.supportEmail}

- The ${data.appName} Team
  `,
});
