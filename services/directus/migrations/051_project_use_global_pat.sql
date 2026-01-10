-- Project Use Global PAT Flag
-- Allows projects to use the user's global GitHub PAT instead of project-specific PAT
-- Enables two-tier GitHub integration: global default + per-project override

-- =============================================
-- Add use_global_pat column to projects table
-- =============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS use_global_pat BOOLEAN DEFAULT true;

-- =============================================
-- Comments
-- =============================================
COMMENT ON COLUMN projects.use_global_pat IS
'When true, use user global GitHub PAT from github_integrations table. When false, use project-specific github_pat_encrypted.';

-- =============================================
-- Create index for filtering projects by PAT type
-- =============================================
CREATE INDEX IF NOT EXISTS idx_projects_use_global_pat ON projects(use_global_pat);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Project use_global_pat column added successfully!';
  RAISE NOTICE 'Projects now support two-tier GitHub PAT configuration:';
  RAISE NOTICE '  - use_global_pat=true: Use user global PAT from github_integrations';
  RAISE NOTICE '  - use_global_pat=false: Use project-specific github_pat_encrypted';
END $$;
