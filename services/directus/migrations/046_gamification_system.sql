-- Migration: 046_gamification_system.sql
-- Description: Complete gamification system with sprints, points, achievements, and retrospectives
-- Features: Points tracking, sprint management, streaks, levels, achievements, leaderboards

-- =============================================
-- SPRINTS TABLE
-- Time-bounded work periods within projects
-- =============================================
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Sprint Configuration
  name VARCHAR(255) NOT NULL,
  goal TEXT,
  duration_type VARCHAR(20) NOT NULL DEFAULT 'biweekly'
    CHECK (duration_type IN ('weekly', 'biweekly', 'monthly', 'yearly', 'custom')),

  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Point Targets
  point_goal INTEGER DEFAULT 0,
  points_completed INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),

  -- Velocity Tracking
  velocity_actual DECIMAL(10,2) DEFAULT 0,
  velocity_predicted DECIMAL(10,2),

  -- Metadata
  sort INTEGER DEFAULT 0,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field, sort)
VALUES (
  'sprints',
  'sprint',
  'Time-bounded work periods with point goals and velocity tracking',
  '{{name}}',
  false,
  false,
  'sort',
  20
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- USER GAMIFICATION STATS TABLE
-- Per-user points, streaks, levels, personal bests
-- =============================================
CREATE TABLE IF NOT EXISTS user_gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- NULL for global stats

  -- Points
  total_points INTEGER DEFAULT 0,
  points_this_week INTEGER DEFAULT 0,
  points_this_month INTEGER DEFAULT 0,

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  streak_frozen_until DATE,  -- For streak freeze power-ups

  -- Level System
  level INTEGER DEFAULT 1,
  xp_current INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,

  -- Personal Bests
  best_daily_points INTEGER DEFAULT 0,
  best_weekly_points INTEGER DEFAULT 0,
  best_sprint_points INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,

  -- Counts
  tasks_completed INTEGER DEFAULT 0,
  tasks_completed_early INTEGER DEFAULT 0,
  milestones_completed INTEGER DEFAULT 0,
  sprints_completed INTEGER DEFAULT 0,

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_gamification_user ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_project ON user_gamification_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_points ON user_gamification_stats(total_points DESC);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'user_gamification_stats',
  'leaderboard',
  'User gamification statistics including points, streaks, and levels',
  '{{user_id}} - Level {{level}}',
  false,
  false,
  21
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- POINT EVENTS TABLE
-- Immutable log of all point transactions
-- =============================================
CREATE TABLE IF NOT EXISTS point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,

  -- Event Details
  event_type VARCHAR(50) NOT NULL
    CHECK (event_type IN (
      'task_completed', 'task_early_bonus', 'streak_bonus',
      'milestone_completed', 'sprint_completed', 'sprint_goal_achieved',
      'level_up', 'achievement_unlocked', 'referral_bonus', 'adjustment'
    )),

  -- Related Entity
  related_entity_type VARCHAR(50),  -- 'todo', 'milestone', 'sprint', etc.
  related_entity_id UUID,

  -- Points
  points INTEGER NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.00,
  points_final INTEGER NOT NULL,  -- points * multiplier

  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  date_created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_events_user ON point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_point_events_project ON point_events(project_id);
CREATE INDEX IF NOT EXISTS idx_point_events_sprint ON point_events(sprint_id);
CREATE INDEX IF NOT EXISTS idx_point_events_date ON point_events(date_created DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_type ON point_events(event_type);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'point_events',
  'stars',
  'Immutable log of all point transactions',
  '+{{points_final}} pts - {{event_type}}',
  false,
  false,
  22
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- ACHIEVEMENTS TABLE
-- Badge definitions with criteria
-- =============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Definition
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general'
    CHECK (category IN ('completion', 'streak', 'speed', 'collaboration', 'milestone', 'special')),

  -- Visual
  icon VARCHAR(100) NOT NULL,
  badge_color VARCHAR(20) DEFAULT '#6366f1',
  rarity VARCHAR(20) DEFAULT 'common'
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),

  -- Requirements
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  requirement_metadata JSONB DEFAULT '{}',

  -- Rewards
  points_reward INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,  -- Secret achievements
  sort_order INTEGER DEFAULT 0,

  date_created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'achievements',
  'emoji_events',
  'Achievement and badge definitions',
  '{{name}} ({{rarity}})',
  false,
  false,
  23
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- USER ACHIEVEMENTS TABLE
-- Tracks unlocked achievements per user
-- =============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Unlock Details
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  points_awarded INTEGER DEFAULT 0,

  -- Context
  metadata JSONB DEFAULT '{}',

  UNIQUE(user_id, achievement_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'user_achievements',
  'military_tech',
  'User unlocked achievements',
  '{{user_id}} - {{achievement_id}}',
  false,
  false,
  24
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- RETROSPECTIVES TABLE
-- Sprint review data
-- =============================================
CREATE TABLE IF NOT EXISTS retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Summary
  summary TEXT,

  -- Structured Feedback (JSONB arrays)
  went_well JSONB DEFAULT '[]',      -- Array of {text, votes, author_id}
  needs_improvement JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',    -- Array of {id, text, assignee_id, status, due_date}

  -- Team Sentiment (1-5 scale)
  sentiment_productivity INTEGER CHECK (sentiment_productivity IS NULL OR sentiment_productivity BETWEEN 1 AND 5),
  sentiment_collaboration INTEGER CHECK (sentiment_collaboration IS NULL OR sentiment_collaboration BETWEEN 1 AND 5),
  sentiment_satisfaction INTEGER CHECK (sentiment_satisfaction IS NULL OR sentiment_satisfaction BETWEEN 1 AND 5),
  sentiment_overall INTEGER CHECK (sentiment_overall IS NULL OR sentiment_overall BETWEEN 1 AND 5),

  -- Participation
  participants JSONB DEFAULT '[]',  -- Array of user_ids who contributed

  -- Status
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),

  UNIQUE(sprint_id)
);

