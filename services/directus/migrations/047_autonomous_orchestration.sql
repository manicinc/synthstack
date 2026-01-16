-- Migration: 047_autonomous_orchestration.sql
-- Description: Autonomous orchestration system for AI agent batch processing
-- Features: Per-project scheduling, batch jobs, execution logs, action configs, GitHub analysis cache

-- =============================================
-- AGENT ORCHESTRATION SCHEDULES TABLE
-- Per-project, per-agent scheduling configuration
-- =============================================
CREATE TABLE IF NOT EXISTS agent_orchestration_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Schedule Configuration
  is_enabled BOOLEAN DEFAULT true,
  schedule_type VARCHAR(30) NOT NULL DEFAULT 'daily'
    CHECK (schedule_type IN ('hourly', 'every_4h', 'every_8h', 'daily', 'weekly', 'custom')),
  cron_expression VARCHAR(100),  -- For custom schedules, e.g., "0 9 * * 1-5"
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Execution Windows
  run_after_time TIME,           -- Don't run before this time
  run_before_time TIME,          -- Don't run after this time
  run_on_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],  -- 0=Sun, 6=Sat

  -- Throttling
  min_interval_minutes INTEGER DEFAULT 60,  -- Min time between runs
  max_runs_per_day INTEGER DEFAULT 24,
  cooldown_after_error_minutes INTEGER DEFAULT 30,

  -- Priority & Concurrency
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  allow_concurrent BOOLEAN DEFAULT false,

  -- Last Execution Info
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),

  UNIQUE(project_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_orch_schedules_project ON agent_orchestration_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_orch_schedules_agent ON agent_orchestration_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_orch_schedules_enabled ON agent_orchestration_schedules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_orch_schedules_next_run ON agent_orchestration_schedules(last_run_at, schedule_type) WHERE is_enabled = true;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'agent_orchestration_schedules',
  'schedule',
  'Per-project, per-agent scheduling configuration for autonomous orchestration',
  '{{project_id}} - {{agent_id}}',
  false,
  false,
  30
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- ORCHESTRATION JOBS TABLE
-- Batch job executions tracking
-- =============================================
CREATE TABLE IF NOT EXISTS orchestration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Job Type
  job_type VARCHAR(50) NOT NULL
    CHECK (job_type IN ('batch', 'single_agent', 'github_analysis', 'task_assignment', 'retry', 'manual')),

  -- Trigger Info
  triggered_by VARCHAR(50) NOT NULL
    CHECK (triggered_by IN ('cron', 'webhook', 'manual', 'api', 'system', 'retry_scheduler')),
  triggered_by_user_id UUID REFERENCES directus_users(id),

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'timeout')),

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  agents_executed INTEGER DEFAULT 0,
  agents_succeeded INTEGER DEFAULT 0,
  agents_failed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tasks_assigned INTEGER DEFAULT 0,

  -- Error Info
  error_message TEXT,
  error_code VARCHAR(50),
  error_stack TEXT,

  -- Retry Info
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  parent_job_id UUID REFERENCES orchestration_jobs(id),

  -- Input/Output
  input_params JSONB DEFAULT '{}',
  output_summary JSONB DEFAULT '{}',

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orch_jobs_project ON orchestration_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_orch_jobs_status ON orchestration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_orch_jobs_type ON orchestration_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_orch_jobs_created ON orchestration_jobs(date_created DESC);
CREATE INDEX IF NOT EXISTS idx_orch_jobs_scheduled ON orchestration_jobs(scheduled_at) WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_orch_jobs_running ON orchestration_jobs(started_at) WHERE status = 'running';

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'orchestration_jobs',
  'work',
  'Batch job executions for autonomous orchestration',
  '{{job_type}} - {{status}}',
  false,
  false,
  31
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- ORCHESTRATION EXECUTION LOGS TABLE
-- Detailed per-agent execution logs within a job
-- =============================================
CREATE TABLE IF NOT EXISTS orchestration_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES orchestration_jobs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES agent_orchestration_schedules(id) ON DELETE SET NULL,

  -- Agent Info
  agent_slug VARCHAR(50) NOT NULL,
  agent_name VARCHAR(255),

  -- Execution Phase
  phase VARCHAR(30) NOT NULL DEFAULT 'analyze'
    CHECK (phase IN ('analyze', 'decide', 'execute', 'verify', 'complete')),

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'do_nothing')),

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- "Do Nothing" Intelligence
  should_act BOOLEAN DEFAULT true,
  do_nothing_reason TEXT,           -- Why agent decided not to act
  confidence_score DECIMAL(5,4),    -- 0.0000 to 1.0000

  -- Context Analyzed
  context_summary JSONB DEFAULT '{}',  -- What data the agent considered
  github_data_used JSONB DEFAULT '{}', -- GitHub metrics if analyzed

  -- Actions Taken
  actions_proposed INTEGER DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  actions_approved INTEGER DEFAULT 0,
  actions_rejected INTEGER DEFAULT 0,

  -- Results
  output_data JSONB DEFAULT '{}',
  suggestions_created TEXT[],       -- IDs of suggestions created
  tasks_created TEXT[],             -- IDs of tasks created

  -- Errors
  error_message TEXT,
  error_code VARCHAR(50),

  -- Tokens/Cost Tracking
  tokens_used INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orch_logs_job ON orchestration_execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_orch_logs_project ON orchestration_execution_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_orch_logs_agent ON orchestration_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_orch_logs_status ON orchestration_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_orch_logs_created ON orchestration_execution_logs(date_created DESC);
