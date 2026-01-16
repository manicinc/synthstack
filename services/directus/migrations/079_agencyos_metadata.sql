-- ============================================
-- Migration 079: AgencyOS Collection Metadata
-- ============================================
-- Organizes collections with icons, colors, groups, and sidebar layout
-- Creates cohesive UI experience in Directus Admin
-- ============================================

-- ============================================
-- Collection Groups
-- ============================================
-- Directus 11 uses "group" field to organize collections in sidebar
-- Groups: CRM, Projects, Billing, Proposals, Help, Content

-- Update existing collections (extended by AgencyOS)
UPDATE directus_collections SET
  icon = 'business',
  color = '#6366F1',
  note = 'Client organizations and companies',
  sort = 10,
  "group" = 'crm'
WHERE collection = 'organizations';

UPDATE directus_collections SET
  icon = 'person',
  color = '#8B5CF6',
  note = 'Individual contacts',
  sort = 20,
  "group" = 'crm'
WHERE collection = 'contacts';

-- ============================================
-- CRM Group
-- ============================================

UPDATE directus_collections SET
  sort = 30,
  "group" = 'crm'
WHERE collection = 'os_deal_stages';

UPDATE directus_collections SET
  sort = 40,
  "group" = 'crm'
WHERE collection = 'os_deals';

UPDATE directus_collections SET
  sort = 50,
  "group" = 'crm'
WHERE collection = 'os_activities';

-- ============================================
-- Projects Group
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'projects'
WHERE collection = 'os_projects';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'projects'
WHERE collection = 'os_tasks';

UPDATE directus_collections SET
  sort = 30,
  "group" = 'projects'
WHERE collection = 'os_project_templates';

-- ============================================
-- Billing Group
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'billing'
WHERE collection = 'os_invoices';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'billing'
WHERE collection = 'os_payments';

UPDATE directus_collections SET
  sort = 30,
  "group" = 'billing'
WHERE collection = 'os_expenses';

UPDATE directus_collections SET
  sort = 40,
  "group" = 'billing'
WHERE collection = 'os_items';

-- Billing Settings
UPDATE directus_collections SET
  sort = 50,
  "group" = 'billing'
WHERE collection = 'os_tax_rates';

UPDATE directus_collections SET
  sort = 60,
  "group" = 'billing'
WHERE collection = 'os_payment_terms';

-- ============================================
-- Proposals Group
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'proposals'
WHERE collection = 'os_proposals';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'proposals'
WHERE collection = 'os_proposal_approvals';

-- ============================================
-- Help Center Group
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'help'
WHERE collection = 'help_collections';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'help'
WHERE collection = 'help_articles';

UPDATE directus_collections SET
  sort = 30,
  "group" = 'help'
WHERE collection = 'help_feedback';

UPDATE directus_collections SET
  sort = 40,
  "group" = 'help'
WHERE collection = 'inbox';

-- ============================================
-- Content Blocks Group
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'content_blocks'
WHERE collection = 'block_hero';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'content_blocks'
WHERE collection = 'block_cta';

UPDATE directus_collections SET
  sort = 30,
  "group" = 'content_blocks'
WHERE collection = 'block_richtext';

UPDATE directus_collections SET
  sort = 40,
  "group" = 'content_blocks'
WHERE collection = 'block_faq';

UPDATE directus_collections SET
  sort = 50,
  "group" = 'content_blocks'
WHERE collection = 'block_gallery';

UPDATE directus_collections SET
  sort = 60,
  "group" = 'content_blocks'
WHERE collection = 'block_logocloud';

UPDATE directus_collections SET
  sort = 70,
  "group" = 'content_blocks'
WHERE collection = 'block_steps';

UPDATE directus_collections SET
  sort = 80,
  "group" = 'content_blocks'
WHERE collection = 'block_columns';

UPDATE directus_collections SET
  sort = 90,
  "group" = 'content_blocks'
WHERE collection = 'block_testimonials_slider';

UPDATE directus_collections SET
  sort = 100,
  "group" = 'content_blocks'
WHERE collection = 'block_quote';

UPDATE directus_collections SET
  sort = 110,
  "group" = 'content_blocks'
WHERE collection = 'block_video';

UPDATE directus_collections SET
  sort = 120,
  "group" = 'content_blocks'
WHERE collection = 'block_team';

UPDATE directus_collections SET
  sort = 130,
  "group" = 'content_blocks'
WHERE collection = 'block_form';

UPDATE directus_collections SET
  sort = 140,
  "group" = 'content_blocks'
WHERE collection = 'block_html';

UPDATE directus_collections SET
  sort = 150,
  "group" = 'content_blocks'
WHERE collection = 'block_divider';

-- ============================================
-- Miscellaneous Collections
-- ============================================

UPDATE directus_collections SET
  sort = 10,
  "group" = 'settings'
WHERE collection = 'os_email_templates';

UPDATE directus_collections SET
  sort = 20,
  "group" = 'settings'
WHERE collection = 'os_subscriptions';

-- ============================================
-- Collection Display Templates
-- ============================================
-- Update display templates for better UX

UPDATE directus_collections SET
  display_template = '{{name}} - {{organization.name}}'
WHERE collection = 'os_deals';

UPDATE directus_collections SET
  display_template = '{{invoice_number}} - {{organization.name}} - ${{total}}'
WHERE collection = 'os_invoices';

UPDATE directus_collections SET
  display_template = '{{name}} - {{activity_type}}'
