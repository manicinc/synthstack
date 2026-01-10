-- Team Invitation Email Template Migration
-- Adds email template for project team member invitations

-- Insert team invitation email template
INSERT INTO email_templates (
  slug,
  name,
  description,
  category,
  subject,
  html_template,
  text_template,
  engine,
  variables,
  preview_data,
  status
) VALUES (
  'team-invitation',
  'Team Invitation',
  'Invitation to join a project team',
  'transactional',
  $$You've been invited to join <%= projectName %> on SynthStack$$,
  $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1f2937;
      font-size: 20px;
      margin: 0 0 20px 0;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #4b5563;
      font-size: 16px;
    }
    .project-info {
      background-color: #f9fafb;
      border-left: 4px solid #6366F1;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .project-info p {
      margin: 8px 0;
      font-size: 15px;
    }
    .project-info strong {
      color: #1f2937;
      display: inline-block;
      min-width: 80px;
    }
    .role-badge {
      display: inline-block;
      background-color: #6366F1;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin: 24px 0;
      transition: transform 0.2s;
      box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(99, 102, 241, 0.3);
    }
    .expiry-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .expiry-notice p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: #6366F1;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .security-notice {
      margin-top: 20px;
      padding: 16px;
      background-color: #f3f4f6;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 4px 0;
      color: #6b7280;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Invited!</h1>
      <p>Join a project team on SynthStack</p>
    </div>

    <div class="content">
      <h2>Hi there!</h2>

      <p><strong><%= inviterName %></strong> has invited you to join their project team on SynthStack.</p>

      <div class="project-info">
        <p><strong>Project:</strong> <%= projectName %></p>
        <p><strong>Your Role:</strong> <span class="role-badge"><%= role %></span></p>
        <p><strong>Invited by:</strong> <%= inviterEmail %></p>
      </div>

      <% if (projectDescription) { %>
      <p><strong>Project Description:</strong></p>
      <p style="font-style: italic; color: #6b7280;"><%= projectDescription %></p>
      <% } %>

      <p>Accept this invitation to collaborate on the project and gain access to:</p>
      <ul style="color: #4b5563; margin: 16px 0; padding-left: 20px;">
        <li>Project files and documents</li>
        <li>Team conversations and updates</li>
        <li>Collaborative tools and AI features</li>
        <li>Real-time project progress tracking</li>
      </ul>

      <div style="text-align: center;">
        <a href="<%= acceptUrl %>" class="cta-button">Accept Invitation</a>
      </div>

      <div class="expiry-notice">
        <p>⏰ <strong>This invitation expires in 7 days</strong> on <%= expiryDate %>. Click the button above to accept before it expires.</p>
      </div>

      <p style="margin-top: 24px;">If you don't have a SynthStack account yet, clicking the button will guide you through a quick signup process.</p>

      <div class="security-notice">
        <p><strong>🔒 Security Notice</strong></p>
        <p>This invitation was sent to <%= inviteEmail %>. If you weren't expecting this invitation or believe it was sent by mistake, you can safely ignore this email.</p>
      </div>
    </div>

    <div class="footer">
      <p>Need help? <a href="<%= supportUrl %>">Contact Support</a> | <a href="<%= dashboardUrl %>">Visit Dashboard</a></p>
      <p style="margin-top: 16px;">&copy; <%= currentYear %> SynthStack. All rights reserved.</p>
      <p>This is an automated email, please do not reply directly.</p>
    </div>
  </div>
</body>
</html>$$,
  $$You've been invited to join <%= projectName %> on SynthStack!

Hi there,

<%= inviterName %> (<%= inviterEmail %>) has invited you to join their project team.

PROJECT DETAILS:
- Project: <%= projectName %>
- Your Role: <%= role %>
- Invited by: <%= inviterName %> (<%= inviterEmail %>)
<% if (projectDescription) { %>
- Description: <%= projectDescription %>
<% } %>

To accept this invitation, click the link below:
<%= acceptUrl %>

WHAT YOU'LL GET ACCESS TO:
- Project files and documents
- Team conversations and updates
- Collaborative tools and AI features
- Real-time project progress tracking

⏰ IMPORTANT: This invitation expires in 7 days on <%= expiryDate %>.

If you don't have a SynthStack account yet, clicking the link will guide you through a quick signup process.

🔒 Security Notice:
This invitation was sent to <%= inviteEmail %>. If you weren't expecting this or believe it was sent by mistake, you can safely ignore this email.

Need help? Contact support at <%= supportUrl %>
Visit your dashboard: <%= dashboardUrl %>

© <%= currentYear %> SynthStack. All rights reserved.
This is an automated email, please do not reply directly.$$,
  'ejs',
  '[
    {"name": "inviteEmail", "type": "string", "required": true, "description": "Email address of the invitee"},
    {"name": "inviterName", "type": "string", "required": true, "description": "Name of person sending invitation"},
    {"name": "inviterEmail", "type": "string", "required": true, "description": "Email of person sending invitation"},
    {"name": "projectName", "type": "string", "required": true, "description": "Name of the project"},
    {"name": "projectDescription", "type": "string", "required": false, "description": "Description of the project"},
    {"name": "role", "type": "string", "required": true, "description": "Role assigned (admin/member/viewer)"},
    {"name": "acceptUrl", "type": "string", "required": true, "description": "URL to accept invitation"},
    {"name": "expiryDate", "type": "string", "required": true, "description": "When invitation expires"},
    {"name": "dashboardUrl", "type": "string", "required": true, "description": "Dashboard URL"},
    {"name": "supportUrl", "type": "string", "required": true, "description": "Support URL"},
    {"name": "currentYear", "type": "string", "required": true, "description": "Current year for footer"}
  ]'::jsonb,
  '{
    "inviteEmail": "colleague@example.com",
    "inviterName": "John Smith",
    "inviterEmail": "john@example.com",
    "projectName": "Q4 Marketing Campaign",
    "projectDescription": "Launch campaign for new product line",
    "role": "admin",
    "acceptUrl": "https://app.synthstack.com/accept-invite?token=abc123",
    "expiryDate": "December 25, 2025",
    "dashboardUrl": "https://app.synthstack.com/app",
    "supportUrl": "https://app.synthstack.com/contact",
    "currentYear": "2025"
  }'::jsonb,
  'published'
) ON CONFLICT (slug) DO UPDATE SET
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  subject = EXCLUDED.subject,
  variables = EXCLUDED.variables,
  preview_data = EXCLUDED.preview_data,
  updated_at = CURRENT_TIMESTAMP;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Team invitation email template created successfully!';
  RAISE NOTICE 'Template slug: team-invitation';
  RAISE NOTICE 'Use this template for sending project team invitations';
END $$;
