/**
 * @file templates/auth/password-reset.ts
 * @description Password reset email template
 */

export interface PasswordResetTemplateData {
  resetUrl: string;
  expiresIn: string;
  appName: string;
  supportEmail: string;
}

export const passwordResetTemplate = (data: PasswordResetTemplateData) => ({
  subject: `Reset your ${data.appName} password`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 24px;">Reset Your Password</h1>
        <p style="color: #666; font-size: 16px;">We received a request to reset your ${data.appName} password</p>
      </div>

      <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <p style="color: white; margin-bottom: 20px; font-size: 16px;">Click the button below to set a new password:</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: white; color: #6366F1; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p style="color: #666; font-size: 14px; margin: 0;">
          <strong style="color: #1a1a1a;">This link expires in ${data.expiresIn}.</strong><br/><br/>
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 30px;">
        <p style="color: #92400E; font-size: 14px; margin: 0;">
          <strong>Security tip:</strong> Never share this link with anyone. ${data.appName} will never ask for your password via email.
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
Reset Your Password

We received a request to reset your ${data.appName} password.

Click the link below to set a new password:
${data.resetUrl}

This link expires in ${data.expiresIn}.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Security tip: Never share this link with anyone. ${data.appName} will never ask for your password via email.

Need help? Contact us at ${data.supportEmail}

- The ${data.appName} Team
  `,
});
