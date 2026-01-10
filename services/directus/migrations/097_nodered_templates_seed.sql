-- =====================================================
-- Node-RED Flow Templates Seed Data
-- Seeds initial workflow templates for the template library
-- =====================================================

-- AI Agent: Welcome Email Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Welcome Email Automation',
  'welcome-email-automation',
  'Automatically send a personalized welcome email when a new user registers. Uses AI to generate a custom greeting.',
  'notifications',
  'beginner',
  'mail',
  '#8b5cf6',
  ARRAY['email', 'onboarding', 'ai'],
  'published',
  '[
    {"id":"welcome-tab","type":"tab","label":"Welcome Email","info":"Sends welcome email on user registration"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"welcome-tab","name":"User Registered","event":"directus:user-registered","x":150,"y":100,"wires":[["agent-1"]]},
    {"id":"agent-1","type":"synthstack-agent","z":"welcome-tab","name":"Generate Welcome","agent":"content-creator","prompt":"Write a warm, personalized welcome email for {{msg.payload.first_name}}","x":350,"y":100,"wires":[["email-1"]]},
    {"id":"email-1","type":"synthstack-email","z":"welcome-tab","name":"Send Email","to":"","subject":"Welcome to SynthStack!","x":550,"y":100,"wires":[["debug-1"],[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-agent', 'synthstack-email'],
  0,
  NULL
);

-- AI Agent: Content Approval Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'AI Content Review & Approval',
  'ai-content-review-approval',
  'Review user-generated content with AI and route for human approval if needed. Includes sentiment analysis and toxicity detection.',
  'ai-agents',
  'intermediate',
  'rate_review',
  '#6366f1',
  ARRAY['ai', 'moderation', 'approval', 'content'],
  'published',
  '[
    {"id":"content-tab","type":"tab","label":"Content Review","info":"AI-powered content moderation with human escalation"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"content-tab","name":"New Content","event":"directus:content-submitted","x":150,"y":150,"wires":[["agent-1"]]},
    {"id":"agent-1","type":"synthstack-agent","z":"content-tab","name":"Analyze Content","agent":"safety-reviewer","prompt":"Analyze this content for appropriateness. Score 1-10. Flag concerns.","x":350,"y":150,"wires":[["switch-1"]]},
    {"id":"switch-1","type":"switch","z":"content-tab","name":"Score Check","property":"payload.score","rules":[{"t":"gte","v":"8"},{"t":"lt","v":"8"}],"x":530,"y":150,"wires":[["approve-1"],["approval-1"]]},
    {"id":"approve-1","type":"synthstack-directus","z":"content-tab","name":"Auto Approve","operation":"update","collection":"content","x":720,"y":100,"wires":[[]]},
    {"id":"approval-1","type":"synthstack-approval","z":"content-tab","name":"Human Review","timeout":"24h","x":720,"y":200,"wires":[["approve-2"],["reject-1"]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-agent', 'synthstack-approval', 'synthstack-directus'],
  0,
  NULL
);

-- GitHub Issue Sync Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'GitHub Issues to Projects Sync',
  'github-issues-projects-sync',
  'Sync GitHub issues to your SynthStack projects. Automatically create tasks when issues are opened and update status when closed.',
  'integrations',
  'intermediate',
  'code',
  '#24292e',
  ARRAY['github', 'sync', 'issues', 'projects'],
  'published',
  '[
    {"id":"github-tab","type":"tab","label":"GitHub Sync","info":"Sync GitHub issues to projects"},
    {"id":"http-1","type":"http in","z":"github-tab","name":"GitHub Webhook","url":"/github/issues","method":"post","x":150,"y":150,"wires":[["switch-1"]]},
    {"id":"switch-1","type":"switch","z":"github-tab","name":"Action","property":"payload.action","rules":[{"t":"eq","v":"opened"},{"t":"eq","v":"closed"}],"x":330,"y":150,"wires":[["create-1"],["update-1"]]},
    {"id":"create-1","type":"synthstack-directus","z":"github-tab","name":"Create Task","operation":"create","collection":"tasks","x":520,"y":100,"wires":[["http-resp"]]},
    {"id":"update-1","type":"synthstack-directus","z":"github-tab","name":"Close Task","operation":"update","collection":"tasks","x":520,"y":200,"wires":[["http-resp"]]},
    {"id":"http-resp","type":"http response","z":"github-tab","name":"OK","statusCode":"200","x":700,"y":150,"wires":[]}
  ]'::jsonb,
  ARRAY['synthstack-directus'],
  0,
  NULL
);

-- Daily Report Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Daily Project Summary',
  'daily-project-summary',
  'Generate and send a daily summary of project activity using AI. Includes metrics, highlights, and recommendations.',
  'scheduling',
  'beginner',
  'summarize',
  '#0ea5e9',
  ARRAY['daily', 'report', 'ai', 'email'],
  'published',
  '[
    {"id":"daily-tab","type":"tab","label":"Daily Summary","info":"Daily project activity summary"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"daily-tab","name":"Daily 8 AM","event":"schedule:daily","x":150,"y":150,"wires":[["directus-1"]]},
    {"id":"directus-1","type":"synthstack-directus","z":"daily-tab","name":"Get Activity","operation":"read","collection":"activities","x":340,"y":150,"wires":[["agent-1"]]},
    {"id":"agent-1","type":"synthstack-agent","z":"daily-tab","name":"Generate Summary","agent":"data-analyst","prompt":"Create a concise daily summary of this project activity","x":540,"y":150,"wires":[["email-1"]]},
    {"id":"email-1","type":"synthstack-email","z":"daily-tab","name":"Send Report","to":"team@example.com","subject":"Daily Project Summary","x":740,"y":150,"wires":[[],[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-directus', 'synthstack-agent', 'synthstack-email'],
  0,
  NULL
);

-- Stripe Webhook Handler
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Stripe Payment Handler',
  'stripe-payment-handler',
  'Handle Stripe webhooks for payments. Update subscription status, send receipts, and trigger onboarding flows.',
  'integrations',
  'advanced',
  'credit_card',
  '#635bff',
  ARRAY['stripe', 'payments', 'webhooks', 'billing'],
  'published',
  '[
    {"id":"stripe-tab","type":"tab","label":"Stripe Handler","info":"Process Stripe payment events"},
    {"id":"http-1","type":"http in","z":"stripe-tab","name":"Stripe Webhook","url":"/stripe/webhook","method":"post","x":150,"y":200,"wires":[["switch-1"]]},
    {"id":"switch-1","type":"switch","z":"stripe-tab","name":"Event Type","property":"payload.type","rules":[{"t":"eq","v":"checkout.session.completed"},{"t":"eq","v":"customer.subscription.updated"},{"t":"eq","v":"invoice.payment_failed"}],"x":340,"y":200,"wires":[["checkout-1"],["sub-1"],["failed-1"]]},
    {"id":"checkout-1","type":"synthstack-directus","z":"stripe-tab","name":"Activate Sub","operation":"update","collection":"subscriptions","x":540,"y":100,"wires":[["email-success"]]},
    {"id":"sub-1","type":"synthstack-directus","z":"stripe-tab","name":"Update Sub","operation":"update","collection":"subscriptions","x":540,"y":200,"wires":[[]]},
    {"id":"failed-1","type":"synthstack-directus","z":"stripe-tab","name":"Mark Failed","operation":"update","collection":"subscriptions","x":540,"y":300,"wires":[["email-failed"]]},
    {"id":"email-success","type":"synthstack-email","z":"stripe-tab","name":"Welcome Email","x":750,"y":100,"wires":[[],[]]},
    {"id":"email-failed","type":"synthstack-email","z":"stripe-tab","name":"Payment Failed","x":750,"y":300,"wires":[[],[]]}
  ]'::jsonb,
  ARRAY['synthstack-directus', 'synthstack-email'],
  0,
  NULL
);

-- Customer Support Copilot
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'AI Support Copilot',
  'ai-support-copilot',
  'Automate customer support with RAG-powered responses. Searches knowledge base and drafts replies for agent review.',
  'ai-agents',
  'advanced',
  'support_agent',
  '#10b981',
  ARRAY['ai', 'support', 'copilot', 'rag', 'customer-service'],
  'published',
  '[
    {"id":"support-tab","type":"tab","label":"Support Copilot","info":"AI-assisted customer support"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"support-tab","name":"New Ticket","event":"directus:ticket-created","x":150,"y":200,"wires":[["copilot-1"]]},
    {"id":"copilot-1","type":"synthstack-copilot","z":"support-tab","name":"Search KB","x":340,"y":200,"wires":[["agent-1"]]},
    {"id":"agent-1","type":"synthstack-agent","z":"support-tab","name":"Draft Reply","agent":"support-agent","prompt":"Draft a helpful reply using this knowledge base context","x":540,"y":200,"wires":[["approval-1"]]},
    {"id":"approval-1","type":"synthstack-approval","z":"support-tab","name":"Agent Review","timeout":"4h","x":740,"y":200,"wires":[["send-1"],["escalate-1"]]},
    {"id":"send-1","type":"synthstack-email","z":"support-tab","name":"Send Reply","x":940,"y":150,"wires":[[],[]]},
    {"id":"escalate-1","type":"synthstack-directus","z":"support-tab","name":"Escalate","operation":"update","collection":"tickets","x":940,"y":250,"wires":[[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-copilot', 'synthstack-agent', 'synthstack-approval', 'synthstack-email', 'synthstack-directus'],
  0,
  NULL
);

-- Onboarding Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'User Onboarding Sequence',
  'user-onboarding-sequence',
  'Multi-step onboarding flow with timed emails, progress tracking, and personalized content using AI.',
  'notifications',
  'intermediate',
  'rocket_launch',
  '#f59e0b',
  ARRAY['onboarding', 'drip', 'email', 'sequence'],
  'published',
  '[
    {"id":"onboard-tab","type":"tab","label":"Onboarding","info":"Automated user onboarding sequence"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"onboard-tab","name":"User Created","event":"directus:user-registered","x":150,"y":150,"wires":[["email-1"]]},
    {"id":"email-1","type":"synthstack-email","z":"onboard-tab","name":"Day 0: Welcome","x":350,"y":150,"wires":[["delay-1"],[]]},
    {"id":"delay-1","type":"delay","z":"onboard-tab","name":"Wait 1 Day","timeout":"1","timeoutUnits":"days","x":540,"y":150,"wires":[["check-1"]]},
    {"id":"check-1","type":"synthstack-directus","z":"onboard-tab","name":"Check Progress","operation":"read","collection":"user_progress","x":730,"y":150,"wires":[["switch-1"]]},
    {"id":"switch-1","type":"switch","z":"onboard-tab","name":"Completed?","property":"payload.completed","rules":[{"t":"true"},{"t":"false"}],"x":920,"y":150,"wires":[[],["email-2"]]},
    {"id":"email-2","type":"synthstack-email","z":"onboard-tab","name":"Day 1: Tips","x":1100,"y":200,"wires":[["delay-2"],[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-email', 'synthstack-directus'],
  0,
  NULL
);

-- Data Cleanup Scheduler
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Scheduled Data Cleanup',
  'scheduled-data-cleanup',
  'Automatically clean up old data on a schedule. Remove expired sessions, old logs, and orphaned files.',
  'scheduling',
  'beginner',
  'cleaning_services',
  '#ef4444',
  ARRAY['cleanup', 'maintenance', 'scheduled', 'data'],
  'published',
  '[
    {"id":"cleanup-tab","type":"tab","label":"Data Cleanup","info":"Scheduled data maintenance"},
    {"id":"cron-1","type":"synthstack-trigger","z":"cleanup-tab","name":"Weekly Sunday","event":"schedule:weekly","x":150,"y":150,"wires":[["parallel-1"]]},
    {"id":"parallel-1","type":"link out","z":"cleanup-tab","name":"Parallel Tasks","x":340,"y":150,"wires":["sessions-1","logs-1","files-1"]},
    {"id":"sessions-1","type":"synthstack-directus","z":"cleanup-tab","name":"Clear Sessions","operation":"delete","collection":"sessions","x":540,"y":80,"wires":[["report-1"]]},
    {"id":"logs-1","type":"synthstack-directus","z":"cleanup-tab","name":"Archive Logs","operation":"delete","collection":"activity_logs","x":540,"y":150,"wires":[["report-1"]]},
    {"id":"files-1","type":"synthstack-directus","z":"cleanup-tab","name":"Clean Files","operation":"delete","collection":"orphan_files","x":540,"y":220,"wires":[["report-1"]]},
    {"id":"report-1","type":"synthstack-email","z":"cleanup-tab","name":"Cleanup Report","x":760,"y":150,"wires":[[],[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-directus', 'synthstack-email'],
  0,
  NULL
);

-- Lead Notification Flow (Slack + Discord)
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Lead Notification Multi-Channel',
  'lead-notification-multi-channel',
  'Notify your team instantly when a new lead comes in. Posts to Slack, Discord, and sends email with lead details.',
  'notifications',
  'beginner',
  'notifications_active',
  '#22c55e',
  ARRAY['slack', 'discord', 'email', 'leads', 'notifications'],
  'published',
  '[
    {"id":"lead-tab","type":"tab","label":"Lead Notifications","info":"Multi-channel lead notifications"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"lead-tab","name":"New Lead","event":"directus:lead-created","x":150,"y":200,"wires":[["format-1"]]},
    {"id":"format-1","type":"function","z":"lead-tab","name":"Format Lead","func":"const lead = msg.payload;\nmsg.leadName = lead.name || \"Unknown\";\nmsg.leadEmail = lead.email || \"N/A\";\nmsg.leadCompany = lead.company || \"N/A\";\nmsg.leadSource = lead.source || \"Website\";\nmsg.leadScore = lead.score || 0;\nreturn msg;","x":330,"y":200,"wires":[["slack-1","discord-1","email-1"]]},
    {"id":"slack-1","type":"synthstack-slack","z":"lead-tab","name":"Post to Slack","channel":"#sales-leads","operation":"postMessage","x":530,"y":120,"wires":[[]]},
    {"id":"discord-1","type":"synthstack-discord","z":"lead-tab","name":"Post to Discord","channel":"sales-leads","operation":"sendMessage","x":530,"y":200,"wires":[[]]},
    {"id":"email-1","type":"synthstack-email","z":"lead-tab","name":"Email Sales","to":"sales@company.com","subject":"New Lead: {{leadName}}","x":530,"y":280,"wires":[[],[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-slack', 'synthstack-discord', 'synthstack-email'],
  0,
  NULL
);

-- AI Content Generation Pipeline
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'AI Content Generation Pipeline',
  'ai-content-generation-pipeline',
  'Generate blog posts, social media content, and SEO metadata using AI. Saves drafts to Directus and optionally publishes to Notion.',
  'ai-agents',
  'intermediate',
  'auto_awesome',
  '#a855f7',
  ARRAY['ai', 'content', 'blog', 'seo', 'notion'],
  'published',
  '[
    {"id":"content-tab","type":"tab","label":"Content Generation","info":"AI-powered content creation pipeline"},
    {"id":"http-1","type":"http in","z":"content-tab","name":"Generate Request","url":"/content/generate","method":"post","x":150,"y":200,"wires":[["validate-1"]]},
    {"id":"validate-1","type":"function","z":"content-tab","name":"Validate Input","func":"if (!msg.payload.topic) { msg.statusCode = 400; msg.payload = {error: \"Topic required\"}; return [null, msg]; }\nreturn [msg, null];","outputs":2,"x":340,"y":200,"wires":[["research-1"],["http-error"]]},
    {"id":"research-1","type":"synthstack-kb-search","z":"content-tab","name":"Research Topic","x":530,"y":200,"wires":[["outline-1"]]},
    {"id":"outline-1","type":"synthstack-agent","z":"content-tab","name":"Create Outline","agent":"content-strategist","x":720,"y":200,"wires":[["draft-1"]]},
    {"id":"draft-1","type":"synthstack-agent","z":"content-tab","name":"Write Draft","agent":"content-creator","x":910,"y":200,"wires":[["seo-1"]]},
    {"id":"seo-1","type":"synthstack-agent","z":"content-tab","name":"SEO Optimize","agent":"seo-specialist","x":1100,"y":200,"wires":[["save-1"]]},
    {"id":"save-1","type":"synthstack-directus","z":"content-tab","name":"Save Draft","operation":"create","collection":"content_drafts","x":1290,"y":200,"wires":[["notion-1"]]},
    {"id":"notion-1","type":"synthstack-notion","z":"content-tab","name":"Sync to Notion","operation":"createPage","x":1480,"y":200,"wires":[["http-resp"]]},
    {"id":"http-resp","type":"http response","z":"content-tab","name":"Success","statusCode":"200","x":1670,"y":200,"wires":[]},
    {"id":"http-error","type":"http response","z":"content-tab","name":"Error","x":530,"y":280,"wires":[]}
  ]'::jsonb,
  ARRAY['synthstack-kb-search', 'synthstack-agent', 'synthstack-directus', 'synthstack-notion'],
  0,
  NULL
);

-- Customer Support RAG Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'RAG-Powered Support Bot',
  'rag-powered-support-bot',
  'Answer customer questions using RAG. Searches knowledge base, generates responses, and escalates complex issues to human agents.',
  'ai-agents',
  'advanced',
  'psychology',
  '#06b6d4',
  ARRAY['rag', 'support', 'ai', 'knowledge-base', 'copilot'],
  'published',
  '[
    {"id":"rag-tab","type":"tab","label":"RAG Support","info":"RAG-powered customer support bot"},
    {"id":"http-1","type":"http in","z":"rag-tab","name":"Support Query","url":"/support/ask","method":"post","x":150,"y":200,"wires":[["search-1"]]},
    {"id":"search-1","type":"synthstack-kb-search","z":"rag-tab","name":"Search KB","x":340,"y":200,"wires":[["check-results"]]},
    {"id":"check-results","type":"switch","z":"rag-tab","name":"Has Results?","property":"payload.results.length","rules":[{"t":"gt","v":"0"},{"t":"eq","v":"0"}],"x":530,"y":200,"wires":[["generate-1"],["no-results"]]},
    {"id":"generate-1","type":"synthstack-copilot","z":"rag-tab","name":"Generate Answer","x":720,"y":150,"wires":[["confidence-check"]]},
    {"id":"confidence-check","type":"switch","z":"rag-tab","name":"Confidence?","property":"payload.confidence","rules":[{"t":"gte","v":"0.7"},{"t":"lt","v":"0.7"}],"x":910,"y":150,"wires":[["http-success"],["escalate-1"]]},
    {"id":"no-results","type":"function","z":"rag-tab","name":"No Results Msg","func":"msg.payload = {answer: \"I could not find information about that. Let me connect you with a human agent.\", confidence: 0, escalate: true};\nreturn msg;","x":720,"y":250,"wires":[["escalate-1"]]},
    {"id":"escalate-1","type":"synthstack-directus","z":"rag-tab","name":"Create Ticket","operation":"create","collection":"support_tickets","x":1100,"y":200,"wires":[["slack-notify"]]},
    {"id":"slack-notify","type":"synthstack-slack","z":"rag-tab","name":"Notify Support","channel":"#support-escalations","operation":"postMessage","x":1290,"y":200,"wires":[["http-escalated"]]},
    {"id":"http-success","type":"http response","z":"rag-tab","name":"Answer","statusCode":"200","x":1100,"y":100,"wires":[]},
    {"id":"http-escalated","type":"http response","z":"rag-tab","name":"Escalated","statusCode":"202","x":1480,"y":200,"wires":[]}
  ]'::jsonb,
  ARRAY['synthstack-kb-search', 'synthstack-copilot', 'synthstack-directus', 'synthstack-slack'],
  0,
  NULL
);

-- Google Sheets Sync Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'CRM to Google Sheets Sync',
  'crm-google-sheets-sync',
  'Automatically sync contacts and deals from your CRM to Google Sheets. Perfect for reporting and sharing with stakeholders.',
  'integrations',
  'intermediate',
  'table_chart',
  '#34a853',
  ARRAY['google-sheets', 'crm', 'sync', 'reporting'],
  'published',
  '[
    {"id":"sheets-tab","type":"tab","label":"Sheets Sync","info":"Sync CRM data to Google Sheets"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"sheets-tab","name":"Contact Updated","event":"directus:contact-updated","x":150,"y":150,"wires":[["transform-1"]]},
    {"id":"trigger-2","type":"synthstack-trigger","z":"sheets-tab","name":"Deal Updated","event":"directus:deal-updated","x":150,"y":250,"wires":[["transform-2"]]},
    {"id":"transform-1","type":"function","z":"sheets-tab","name":"Format Contact","func":"msg.sheetId = env.get(\"CONTACTS_SHEET_ID\");\nmsg.range = \"Contacts!A:Z\";\nmsg.values = [[msg.payload.id, msg.payload.name, msg.payload.email, msg.payload.company, new Date().toISOString()]];\nreturn msg;","x":360,"y":150,"wires":[["sheets-1"]]},
    {"id":"transform-2","type":"function","z":"sheets-tab","name":"Format Deal","func":"msg.sheetId = env.get(\"DEALS_SHEET_ID\");\nmsg.range = \"Deals!A:Z\";\nmsg.values = [[msg.payload.id, msg.payload.name, msg.payload.value, msg.payload.stage, new Date().toISOString()]];\nreturn msg;","x":360,"y":250,"wires":[["sheets-1"]]},
    {"id":"sheets-1","type":"synthstack-gsheets","z":"sheets-tab","name":"Update Sheet","operation":"appendRow","x":570,"y":200,"wires":[["debug-1"]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-gsheets'],
  0,
  NULL
);

-- Twilio SMS Notifications
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'SMS Alert System',
  'sms-alert-system',
  'Send SMS alerts for critical events. Notify team members via Twilio when important thresholds are crossed.',
  'notifications',
  'intermediate',
  'sms',
  '#f22f46',
  ARRAY['twilio', 'sms', 'alerts', 'notifications'],
  'published',
  '[
    {"id":"sms-tab","type":"tab","label":"SMS Alerts","info":"Critical event SMS notifications"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"sms-tab","name":"Critical Event","event":"system:critical-alert","x":150,"y":200,"wires":[["lookup-1"]]},
    {"id":"lookup-1","type":"synthstack-directus","z":"sms-tab","name":"Get On-Call","operation":"read","collection":"on_call_schedule","x":350,"y":200,"wires":[["format-1"]]},
    {"id":"format-1","type":"function","z":"sms-tab","name":"Format Message","func":"const alert = msg.payload.alert;\nconst onCall = msg.payload.onCall;\nmsg.to = onCall.phone;\nmsg.body = `[CRITICAL] ${alert.title}: ${alert.message}. Respond within 15 minutes.`;\nreturn msg;","x":550,"y":200,"wires":[["sms-1"]]},
    {"id":"sms-1","type":"synthstack-twilio","z":"sms-tab","name":"Send SMS","operation":"sendSMS","x":750,"y":200,"wires":[["log-1"]]},
    {"id":"log-1","type":"synthstack-directus","z":"sms-tab","name":"Log Alert","operation":"create","collection":"alert_logs","x":950,"y":200,"wires":[[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-directus', 'synthstack-twilio'],
  0,
  NULL
);

-- Jira Integration Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Jira Issue Automation',
  'jira-issue-automation',
  'Automate Jira workflows. Create issues from form submissions, transition issues based on events, and sync with projects.',
  'integrations',
  'intermediate',
  'bug_report',
  '#0052cc',
  ARRAY['jira', 'issues', 'automation', 'project-management'],
  'published',
  '[
    {"id":"jira-tab","type":"tab","label":"Jira Automation","info":"Automated Jira issue management"},
    {"id":"http-1","type":"http in","z":"jira-tab","name":"Bug Report","url":"/bugs/report","method":"post","x":150,"y":150,"wires":[["create-issue"]]},
    {"id":"trigger-1","type":"synthstack-trigger","z":"jira-tab","name":"Task Completed","event":"directus:task-completed","x":150,"y":280,"wires":[["transition-1"]]},
    {"id":"create-issue","type":"synthstack-jira","z":"jira-tab","name":"Create Issue","operation":"createIssue","projectKey":"BUG","issueType":"Bug","x":360,"y":150,"wires":[["http-resp"]]},
    {"id":"transition-1","type":"synthstack-jira","z":"jira-tab","name":"Close Issue","operation":"transitionIssue","transitionId":"31","x":360,"y":280,"wires":[["debug-1"]]},
    {"id":"http-resp","type":"http response","z":"jira-tab","name":"Created","statusCode":"201","x":560,"y":150,"wires":[]}
  ]'::jsonb,
  ARRAY['synthstack-jira', 'synthstack-trigger'],
  0,
  NULL
);

-- Knowledge Base Ingestion Flow
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'Knowledge Base Ingestion',
  'knowledge-base-ingestion',
  'Ingest documents from Google Drive and Notion into your knowledge base. Automatically index new content for RAG.',
  'ai-agents',
  'advanced',
  'cloud_upload',
  '#7c3aed',
  ARRAY['knowledge-base', 'rag', 'drive', 'notion', 'ingestion'],
  'published',
  '[
    {"id":"ingest-tab","type":"tab","label":"KB Ingestion","info":"Ingest documents into knowledge base"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"ingest-tab","name":"Scheduled","event":"schedule:hourly","x":150,"y":150,"wires":[["drive-1","notion-1"]]},
    {"id":"drive-1","type":"synthstack-gdrive","z":"ingest-tab","name":"Scan Drive","operation":"listFiles","folderId":"{{env.KB_DRIVE_FOLDER}}","x":350,"y":100,"wires":[["filter-drive"]]},
    {"id":"notion-1","type":"synthstack-notion","z":"ingest-tab","name":"Scan Notion","operation":"queryDatabase","databaseId":"{{env.KB_NOTION_DB}}","x":350,"y":200,"wires":[["filter-notion"]]},
    {"id":"filter-drive","type":"function","z":"ingest-tab","name":"Filter New","func":"msg.payload = msg.payload.files.filter(f => new Date(f.modifiedTime) > global.get(\"lastDriveSync\") || new Date());\nreturn msg;","x":550,"y":100,"wires":[["ingest-1"]]},
    {"id":"filter-notion","type":"function","z":"ingest-tab","name":"Filter New","func":"msg.payload = msg.payload.results.filter(p => new Date(p.last_edited_time) > global.get(\"lastNotionSync\") || new Date());\nreturn msg;","x":550,"y":200,"wires":[["ingest-1"]]},
    {"id":"ingest-1","type":"synthstack-kb-ingest","z":"ingest-tab","name":"Ingest to KB","x":750,"y":150,"wires":[["log-1"]]},
    {"id":"log-1","type":"synthstack-directus","z":"ingest-tab","name":"Log Ingestion","operation":"create","collection":"kb_ingestion_logs","x":950,"y":150,"wires":[[]]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-gdrive', 'synthstack-notion', 'synthstack-kb-ingest', 'synthstack-directus'],
  0,
  NULL
);

-- Gmail Auto-Responder
INSERT INTO nodered_templates (
  id, name, slug, description, category, difficulty,
  icon, color, tags, status,
  flow_json, required_nodes, install_count, rating_average
) VALUES (
  gen_random_uuid(),
  'AI Gmail Auto-Responder',
  'ai-gmail-auto-responder',
  'Automatically draft and send responses to common email inquiries using AI. Searches knowledge base for context.',
  'notifications',
  'advanced',
  'mark_email_read',
  '#ea4335',
  ARRAY['gmail', 'email', 'ai', 'auto-reply'],
  'published',
  '[
    {"id":"gmail-tab","type":"tab","label":"Gmail Auto-Reply","info":"AI-powered email auto-responder"},
    {"id":"trigger-1","type":"synthstack-trigger","z":"gmail-tab","name":"New Email","event":"gmail:message-received","x":150,"y":200,"wires":[["classify-1"]]},
    {"id":"classify-1","type":"synthstack-agent","z":"gmail-tab","name":"Classify Email","agent":"email-classifier","x":350,"y":200,"wires":[["switch-1"]]},
    {"id":"switch-1","type":"switch","z":"gmail-tab","name":"Type?","property":"payload.category","rules":[{"t":"eq","v":"support"},{"t":"eq","v":"sales"},{"t":"else"}],"x":530,"y":200,"wires":[["kb-search"],["sales-draft"],["skip"]]},
    {"id":"kb-search","type":"synthstack-kb-search","z":"gmail-tab","name":"Search KB","x":720,"y":120,"wires":[["draft-1"]]},
    {"id":"sales-draft","type":"synthstack-agent","z":"gmail-tab","name":"Sales Draft","agent":"sales-assistant","x":720,"y":200,"wires":[["send-1"]]},
    {"id":"draft-1","type":"synthstack-copilot","z":"gmail-tab","name":"Draft Reply","x":910,"y":120,"wires":[["send-1"]]},
    {"id":"send-1","type":"synthstack-gmail","z":"gmail-tab","name":"Send Reply","operation":"reply","x":1100,"y":160,"wires":[[]]},
    {"id":"skip","type":"debug","z":"gmail-tab","name":"Skip","x":720,"y":280,"wires":[]}
  ]'::jsonb,
  ARRAY['synthstack-trigger', 'synthstack-agent', 'synthstack-kb-search', 'synthstack-copilot', 'synthstack-gmail'],
  0,
  NULL
);

-- Comment the seed completion
COMMENT ON TABLE nodered_templates IS 'Node-RED workflow templates. Seeded with initial templates on 2026-01-06. Extended with integration templates on 2026-01-07.';

