-- Fix collection groups - rename conflicting groups
-- Some group names conflict with existing collections

-- Delete old conflicting group attempts
DELETE FROM directus_collections WHERE collection IN ('projects', 'proposals', 'settings') AND hidden = true;

-- Create properly named groups (no conflicts)
INSERT INTO directus_collections (collection, icon, note, hidden, collapse) VALUES
('agency_crm', 'business', 'CRM & Sales', true, 'open'),
('agency_projects', 'folder', 'Project Management', true, 'open'),
('agency_billing', 'payments', 'Billing & Invoicing', true, 'open'),
('agency_proposals', 'description', 'Proposals & Quotes', true, 'open'),
('agency_help', 'help_outline', 'Help & Support', true, 'open'),
('agency_blocks', 'view_module', 'Content Blocks', true, 'open'),
('agency_settings', 'tune', 'Agency Settings', true, 'open')
ON CONFLICT (collection) DO NOTHING;

-- Update collections to use renamed groups
UPDATE directus_collections SET "group" = 'agency_crm' WHERE collection IN ('organizations', 'contacts', 'os_deal_stages', 'os_deals', 'os_activities');

UPDATE directus_collections SET "group" = 'agency_projects' WHERE collection IN ('os_projects', 'os_tasks', 'os_project_templates');

UPDATE directus_collections SET "group" = 'agency_billing' WHERE collection IN ('os_invoices', 'os_payments', 'os_expenses', 'os_items', 'os_tax_rates', 'os_payment_terms');

UPDATE directus_collections SET "group" = 'agency_proposals' WHERE collection IN ('os_proposals', 'os_proposal_approvals');

UPDATE directus_collections SET "group" = 'agency_help' WHERE collection IN ('help_collections', 'help_articles', 'help_feedback', 'inbox');

UPDATE directus_collections SET "group" = 'agency_blocks' WHERE collection LIKE 'block_%';

UPDATE directus_collections SET "group" = 'agency_settings' WHERE collection IN ('os_email_templates', 'os_subscriptions');

-- Remove old groups that caused conflicts
DELETE FROM directus_collections WHERE collection IN ('crm', 'billing', 'help', 'content_blocks') AND hidden = true;

DO $$
BEGIN
  RAISE NOTICE '✅ Collection groups fixed with new names:';
  RAISE NOTICE '   - agency_crm (CRM & Sales)';
  RAISE NOTICE '   - agency_projects (Project Management)';
  RAISE NOTICE '   - agency_billing (Billing & Invoicing)';
  RAISE NOTICE '   - agency_proposals (Proposals & Quotes)';
  RAISE NOTICE '   - agency_help (Help & Support)';
  RAISE NOTICE '   - agency_blocks (Content Blocks)';
  RAISE NOTICE '   - agency_settings (Agency Settings)';
END $$;
