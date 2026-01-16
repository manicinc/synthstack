-- Migration: 050_example_project_github.sql
-- Description: Create manicinc/manicinc example project with full GitHub integration
-- This is the seeded example project for guests to explore autonomous features
-- Future: Will transition to manicinc/synthstack when public

-- =========================================
-- Create New Example Project: manic.agency
-- (Separate from the SynthStack Platform Launch project)
-- =========================================

-- First, create the project if it doesn't exist
INSERT INTO projects (
  id,
  name,
  description,
  status,
  is_system,
  github_repo,
  github_repo_owner,
  github_repo_name,
  github_sync_enabled,
  github_sync_issues,
  github_sync_prs,
  github_default_branch,
  date_created
) VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'manic.agency Website',
  E'**Live Example Project** - Explore how SynthStack''s autonomous AI agents work.\n\nThis project connects to the real [manicinc/manicinc](https://github.com/manicinc/manicinc) GitHub repository - the source code for manic.agency.\n\n## What You Can Explore:\n- 📊 GitHub velocity metrics (commits, PRs, issues)\n- 🤖 AI agent suggestions and insights\n- 📈 Gamification with complexity estimates\n- 🔄 Autonomous orchestration logs\n\n**Note:** As a guest, you can explore but cannot modify. Upgrade to Premium to use these features on your own projects.',
  'active',
  TRUE,
  'manicinc/manicinc',
  'manicinc',
  'manicinc',
  TRUE,
  TRUE,
  TRUE,
  'main',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  github_repo = EXCLUDED.github_repo,
  github_sync_enabled = EXCLUDED.github_sync_enabled;

-- Also update the original example project with GitHub integration
UPDATE projects
SET
  github_repo = 'manicinc/manicinc',
  github_sync_enabled = true,
  github_default_branch = 'main',
  github_sync_issues = true,
  github_sync_prs = true
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- =========================================
-- Agent Orchestration Schedules for manic.agency project
-- Shows what autonomous configuration looks like
-- =========================================

INSERT INTO agent_orchestration_schedules (
  project_id,
  agent_slug,
  is_enabled,
  frequency_hours,
  autonomous_mode,
  min_confidence_score,
  max_suggestions_per_run,
  cooldown_hours,
  last_run_at,
  next_run_at,
  run_count,
  date_created
) VALUES
-- Developer agent - reviews PRs and suggests improvements
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'developer',
  TRUE,
  6,
  'suggest',
  0.6,
  3,
  4,
  NOW() - INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  47,
  NOW() - INTERVAL '30 days'
),
-- Researcher agent - finds market insights
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'researcher',
  TRUE,
  24,
  'suggest',
  0.7,
  2,
  12,
  NOW() - INTERVAL '12 hours',
  NOW() + INTERVAL '12 hours',
  15,
  NOW() - INTERVAL '30 days'
),
-- Marketer agent - creates blog posts and release notes
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'marketer',
  TRUE,
  12,
  'suggest',
  0.5,
  2,
  8,
  NOW() - INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  28,
  NOW() - INTERVAL '30 days'
),
-- SEO Writer agent - improves documentation
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'seo_writer',
  TRUE,
  48,
  'suggest',
  0.5,
  1,
  24,
  NOW() - INTERVAL '24 hours',
  NOW() + INTERVAL '24 hours',
  8,
  NOW() - INTERVAL '30 days'
),
-- Designer agent - UI/UX feedback (disabled to show toggle)
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'designer',
  FALSE,
  168,
  'suggest',
  0.8,
  1,
  48,
  NULL,
  NULL,
  0,
  NOW() - INTERVAL '30 days'
)
ON CONFLICT (project_id, agent_slug) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  frequency_hours = EXCLUDED.frequency_hours,
  run_count = EXCLUDED.run_count;

-- Also add schedules for original example project (disabled)
INSERT INTO agent_orchestration_schedules (project_id, agent_slug, is_enabled, frequency_hours, autonomous_mode)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'general', false, 6, 'suggest'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'researcher', false, 6, 'suggest'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'marketer', false, 12, 'suggest'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'developer', false, 6, 'suggest'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'seo_writer', false, 24, 'suggest'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'designer', false, 24, 'suggest')
ON CONFLICT (project_id, agent_slug) DO UPDATE SET
  frequency_hours = EXCLUDED.frequency_hours,
  autonomous_mode = EXCLUDED.autonomous_mode;

-- =========================================
-- Sample Todos for manic.agency project
-- =========================================

INSERT INTO todos (id, project_id, title, description, status, priority, sort, github_issue_number, date_created) VALUES
('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f3', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Redesign hero section',
 'Update the landing page hero with new animations and messaging. See Figma design v3.',
 'in_progress', 'high', 1, 45, NOW() - INTERVAL '5 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f4', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Fix mobile navigation bug',
 'Navigation menu doesn''t close when clicking outside on mobile Safari. Related to #38.',
 'in_progress', 'urgent', 2, 38, NOW() - INTERVAL '8 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f5', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Add team page',
 'Create /team page with bios, photos, and social links for all team members.',
 'pending', 'medium', 3, 51, NOW() - INTERVAL '3 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f6', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Implement contact form',
 'Add contact form with email integration. Consider using Formspree or custom backend.',
 'pending', 'medium', 4, 52, NOW() - INTERVAL '2 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f7', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Optimize images',
 'Compress and convert images to WebP format. Current page weight is too high.',
 'pending', 'low', 5, 49, NOW() - INTERVAL '4 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f8', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Set up analytics',
 'Implement Plausible analytics with custom events for key actions.',
 'completed', 'high', 6, 35, NOW() - INTERVAL '14 days'),

