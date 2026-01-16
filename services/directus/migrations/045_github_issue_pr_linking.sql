-- GitHub Issue-PR Smart Linking
-- Automatically links PRs to issues based on:
-- 1. Branch name patterns (feature/123-description → #123)
-- 2. PR title/body references (#123, fixes #123, closes #123)
-- Like JIRA's smart commits/branches

-- =============================================
-- Add linking fields to PRs table
-- =============================================
ALTER TABLE project_github_prs
ADD COLUMN IF NOT EXISTS linked_issue_numbers INTEGER[] DEFAULT '{}',  -- Array of linked issue numbers
ADD COLUMN IF NOT EXISTS link_sources JSONB DEFAULT '[]'::jsonb;  -- How links were detected

-- Example link_sources:
-- [{"issue": 123, "source": "branch", "pattern": "feature/123-login"},
--  {"issue": 456, "source": "body", "pattern": "fixes #456"}]

-- =============================================
-- Create explicit linking table for complex queries
-- =============================================
CREATE TABLE IF NOT EXISTS project_github_issue_pr_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES project_github_issues(id) ON DELETE CASCADE,
  pr_id UUID REFERENCES project_github_prs(id) ON DELETE CASCADE,
  github_issue_number INTEGER NOT NULL,
  github_pr_number INTEGER NOT NULL,
  link_type VARCHAR(50) NOT NULL,  -- 'branch', 'title', 'body', 'closes', 'fixes', 'resolves'
  link_pattern TEXT,  -- The matched pattern (e.g., "feature/123-login" or "fixes #123")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, github_issue_number, github_pr_number, link_type)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_issue_pr_links_project ON project_github_issue_pr_links(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_pr_links_issue ON project_github_issue_pr_links(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_issue_pr_links_pr ON project_github_issue_pr_links(github_pr_number);
CREATE INDEX IF NOT EXISTS idx_issue_pr_links_issue_id ON project_github_issue_pr_links(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_pr_links_pr_id ON project_github_issue_pr_links(pr_id);

-- =============================================
-- Add linked_prs count to issues for quick display
-- =============================================
ALTER TABLE project_github_issues
ADD COLUMN IF NOT EXISTS linked_pr_count INTEGER DEFAULT 0;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE project_github_issue_pr_links IS 'Links between GitHub PRs and issues, detected automatically from branch names and PR content';
COMMENT ON COLUMN project_github_prs.linked_issue_numbers IS 'Array of issue numbers this PR is linked to';
COMMENT ON COLUMN project_github_prs.link_sources IS 'JSON array describing how each link was detected';
COMMENT ON COLUMN project_github_issue_pr_links.link_type IS 'How the link was detected: branch, title, body, closes, fixes, resolves';

-- =============================================
-- Success
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'GitHub Issue-PR smart linking tables created!';
  RAISE NOTICE 'Patterns detected:';
  RAISE NOTICE '  - Branch: feature/123-*, bugfix/123-*, issue-123-*, 123-*';
  RAISE NOTICE '  - Keywords: fixes #123, closes #123, resolves #123, ref #123';
  RAISE NOTICE '  - Direct: #123 in title or body';
END $$;
