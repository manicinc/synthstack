-- Migration: 038_synthstack_example_project.sql
-- Description: Add is_system flag to projects and create comprehensive SynthStack example project
-- System projects cannot be deleted by regular users, only admins

-- =========================================
-- Add is_system column to projects table
-- =========================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Create index for quick system project lookups
CREATE INDEX IF NOT EXISTS idx_projects_is_system ON projects(is_system) WHERE is_system = TRUE;

-- Register the new field with Directus
UPDATE directus_fields
SET
  readonly = true,
  note = 'System projects cannot be deleted by users'
WHERE collection = 'projects' AND field = 'is_system';

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, required, "group", note)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.required,
  v."group",
  v.note
FROM (
  VALUES (
    'projects',
    'is_system',
    NULL,
    'boolean',
    '{"label": "System Project"}',
    'boolean',
    '{"labelOn": "System", "labelOff": "User"}',
    true,
    false,
    99,
    'half',
    false,
    NULL,
    'System projects cannot be deleted by users'
  )
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, required, "group", note)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =========================================
-- Clear existing seed data and recreate
-- =========================================

-- Delete existing sample data to recreate fresh
DELETE FROM marketing_plans WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
DELETE FROM milestones WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
DELETE FROM todos WHERE project_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
DELETE FROM projects WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- =========================================
-- Create SynthStack Example Project (System)
-- =========================================
INSERT INTO projects (id, name, description, status, is_system, date_created)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'SynthStack Platform Launch',
  E'Example project demonstrating SynthStack''s project management capabilities.\n\nThis project tracks the development and launch of a modern AI-powered SaaS platform, showcasing:\n- Milestone tracking\n- Todo management with priorities\n- Marketing plan integration\n- AI copilot suggestions\n\n**Note:** This is a system project and cannot be deleted.',
  'active',
  TRUE,
  NOW()
);

-- =========================================
-- Phase 1: Foundation Todos (Completed)
-- =========================================
INSERT INTO todos (id, project_id, title, description, status, priority, sort, date_created) VALUES
-- Infrastructure
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f01', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Set up monorepo structure',
 'Configure pnpm workspaces with apps/web, packages/api-gateway, packages/ml-service',
 'completed', 'urgent', 1, NOW() - INTERVAL '30 days'),

('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f02', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Configure Docker Compose',
 'Set up development environment with PostgreSQL, Redis, Qdrant, Directus, and all services',
 'completed', 'urgent', 2, NOW() - INTERVAL '29 days'),

('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f03', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Set up CI/CD pipeline',
 'Configure GitHub Actions for linting, testing, and deployment workflows',
 'completed', 'high', 3, NOW() - INTERVAL '28 days'),

('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f04', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Implement authentication system',
 'Integrate Supabase Auth with JWT tokens and session management',
 'completed', 'urgent', 4, NOW() - INTERVAL '25 days'),

('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f05', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Create database migrations',
 'Design and implement all SQL migrations for projects, todos, milestones, and more',
 'completed', 'high', 5, NOW() - INTERVAL '24 days'),

-- =========================================
-- Phase 2: Core Features (In Progress)
-- =========================================
('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a11', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Build AI Copilot Hub',
 'Create the main AI assistant interface with chat, suggestions, and project context awareness',
 'in_progress', 'urgent', 10, NOW() - INTERVAL '14 days'),

('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a12', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Implement RAG pipeline',
 'Set up document ingestion, embedding generation, and vector search with Qdrant',
 'in_progress', 'high', 11, NOW() - INTERVAL '12 days'),

('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a13', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Create project management UI',
 'Build projects list, detail views, and CRUD operations with Quasar components',
 'in_progress', 'high', 12, NOW() - INTERVAL '10 days'),

('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Add AI Co-Founders panel',
 'Implement the 6 specialized AI agents (Product, Engineer, Marketing, Design, Data, Support)',
 'in_progress', 'medium', 13, NOW() - INTERVAL '7 days'),

-- =========================================
-- Phase 3: Polish & Launch (Pending)
-- =========================================
('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b21', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Design landing page',
 'Create compelling hero section with animated box, feature highlights, and CTAs',
 'pending', 'high', 20, NOW() - INTERVAL '5 days'),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b22', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Write API documentation',
 'Document all REST endpoints with OpenAPI/Swagger specs',
 'pending', 'medium', 21, NOW() - INTERVAL '4 days'),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b23', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Create user onboarding flow',
 'Build step-by-step wizard for new user setup and project creation',
 'pending', 'medium', 22, NOW() - INTERVAL '3 days'),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b24', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Implement subscription billing',
 'Integrate Stripe for payment processing with tiered pricing (Maker, Pro, Unlimited)',
 'pending', 'high', 23, NOW() - INTERVAL '2 days'),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b25', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Set up error monitoring',
 'Configure Sentry or similar for production error tracking and alerting',
 'pending', 'medium', 24, NOW() - INTERVAL '1 day'),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b26', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Performance optimization',
 'Audit and optimize bundle size, implement lazy loading, add caching strategies',
 'pending', 'low', 25, NOW()),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b27', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Security audit',
 'Review OWASP top 10, implement CSP headers, audit dependencies',
 'pending', 'high', 26, NOW()),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b28', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Write end-to-end tests',
 'Create Playwright tests for critical user flows (auth, projects, copilot)',
 'pending', 'medium', 27, NOW()),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b29', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Prepare ProductHunt launch',
 'Create assets, write copy, schedule launch, prepare for feedback',
 'pending', 'low', 28, NOW()),

