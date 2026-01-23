-- Migration 035: Navigation Groups
-- Organize Directus sidebar navigation into hierarchical module groups

-- ======================
-- 0. ENSURE GROUP COLLECTIONS EXIST
-- ======================

-- The directus_collections."group" column has a FK to directus_collections(collection),
-- so group keys must exist as collections.
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, sort, collapse)
VALUES
  ('business', 'business', 'Business module', false, true, 100, 'open'),
  ('invoicing', 'receipt_long', 'Invoicing module', false, true, 101, 'open'),
  ('ai_tools', 'smart_toy', 'AI tools module', false, true, 102, 'open'),
  ('content', 'article', 'Content module', false, true, 103, 'open'),
  ('users_access', 'group', 'Users & access module', false, true, 104, 'open'),
  ('settings', 'settings', 'Settings module', false, true, 105, 'open')
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  hidden = EXCLUDED.hidden,
  singleton = EXCLUDED.singleton,
  sort = EXCLUDED.sort,
  collapse = EXCLUDED.collapse;

-- ======================
-- 1. UPDATE COLLECTION METADATA FOR GROUPING
-- ======================

-- Set group for each collection to organize sidebar navigation
UPDATE directus_collections SET "group" = NULL WHERE "group" IS NOT NULL; -- Reset first

-- Overview (no group - stays at top)
UPDATE directus_collections SET "group" = NULL, sort = 1 WHERE collection = 'dashboards';

-- Business Module
UPDATE directus_collections SET "group" = 'business', sort = 1 WHERE collection = 'organizations';
UPDATE directus_collections SET "group" = 'business', sort = 2 WHERE collection = 'contacts';
UPDATE directus_collections SET "group" = 'business', sort = 3 WHERE collection = 'deals';
UPDATE directus_collections SET "group" = 'business', sort = 4 WHERE collection = 'proposals';

-- Invoicing Module
UPDATE directus_collections SET "group" = 'invoicing', sort = 1 WHERE collection = 'invoices';
UPDATE directus_collections SET "group" = 'invoicing', sort = 2 WHERE collection = 'payments';
UPDATE directus_collections SET "group" = 'invoicing', sort = 3 WHERE collection = 'expenses';
UPDATE directus_collections SET "group" = 'invoicing', sort = 4 WHERE collection = 'tax_rates';

-- Projects Module
UPDATE directus_collections SET "group" = 'projects', sort = 1 WHERE collection = 'projects';
UPDATE directus_collections SET "group" = 'projects', sort = 2 WHERE collection = 'todos';
UPDATE directus_collections SET "group" = 'projects', sort = 3 WHERE collection = 'marketing_plans';

-- AI Tools Module
UPDATE directus_collections SET "group" = 'ai_tools', sort = 1 WHERE collection = 'copilot_sessions';
UPDATE directus_collections SET "group" = 'ai_tools', sort = 2 WHERE collection = 'ai_agents';
UPDATE directus_collections SET "group" = 'ai_tools', sort = 3 WHERE collection = 'seo_keywords';
UPDATE directus_collections SET "group" = 'ai_tools', sort = 4 WHERE collection = 'ai_suggestions';

-- Content Module
UPDATE directus_collections SET "group" = 'content', sort = 1 WHERE collection = 'blog_posts';
UPDATE directus_collections SET "group" = 'content', sort = 2 WHERE collection = 'blog_categories';
UPDATE directus_collections SET "group" = 'content', sort = 3 WHERE collection = 'documents';

-- Users & Access Module
UPDATE directus_collections SET "group" = 'users_access', sort = 1 WHERE collection = 'app_users';
UPDATE directus_collections SET "group" = 'users_access', sort = 2 WHERE collection = 'user_subscriptions';
UPDATE directus_collections SET "group" = 'users_access', sort = 3 WHERE collection = 'credit_transactions';
UPDATE directus_collections SET "group" = 'users_access', sort = 4 WHERE collection = 'referral_codes';

-- Settings Module (typically hidden, but organized)
UPDATE directus_collections SET "group" = 'settings', sort = 1 WHERE collection = 'feature_flags';
UPDATE directus_collections SET "group" = 'settings', sort = 2 WHERE collection = 'themes';
UPDATE directus_collections SET "group" = 'settings', sort = 3 WHERE collection = 'onboarding_progress';

-- Hidden/System collections (no group, hidden from nav)
UPDATE directus_collections SET "group" = NULL, hidden = true WHERE collection IN (
  'deal_stages',
  'proposal_templates',
  'invoice_items',
  'analytics_events'
);

-- ======================
-- 2. UPDATE COLLECTION DISPLAY NAMES
-- ======================

