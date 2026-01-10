/**
 * @file templates/lifetime-welcome.ts
 * @description Welcome email template for lifetime license buyers
 */

export const lifetimeWelcomeTemplate = (data: {
  licenseAccessUrl: string;
  sessionId: string;
}) => ({
  subject: '🎉 Welcome to SynthStack - Get Your Source Code Access',
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366F1; margin-bottom: 10px;">🎉 Welcome to SynthStack!</h1>
        <p style="color: #666; font-size: 16px;">Thank you for purchasing a Lifetime License</p>
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">What You Get:</h2>
        <ul style="color: #333; line-height: 1.8;">
          <li>✅ Full source code access via private GitHub repository</li>
          <li>✅ All 6 AI Co-Founder agents</li>
          <li>✅ Complete documentation and API reference</li>
          <li>✅ Lifetime updates (bug fixes + security patches forever)</li>
          <li>✅ Priority support via Discord</li>
          <li>✅ Commercial usage rights (unlimited SaaS products)</li>
        </ul>
      </div>

      <div style="background: #6366F1; color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h2 style="margin-top: 0;">NEXT STEP: Get Repository Access</h2>
        <p style="margin-bottom: 20px;">Submit your GitHub username to receive instant access</p>
        <a href="${data.licenseAccessUrl}" style="display: inline-block; background: white; color: #6366F1; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Submit GitHub Username →
        </a>
      </div>

      <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 30px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;"><strong>Don't have a GitHub account?</strong></p>
        <p style="color: #666; font-size: 14px;">Create one free at <a href="https://github.com/signup" style="color: #6366F1;">github.com/signup</a></p>
      </div>

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
        <p style="color: #999; font-size: 13px;">
          Questions? Reply to this email or contact <a href="mailto:team@manic.agency" style="color: #6366F1;">team@manic.agency</a>
          <br/>
          Join our Discord: <a href="https://discord.gg/synthstack" style="color: #6366F1;">discord.gg/synthstack</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          - The SynthStack Team<br/>
          Manic Agency LLC
        </p>
      </div>
    </div>
  `,
  text: `
Welcome to SynthStack!

Thank you for purchasing a Lifetime License.

WHAT YOU GET:
- Full source code via private GitHub repository
- All 6 AI Co-Founder agents
- Complete documentation
- Lifetime updates (bug fixes + security patches)
- Priority support via Discord
- Commercial usage rights

NEXT STEP: Get Repository Access

Submit your GitHub username to receive instant access:
${data.licenseAccessUrl}

Don't have a GitHub account? Create one free at https://github.com/signup

Questions? Reply to this email or contact team@manic.agency

- The SynthStack Team
  `,
});
