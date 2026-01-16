-- =========================================
-- Migration 056: Todo Status Expansion & GitHub Issue Linking
-- =========================================
-- Expands todo statuses to match GitHub issue workflows
-- Adds ability to link todos to GitHub issues and PRs
-- =========================================

-- =========================================
-- 1. Expand Todo Status Options
-- =========================================
-- Current: pending, in_progress, completed
-- Adding: blocked, cancelled, review (to match GitHub issue workflows)

-- First, drop the existing constraint
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_status_check;

-- Add the new constraint with expanded statuses
ALTER TABLE todos ADD CONSTRAINT todos_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled', 'review'));

-- =========================================
-- 2. Add GitHub Issue/PR Linking Fields
-- =========================================
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
ADD COLUMN IF NOT EXISTS github_pr_number INTEGER,
ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
ADD COLUMN IF NOT EXISTS github_pr_url TEXT,
ADD COLUMN IF NOT EXISTS github_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS github_sync_direction VARCHAR(20) DEFAULT 'manual'
  CHECK (github_sync_direction IN ('manual', 'from_github', 'to_github', 'bidirectional'));

-- Create indexes for GitHub lookups
CREATE INDEX IF NOT EXISTS idx_todos_github_issue ON todos(github_issue_number) WHERE github_issue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_github_pr ON todos(github_pr_number) WHERE github_pr_number IS NOT NULL;

-- =========================================
-- 3. Update Directus Fields Configuration
-- =========================================

-- Update the status field with new options and icons
UPDATE directus_fields
SET options = '{
  "choices": [
    {"text": "To Do", "value": "pending", "icon": "radio_button_unchecked", "color": "grey"},
    {"text": "In Progress", "value": "in_progress", "icon": "pending", "color": "blue"},
    {"text": "In Review", "value": "review", "icon": "rate_review", "color": "purple"},
    {"text": "Blocked", "value": "blocked", "icon": "block", "color": "red"},
    {"text": "Completed", "value": "completed", "icon": "check_circle", "color": "green"},
    {"text": "Cancelled", "value": "cancelled", "icon": "cancel", "color": "grey"}
  ]
}'::jsonb
WHERE collection = 'todos' AND field = 'status';

-- Add github_issue_number field configuration
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_issue_number',
  NULL,
  'input',
  '{"placeholder": "e.g., 42", "iconLeft": "bug_report"}'::jsonb,
  'formatted-value',
  '{"prefix": "#"}'::jsonb,
  false,
  false,
  25,
  'half',
  NULL,
  'Link to a GitHub issue number',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_issue_number'
);

-- Add github_pr_number field configuration
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_pr_number',
  NULL,
  'input',
  '{"placeholder": "e.g., 123", "iconLeft": "merge_type"}'::jsonb,
  'formatted-value',
  '{"prefix": "PR #"}'::jsonb,
  false,
  false,
  26,
  'half',
  NULL,
  'Link to a GitHub pull request number',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_pr_number'
);

-- Add github_issue_url field (hidden, auto-generated)
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_issue_url',
  NULL,
  'input',
  '{"iconLeft": "link"}'::jsonb,
  'formatted-value',
  NULL,
  true,
  true,
  27,
  'full',
  NULL,
  'Auto-generated URL to the GitHub issue',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_issue_url'
);

-- Add github_pr_url field (hidden, auto-generated)
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_pr_url',
  NULL,
  'input',
  '{"iconLeft": "link"}'::jsonb,
  'formatted-value',
  NULL,
  true,
  true,
  28,
  'full',
  NULL,
  'Auto-generated URL to the GitHub PR',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_pr_url'
);

-- Add github_synced_at field (hidden)
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_synced_at',
  'date-created',
  'datetime',
  NULL,
  'datetime',
  '{"relative": true}'::jsonb,
  true,
  true,
  29,
  'half',
  NULL,
  'Last synced with GitHub',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_synced_at'
);

-- Add github_sync_direction field
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  'todos',
  'github_sync_direction',
  NULL,
  'select-dropdown',
  '{
    "choices": [
      {"text": "Manual Link", "value": "manual"},
      {"text": "Imported from GitHub", "value": "from_github"},
      {"text": "Pushed to GitHub", "value": "to_github"},
      {"text": "Bidirectional Sync", "value": "bidirectional"}
    ]
  }'::jsonb,
  'labels',
  '{
    "choices": [
      {"text": "Manual", "value": "manual", "background": "grey"},
      {"text": "From GitHub", "value": "from_github", "background": "blue"},
      {"text": "To GitHub", "value": "to_github", "background": "green"},
      {"text": "Bidirectional", "value": "bidirectional", "background": "purple"}
    ]
  }'::jsonb,
  false,
  true,
  30,
  'half',
  NULL,
  'How this todo syncs with GitHub',
  NULL,
  false,
  NULL,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'todos' AND field = 'github_sync_direction'
);

-- =========================================
-- 4. Update Example Project Todos with Sample GitHub Links
-- =========================================
-- Link some example todos to fictional GitHub issues for demo purposes
UPDATE todos
SET github_issue_number = 1,
    github_issue_url = 'https://github.com/synthstack/platform/issues/1',
    github_sync_direction = 'manual'
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND title LIKE '%CI/CD%'
  AND github_issue_number IS NULL;

UPDATE todos
SET github_issue_number = 2,
    github_issue_url = 'https://github.com/synthstack/platform/issues/2',
    github_sync_direction = 'manual'
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND title LIKE '%API%'
  AND github_issue_number IS NULL;

UPDATE todos
SET github_issue_number = 5,
    github_pr_number = 12,
    github_issue_url = 'https://github.com/synthstack/platform/issues/5',
    github_pr_url = 'https://github.com/synthstack/platform/pull/12',
    github_sync_direction = 'manual'
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND title LIKE '%authentication%'
  AND github_issue_number IS NULL;

-- Set some todos to blocked/review status for demo
UPDATE todos
SET status = 'blocked'
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND title LIKE '%security%'
  AND status = 'pending';

UPDATE todos
SET status = 'review'
WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND title LIKE '%testing%'
  AND status = 'in_progress';