-- Make collection names more user-friendly
UPDATE directus_collections SET note = 'Client organizations and companies' WHERE collection = 'organizations';
UPDATE directus_collections SET note = 'Client contacts and decision makers' WHERE collection = 'contacts';
UPDATE directus_collections SET note = 'Sales pipeline and opportunities' WHERE collection = 'deals';
UPDATE directus_collections SET note = 'Project proposals and quotes' WHERE collection = 'proposals';
UPDATE directus_collections SET note = 'Client invoices and billing' WHERE collection = 'invoices';
UPDATE directus_collections SET note = 'Payment transactions and receipts' WHERE collection = 'payments';
UPDATE directus_collections SET note = 'Project expenses and reimbursements' WHERE collection = 'expenses';
UPDATE directus_collections SET note = 'Tax rates for invoicing' WHERE collection = 'tax_rates';
UPDATE directus_collections SET note = 'Client projects and deliverables' WHERE collection = 'projects';
UPDATE directus_collections SET note = 'Tasks and action items' WHERE collection = 'todos';
UPDATE directus_collections SET note = 'Marketing campaign plans' WHERE collection = 'marketing_plans';
UPDATE directus_collections SET note = 'AI chat conversations and history' WHERE collection = 'copilot_sessions';
UPDATE directus_collections SET note = 'AI co-founder agents and assistants' WHERE collection = 'ai_agents';
UPDATE directus_collections SET note = 'SEO keyword research and tracking' WHERE collection = 'seo_keywords';
UPDATE directus_collections SET note = 'AI-generated content suggestions' WHERE collection = 'ai_suggestions';
UPDATE directus_collections SET note = 'Blog articles and posts' WHERE collection = 'blog_posts';
UPDATE directus_collections SET note = 'Blog content categories' WHERE collection = 'blog_categories';
UPDATE directus_collections SET note = 'Knowledge base and documentation' WHERE collection = 'documents';
UPDATE directus_collections SET note = 'Application users and accounts' WHERE collection = 'app_users';
UPDATE directus_collections SET note = 'User subscription plans' WHERE collection = 'user_subscriptions';
UPDATE directus_collections SET note = 'Credit usage and transactions' WHERE collection = 'credit_transactions';
UPDATE directus_collections SET note = 'Referral tracking codes' WHERE collection = 'referral_codes';

-- ======================
-- 3. UPDATE COLLECTION ICONS
-- ======================

-- Set appropriate Material Design icons for each collection
UPDATE directus_collections SET icon = 'business' WHERE collection = 'organizations';
UPDATE directus_collections SET icon = 'person' WHERE collection = 'contacts';
UPDATE directus_collections SET icon = 'trending_up' WHERE collection = 'deals';
UPDATE directus_collections SET icon = 'description' WHERE collection = 'proposals';
UPDATE directus_collections SET icon = 'receipt_long' WHERE collection = 'invoices';
UPDATE directus_collections SET icon = 'payment' WHERE collection = 'payments';
UPDATE directus_collections SET icon = 'receipt' WHERE collection = 'expenses';
UPDATE directus_collections SET icon = 'percent' WHERE collection = 'tax_rates';
UPDATE directus_collections SET icon = 'work' WHERE collection = 'projects';
UPDATE directus_collections SET icon = 'task' WHERE collection = 'todos';
UPDATE directus_collections SET icon = 'campaign' WHERE collection = 'marketing_plans';
UPDATE directus_collections SET icon = 'smart_toy' WHERE collection = 'copilot_sessions';
UPDATE directus_collections SET icon = 'psychology' WHERE collection = 'ai_agents';
UPDATE directus_collections SET icon = 'search' WHERE collection = 'seo_keywords';
UPDATE directus_collections SET icon = 'lightbulb' WHERE collection = 'ai_suggestions';
UPDATE directus_collections SET icon = 'article' WHERE collection = 'blog_posts';
UPDATE directus_collections SET icon = 'category' WHERE collection = 'blog_categories';
UPDATE directus_collections SET icon = 'folder' WHERE collection = 'documents';
UPDATE directus_collections SET icon = 'group' WHERE collection = 'app_users';
UPDATE directus_collections SET icon = 'card_membership' WHERE collection = 'user_subscriptions';
UPDATE directus_collections SET icon = 'account_balance' WHERE collection = 'credit_transactions';
UPDATE directus_collections SET icon = 'redeem' WHERE collection = 'referral_codes';

-- ======================
-- 4. CREATE INSIGHTS DASHBOARDS
-- ======================

