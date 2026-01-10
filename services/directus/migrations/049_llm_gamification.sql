-- Migration: 049_llm_gamification.sql
-- Description: LLM-powered task complexity estimation and gamification enhancement
-- Features: Pre-estimation, post-mortem analysis, accuracy tracking, point adjustments

-- =============================================
-- TASK COMPLEXITY ESTIMATES TABLE
-- Tracks LLM-based complexity predictions and actual outcomes
-- =============================================
CREATE TABLE IF NOT EXISTS task_complexity_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,

  -- Pre-estimation (before work begins)
  pre_estimated_at TIMESTAMPTZ,
  pre_complexity_score INTEGER CHECK (pre_complexity_score IS NULL OR pre_complexity_score BETWEEN 1 AND 5),
  pre_estimated_hours DECIMAL(10,2),
  pre_estimated_points INTEGER,
  pre_factors JSONB DEFAULT '{}',  -- {issue_type, scope_indicators, keyword_complexity, ...}
  pre_llm_reasoning TEXT,

  -- Post-mortem analysis (after PR merge)
  post_analyzed_at TIMESTAMPTZ,
  post_actual_complexity INTEGER CHECK (post_actual_complexity IS NULL OR post_actual_complexity BETWEEN 1 AND 5),
  post_actual_points INTEGER,
  post_metrics JSONB DEFAULT '{}',  -- {lines_added, lines_removed, files_changed, commits, time_to_merge, ...}
  post_llm_analysis TEXT,

  -- Accuracy and adjustment
  accuracy_score DECIMAL(5,2),  -- How close was the estimate? (0-100)
  point_adjustment DECIMAL(5,2),  -- Multiplier applied (e.g., 1.25 for +25% bonus)
  adjustment_reason TEXT,

  -- GitHub integration
  github_pr_id VARCHAR(255),
  github_issue_id VARCHAR(255),

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),

  UNIQUE(todo_id)
);

