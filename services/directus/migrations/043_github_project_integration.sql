-- GitHub Project Integration
-- Adds GitHub repository linking to projects with auto-sync capabilities

-- =============================================
-- Add GitHub fields to projects table
-- =============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS github_repo VARCHAR(255),  -- Full repo name: "owner/repo"
ADD COLUMN IF NOT EXISTS github_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS github_last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS github_default_branch VARCHAR(100) DEFAULT 'main',
ADD COLUMN IF NOT EXISTS github_sync_issues BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS github_sync_prs BOOLEAN DEFAULT true;

-- Create index for GitHub repo lookups
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON projects(github_repo) WHERE github_repo IS NOT NULL;

-- =============================================
-- GitHub Issues Cache Table
-- =============================================
CREATE TABLE IF NOT EXISTS project_github_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- GitHub issue data
  github_issue_id INTEGER NOT NULL,  -- GitHub's issue number
  github_issue_node_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  body TEXT,
  state VARCHAR(20) NOT NULL,  -- 'open', 'closed'

  -- User data
  created_by_github_user VARCHAR(100),
  created_by_github_avatar VARCHAR(500),
  assigned_to_github_user VARCHAR(100),

  -- Labels and metadata
  labels JSONB DEFAULT '[]'::jsonb,
  milestone VARCHAR(255),

  -- URLs
  html_url VARCHAR(500),
  api_url VARCHAR(500),

  -- Counts
  comments_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,

  -- Timestamps from GitHub
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  github_closed_at TIMESTAMPTZ,

  -- Local tracking
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per project
  UNIQUE(project_id, github_issue_id)
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field)
VALUES (
  'project_github_issues',
  'bug_report',
  'Cached GitHub issues linked to projects',
  '#{{github_issue_id}} - {{title}}',
  false,
  false,
  'github_issue_id'
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- GitHub Pull Requests Cache Table
-- =============================================
CREATE TABLE IF NOT EXISTS project_github_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- GitHub PR data
  github_pr_id INTEGER NOT NULL,  -- GitHub's PR number
  github_pr_node_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  body TEXT,
  state VARCHAR(20) NOT NULL,  -- 'open', 'closed', 'merged'
  draft BOOLEAN DEFAULT false,

  -- Branch info
  head_branch VARCHAR(255),
  base_branch VARCHAR(255),
  head_sha VARCHAR(40),

  -- User data
  created_by_github_user VARCHAR(100),
  created_by_github_avatar VARCHAR(500),

  -- Labels and metadata
  labels JSONB DEFAULT '[]'::jsonb,
  milestone VARCHAR(255),
  reviewers JSONB DEFAULT '[]'::jsonb,

  -- URLs
  html_url VARCHAR(500),
  api_url VARCHAR(500),
  diff_url VARCHAR(500),

  -- Stats
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  review_comments_count INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0,

  -- Review status
  mergeable BOOLEAN,
  mergeable_state VARCHAR(50),
  merged BOOLEAN DEFAULT false,
  merged_by_github_user VARCHAR(100),

  -- Timestamps from GitHub
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  github_closed_at TIMESTAMPTZ,
  github_merged_at TIMESTAMPTZ,

  -- Local tracking
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per project
  UNIQUE(project_id, github_pr_id)
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field)
VALUES (
  'project_github_prs',
  'merge_type',
  'Cached GitHub pull requests linked to projects',
  '#{{github_pr_id}} - {{title}}',
  false,
  false,
  'github_pr_id'
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_project_github_issues_project ON project_github_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_github_issues_state ON project_github_issues(state);
CREATE INDEX IF NOT EXISTS idx_project_github_issues_synced ON project_github_issues(synced_at);

CREATE INDEX IF NOT EXISTS idx_project_github_prs_project ON project_github_prs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_github_prs_state ON project_github_prs(state);
CREATE INDEX IF NOT EXISTS idx_project_github_prs_synced ON project_github_prs(synced_at);
CREATE INDEX IF NOT EXISTS idx_project_github_prs_merged ON project_github_prs(merged);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_github_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_github_issues_updated_at
  BEFORE UPDATE ON project_github_issues
  FOR EACH ROW EXECUTE FUNCTION update_github_cache_updated_at();

CREATE TRIGGER project_github_prs_updated_at
  BEFORE UPDATE ON project_github_prs
  FOR EACH ROW EXECUTE FUNCTION update_github_cache_updated_at();

-- =============================================
-- Permissions
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_github_issues TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_github_prs TO synthstack;

-- =============================================
-- Comments
-- =============================================
COMMENT ON COLUMN projects.github_repo IS 'GitHub repository in owner/repo format';
COMMENT ON COLUMN projects.github_sync_enabled IS 'Whether to automatically sync GitHub issues and PRs';
COMMENT ON COLUMN projects.github_last_synced_at IS 'Timestamp of last successful GitHub sync';
COMMENT ON TABLE project_github_issues IS 'Cached GitHub issues for projects with auto-sync';
COMMENT ON TABLE project_github_prs IS 'Cached GitHub pull requests for projects with auto-sync';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'GitHub project integration created successfully!';
  RAISE NOTICE 'Projects can now be linked to GitHub repositories';
  RAISE NOTICE 'Tables created: project_github_issues, project_github_prs';
  RAISE NOTICE 'Use POST /api/v1/projects/:id/github to link a repository';
END $$;
