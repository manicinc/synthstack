/**
 * @file templates/lifetime-invitation-sent.ts
 * @description GitHub invitation sent email template for lifetime license buyers
 */

export const lifetimeInvitationSentTemplate = (data: {
  githubUsername: string;
}) => ({
  subject: '✉️ GitHub Invitation Sent - Accept to Get Access',
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #6366F1;">✉️ GitHub Invitation Sent!</h1>

      <p style="font-size: 16px; color: #333;">Great news! We've sent a GitHub organization invitation to <strong>@${data.githubUsername}</strong>.</p>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin-top: 0;">Next Steps:</h3>
        <ol style="color: #333; line-height: 1.8;">
          <li>Check your email from GitHub (noreply@github.com)</li>
          <li>Click "Join @manicinc" to accept the invitation</li>
          <li>You'll immediately get Read access to manicinc/synthstack-pro</li>
        </ol>
      </div>

      <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
        <strong>Once accepted, clone the repository:</strong>
        <code style="display: block; background: #1a1a1a; color: #0d9488; padding: 12px; border-radius: 4px; margin-top: 10px; font-family: 'Courier New', monospace;">
          git clone https://github.com/manicinc/synthstack-pro.git
        </code>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Haven't received the invitation? Check your spam folder or <a href="mailto:team@manic.agency" style="color: #6366F1;">contact us</a>.
      </p>
    </div>
  `,
});
