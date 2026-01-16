/**
 * @file templates/auth/welcome.ts
 * @description Welcome email template sent after email verification
 */

export interface WelcomeTemplateData {
  displayName: string;
  appName: string;
  supportEmail: string;
  dashboardUrl?: string;
}

export const welcomeTemplate = (data: WelcomeTemplateData) => ({
  subject: `Welcome to ${data.appName}!`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366F1; margin-bottom: 10px; font-size: 28px;">Welcome, ${data.displayName}!</h1>
        <p style="color: #666; font-size: 16px;">Your email is verified and you're all set to go.</p>
      </div>

      <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: white; margin-top: 0; margin-bottom: 15px;">You're Ready to Create!</h2>
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">Start generating amazing content with AI</p>
        ${data.dashboardUrl ? `
        <a href="${data.dashboardUrl}" style="display: inline-block; background: white; color: #6366F1; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
        ` : ''}
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #1a1a1a; margin-top: 0; margin-bottom: 15px;">What you can do with ${data.appName}:</h3>
        <ul style="color: #666; line-height: 2; margin: 0; padding-left: 20px;">
          <li><strong>Text Generation</strong> - Create blog posts, emails, code documentation, and more</li>
          <li><strong>Image Generation</strong> - Generate stunning images with DALL-E</li>
          <li><strong>AI Copilot</strong> - Get help with any task using our intelligent assistant</li>
          <li><strong>Export Options</strong> - Download your creations in multiple formats</li>
        </ul>
      </div>

      <div style="background: #EEF2FF; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #4F46E5; margin-top: 0; margin-bottom: 10px;">Quick Tips</h3>
        <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Use presets for faster content creation</li>
          <li>Check your credit balance in the dashboard</li>
          <li>Experiment with different models for varied results</li>
        </ul>
      </div>

      <div style="text-align: center; border-top: 1px solid #e5e5e5; padding-top: 20px;">
        <p style="color: #999; font-size: 13px;">
          Questions? Contact us at <a href="mailto:${data.supportEmail}" style="color: #6366F1;">${data.supportEmail}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 15px;">
          - The ${data.appName} Team
        </p>
      </div>
    </div>
  `,
  text: `
Welcome to ${data.appName}, ${data.displayName}!

Your email is verified and you're all set to go.

What you can do with ${data.appName}:

- Text Generation - Create blog posts, emails, code documentation, and more
- Image Generation - Generate stunning images with DALL-E
- AI Copilot - Get help with any task using our intelligent assistant
- Export Options - Download your creations in multiple formats

Quick Tips:
- Use presets for faster content creation
- Check your credit balance in the dashboard
- Experiment with different models for varied results

${data.dashboardUrl ? `Go to your dashboard: ${data.dashboardUrl}` : ''}

Questions? Contact us at ${data.supportEmail}

- The ${data.appName} Team
  `,
});