WHERE collection = 'os_activities';

UPDATE directus_collections SET
  display_template = '{{name}} ({{status}})'
WHERE collection = 'os_proposals';

UPDATE directus_collections SET
  display_template = '{{name}} - {{project.name}}'
WHERE collection = 'os_tasks';

UPDATE directus_collections SET
  display_template = '{{name}} - ${{cost}}'
WHERE collection = 'os_expenses';

UPDATE directus_collections SET
  display_template = '${{amount}} - {{payment_date}}'
WHERE collection = 'os_payments';

-- ============================================
-- Collection Notes (Help Text)
-- ============================================

UPDATE directus_collections SET
  note = 'Sales pipeline stages (New, Qualified, Proposal, etc.)'
WHERE collection = 'os_deal_stages';

UPDATE directus_collections SET
  note = 'Sales opportunities and deals'
WHERE collection = 'os_deals';

UPDATE directus_collections SET
  note = 'CRM activities: calls, meetings, emails, tasks'
WHERE collection = 'os_activities';

UPDATE directus_collections SET
  note = 'Client service projects'
WHERE collection = 'os_projects';

UPDATE directus_collections SET
  note = 'Project tasks and to-dos'
WHERE collection = 'os_tasks';

UPDATE directus_collections SET
  note = 'Reusable project templates'
WHERE collection = 'os_project_templates';

UPDATE directus_collections SET
  note = 'Client invoices and billing'
WHERE collection = 'os_invoices';

UPDATE directus_collections SET
  note = 'Payment records and receipts'
WHERE collection = 'os_payments';

UPDATE directus_collections SET
  note = 'Billable expenses and receipts'
WHERE collection = 'os_expenses';

UPDATE directus_collections SET
  note = 'Reusable invoice items catalog'
WHERE collection = 'os_items';

UPDATE directus_collections SET
  note = 'Tax rates for invoicing'
WHERE collection = 'os_tax_rates';

UPDATE directus_collections SET
  note = 'Payment terms (Net 30, etc.)'
WHERE collection = 'os_payment_terms';

UPDATE directus_collections SET
  note = 'Client proposals and quotes'
WHERE collection = 'os_proposals';

UPDATE directus_collections SET
  note = 'E-signature approvals for proposals'
WHERE collection = 'os_proposal_approvals';

UPDATE directus_collections SET
  note = 'Email templates for automation'
WHERE collection = 'os_email_templates';

UPDATE directus_collections SET
  note = 'Subscription tracking'
WHERE collection = 'os_subscriptions';

UPDATE directus_collections SET
  note = 'Help center categories'
WHERE collection = 'help_collections';

UPDATE directus_collections SET
  note = 'Knowledge base articles'
WHERE collection = 'help_articles';

UPDATE directus_collections SET
  note = 'Article ratings and feedback'
WHERE collection = 'help_feedback';

UPDATE directus_collections SET
  note = 'Form submissions inbox'
WHERE collection = 'inbox';

-- ============================================
-- Archive Configuration
-- ============================================
-- Set archive fields for collections that support archiving

UPDATE directus_collections SET
  archive_field = 'status',
  archive_value = 'archived',
  unarchive_value = 'active'
WHERE collection IN (
  'os_items',
  'os_tax_rates',
  'os_email_templates',
  'help_articles'
);

UPDATE directus_collections SET
  archive_field = 'status',
  archive_value = 'cancelled',
  unarchive_value = 'active'
WHERE collection IN (
  'os_projects',
  'os_deals'
);

UPDATE directus_collections SET
  archive_field = 'status',
  archive_value = 'archived',
  unarchive_value = 'unread'
WHERE collection = 'inbox';

-- ============================================
-- Singleton Flag (if any collections are singletons)
-- ============================================
-- None of the AgencyOS collections are singletons

-- ============================================
-- Collection Access & Permissions Notes
-- ============================================
-- After migration, configure collection permissions via Directus UI:
-- Settings > Roles & Permissions
--
-- Recommended permission groups:
-- 1. Admin - Full access to all collections
-- 2. Team Member - Read/write access to projects, tasks, activities
-- 3. Client - Read-only access to portal collections (os_projects, os_tasks, os_invoices, os_proposals where is_visible_to_client = true)
-- 4. Accountant - Full access to billing collections, read-only to others

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 079: AgencyOS Collection Metadata completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Collections organized into groups:';
  RAISE NOTICE '   - CRM: organizations, contacts, deals, activities (5 collections)';
  RAISE NOTICE '   - Projects: projects, tasks, templates (3 collections)';
  RAISE NOTICE '   - Billing: invoices, payments, expenses, items, taxes, terms (6 collections)';
  RAISE NOTICE '   - Proposals: proposals, approvals (2 collections)';
  RAISE NOTICE '   - Help: collections, articles, feedback, inbox (4 collections)';
  RAISE NOTICE '   - Content Blocks: 15 block types';
  RAISE NOTICE '   - Settings: email templates, subscriptions (2 collections)';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 UI configured with icons, colors, and display templates';
  RAISE NOTICE '📋 Archive fields configured for status-based collections';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next steps:';
  RAISE NOTICE '   1. Configure collection permissions via Directus UI';
  RAISE NOTICE '   2. Set up user roles (Admin, Team Member, Client, Accountant)';
  RAISE NOTICE '   3. Test all collections in Directus Admin panel';
  RAISE NOTICE '   4. Import AgencyOS dashboard panels (optional)';
END $$;