('c9d0e1f2-a3b4-4c5d-e6f7-a8b9c0d1e2f9', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Deploy to Vercel',
 'Configure Vercel deployment with custom domain and SSL.',
 'completed', 'urgent', 7, 30, NOW() - INTERVAL '21 days')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  github_issue_number = EXCLUDED.github_issue_number;

-- =========================================
-- Sample Milestones for manic.agency project
-- =========================================

INSERT INTO milestones (id, project_id, title, description, target_date, status, sort, date_created) VALUES
('d0e1f2a3-b4c5-4d6e-f7a8-b9c0d1e2f3a4', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Website v2.0 Launch',
 'Complete redesign with new branding, improved performance, and mobile-first approach.',
 NOW() + INTERVAL '14 days',
 'in_progress', 1, NOW() - INTERVAL '30 days'),

('d0e1f2a3-b4c5-4d6e-f7a8-b9c0d1e2f3a5', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'SEO Optimization',
 'Improve search rankings with technical SEO fixes and content optimization.',
 NOW() + INTERVAL '28 days',
 'upcoming', 2, NOW() - INTERVAL '20 days'),

('d0e1f2a3-b4c5-4d6e-f7a8-b9c0d1e2f3a6', 'd290f1ee-6c54-4b01-90e6-d701748f0851',
 'Portfolio Showcase',
 'Add case studies and portfolio section highlighting client work.',
 NOW() + INTERVAL '45 days',
 'upcoming', 3, NOW() - INTERVAL '15 days')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_date = EXCLUDED.target_date,
  status = EXCLUDED.status;

-- =========================================
-- Sample AI Suggestions (from autonomous agents)
-- Shows what agents have generated
-- =========================================

-- Insert only if agents table exists and has rows
INSERT INTO ai_suggestions (
  id,
  agent_id,
  user_id,
  project_id,
  title,
  content,
  suggestion_type,
  status,
  confidence_score,
  context_used,
  reasoning,
  date_created
)
SELECT
  'e1f2a3b4-c5d6-4e7f-a8b9-c0d1e2f3a4b5'::uuid,
  a.id,
  NULL,
  'd290f1ee-6c54-4b01-90e6-d701748f0851'::uuid,
  'Review PR #42: Dark mode support',
  E'## PR Analysis\n\nThe dark mode implementation looks solid overall. Here are my suggestions:\n\n### ✅ Strengths\n- Uses CSS custom properties for easy theming\n- Respects `prefers-color-scheme` system preference\n- Smooth transitions between modes\n\n### ⚠️ Suggestions\n1. **Add theme persistence** - Store preference in localStorage\n2. **Review contrast ratios** - Some text may not meet WCAG AA standards in dark mode\n3. **Test with images** - Consider adding `filter: brightness(0.9)` for images',
  'code_review',
  'approved',
  0.85,
  '{"pr_diff": 234, "files_changed": 8}'::jsonb,
  'High confidence review based on established dark mode patterns.',
  NOW() - INTERVAL '2 days'
FROM ai_agents a
WHERE a.slug = 'developer'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status;

INSERT INTO ai_suggestions (
  id,
  agent_id,
  user_id,
  project_id,
  title,
  content,
  suggestion_type,
  status,
  confidence_score,
  context_used,
  reasoning,
  date_created
)
SELECT
  'e1f2a3b4-c5d6-4e7f-a8b9-c0d1e2f3a4b6'::uuid,
  a.id,
  NULL,
  'd290f1ee-6c54-4b01-90e6-d701748f0851'::uuid,
  'Blog Post: Why We Chose Astro for manic.agency',
  E'# Why We Chose Astro for Our Agency Website\n\n*A deep dive into our technology choices and lessons learned.*\n\n## The Challenge\n\nWhen redesigning manic.agency, we needed a framework that could deliver blazing-fast page loads while supporting interactive components where needed.\n\n## Why Astro?\n\n### 1. Zero JavaScript by Default\nAstro ships zero JavaScript unless you explicitly need it.\n\n### 2. Island Architecture\nWe can use React, Vue, or Svelte components exactly where needed.\n\n## Results\n\n- **Lighthouse Score:** 98/100\n- **First Contentful Paint:** 0.8s\n- **Total Page Weight:** 124KB',
  'blog_post',
  'pending_review',
  0.72,
  '{"repo_analysis": true, "tech_stack": ["astro", "tailwind"]}'::jsonb,
  'Generated based on repository technology analysis.',
  NOW() - INTERVAL '1 day'
FROM ai_agents a
WHERE a.slug = 'marketer'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status;

-- =========================================
-- Configuration for future transition to synthstack repo
-- =========================================

INSERT INTO feature_flags (key, name, description, is_enabled, category, metadata)
VALUES (
  'example_project_repo',
  'Example Project GitHub Repo',
  'GitHub repository for the seeded example project. Change to manicinc/synthstack when ready.',
  true,
  'system',
  '{
    "current_repo": "manicinc/manicinc",
    "future_repo": "manicinc/synthstack",
    "transition_notes": "Update when synthstack repo is public"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

-- =========================================
-- Comment explaining the example project access model
-- =========================================

COMMENT ON TABLE projects IS
'Projects table with GitHub integration.

GUEST ACCESS MODEL:
- Guests can VIEW the seeded example project (manicinc/manicinc)
- Guests can explore GitHub issues, PRs, and commits (read-only)
- Guests CANNOT use autonomous agent features (premium only)
- Guests CAN create local-only projects (stored in browser)
- Guests CAN connect their own PAT for viewing (not autonomous)

PREMIUM ACCESS MODEL:
- Full CRUD on projects
- GitHub integration with autonomous sync
- AI agent orchestration on configurable schedules
- All suggestion and action automation features';