CREATE INDEX IF NOT EXISTS idx_orch_logs_do_nothing ON orchestration_execution_logs(should_act, do_nothing_reason) WHERE should_act = false;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'orchestration_execution_logs',
  'receipt_long',
  'Detailed per-agent execution logs for orchestration jobs',
  '{{agent_slug}} - {{status}}',
  false,
  false,
  32
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- AUTONOMOUS ACTION CONFIG TABLE
-- Per-action toggles for what agents can do autonomously
-- =============================================
CREATE TABLE IF NOT EXISTS autonomous_action_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Action Definition
  action_key VARCHAR(100) NOT NULL,
  action_name VARCHAR(255) NOT NULL,
  action_category VARCHAR(50) NOT NULL
    CHECK (action_category IN ('github', 'content', 'analysis', 'notification', 'task', 'communication')),

  -- Agent Scope
  agent_slug VARCHAR(50),           -- NULL = applies to all agents

  -- Permissions
  is_enabled BOOLEAN DEFAULT false, -- Default to disabled for safety
  requires_approval BOOLEAN DEFAULT true,
  auto_approve_low_risk BOOLEAN DEFAULT false,

  -- Risk Level
  risk_level VARCHAR(20) DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Limits
  max_per_day INTEGER DEFAULT 10,
  max_per_hour INTEGER DEFAULT 3,
  cooldown_minutes INTEGER DEFAULT 15,

  -- Conditions
  conditions JSONB DEFAULT '{}',    -- Additional conditions for when action is allowed

  -- Usage Tracking
  times_used_today INTEGER DEFAULT 0,
  times_used_total INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),

  UNIQUE(project_id, action_key, agent_slug)
);

