/**
 * @file templates/lifetime-access-granted.ts
 * @description Access granted email template for lifetime license buyers
 */

export const lifetimeAccessGrantedTemplate = (data: {
  githubUsername: string;
}) => ({
  subject: '🚀 You\'re In! Access Your SynthStack Source Code Now',
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981;">🚀 You're All Set!</h1>
        <p style="font-size: 18px; color: #333;">Your GitHub access is now active</p>
      </div>

      <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <h2 style="margin-top: 0;">🎯 Get Started in 3 Steps:</h2>

        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 5px;">1. CLONE THE REPOSITORY</h3>
          <code style="display: block; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 4px; margin-top: 10px;">
            git clone https://github.com/manicinc/synthstack-pro.git<br/>
            cd synthstack-pro
          </code>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 5px;">2. READ THE PLAYBOOK</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>docs/ONBOARDING.md - Complete getting started guide</li>
            <li>docs/QUICK_START.md - Ship your first feature in 30 mins</li>
            <li>docs/ARCHITECTURE.md - Understand the system</li>
          </ul>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 5px;">3. JOIN THE COMMUNITY</h3>
          <p>→ Discord: <a href="https://discord.gg/synthstack" style="color: white;">discord.gg/synthstack</a></p>
          <p>→ GitHub Discussions: Ask questions, share your builds</p>
        </div>
      </div>

      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin-top: 0;">📚 Essential Resources:</h3>
        <ul style="color: #333; line-height: 1.8;">
          <li><a href="https://synthstack.app/docs" style="color: #6366F1;">API Documentation</a></li>
          <li><a href="https://github.com/manicinc/synthstack-pro" style="color: #6366F1;">GitHub Repository</a></li>
          <li><a href="https://discord.gg/synthstack" style="color: #6366F1;">Discord Community</a></li>
        </ul>
      </div>

      <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
        <strong>🔄 Getting Updates:</strong>
        <p style="margin: 10px 0;">Pull the latest features anytime:</p>
        <code style="display: block; background: #1a1a1a; color: #0d9488; padding: 10px; border-radius: 4px; font-family: monospace;">
          cd synthstack-pro<br/>
          git pull origin main
        </code>
      </div>

      <p style="text-align: center; font-size: 18px; margin: 40px 0; color: #333;">
        We can't wait to see what you build! 🎉
      </p>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5;">
        <p style="color: #999; font-size: 13px;">
          Need help? Email <a href="mailto:team@manic.agency" style="color: #6366F1;">team@manic.agency</a><br/>
          Priority support for lifetime buyers on Discord
        </p>
      </div>
    </div>
  `,
});