('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b30', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Set up analytics dashboard',
 'Implement user analytics, feature usage tracking, and conversion funnels',
 'pending', 'low', 29, NOW())

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  sort = EXCLUDED.sort;

-- =========================================
-- Milestones
-- =========================================
INSERT INTO milestones (id, project_id, title, description, target_date, status, sort, date_created) VALUES

('a7b8c9d0-e1f2-4a3b-c4d5-e6f7a8b9c0d1', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Infrastructure Complete',
 'All foundational services deployed and configured:\n- Docker environment\n- CI/CD pipelines\n- Database migrations\n- Authentication system',
 NOW() - INTERVAL '20 days',
 'completed', 1, NOW() - INTERVAL '30 days'),

('a7b8c9d0-e1f2-4a3b-c4d5-e6f7a8b9c0d2', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Alpha Release',
 'Internal testing version with core features:\n- Project management\n- AI Copilot chat\n- Basic dashboard',
 NOW() + INTERVAL '7 days',
 'in_progress', 2, NOW() - INTERVAL '20 days'),

('a7b8c9d0-e1f2-4a3b-c4d5-e6f7a8b9c0d3', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Beta Launch',
 'Public beta with early adopters:\n- Full feature set\n- Onboarding flow\n- Feedback collection',
 NOW() + INTERVAL '21 days',
 'upcoming', 3, NOW() - INTERVAL '15 days'),

('a7b8c9d0-e1f2-4a3b-c4d5-e6f7a8b9c0d4', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'Production Launch',
 'Full public launch:\n- Marketing campaign\n- ProductHunt launch\n- Press coverage',
 NOW() + INTERVAL '45 days',
 'upcoming', 4, NOW() - INTERVAL '10 days'),

('a7b8c9d0-e1f2-4a3b-c4d5-e6f7a8b9c0d5', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
 'First 100 Customers',
 'Growth milestone:\n- Product-market fit validation\n- Customer success stories\n- Referral program launch',
 NOW() + INTERVAL '90 days',
 'upcoming', 5, NOW() - INTERVAL '5 days')

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_date = EXCLUDED.target_date,
  status = EXCLUDED.status,
  sort = EXCLUDED.sort;

-- =========================================
-- Marketing Plan
-- =========================================
INSERT INTO marketing_plans (id, project_id, title, content, status, budget, start_date, end_date, date_created)
VALUES (
  'b8c9d0e1-f2a3-4b4c-d5e6-f7a8b9c0d1e2',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'SynthStack Launch Campaign Q1 2025',
  '{
    "overview": "Multi-channel launch campaign targeting indie hackers, startup founders, and small agency owners",
    "target_audience": [
      "Indie hackers building SaaS products",
      "Small agency owners (1-10 employees)",
      "Solo developers wanting to ship faster",
      "Startup founders in early stages"
    ],
    "channels": {
      "primary": ["ProductHunt", "Twitter/X", "LinkedIn", "Hacker News"],
      "secondary": ["Dev.to", "Reddit (r/SideProject, r/startups)", "YouTube", "Newsletter sponsorships"]
    },
    "messaging": {
      "headline": "Your Agency in a Box",
      "subheadline": "6 AI Co-Founders that know your business and take action",
      "value_props": [
        "Ship 10x faster with AI-powered development",
        "Complete SaaS boilerplate with CMS, auth, payments",
        "AI agents that write code, content, and marketing",
        "One-click deployment to production"
      ]
    },
    "tactics": [
      {
        "channel": "ProductHunt",
        "timing": "Launch day",
        "assets": ["Demo video", "Screenshot gallery", "Founder story"],
        "goal": "Top 5 Product of the Day"
      },
      {
        "channel": "Twitter/X",
        "timing": "Pre-launch + Launch week",
        "assets": ["Build in public thread", "Feature demos", "Behind the scenes"],
        "goal": "1000+ impressions per post"
      },
      {
        "channel": "Content Marketing",
        "timing": "Ongoing",
        "assets": ["Technical blog posts", "Tutorial videos", "Case studies"],
        "goal": "SEO ranking for AI SaaS boilerplate"
      }
    ],
    "kpis": {
      "week_1": {
        "signups": 500,
        "trial_starts": 100,
        "paid_conversions": 10
      },
      "month_1": {
        "signups": 2000,
        "trial_starts": 400,
        "paid_conversions": 50,
        "mrr_target": 2500
      }
    },
    "budget_breakdown": {
      "influencer_partnerships": 1500,
      "paid_ads": 1000,
      "tools_and_software": 500,
      "content_creation": 500,
      "contingency": 500
    }
  }',
  'active',
  4000.00,
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '60 days',
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  budget = EXCLUDED.budget,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date;

-- =========================================
-- Grant read-only access to system projects
-- for demo users (they can view but not modify)
-- =========================================

-- Note: The existing permissions from 024_projects_system.sql
-- already grant read access. System projects are protected
-- at the API layer, not the database layer.
