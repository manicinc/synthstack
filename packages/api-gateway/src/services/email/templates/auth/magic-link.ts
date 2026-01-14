/**
 * @file templates/auth/magic-link.ts
 * @description Magic link passwordless login email template
 */

export interface MagicLinkTemplateData {
    loginUrl: string;
    expiresIn: string;
    appName: string;
    supportEmail: string;
}

export const magicLinkTemplate = (data: MagicLinkTemplateData) => ({
    subject: `Sign in to ${data.appName}`,
    html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin-bottom: 10px; font-size: 24px;">Sign In to ${data.appName}</h1>
        <p style="color: #666; font-size: 16px;">Click the magic link below to sign in instantly</p>
      </div>

      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <p style="color: white; margin-bottom: 20px; font-size: 16px;">No password needed - just click to sign in:</p>
        <a href="${data.loginUrl}" style="display: inline-block; background: white; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ✨ Sign In Now
        </a>
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p style="color: #666; font-size: 14px; margin: 0;">
          <strong style="color: #1a1a1a;">This link expires in ${data.expiresIn}.</strong><br/><br/>
          If you didn't request this sign-in link, you can safely ignore this email.
        </p>
      </div>

      <div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin-bottom: 30px;">
        <p style="color: #1E40AF; font-size: 14px; margin: 0;">
          <strong>Tip:</strong> You can also sign in with Google, GitHub, or Discord for even faster access!
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">
        <p style="color: #999; font-size: 13px;">
          Need help? Contact us at <a href="mailto:${data.supportEmail}" style="color: #10B981;">${data.supportEmail}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 15px;">
          - The ${data.appName} Team
        </p>
      </div>
    </div>
  `,
    text: `
Sign In to ${data.appName}

Click the link below to sign in instantly (no password needed):
${data.loginUrl}

This link expires in ${data.expiresIn}.

If you didn't request this sign-in link, you can safely ignore this email.

Tip: You can also sign in with Google, GitHub, or Discord for even faster access!

Need help? Contact us at ${data.supportEmail}

- The ${data.appName} Team
  `,
});
