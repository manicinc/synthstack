-- Fix collection groups for Directus 11
-- Groups must exist as collection entries before they can be referenced

-- Create collection groups (groups are collections with group=NULL)
INSERT INTO directus_collections (collection, icon, note, hidden, collapse) VALUES
('crm', 'business', 'CRM Collections', true, 'open'),
('projects', 'folder', 'Project Management', true, 'open'),
('billing', 'payments', 'Billing & Invoicing', true, 'open'),
('proposals', 'description', 'Proposals & Quotes', true, 'open'),
('help', 'help', 'Help Center', true, 'open'),
('content_blocks', 'view_module', 'Content Blocks', true, 'open'),
('settings', 'settings', 'Settings', true, 'open')
ON CONFLICT (collection) DO NOTHING;

-- Now update collections to use these groups (from migration 079)
UPDATE directus_collections SET "group" = 'crm' WHERE collection = 'organizations';
UPDATE directus_collections SET "group" = 'crm' WHERE collection = 'contacts';
UPDATE directus_collections SET "group" = 'crm' WHERE collection = 'os_deal_stages';
UPDATE directus_collections SET "group" = 'crm' WHERE collection = 'os_deals';
UPDATE directus_collections SET "group" = 'crm' WHERE collection = 'os_activities';

UPDATE directus_collections SET "group" = 'projects' WHERE collection = 'os_projects';
UPDATE directus_collections SET "group" = 'projects' WHERE collection = 'os_tasks';
UPDATE directus_collections SET "group" = 'projects' WHERE collection = 'os_project_templates';

UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_invoices';
UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_payments';
UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_expenses';
UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_items';
UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_tax_rates';
UPDATE directus_collections SET "group" = 'billing' WHERE collection = 'os_payment_terms';

UPDATE directus_collections SET "group" = 'proposals' WHERE collection = 'os_proposals';
UPDATE directus_collections SET "group" = 'proposals' WHERE collection = 'os_proposal_approvals';

UPDATE directus_collections SET "group" = 'help' WHERE collection = 'help_collections';
UPDATE directus_collections SET "group" = 'help' WHERE collection = 'help_articles';
UPDATE directus_collections SET "group" = 'help' WHERE collection = 'help_feedback';
UPDATE directus_collections SET "group" = 'help' WHERE collection = 'inbox';

UPDATE directus_collections SET "group" = 'content_blocks' WHERE collection LIKE 'block_%';

UPDATE directus_collections SET "group" = 'settings' WHERE collection = 'os_email_templates';
UPDATE directus_collections SET "group" = 'settings' WHERE collection = 'os_subscriptions';
