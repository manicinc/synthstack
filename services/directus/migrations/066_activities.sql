-- Migration: 066_activities.sql
-- Description: CRM activities for tracking calls, meetings, emails, and tasks
-- Dependencies: 028_organizations_contacts.sql, 029_deals_pipeline.sql

-- =============================================================================
-- ACTIVITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Activity Type
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'meeting', 'email', 'task', 'note', 'follow_up')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),

  -- Activity Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  activity_notes TEXT, -- Notes about the activity outcome

  -- Timing
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  due_date DATE,
  duration_minutes INTEGER,
  all_day BOOLEAN DEFAULT false,

  -- For calls/meetings
  location VARCHAR(500),
  meeting_url VARCHAR(500), -- Zoom, Meet, Teams link
  phone_number VARCHAR(50),

  -- For emails
  email_subject VARCHAR(500),
  email_body TEXT,

  -- Outcome tracking
  outcome VARCHAR(50), -- 'positive', 'neutral', 'negative', 'no_answer', etc.
  outcome_notes TEXT,

  -- Relationships
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Assignment
  assigned_to UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Reminders
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_organization ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned ON activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_reminder ON activities(reminder_at) WHERE reminder_sent = FALSE;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_activities_timestamp ON activities;
CREATE TRIGGER update_activities_timestamp
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- ACTIVITY CONTACTS (participants)
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Participation role
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('organizer', 'participant', 'optional', 'cc')),

  -- Response status (for meetings)
  response_status VARCHAR(50) DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),

  -- Attendance (after meeting)
  attended BOOLEAN,

  UNIQUE(activity_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity ON activity_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_contact ON activity_contacts(contact_id);

-- =============================================================================
-- ACTIVITY ATTACHMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES directus_files(id) ON DELETE CASCADE,

  label VARCHAR(255),
  sort INTEGER DEFAULT 0,

  date_created TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(activity_id, file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity ON activity_attachments(activity_id);

-- =============================================================================
-- DEAL CONTACTS (link contacts to deals)
-- =============================================================================

CREATE TABLE IF NOT EXISTS deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role in the deal
  role VARCHAR(50) DEFAULT 'stakeholder' CHECK (role IN ('decision_maker', 'influencer', 'stakeholder', 'champion', 'blocker')),
  is_primary BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  sort INTEGER DEFAULT 0,

  UNIQUE(deal_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal ON deal_contacts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact ON deal_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_primary ON deal_contacts(is_primary) WHERE is_primary = TRUE;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES
  ('activities', 'event', 'CRM activities: calls, meetings, emails, tasks', '{{name}}', 'sort', 'status', 'cancelled', 'scheduled', 60),
  ('activity_contacts', 'people', 'Contacts participating in activities', NULL, NULL, NULL, NULL, NULL, 61),
  ('activity_attachments', 'attach_file', 'Files attached to activities', NULL, 'sort', NULL, NULL, NULL, 62),
  ('deal_contacts', 'people', 'Contacts associated with deals', '{{contact_id.first_name}} {{contact_id.last_name}}', 'sort', NULL, NULL, NULL, 63)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Activities Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('activities', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('activities', 'activity_type', NULL, 'select-dropdown', '{"choices": [{"text": "Call", "value": "call"}, {"text": "Meeting", "value": "meeting"}, {"text": "Email", "value": "email"}, {"text": "Task", "value": "task"}, {"text": "Note", "value": "note"}, {"text": "Follow Up", "value": "follow_up"}]}', 'labels', '{"choices": [{"text": "Call", "value": "call", "icon": "call", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Meeting", "value": "meeting", "icon": "event", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Email", "value": "email", "icon": "email", "foreground": "#FFFFFF", "background": "#8B5CF6"}, {"text": "Task", "value": "task", "icon": "task", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Note", "value": "note", "icon": "note", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Follow Up", "value": "follow_up", "icon": "redo", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 2, 'half', NULL, TRUE),
  ('activities', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Scheduled", "value": "scheduled"}, {"text": "In Progress", "value": "in_progress"}, {"text": "Completed", "value": "completed"}, {"text": "Cancelled", "value": "cancelled"}, {"text": "No Show", "value": "no_show"}]}', 'labels', '{"choices": [{"text": "Scheduled", "value": "scheduled", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "In Progress", "value": "in_progress", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Completed", "value": "completed", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Cancelled", "value": "cancelled", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "No Show", "value": "no_show", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('activities', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 4, 'full', 'Activity name', TRUE),
  ('activities', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 5, 'full', 'Description', FALSE),
  ('activities', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('activities', 'deal_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 7, 'half', 'Related deal', FALSE),
  ('activities', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 8, 'half', 'Related project', FALSE),
  ('activities', 'assigned_to', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('activities', 'start_time', NULL, 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('activities', 'end_time', NULL, 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 11, 'half', NULL, FALSE),
  ('activities', 'due_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"relative": false}', FALSE, FALSE, 12, 'half', 'Due date (for tasks)', FALSE),
  ('activities', 'all_day', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 13, 'half', NULL, FALSE),
  ('activities', 'priority', NULL, 'select-dropdown', '{"choices": [{"text": "Low", "value": "low"}, {"text": "Normal", "value": "normal"}, {"text": "High", "value": "high"}, {"text": "Urgent", "value": "urgent"}]}', 'labels', '{"choices": [{"text": "Low", "value": "low", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Normal", "value": "normal", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "High", "value": "high", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Urgent", "value": "urgent", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 14, 'half', NULL, FALSE),
  ('activities', 'location', NULL, 'input', '{"iconRight": "place"}', NULL, NULL, FALSE, FALSE, 15, 'half', NULL, FALSE),
  ('activities', 'meeting_url', NULL, 'input', '{"iconRight": "videocam"}', NULL, NULL, FALSE, FALSE, 16, 'half', 'Video meeting link', FALSE),
  ('activities', 'phone_number', NULL, 'input', '{"iconRight": "phone"}', NULL, NULL, FALSE, FALSE, 17, 'half', NULL, FALSE),
  ('activities', 'activity_notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 18, 'full', 'Notes from activity', FALSE),
  ('activities', 'outcome', NULL, 'select-dropdown', '{"choices": [{"text": "Positive", "value": "positive"}, {"text": "Neutral", "value": "neutral"}, {"text": "Negative", "value": "negative"}, {"text": "No Answer", "value": "no_answer"}, {"text": "Voicemail", "value": "voicemail"}]}', 'labels', '{"choices": [{"text": "Positive", "value": "positive", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Neutral", "value": "neutral", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Negative", "value": "negative", "foreground": "#FFFFFF", "background": "#EF4444"}, {"text": "No Answer", "value": "no_answer", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Voicemail", "value": "voicemail", "foreground": "#FFFFFF", "background": "#3B82F6"}]}', FALSE, FALSE, 19, 'half', 'Activity outcome', FALSE),
  ('activities', 'reminder_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', FALSE, FALSE, 20, 'half', 'Send reminder at', FALSE),
  ('activities', 'completed_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 21, 'half', NULL, FALSE),
  ('activities', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 22, 'half', NULL, FALSE),
  ('activities', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 23, 'half', NULL, FALSE),
  ('activities', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 24, 'half', NULL, FALSE),
  ('activities', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 25, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Deal Contacts Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('deal_contacts', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('deal_contacts', 'deal_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'half', NULL, TRUE),
  ('deal_contacts', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', NULL, FALSE, FALSE, 3, 'half', NULL, TRUE),
  ('deal_contacts', 'role', NULL, 'select-dropdown', '{"choices": [{"text": "Decision Maker", "value": "decision_maker"}, {"text": "Influencer", "value": "influencer"}, {"text": "Stakeholder", "value": "stakeholder"}, {"text": "Champion", "value": "champion"}, {"text": "Blocker", "value": "blocker"}]}', 'labels', '{"choices": [{"text": "Decision Maker", "value": "decision_maker", "foreground": "#FFFFFF", "background": "#6366F1"}, {"text": "Influencer", "value": "influencer", "foreground": "#FFFFFF", "background": "#8B5CF6"}, {"text": "Stakeholder", "value": "stakeholder", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Champion", "value": "champion", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Blocker", "value": "blocker", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 4, 'half', 'Role in deal', FALSE),
  ('deal_contacts', 'is_primary', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', 'Primary contact', FALSE),
  ('deal_contacts', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 6, 'full', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Activities -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activities', 'organization_id', 'organizations', 'activities', 'nullify')
ON CONFLICT DO NOTHING;

-- Activities -> Deal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activities', 'deal_id', 'deals', 'activities', 'nullify')
ON CONFLICT DO NOTHING;

-- Activities -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activities', 'project_id', 'projects', 'activities', 'nullify')
ON CONFLICT DO NOTHING;

-- Activities -> Assigned User
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activities', 'assigned_to', 'directus_users', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Activity Contacts -> Activity
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activity_contacts', 'activity_id', 'activities', 'participants', 'nullify')
ON CONFLICT DO NOTHING;

-- Activity Contacts -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activity_contacts', 'contact_id', 'contacts', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Activity Attachments -> Activity
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activity_attachments', 'activity_id', 'activities', 'attachments', 'nullify')
ON CONFLICT DO NOTHING;

-- Activity Attachments -> Files
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('activity_attachments', 'file_id', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Deal Contacts -> Deal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('deal_contacts', 'deal_id', 'deals', 'deal_contacts', 'nullify')
ON CONFLICT DO NOTHING;

-- Deal Contacts -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('deal_contacts', 'contact_id', 'contacts', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- AUTO-COMPLETE ACTIVITY TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_complete_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
    NEW.completed_by = NEW.user_updated;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_complete_activity ON activities;
CREATE TRIGGER trigger_auto_complete_activity
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_activity();

-- =============================================================================
-- FEATURE FLAGS
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('crm_activities', 'CRM Activities', 'Track calls, meetings, and emails', 'crm', true, false, 'subscriber', 500),
  ('crm_activity_reminders', 'Activity Reminders', 'Send reminders for scheduled activities', 'crm', true, false, 'subscriber', 501)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE activities IS 'CRM activities: calls, meetings, emails, tasks, notes';
COMMENT ON TABLE activity_contacts IS 'Contacts participating in activities';
COMMENT ON TABLE activity_attachments IS 'Files attached to activities';
COMMENT ON TABLE deal_contacts IS 'Contacts associated with deals with role tracking';