CREATE INDEX IF NOT EXISTS idx_task_complexity_todo ON task_complexity_estimates(todo_id);
CREATE INDEX IF NOT EXISTS idx_task_complexity_pre_date ON task_complexity_estimates(pre_estimated_at);
CREATE INDEX IF NOT EXISTS idx_task_complexity_post_date ON task_complexity_estimates(post_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_task_complexity_accuracy ON task_complexity_estimates(accuracy_score);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'task_complexity_estimates',
  'psychology',
  'LLM-powered task complexity predictions and post-mortem analysis',
  '{{todo_id}} - Complexity: {{pre_complexity_score}}',
  false,
  false,
  30
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- ALTER TODOS TABLE
-- Add complexity estimation and GitHub tracking fields
-- =============================================

-- Add complexity estimate reference
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS complexity_estimate_id UUID REFERENCES task_complexity_estimates(id) ON DELETE SET NULL;

-- Add issue type for categorization
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS issue_type VARCHAR(50) DEFAULT 'task'
    CHECK (issue_type IN ('bug', 'feature', 'enhancement', 'refactor', 'documentation', 'test', 'chore', 'task'));

-- Add GitHub tracking fields
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
  ADD COLUMN IF NOT EXISTS github_pr_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_todos_complexity_estimate ON todos(complexity_estimate_id);
CREATE INDEX IF NOT EXISTS idx_todos_issue_type ON todos(issue_type);
CREATE INDEX IF NOT EXISTS idx_todos_github_issue ON todos(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_todos_github_pr ON todos(github_pr_number);

-- =============================================
-- COMPLEXITY SCALE REFERENCE TABLE
-- Defines the 1-5 complexity levels
-- =============================================
CREATE TABLE IF NOT EXISTS complexity_scale (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  typical_hours_min DECIMAL(5,2),
  typical_hours_max DECIMAL(5,2),
  base_points INTEGER NOT NULL,
  example_tasks JSONB DEFAULT '[]'
);

-- Seed complexity scale definitions
INSERT INTO complexity_scale (level, name, description, typical_hours_min, typical_hours_max, base_points, example_tasks) VALUES
  (1, 'Trivial', 'Simple, well-defined task. Single file change, minimal testing needed.', 0.25, 1, 5, '["Fix typo", "Update config value", "Add comment", "Small CSS tweak"]'::jsonb),
  (2, 'Simple', 'Straightforward task with clear scope. Few files, basic testing.', 1, 4, 10, '["Add new field to form", "Simple API endpoint", "Basic UI component", "Update dependency"]'::jsonb),
  (3, 'Moderate', 'Standard feature work. Multiple files, some integration needed.', 4, 8, 20, '["New CRUD feature", "Moderate refactor", "Integration with service", "Complex UI component"]'::jsonb),
  (4, 'Complex', 'Significant effort required. Cross-cutting concerns, extensive testing.', 8, 24, 35, '["New system component", "Major refactor", "Complex integration", "Performance optimization"]'::jsonb),
  (5, 'Epic', 'Major undertaking. Architectural changes, multi-sprint potential.', 24, 80, 50, '["New subsystem", "Database migration", "Authentication overhaul", "Major feature set"]'::jsonb)
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  typical_hours_min = EXCLUDED.typical_hours_min,
  typical_hours_max = EXCLUDED.typical_hours_max,
  base_points = EXCLUDED.base_points,
  example_tasks = EXCLUDED.example_tasks;

-- Register complexity_scale with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'complexity_scale',
  'leaderboard',
  'Reference table for task complexity levels 1-5',
  'Level {{level}}: {{name}}',
  true,
  false,
  31
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- USER ESTIMATION ACCURACY TABLE
-- Track user's estimation accuracy over time
-- =============================================
CREATE TABLE IF NOT EXISTS user_estimation_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Accuracy stats
  total_estimates INTEGER DEFAULT 0,
  accurate_estimates INTEGER DEFAULT 0,  -- Within 1 level of actual
  overestimates INTEGER DEFAULT 0,
  underestimates INTEGER DEFAULT 0,

  -- Average accuracy score
  average_accuracy DECIMAL(5,2) DEFAULT 0,

  -- By complexity level (stored as JSONB)
  accuracy_by_level JSONB DEFAULT '{
    "1": {"count": 0, "accurate": 0},
    "2": {"count": 0, "accurate": 0},
    "3": {"count": 0, "accurate": 0},
    "4": {"count": 0, "accurate": 0},
    "5": {"count": 0, "accurate": 0}
  }',

  -- Bonus points earned from accurate estimates
  total_accuracy_bonus INTEGER DEFAULT 0,

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_estimation_user ON user_estimation_accuracy(user_id);
CREATE INDEX IF NOT EXISTS idx_user_estimation_project ON user_estimation_accuracy(project_id);
CREATE INDEX IF NOT EXISTS idx_user_estimation_accuracy ON user_estimation_accuracy(average_accuracy DESC);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'user_estimation_accuracy',
  'trending_up',
  'Track user estimation accuracy for gamification bonuses',
  '{{user_id}} - Accuracy: {{average_accuracy}}%',
  false,
  false,
  32
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- DIRECTUS RELATIONS
-- =============================================

-- Task Complexity Estimates -> Todo
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('task_complexity_estimates', 'todo_id', 'todos', 'complexity_estimates')
ON CONFLICT DO NOTHING;

-- Todos -> Complexity Estimate
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('todos', 'complexity_estimate_id', 'task_complexity_estimates', NULL)
ON CONFLICT DO NOTHING;

-- User Estimation Accuracy -> User
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_estimation_accuracy', 'user_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- User Estimation Accuracy -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_estimation_accuracy', 'project_id', 'projects', NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- PERMISSIONS
-- =============================================

-- Grant permissions for task_complexity_estimates
DO $$
BEGIN
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'task_complexity_estimates', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'complexity_scale', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'user_estimation_accuracy', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE task_complexity_estimates IS 'LLM-powered task complexity predictions before work and post-mortem analysis after PR merge';
COMMENT ON TABLE complexity_scale IS 'Reference table defining the 1-5 complexity scale with descriptions and point values';
COMMENT ON TABLE user_estimation_accuracy IS 'Tracks estimation accuracy per user for gamification bonuses';

COMMENT ON COLUMN task_complexity_estimates.pre_complexity_score IS 'LLM predicted complexity (1-5) before work begins';
COMMENT ON COLUMN task_complexity_estimates.post_actual_complexity IS 'LLM analyzed actual complexity (1-5) after PR merge';
COMMENT ON COLUMN task_complexity_estimates.accuracy_score IS 'How accurate was the pre-estimate compared to post-analysis (0-100)';
COMMENT ON COLUMN task_complexity_estimates.point_adjustment IS 'Points multiplier based on estimation accuracy (e.g., 1.25 = +25% bonus)';
COMMENT ON COLUMN task_complexity_estimates.pre_factors IS 'JSON with factors used for pre-estimation: issue_type, scope_indicators, keyword_complexity';
COMMENT ON COLUMN task_complexity_estimates.post_metrics IS 'JSON with actual PR metrics: lines_added, lines_removed, files_changed, commits, time_to_merge';

COMMENT ON COLUMN todos.issue_type IS 'Task category: bug, feature, enhancement, refactor, documentation, test, chore, task';
COMMENT ON COLUMN todos.github_issue_number IS 'Linked GitHub issue number';
COMMENT ON COLUMN todos.github_pr_number IS 'Linked GitHub PR number';
COMMENT ON COLUMN todos.complexity_estimate_id IS 'Reference to LLM complexity estimate record';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'LLM Gamification migration completed successfully!';
  RAISE NOTICE 'New tables: task_complexity_estimates, complexity_scale, user_estimation_accuracy';
  RAISE NOTICE 'Modified: todos (added complexity_estimate_id, issue_type, github_issue_number, github_pr_number)';
  RAISE NOTICE 'Complexity Scale: 1-Trivial, 2-Simple, 3-Moderate, 4-Complex, 5-Epic';
  RAISE NOTICE 'Point adjustment formula:';
  RAISE NOTICE '  diff >= 2 (underestimate) -> +25% bonus';
  RAISE NOTICE '  diff == 1 -> +15% bonus';
  RAISE NOTICE '  diff == 0 -> +10% accuracy bonus';
  RAISE NOTICE '  diff == -1 -> 0% (no adjustment)';
  RAISE NOTICE '  diff <= -2 (overestimate) -> -10% penalty';
END $$;
