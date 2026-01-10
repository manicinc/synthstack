-- ============================================
-- Migration 075: AgencyOS Proposals & Activities
-- ============================================
-- Creates deals, proposals, activities, and subscriptions
-- Includes e-signature workflow and CRM activity tracking
-- ============================================

-- OS Deals Table (Sales Pipeline)
CREATE TABLE IF NOT EXISTS os_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  owner UUID REFERENCES directus_users(id),
  organization UUID REFERENCES organizations(id) ON DELETE CASCADE,
  deal_stage UUID REFERENCES os_deal_stages(id),
  close_date DATE,
  next_contact_date DATE,
  deal_value NUMERIC(10,2),
  deal_notes TEXT,
  comments TEXT,
  activity TEXT
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_deals', 'handshake', 'Sales pipeline deals', '#6366F1', 'sort', 'status', 'cancelled', 'active', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_deals', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_deals', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Won","value":"won"},{"text":"Lost","value":"lost"},{"text":"Cancelled","value":"cancelled"}]}'::jsonb, 'badge', NULL),
('os_deals', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_deals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_deals', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_deals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_deals', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_deals', 'name', NULL, 'input', '{"placeholder":"Deal name"}'::jsonb, NULL, NULL),
('os_deals', 'owner', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Deal owner'),
('os_deals', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Client organization'),
('os_deals', 'deal_stage', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Pipeline stage'),
('os_deals', 'close_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, 'Expected close date'),
('os_deals', 'next_contact_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, 'Next follow-up'),
('os_deals', 'deal_value', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Deal value'),
('os_deals', 'deal_notes', NULL, 'input-rich-text-md', NULL, NULL, 'Internal notes'),
('os_deals', 'comments', NULL, 'input-multiline', NULL, NULL, 'Comments'),
('os_deals', 'activity', NULL, 'input-multiline', NULL, NULL, 'Recent activity'),
('os_deals', 'contacts', 'o2m', 'list-o2m', '{"template":"{{contacts_id.first_name}} {{contacts_id.last_name}}"}'::jsonb, NULL, 'Deal contacts'),
('os_deals', 'proposals', 'o2m', 'list-o2m', '{"template":"{{name}}"}'::jsonb, NULL, 'Related proposals'),
('os_deals', 'activities', 'o2m', 'list-o2m', '{"template":"{{name}}"}'::jsonb, NULL, 'Deal activities')
ON CONFLICT DO NOTHING;

-- OS Deal Contacts Junction Table
CREATE TABLE IF NOT EXISTS os_deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_deals_id UUID REFERENCES os_deals(id) ON DELETE CASCADE,
  contacts_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  primary_contact BOOLEAN DEFAULT false,
  sort INTEGER DEFAULT 0,

  UNIQUE (os_deals_id, contacts_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_deal_contacts', 'link', 'Links contacts to deals', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_deal_contacts', 'id', 'uuid', 'input', NULL),
('os_deal_contacts', 'os_deals_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_deal_contacts', 'contacts_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb),
('os_deal_contacts', 'primary_contact', 'cast-boolean', 'boolean', NULL),
('os_deal_contacts', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('os_deal_contacts', 'os_deals_id', 'os_deals', 'contacts', 'contacts_id'),
('os_deal_contacts', 'contacts_id', 'contacts', NULL, 'os_deals_id')
ON CONFLICT DO NOTHING;

-- OS Proposals Table
CREATE TABLE IF NOT EXISTS os_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  organization UUID REFERENCES organizations(id) ON DELETE CASCADE,
  deal UUID REFERENCES os_deals(id) ON DELETE SET NULL,
  owner UUID REFERENCES directus_users(id),
  activity TEXT
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_proposals', 'description', 'Client proposals', '#8B5CF6', 'sort', 'status', 'expired', 'draft', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_proposals', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_proposals', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Sent","value":"sent"},{"text":"Viewed","value":"viewed"},{"text":"Approved","value":"approved"},{"text":"Declined","value":"declined"},{"text":"Expired","value":"expired"}]}'::jsonb, 'badge', NULL),
('os_proposals', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_proposals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_proposals', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_proposals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_proposals', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_proposals', 'name', NULL, 'input', '{"placeholder":"Proposal name"}'::jsonb, NULL, NULL),
('os_proposals', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Client organization'),
('os_proposals', 'deal', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Related deal'),
('os_proposals', 'owner', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Proposal owner'),
('os_proposals', 'activity', NULL, 'input-multiline', NULL, NULL, 'Activity log'),
('os_proposals', 'contacts', 'o2m', 'list-o2m', '{"template":"{{contacts_id.first_name}} {{contacts_id.last_name}}"}'::jsonb, NULL, 'Proposal contacts'),
('os_proposals', 'approvals', 'o2m', 'list-o2m', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'E-signature approvals'),
('os_proposals', 'blocks', 'o2m', 'list-o2m', '{"template":"{{collection}}"}'::jsonb, NULL, 'Content blocks')
ON CONFLICT DO NOTHING;

-- OS Proposal Contacts Junction Table
CREATE TABLE IF NOT EXISTS os_proposal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_proposals_id UUID REFERENCES os_proposals(id) ON DELETE CASCADE,
  contacts_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (os_proposals_id, contacts_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_proposal_contacts', 'link', 'Links contacts to proposals', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_proposal_contacts', 'id', 'uuid', 'input', NULL),
('os_proposal_contacts', 'os_proposals_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_proposal_contacts', 'contacts_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb),
('os_proposal_contacts', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('os_proposal_contacts', 'os_proposals_id', 'os_proposals', 'contacts', 'contacts_id'),
('os_proposal_contacts', 'contacts_id', 'contacts', NULL, 'os_proposals_id')
ON CONFLICT DO NOTHING;

-- OS Proposal Approvals Table (E-Signature Workflow)
CREATE TABLE IF NOT EXISTS os_proposal_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  proposal UUID REFERENCES os_proposals(id) ON DELETE CASCADE NOT NULL,
  contact UUID REFERENCES contacts(id),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  organization VARCHAR(255),

  signature_type VARCHAR(50), -- 'typed', 'drawn', 'uploaded'
  signature_text VARCHAR(255),
  signature_image UUID REFERENCES directus_files(id),
  esignature_agreement BOOLEAN DEFAULT false,
  ip_address VARCHAR(100),
  metadata JSONB
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, display_template)
VALUES ('os_proposal_approvals', 'draw', 'E-signature approvals', '#10B981', 'sort', '{{first_name}} {{last_name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_proposal_approvals', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_proposal_approvals', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Approved","value":"approved"},{"text":"Declined","value":"declined"}]}'::jsonb, 'badge', NULL),
('os_proposal_approvals', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_proposal_approvals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_proposal_approvals', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_proposal_approvals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_proposal_approvals', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_proposal_approvals', 'proposal', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Parent proposal'),
('os_proposal_approvals', 'contact', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Linked contact'),
('os_proposal_approvals', 'first_name', NULL, 'input', '{"placeholder":"First name"}'::jsonb, NULL, NULL),
('os_proposal_approvals', 'last_name', NULL, 'input', '{"placeholder":"Last name"}'::jsonb, NULL, NULL),
('os_proposal_approvals', 'email', NULL, 'input', '{"placeholder":"email@example.com"}'::jsonb, NULL, NULL),
('os_proposal_approvals', 'organization', NULL, 'input', '{"placeholder":"Company name"}'::jsonb, NULL, NULL),
('os_proposal_approvals', 'signature_type', NULL, 'select-dropdown', '{"choices":[{"text":"Typed","value":"typed"},{"text":"Drawn","value":"drawn"},{"text":"Uploaded","value":"uploaded"}]}'::jsonb, NULL, 'How signature was created'),
('os_proposal_approvals', 'signature_text', NULL, 'input', '{"placeholder":"Typed signature"}'::jsonb, NULL, NULL),
('os_proposal_approvals', 'signature_image', 'file', 'file-image', NULL, NULL, 'Drawn or uploaded signature'),
('os_proposal_approvals', 'esignature_agreement', 'cast-boolean', 'boolean', NULL, NULL, 'Agreed to e-signature terms'),
('os_proposal_approvals', 'ip_address', NULL, 'input', '{"placeholder":"192.168.1.1"}'::jsonb, NULL, 'Signer IP address'),
('os_proposal_approvals', 'metadata', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Additional metadata')
ON CONFLICT DO NOTHING;

-- OS Proposal Blocks Table (Content Blocks)
CREATE TABLE IF NOT EXISTS os_proposal_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  os_proposals_id UUID REFERENCES os_proposals(id) ON DELETE CASCADE NOT NULL,
  collection VARCHAR(100), -- Polymorphic relation: which block collection
  item VARCHAR(100) -- Polymorphic relation: ID of block item
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_proposal_blocks', 'view_module', 'Proposal content blocks', true)
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_proposal_blocks', 'id', 'uuid', 'input', NULL),
('os_proposal_blocks', 'sort', NULL, 'input', NULL),
('os_proposal_blocks', 'user_created', 'user-created', 'select-dropdown-m2o', NULL),
('os_proposal_blocks', 'date_created', 'date-created', 'datetime', NULL),
('os_proposal_blocks', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL),
('os_proposal_blocks', 'date_updated', 'date-updated', 'datetime', NULL),
('os_proposal_blocks', 'os_proposals_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_proposal_blocks', 'collection', NULL, 'input', '{"placeholder":"block_richtext"}'::jsonb),
('os_proposal_blocks', 'item', NULL, 'input', '{"placeholder":"UUID"}'::jsonb)
ON CONFLICT DO NOTHING;

-- OS Activities Table (CRM Activity Tracking)
CREATE TABLE IF NOT EXISTS os_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  deal UUID REFERENCES os_deals(id) ON DELETE SET NULL,
  organization UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES directus_users(id),
  activity_type VARCHAR(100), -- 'call', 'meeting', 'email', 'task', 'note'
  name VARCHAR(255) NOT NULL,
  activity_notes TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  due_date DATE
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_activities', 'event', 'CRM activities', '#3B82F6', 'sort', 'status', 'cancelled', 'pending', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_activities', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_activities', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Completed","value":"completed"},{"text":"Cancelled","value":"cancelled"}]}'::jsonb, 'badge', NULL),
('os_activities', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_activities', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_activities', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_activities', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_activities', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_activities', 'deal', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Related deal'),
('os_activities', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Related organization'),
('os_activities', 'assigned_to', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Assigned to'),
('os_activities', 'activity_type', NULL, 'select-dropdown', '{"allowOther":true,"choices":[{"text":"Call","value":"call"},{"text":"Meeting","value":"meeting"},{"text":"Email","value":"email"},{"text":"Task","value":"task"},{"text":"Note","value":"note"}]}'::jsonb, NULL, 'Activity type'),
('os_activities', 'name', NULL, 'input', '{"placeholder":"Activity name"}'::jsonb, NULL, NULL),
('os_activities', 'activity_notes', NULL, 'input-rich-text-md', NULL, NULL, 'Activity notes'),
('os_activities', 'start_time', NULL, 'datetime', NULL, NULL, 'Start time'),
('os_activities', 'end_time', NULL, 'datetime', NULL, NULL, 'End time'),
('os_activities', 'due_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, 'Due date'),
('os_activities', 'contacts', 'o2m', 'list-o2m', '{"template":"{{contacts_id.first_name}} {{contacts_id.last_name}}"}'::jsonb, NULL, 'Related contacts')
ON CONFLICT DO NOTHING;

-- OS Activity Contacts Junction Table
CREATE TABLE IF NOT EXISTS os_activity_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_activities_id UUID REFERENCES os_activities(id) ON DELETE CASCADE,
  contacts_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  UNIQUE (os_activities_id, contacts_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_activity_contacts', 'link', 'Links contacts to activities', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_activity_contacts', 'id', 'uuid', 'input', NULL),
('os_activity_contacts', 'os_activities_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_activity_contacts', 'contacts_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('os_activity_contacts', 'os_activities_id', 'os_activities', 'contacts', 'contacts_id'),
('os_activity_contacts', 'contacts_id', 'contacts', NULL, 'os_activities_id')
ON CONFLICT DO NOTHING;

-- OS Subscriptions Table (Subscription Tracking)
CREATE TABLE IF NOT EXISTS os_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created TIMESTAMPTZ DEFAULT NOW(),
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, display_template)
VALUES ('os_subscriptions', 'subscriptions', 'Subscription tracking', '#EC4899', '{{status}} - {{quantity}} seats')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_subscriptions', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_subscriptions', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Trialing","value":"trialing"},{"text":"Past Due","value":"past_due"},{"text":"Canceled","value":"canceled"},{"text":"Unpaid","value":"unpaid"},{"text":"Incomplete","value":"incomplete"}]}'::jsonb, 'badge', NULL),
('os_subscriptions', 'quantity', NULL, 'input', '{"placeholder":"1","type":"number"}'::jsonb, NULL, 'Number of seats'),
('os_subscriptions', 'cancel_at_period_end', 'cast-boolean', 'boolean', NULL, NULL, 'Cancel at end of billing period'),
('os_subscriptions', 'created', NULL, 'datetime', NULL, NULL, 'Subscription created'),
('os_subscriptions', 'trial_start', NULL, 'datetime', NULL, NULL, 'Trial start date'),
('os_subscriptions', 'trial_end', NULL, 'datetime', NULL, NULL, 'Trial end date'),
('os_subscriptions', 'cancel_at', NULL, 'datetime', NULL, NULL, 'Scheduled cancellation'),
('os_subscriptions', 'canceled_at', NULL, 'datetime', NULL, NULL, 'Cancellation date'),
('os_subscriptions', 'ended_at', NULL, 'datetime', NULL, NULL, 'Subscription ended')
ON CONFLICT DO NOTHING;

-- Add relations for deals and proposals
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('os_proposals', 'deal', 'os_deals', 'proposals'),
('os_activities', 'deal', 'os_deals', 'activities'),
('os_proposal_approvals', 'proposal', 'os_proposals', 'approvals'),
('os_proposal_blocks', 'os_proposals_id', 'os_proposals', 'blocks')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_os_deals_organization ON os_deals(organization);
CREATE INDEX IF NOT EXISTS idx_os_deals_owner ON os_deals(owner);
CREATE INDEX IF NOT EXISTS idx_os_deals_deal_stage ON os_deals(deal_stage);
CREATE INDEX IF NOT EXISTS idx_os_deals_status ON os_deals(status);
CREATE INDEX IF NOT EXISTS idx_os_proposals_organization ON os_proposals(organization);
CREATE INDEX IF NOT EXISTS idx_os_proposals_deal ON os_proposals(deal);
CREATE INDEX IF NOT EXISTS idx_os_proposals_status ON os_proposals(status);
CREATE INDEX IF NOT EXISTS idx_os_activities_deal ON os_activities(deal);
CREATE INDEX IF NOT EXISTS idx_os_activities_organization ON os_activities(organization);
CREATE INDEX IF NOT EXISTS idx_os_activities_assigned_to ON os_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_os_activities_status ON os_activities(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 075: AgencyOS Proposals & Activities completed successfully';
  RAISE NOTICE '   Created: os_deals, os_deal_contacts';
  RAISE NOTICE '   Created: os_proposals, os_proposal_contacts, os_proposal_approvals, os_proposal_blocks';
  RAISE NOTICE '   Created: os_activities, os_activity_contacts, os_subscriptions';
END $$;