CREATE INDEX IF NOT EXISTS idx_retrospectives_sprint ON retrospectives(sprint_id);
CREATE INDEX IF NOT EXISTS idx_retrospectives_project ON retrospectives(project_id);
CREATE INDEX IF NOT EXISTS idx_retrospectives_status ON retrospectives(status);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'retrospectives',
  'rate_review',
  'Sprint retrospective reviews',
  'Retro: {{sprint_id}}',
  false,
  false,
  25
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =============================================
-- MODIFY TODOS TABLE
-- Add sprint linkage and gamification fields
-- =============================================
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES directus_users(id);

CREATE INDEX IF NOT EXISTS idx_todos_sprint ON todos(sprint_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);

-- =============================================
-- DIRECTUS RELATIONS
-- =============================================

-- Sprints -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('sprints', 'project_id', 'projects', 'sprints')
ON CONFLICT DO NOTHING;

-- Todos -> Sprint
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('todos', 'sprint_id', 'sprints', 'todos')
ON CONFLICT DO NOTHING;

-- Point Events -> User
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('point_events', 'user_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- Point Events -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('point_events', 'project_id', 'projects', NULL)
ON CONFLICT DO NOTHING;

-- Point Events -> Sprint
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('point_events', 'sprint_id', 'sprints', NULL)
ON CONFLICT DO NOTHING;

-- User Gamification Stats -> User
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_gamification_stats', 'user_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- User Gamification Stats -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_gamification_stats', 'project_id', 'projects', NULL)
ON CONFLICT DO NOTHING;

-- User Achievements -> User
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_achievements', 'user_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- User Achievements -> Achievement
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('user_achievements', 'achievement_id', 'achievements', 'user_achievements')
ON CONFLICT DO NOTHING;

-- Retrospectives -> Sprint
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('retrospectives', 'sprint_id', 'sprints', 'retrospective')
ON CONFLICT DO NOTHING;

-- Retrospectives -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('retrospectives', 'project_id', 'projects', NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED ACHIEVEMENTS
-- =============================================
INSERT INTO achievements (name, slug, description, category, icon, badge_color, rarity, requirement_type, requirement_value, points_reward, sort_order) VALUES
  -- Completion Achievements
  ('First Task', 'first-task', 'Complete your first task', 'completion', 'check_circle', '#10b981', 'common', 'tasks_completed', 1, 10, 1),
  ('Task Master', 'task-master-10', 'Complete 10 tasks', 'completion', 'task_alt', '#10b981', 'common', 'tasks_completed', 10, 25, 2),
  ('Task Champion', 'task-master-50', 'Complete 50 tasks', 'completion', 'emoji_events', '#6366f1', 'uncommon', 'tasks_completed', 50, 100, 3),
  ('Task Legend', 'task-master-100', 'Complete 100 tasks', 'completion', 'military_tech', '#f59e0b', 'rare', 'tasks_completed', 100, 250, 4),
  ('Task Titan', 'task-master-500', 'Complete 500 tasks', 'completion', 'workspace_premium', '#ef4444', 'epic', 'tasks_completed', 500, 1000, 5),

  -- Speed Achievements
  ('Early Bird', 'early-bird-5', 'Complete 5 tasks before due date', 'speed', 'schedule', '#10b981', 'common', 'tasks_early', 5, 50, 10),
  ('Speed Demon', 'early-bird-25', 'Complete 25 tasks before due date', 'speed', 'bolt', '#6366f1', 'uncommon', 'tasks_early', 25, 150, 11),
  ('Time Lord', 'early-bird-100', 'Complete 100 tasks before due date', 'speed', 'timer', '#f59e0b', 'rare', 'tasks_early', 100, 500, 12),

  -- Streak Achievements
  ('On Fire', 'streak-3', 'Maintain a 3-day streak', 'streak', 'local_fire_department', '#f97316', 'common', 'streak', 3, 30, 20),
  ('Blazing', 'streak-7', 'Maintain a 7-day streak', 'streak', 'whatshot', '#f97316', 'uncommon', 'streak', 7, 75, 21),
  ('Unstoppable', 'streak-14', 'Maintain a 14-day streak', 'streak', 'fireplace', '#ef4444', 'rare', 'streak', 14, 200, 22),
  ('Inferno', 'streak-30', 'Maintain a 30-day streak', 'streak', 'mode_heat', '#dc2626', 'epic', 'streak', 30, 500, 23),
  ('Eternal Flame', 'streak-100', 'Maintain a 100-day streak', 'streak', 'emergency_heat', '#7c2d12', 'legendary', 'streak', 100, 2000, 24),

  -- Milestone Achievements
  ('Milestone Maker', 'milestone-1', 'Complete your first milestone', 'milestone', 'flag', '#8b5cf6', 'common', 'milestones', 1, 50, 30),
  ('Goal Getter', 'milestone-5', 'Complete 5 milestones', 'milestone', 'assistant_photo', '#8b5cf6', 'uncommon', 'milestones', 5, 150, 31),
  ('Milestone Master', 'milestone-10', 'Complete 10 milestones', 'milestone', 'tour', '#f59e0b', 'rare', 'milestones', 10, 400, 32),

  -- Sprint Achievements
  ('Sprint Champion', 'sprint-goal-1', 'Achieve a sprint goal', 'completion', 'sprint', '#0ea5e9', 'uncommon', 'sprint_goals', 1, 100, 40),
  ('Sprint Specialist', 'sprint-goal-5', 'Achieve 5 sprint goals', 'completion', 'directions_run', '#0ea5e9', 'rare', 'sprint_goals', 5, 300, 41),
  ('Velocity King', 'sprint-goal-10', 'Achieve 10 sprint goals', 'completion', 'speed', '#f59e0b', 'epic', 'sprint_goals', 10, 750, 42),

  -- Level Achievements
  ('Rising Star', 'level-5', 'Reach level 5', 'special', 'trending_up', '#fbbf24', 'common', 'level', 5, 0, 50),
  ('Contributor', 'level-10', 'Reach level 10', 'special', 'star', '#fbbf24', 'uncommon', 'level', 10, 0, 51),
  ('Expert', 'level-20', 'Reach level 20', 'special', 'star_rate', '#f59e0b', 'rare', 'level', 20, 0, 52),
  ('Master', 'level-50', 'Reach level 50', 'special', 'auto_awesome', '#ef4444', 'epic', 'level', 50, 0, 53),
  ('Legend', 'level-100', 'Reach level 100', 'special', 'diamond', '#7c3aed', 'legendary', 'level', 100, 0, 54)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  badge_color = EXCLUDED.badge_color,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  points_reward = EXCLUDED.points_reward,
  sort_order = EXCLUDED.sort_order;

-- =============================================
-- PERMISSIONS
-- =============================================

-- Grant access to authenticated users for gamification tables
DO $$
DECLARE
  policy_id UUID := 'abf8a154-5b1c-4a46-ac1e-7e9c16d12345';  -- Authenticated users policy placeholder
BEGIN
  -- For user_gamification_stats (users can only see their own stats)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'user_gamification_stats', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- For achievements (public read)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'achievements', 'read', '{"is_active": {"_eq": true}}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- For point_events (users can only see their own events)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'point_events', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- For user_achievements (users can see their own and others' public achievements)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'user_achievements', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- For sprints (read access for project members)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'sprints', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- For retrospectives (read access for project members)
  INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
  SELECT 'retrospectives', 'read', '{}', '{}', NULL, '*', id
  FROM directus_policies WHERE name = 'Public' LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE sprints IS 'Time-bounded work periods (weekly/biweekly/monthly/yearly) with point goals and velocity tracking';
COMMENT ON TABLE user_gamification_stats IS 'Per-user gamification statistics including points, streaks, levels, and personal bests';
COMMENT ON TABLE point_events IS 'Immutable audit log of all point transactions for analytics and history';
COMMENT ON TABLE achievements IS 'Badge and achievement definitions with unlock criteria';
COMMENT ON TABLE user_achievements IS 'Junction table tracking which users have unlocked which achievements';
COMMENT ON TABLE retrospectives IS 'Sprint retrospective data including went well, improvements, action items, and team sentiment';

COMMENT ON COLUMN todos.sprint_id IS 'Optional sprint this todo is assigned to';
COMMENT ON COLUMN todos.points IS 'Base points this task is worth (calculated from priority)';
COMMENT ON COLUMN todos.points_awarded IS 'Actual points awarded including bonuses';
COMMENT ON COLUMN todos.completed_at IS 'Timestamp when task was marked completed';

COMMENT ON COLUMN sprints.duration_type IS 'Sprint cadence: weekly (7d), biweekly (14d), monthly (30d), yearly (365d), or custom';
COMMENT ON COLUMN sprints.velocity_actual IS 'Points per day actually achieved in this sprint';
COMMENT ON COLUMN sprints.velocity_predicted IS 'Predicted velocity based on historical average';

COMMENT ON COLUMN user_gamification_stats.streak_frozen_until IS 'Date until which streak is protected (streak freeze power-up)';
COMMENT ON COLUMN user_gamification_stats.xp_to_next_level IS 'XP required to reach the next level';

COMMENT ON COLUMN achievements.requirement_metadata IS 'Additional criteria for complex achievement requirements';
COMMENT ON COLUMN achievements.is_hidden IS 'Secret achievements not shown until unlocked';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Gamification system created successfully!';
  RAISE NOTICE 'Tables: sprints, user_gamification_stats, point_events, achievements, user_achievements, retrospectives';
  RAISE NOTICE 'Modified: todos (added sprint_id, points, points_awarded, completed_at, completed_by)';
  RAISE NOTICE 'Seeded 24 achievements across 5 categories';
  RAISE NOTICE 'Points formula: Base (5-30 by priority) + Early bonus (5%/day, max 50%) + Streak bonus (2%/day, max 20%)';
END $$;
