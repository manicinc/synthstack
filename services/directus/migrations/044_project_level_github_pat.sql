-- Project-Level GitHub PAT Storage
-- Refactors GitHub integration to store PAT per project instead of per user
-- Each project can have its own GitHub PAT for independent repository access

-- =============================================
-- Add GitHub PAT fields to projects table
-- =============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS github_pat_encrypted TEXT,  -- Encrypted GitHub Personal Access Token
ADD COLUMN IF NOT EXISTS github_pat_iv VARCHAR(32),  -- Initialization vector for decryption
ADD COLUMN IF NOT EXISTS github_username VARCHAR(100);  -- GitHub username for this PAT

-- Create index for GitHub username lookups
CREATE INDEX IF NOT EXISTS idx_projects_github_username ON projects(github_username) WHERE github_username IS NOT NULL;

-- =============================================
-- Add PAT metadata fields
-- =============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS github_pat_scopes JSONB DEFAULT '[]'::jsonb,  -- PAT scopes/permissions
ADD COLUMN IF NOT EXISTS github_pat_verified_at TIMESTAMPTZ,  -- Last PAT verification timestamp
ADD COLUMN IF NOT EXISTS github_pat_verification_error TEXT;  -- Error message if verification failed

-- =============================================
-- Comments
-- =============================================
COMMENT ON COLUMN projects.github_pat_encrypted IS 'Encrypted GitHub Personal Access Token (AES-256-GCM)';
COMMENT ON COLUMN projects.github_pat_iv IS 'Initialization vector for PAT decryption';
COMMENT ON COLUMN projects.github_username IS 'GitHub username associated with this PAT';
COMMENT ON COLUMN projects.github_pat_scopes IS 'Array of GitHub PAT scopes (e.g., ["repo", "read:org"])';
COMMENT ON COLUMN projects.github_pat_verified_at IS 'Timestamp of last successful PAT verification';
COMMENT ON COLUMN projects.github_pat_verification_error IS 'Error message from last PAT verification attempt';

-- =============================================
-- Security Note
-- =============================================
-- PATs are encrypted using AES-256-GCM with a secret key from environment
-- The IV (initialization vector) is stored per project for secure decryption
-- Never expose the decrypted PAT in API responses or logs

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Project-level GitHub PAT storage created successfully!';
  RAISE NOTICE 'Projects can now store their own GitHub PATs independently';
  RAISE NOTICE 'Use POST /api/v1/projects/:id/github/link with "pat" field';
  RAISE NOTICE 'WARNING: Ensure GITHUB_PAT_ENCRYPTION_KEY is set in environment';
END $$;