CREATE INDEX IF NOT EXISTS idx_action_config_project ON autonomous_action_config(project_id);
CREATE INDEX IF NOT EXISTS idx_action_config_agent ON autonomous_action_config(agent_slug);
CREATE INDEX IF NOT EXISTS idx_action_config_enabled ON autonomous_action_config(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_action_config_category ON autonomous_action_config(action_category);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'autonomous_action_config',
  'toggle_on',
  'Per-action toggles for autonomous agent behaviors',
  '{{action_name}} ({{risk_level}})',
  false,
  false,
  33
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- GITHUB ANALYSIS CACHE TABLE
-- Cached GitHub velocity metrics and analysis
-- =============================================
CREATE TABLE IF NOT EXISTS github_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Analysis Period
  period_type VARCHAR(20) NOT NULL DEFAULT 'daily'
    CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Commit Metrics
  commits_count INTEGER DEFAULT 0,
  commits_by_author JSONB DEFAULT '{}',  -- {author: count}
  files_changed INTEGER DEFAULT 0,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,

  -- PR Metrics
  prs_opened INTEGER DEFAULT 0,
  prs_merged INTEGER DEFAULT 0,
  prs_closed INTEGER DEFAULT 0,
  avg_pr_review_hours DECIMAL(10,2),
  avg_pr_merge_hours DECIMAL(10,2),

  -- Issue Metrics
  issues_opened INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,
  avg_issue_resolution_hours DECIMAL(10,2),
  issues_by_label JSONB DEFAULT '{}',  -- {label: count}

  -- Velocity Metrics
  velocity_score DECIMAL(5,2),         -- Calculated velocity 0-100
  velocity_trend VARCHAR(20)           -- 'increasing', 'stable', 'decreasing'
    CHECK (velocity_trend IS NULL OR velocity_trend IN ('increasing', 'stable', 'decreasing')),
  velocity_change_percent DECIMAL(10,2),

  -- Code Quality Signals
  test_coverage_percent DECIMAL(5,2),
  build_success_rate DECIMAL(5,2),

  -- Activity Patterns
  most_active_hours JSONB DEFAULT '[]',     -- Array of {hour: 0-23, activity: count}
  most_active_days JSONB DEFAULT '[]',      -- Array of {day: 0-6, activity: count}

  -- Contributors
  active_contributors INTEGER DEFAULT 0,
  contributor_details JSONB DEFAULT '[]',   -- Array of {login, commits, prs, reviews}

  -- Hot Spots (frequently changed files)
  hot_spots JSONB DEFAULT '[]',             -- Array of {path, changes, risk_score}

  -- Raw Data Hash (for deduplication)
  data_hash VARCHAR(64),

  -- Metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_stale BOOLEAN DEFAULT false,

  UNIQUE(project_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_github_cache_project ON github_analysis_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_github_cache_period ON github_analysis_cache(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_github_cache_analyzed ON github_analysis_cache(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_cache_expires ON github_analysis_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_github_cache_stale ON github_analysis_cache(is_stale) WHERE is_stale = false;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'github_analysis_cache',
  'insights',
  'Cached GitHub velocity metrics and analysis for autonomous orchestration',
  '{{project_id}} - {{period_type}}',
  false,
  false,
  34
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- FEATURE FLAG FOR AUTONOMOUS ORCHESTRATION
-- =============================================
INSERT INTO feature_flags (
  key,
  name,
  description,
  category,
  is_enabled,
  is_premium,
  min_tier,
  rollout_percentage,
  sort_order
) VALUES (
  'autonomous_orchestration',
  'Autonomous Orchestration',
  'Enable AI agents to work autonomously on batch tasks with scheduling, GitHub analysis, and intelligent "do nothing" decisions',
  'ai',
  true,
  true,
  'premium',
  100,
  50
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  min_tier = EXCLUDED.min_tier;

-- =============================================
-- DIRECTUS RELATIONS
-- =============================================

-- Schedules -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('agent_orchestration_schedules', 'project_id', 'projects', 'orchestration_schedules')
ON CONFLICT DO NOTHING;

-- Schedules -> Agent
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('agent_orchestration_schedules', 'agent_id', 'ai_agents', 'orchestration_schedules')
ON CONFLICT DO NOTHING;

-- Jobs -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_jobs', 'project_id', 'projects', 'orchestration_jobs')
ON CONFLICT DO NOTHING;

-- Jobs -> User (triggered by)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_jobs', 'triggered_by_user_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- Jobs -> Parent Job (for retries)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_jobs', 'parent_job_id', 'orchestration_jobs', 'retry_jobs')
ON CONFLICT DO NOTHING;

-- Execution Logs -> Job
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_execution_logs', 'job_id', 'orchestration_jobs', 'execution_logs')
ON CONFLICT DO NOTHING;

-- Execution Logs -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_execution_logs', 'project_id', 'projects', NULL)
ON CONFLICT DO NOTHING;

-- Execution Logs -> Agent
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('orchestration_execution_logs', 'agent_id', 'ai_agents', NULL)
ON CONFLICT DO NOTHING;

-- Action Config -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('autonomous_action_config', 'project_id', 'projects', 'action_configs')
ON CONFLICT DO NOTHING;

-- GitHub Cache -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('github_analysis_cache', 'project_id', 'projects', 'github_analysis_cache')
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED DEFAULT ACTION CONFIGS
-- =============================================
-- Note: These are templates - actual configs are created per-project
INSERT INTO autonomous_action_config (
  project_id,
  action_key,
  action_name,
  action_category,
  agent_slug,
  is_enabled,
  requires_approval,
  risk_level,
  max_per_day,
  max_per_hour
)
SELECT
  p.id,
  action_def.action_key,
  action_def.action_name,
  action_def.action_category,
  action_def.agent_slug,
  action_def.is_enabled,
  action_def.requires_approval,
  action_def.risk_level,
  action_def.max_per_day,
  action_def.max_per_hour
FROM projects p
CROSS JOIN (
  VALUES
    -- Developer agent actions
    ('create_pr_draft', 'Create Draft PR', 'github', 'developer', false, true, 'high', 5, 2),
    ('add_pr_comment', 'Comment on PR', 'github', 'developer', false, true, 'medium', 20, 5),
    ('create_issue', 'Create GitHub Issue', 'github', 'developer', false, true, 'medium', 10, 3),
    ('analyze_code', 'Analyze Code Changes', 'analysis', 'developer', true, false, 'low', 50, 10),

    -- Researcher agent actions
    ('market_research', 'Conduct Market Research', 'analysis', 'researcher', true, false, 'low', 10, 3),
    ('competitor_analysis', 'Analyze Competitors', 'analysis', 'researcher', true, false, 'low', 5, 2),
    ('create_research_note', 'Create Research Note', 'content', 'researcher', true, true, 'low', 20, 5),

    -- Marketer agent actions
    ('draft_blog_post', 'Draft Blog Post', 'content', 'marketer', false, true, 'medium', 3, 1),
    ('draft_social_post', 'Draft Social Media Post', 'content', 'marketer', false, true, 'low', 10, 3),
    ('analyze_campaign', 'Analyze Campaign Performance', 'analysis', 'marketer', true, false, 'low', 10, 3),

    -- SEO Writer agent actions
    ('keyword_research', 'Keyword Research', 'analysis', 'seo_writer', true, false, 'low', 20, 5),
    ('draft_seo_content', 'Draft SEO Content', 'content', 'seo_writer', false, true, 'medium', 5, 2),
    ('meta_suggestions', 'Suggest Meta Tags', 'content', 'seo_writer', true, true, 'low', 30, 10),

    -- Designer agent actions
    ('analyze_visual', 'Analyze Visual Design', 'analysis', 'designer', true, false, 'low', 20, 5),
    ('responsive_audit', 'Responsive Design Audit', 'analysis', 'designer', true, false, 'low', 10, 3),

    -- General agent actions
    ('create_task', 'Create Task', 'task', NULL, true, true, 'low', 50, 15),
    ('send_notification', 'Send Notification', 'notification', NULL, true, false, 'low', 100, 20),
    ('update_status', 'Update Status', 'task', NULL, true, false, 'low', 100, 30)
) AS action_def(action_key, action_name, action_category, agent_slug, is_enabled, requires_approval, risk_level, max_per_day, max_per_hour)
WHERE NOT EXISTS (
  SELECT 1 FROM autonomous_action_config ac
  WHERE ac.project_id = p.id
  AND ac.action_key = action_def.action_key
  AND (ac.agent_slug = action_def.agent_slug OR (ac.agent_slug IS NULL AND action_def.agent_slug IS NULL))
)
ON CONFLICT DO NOTHING;

-- =============================================
-- PERMISSIONS
-- =============================================

DO $$
BEGIN
  -- Read permissions for authenticated users (own project data)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'agent_orchestration_schedules', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'orchestration_jobs', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'orchestration_execution_logs', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'autonomous_action_config', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'github_analysis_cache', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE agent_orchestration_schedules IS 'Per-project, per-agent scheduling configuration for autonomous batch processing';
COMMENT ON TABLE orchestration_jobs IS 'Tracks batch job executions including status, timing, and results';
COMMENT ON TABLE orchestration_execution_logs IS 'Detailed logs of each agent execution within a job, including "do nothing" decisions';
COMMENT ON TABLE autonomous_action_config IS 'Per-action toggles controlling what agents can do autonomously with approval workflows';
COMMENT ON TABLE github_analysis_cache IS 'Cached GitHub metrics for velocity analysis and intelligent task assignment';

COMMENT ON COLUMN agent_orchestration_schedules.cron_expression IS 'Standard cron expression for custom schedules (e.g., "0 9 * * 1-5" for 9am weekdays)';
COMMENT ON COLUMN agent_orchestration_schedules.run_on_days IS 'Array of days when agent can run (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN agent_orchestration_schedules.min_interval_minutes IS 'Minimum time between consecutive runs to prevent overload';
COMMENT ON COLUMN agent_orchestration_schedules.cooldown_after_error_minutes IS 'Time to wait before retrying after a failure';

COMMENT ON COLUMN orchestration_execution_logs.should_act IS 'Whether agent determined it should take action (false = "do nothing")';
COMMENT ON COLUMN orchestration_execution_logs.do_nothing_reason IS 'Explanation of why agent chose not to act';
COMMENT ON COLUMN orchestration_execution_logs.confidence_score IS 'Agent confidence in its decision (0.0 to 1.0)';
COMMENT ON COLUMN orchestration_execution_logs.context_summary IS 'Summary of data agent considered when making decision';

COMMENT ON COLUMN autonomous_action_config.auto_approve_low_risk IS 'Automatically approve low-risk actions without human review';
COMMENT ON COLUMN autonomous_action_config.risk_level IS 'Risk classification affecting approval requirements';
COMMENT ON COLUMN autonomous_action_config.conditions IS 'JSON conditions for when action is allowed';

COMMENT ON COLUMN github_analysis_cache.velocity_score IS 'Calculated development velocity score from 0-100';
COMMENT ON COLUMN github_analysis_cache.hot_spots IS 'Frequently changed files that may need attention';
COMMENT ON COLUMN github_analysis_cache.data_hash IS 'SHA256 hash of raw data for deduplication';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Autonomous orchestration system created successfully!';
  RAISE NOTICE 'Tables: agent_orchestration_schedules, orchestration_jobs, orchestration_execution_logs, autonomous_action_config, github_analysis_cache';
  RAISE NOTICE 'Feature flag: autonomous_orchestration (premium tier required)';
  RAISE NOTICE 'Default action configs seeded for all existing projects';
END $$;
