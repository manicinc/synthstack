-- Demo Credit Low Email Template Migration
-- Adds an email template for demo sessions when only 1 AI message remains

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
  'demo-credit-low',
  'Demo Credits Low',
  'Notifies users when they have 1 demo AI message remaining',
  'notification',
  $$Only 1 AI message remaining — Upgrade or refer friends$$,
  $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Credits Low</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
    <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%);color:#fff;">
      <h1 style="margin:0;font-size:22px;line-height:1.2;">Only 1 AI message remaining</h1>
      <p style="margin:10px 0 0;opacity:0.95;">Keep building — upgrade or refer friends to earn credits.</p>
    </div>

    <div style="padding:28px;color:#111827;">
      <p style="margin:0 0 14px;font-size:16px;">
        Hi <% if (firstName) { %><%= firstName %><% } else { %>there<% } %>,
      </p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
        You're almost out of demo messages. Upgrade to keep generating without interruption, or share your referral link to earn credits.
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 8px;">
        <a href="<%= upgradeUrl %>" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:600;">
          Upgrade
        </a>
        <a href="<%= referralUrl %>" style="display:inline-block;background:#EEF2FF;color:#3730A3;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:600;">
          Referral dashboard
        </a>
      </div>

      <p style="margin:18px 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
        If you don't want demo credit emails, you can <a href="<%= unsubscribeUrl %>" style="color:#6366F1;text-decoration:none;">unsubscribe</a>.
      </p>
    </div>

    <div style="padding:18px 28px;background:#F9FAFB;color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB;">
      This is an automated message from SynthStack.
    </div>
  </div>
</body>
</html>$$,
  $$Hi <% if (firstName) { %><%= firstName %><% } else { %>there<% } %>,

You only have 1 AI message remaining in your demo.

Upgrade to keep generating:
<%= upgradeUrl %>

Or share your referral link to earn credits:
<%= referralUrl %>

Unsubscribe from demo credit emails:
<%= unsubscribeUrl %>
$$,
  'ejs',
  '[
    {"name":"firstName","type":"string","required":false,"description":"User first name (optional)"},
    {"name":"upgradeUrl","type":"string","required":true,"description":"URL to upgrade"},
    {"name":"referralUrl","type":"string","required":true,"description":"URL to referral dashboard"},
    {"name":"unsubscribeUrl","type":"string","required":true,"description":"Unsubscribe URL"}
  ]'::jsonb,
  '{
    "firstName": "Alex",
    "upgradeUrl": "https://synthstack.app/pricing?source=demo_credit_email",
    "referralUrl": "https://synthstack.app/referral",
    "unsubscribeUrl": "https://synthstack.app/preferences/email?unsubscribe=demo_credits"
  }'::jsonb,
  'published'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  engine = EXCLUDED.engine,
  variables = EXCLUDED.variables,
  preview_data = EXCLUDED.preview_data,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
  RAISE NOTICE 'Demo credit low email template created/updated successfully!';
  RAISE NOTICE 'Template slug: demo-credit-low';
END $$;