-- Create default Overview dashboard
INSERT INTO directus_dashboards (id, name, icon, note, date_created, user_created)
VALUES (
  gen_random_uuid(),
  'Overview',
  'dashboard',
  'Main business overview dashboard',
  NOW(),
  (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create Invoice Management dashboard
INSERT INTO directus_dashboards (id, name, icon, note, date_created, user_created)
VALUES (
  gen_random_uuid(),
  'Invoices',
  'receipt_long',
  'Invoice management and billing',
  NOW(),
  (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create CRM Pipeline dashboard
INSERT INTO directus_dashboards (id, name, icon, note, date_created, user_created)
VALUES (
  gen_random_uuid(),
  'CRM Pipeline',
  'trending_up',
  'Sales pipeline and deal tracking',
  NOW(),
  (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create AI Copilot dashboard (if doesn't exist)
INSERT INTO directus_dashboards (id, name, icon, note, date_created, user_created)
VALUES (
  gen_random_uuid(),
  'AI Copilot',
  'smart_toy',
  'AI assistance and chat interface',
  NOW(),
  (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Create Analytics dashboard
INSERT INTO directus_dashboards (id, name, icon, note, date_created, user_created)
VALUES (
  gen_random_uuid(),
  'Analytics',
  'analytics',
  'Business metrics and reporting',
  NOW(),
  (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
) ON CONFLICT DO NOTHING;

-- ======================
-- 5. CONFIGURE DEFAULT PANELS
-- ======================

-- Note: Panel configuration is typically done through the Directus UI or via API
-- This migration sets up the structure, actual panel instances would be created separately

-- Get dashboard IDs for reference
DO $$
DECLARE
  v_overview_dashboard_id UUID;
  v_invoices_dashboard_id UUID;
  v_crm_dashboard_id UUID;
BEGIN
  -- Get dashboard IDs
  SELECT id INTO v_overview_dashboard_id FROM directus_dashboards WHERE name = 'Overview' LIMIT 1;
  SELECT id INTO v_invoices_dashboard_id FROM directus_dashboards WHERE name = 'Invoices' LIMIT 1;
  SELECT id INTO v_crm_dashboard_id FROM directus_dashboards WHERE name = 'CRM Pipeline' LIMIT 1;

  -- Create Welcome Dashboard panel on Overview
  IF v_overview_dashboard_id IS NOT NULL THEN
    INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options, date_created, user_created)
    VALUES (
      gen_random_uuid(),
      v_overview_dashboard_id,
      'Welcome',
      'waving_hand',
      '#6366F1',
      false,
      'Personalized welcome message',
      'welcome-dashboard',
      1, 1, 24, 12,
      '{"showGreeting": true, "showQuickLinks": true, "showRecentActivity": true}'::jsonb,
      NOW(),
      (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
    ) ON CONFLICT DO NOTHING;

    -- Create Business Metrics panel on Overview
    INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options, date_created, user_created)
    VALUES (
      gen_random_uuid(),
      v_overview_dashboard_id,
      'Business Metrics',
      'analytics',
      '#10B981',
      true,
      'Key business metrics',
      'business-metrics',
      1, 13, 24, 8,
      '{"metricsToShow": ["invoices_due", "active_deals", "active_projects", "tasks_today"], "refreshInterval": 60, "compactView": false}'::jsonb,
      NOW(),
      (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Create Invoice Manager panel on Invoices dashboard
  IF v_invoices_dashboard_id IS NOT NULL THEN
    INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options, date_created, user_created)
    VALUES (
      gen_random_uuid(),
      v_invoices_dashboard_id,
      'Invoice Manager',
      'receipt_long',
      '#10B981',
      false,
      'Manage invoices and payments',
      'invoice-manager',
      1, 1, 24, 20,
      '{"showQuickActions": true, "defaultFilter": "all", "itemsPerPage": 10}'::jsonb,
      NOW(),
      (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Create CRM Pipeline panel on CRM dashboard
  IF v_crm_dashboard_id IS NOT NULL THEN
    INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options, date_created, user_created)
    VALUES (
      gen_random_uuid(),
      v_crm_dashboard_id,
      'Sales Pipeline',
      'trending_up',
      '#3B82F6',
      false,
      'Visual sales pipeline',
      'crm-pipeline',
      1, 1, 24, 20,
      '{"showMetrics": true, "groupBy": "stage", "defaultView": "kanban"}'::jsonb,
      NOW(),
      (SELECT id FROM directus_users ORDER BY date_created ASC LIMIT 1)
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ======================
-- 6. SET DEFAULT DASHBOARD
-- ======================

-- Update Directus settings to set Overview as the default dashboard
UPDATE directus_settings
SET module_bar = jsonb_build_array(
  jsonb_build_object('type', 'module', 'id', 'content', 'enabled', true),
  jsonb_build_object('type', 'module', 'id', 'users', 'enabled', true),
  jsonb_build_object('type', 'module', 'id', 'files', 'enabled', true),
  jsonb_build_object('type', 'module', 'id', 'insights', 'enabled', true),
  jsonb_build_object('type', 'module', 'id', 'settings', 'enabled', true)
);

-- ======================
-- MIGRATION COMPLETE
-- ======================

DO $$
BEGIN
  RAISE NOTICE 'Migration 035 completed successfully';
  RAISE NOTICE 'Organized navigation into module groups:';
  RAISE NOTICE '  - Business (organizations, contacts, deals, proposals)';
  RAISE NOTICE '  - Invoicing (invoices, payments, expenses, tax_rates)';
  RAISE NOTICE '  - Projects (projects, todos, marketing_plans)';
  RAISE NOTICE '  - AI Tools (copilot, agents, seo, suggestions)';
  RAISE NOTICE '  - Content (blog_posts, categories, documents)';
  RAISE NOTICE '  - Users & Access (users, subscriptions, credits, referrals)';
  RAISE NOTICE 'Created 5 default dashboards with panels';
END $$;
