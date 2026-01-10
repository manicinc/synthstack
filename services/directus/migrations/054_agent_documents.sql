-- =============================================
-- Migration: Agent-Specific Document Collections
-- =============================================
-- Creates agent_documents table for storing
-- agent-specific knowledge base documents
-- that supplement the global RAG docs.
-- =============================================

-- Agent Documents Collection
CREATE TABLE IF NOT EXISTS agent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'published',
  sort INTEGER,

  -- Document Identity
  agent_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100),
  description TEXT,

  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'markdown',

  -- Scope
  is_global BOOLEAN DEFAULT false,  -- If true, accessible to ALL agents

  -- Vector embedding reference
  embedding_id VARCHAR(100),
  embedding_model VARCHAR(50),
  last_embedded_at TIMESTAMPTZ,

  -- Categorization
  category VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_docs_agent ON agent_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_docs_global ON agent_documents(is_global);
CREATE INDEX IF NOT EXISTS idx_agent_docs_status ON agent_documents(status);
CREATE INDEX IF NOT EXISTS idx_agent_docs_category ON agent_documents(category);

-- Composite index for agent + global queries
CREATE INDEX IF NOT EXISTS idx_agent_docs_agent_global
ON agent_documents(agent_id, is_global) WHERE status = 'published';

-- Register collection in Directus
INSERT INTO directus_collections (collection, icon, note, sort, singleton, accountability, translations)
VALUES (
  'agent_documents',
  'library_books',
  'Agent-specific knowledge base documents for AI copilot RAG',
  55,
  false,
  'all',
  '[{"language": "en-US", "translation": "Agent Documents"}]'
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note;

-- Register fields in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
VALUES
  -- Identity
  ('agent_documents', 'id', 'uuid', 'input', '{"iconLeft": "vpn_key"}', 'raw', NULL, true, true, 1, 'half', NULL, NULL, NULL, false, NULL),
  ('agent_documents', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Published", "value": "published"}, {"text": "Draft", "value": "draft"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"showAsDot": true, "choices": [{"text": "Published", "value": "published", "foreground": "#FFFFFF", "background": "#00C897"}, {"text": "Draft", "value": "draft", "foreground": "#18222F", "background": "#D3DAE4"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#F7971C"}]}', false, false, 2, 'half', NULL, NULL, NULL, false, NULL),
  ('agent_documents', 'sort', NULL, 'input', '{"iconLeft": "sort"}', 'raw', NULL, false, false, 3, 'half', NULL, 'Display order', NULL, false, NULL),

  -- Agent assignment
  ('agent_documents', 'agent_id', NULL, 'select-dropdown',
   '{"choices": [
     {"text": "General Assistant", "value": "general"},
     {"text": "Research Agent", "value": "researcher"},
     {"text": "Marketing Agent", "value": "marketer"},
     {"text": "Developer Agent", "value": "developer"},
     {"text": "SEO Writer", "value": "seo_writer"},
     {"text": "Design Agent", "value": "designer"},
     {"text": "Global (All Agents)", "value": "global"}
   ]}',
   'labels',
   '{"showAsDot": true, "choices": [
     {"text": "General", "value": "general", "foreground": "#FFFFFF", "background": "#6366F1"},
     {"text": "Research", "value": "researcher", "foreground": "#FFFFFF", "background": "#10B981"},
     {"text": "Marketing", "value": "marketer", "foreground": "#18222F", "background": "#F59E0B"},
     {"text": "Developer", "value": "developer", "foreground": "#FFFFFF", "background": "#3B82F6"},
     {"text": "SEO", "value": "seo_writer", "foreground": "#FFFFFF", "background": "#8B5CF6"},
     {"text": "Design", "value": "designer", "foreground": "#FFFFFF", "background": "#EC4899"},
     {"text": "Global", "value": "global", "foreground": "#FFFFFF", "background": "#059669"}
   ]}',
   false, false, 4, 'half', NULL, 'Agent this document belongs to', NULL, true, NULL),

  ('agent_documents', 'is_global', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 5, 'half', NULL, 'Accessible to all agents', NULL, false, NULL),

  -- Document content
  ('agent_documents', 'title', NULL, 'input', '{"iconLeft": "title"}', 'raw', NULL, false, false, 6, 'full', NULL, 'Document title', NULL, true, NULL),
  ('agent_documents', 'slug', NULL, 'input', '{"iconLeft": "link", "slug": true}', 'raw', NULL, false, false, 7, 'half', NULL, 'URL-friendly identifier', NULL, false, NULL),
  ('agent_documents', 'description', NULL, 'input-multiline', '{"rows": 2}', 'raw', NULL, false, false, 8, 'full', NULL, 'Brief description', NULL, false, NULL),
  ('agent_documents', 'content', NULL, 'input-code', '{"language": "markdown", "lineNumber": true}', 'raw', NULL, false, false, 9, 'full', NULL, 'Document content (Markdown)', NULL, true, NULL),
  ('agent_documents', 'content_type', NULL, 'select-dropdown', '{"choices": [{"text": "Markdown", "value": "markdown"}, {"text": "Plain Text", "value": "text"}, {"text": "HTML", "value": "html"}]}', 'raw', NULL, false, false, 10, 'half', NULL, NULL, NULL, false, NULL),

  -- Categorization
  ('agent_documents', 'category', NULL, 'input', '{"iconLeft": "category"}', 'raw', NULL, false, false, 11, 'half', NULL, 'Document category', NULL, false, NULL),
  ('agent_documents', 'tags', 'cast-json', 'tags', NULL, 'raw', NULL, false, false, 12, 'full', NULL, 'Tags for filtering', NULL, false, NULL),

  -- Embedding info (read-only, managed by system)
  ('agent_documents', 'embedding_group', 'alias,no-data,group', 'group-detail', '{"start": "closed"}', NULL, NULL, false, false, 13, 'full', '[{"language": "en-US", "translation": "Vector Embedding"}]', NULL, NULL, false, NULL),
  ('agent_documents', 'embedding_id', NULL, 'input', '{"iconLeft": "fingerprint"}', 'raw', NULL, true, false, 14, 'half', NULL, 'Vector embedding ID in Qdrant', NULL, false, 'embedding_group'),
  ('agent_documents', 'embedding_model', NULL, 'input', '{"iconLeft": "model_training"}', 'raw', NULL, true, false, 15, 'half', NULL, 'Model used for embedding', NULL, false, 'embedding_group'),
  ('agent_documents', 'last_embedded_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', true, false, 16, 'half', NULL, 'Last embedding update', NULL, false, 'embedding_group'),

  -- Metadata
  ('agent_documents', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', true, true, 17, 'half', NULL, NULL, NULL, false, NULL),
  ('agent_documents', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', true, true, 18, 'half', NULL, NULL, NULL, false, NULL),
  ('agent_documents', 'user_created', 'user-created', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 19, 'half', NULL, NULL, NULL, false, NULL),
  ('agent_documents', 'user_updated', 'user-updated', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 20, 'half', NULL, NULL, NULL, false, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  special = EXCLUDED.special,
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  readonly = EXCLUDED.readonly,
  hidden = EXCLUDED.hidden,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width,
  translations = EXCLUDED.translations,
  note = EXCLUDED.note,
  "group" = EXCLUDED."group";

-- Public read access for published documents
INSERT INTO directus_permissions (role, collection, action, permissions, validation, presets, fields)
VALUES
  (NULL, 'agent_documents', 'read', '{"status": {"_eq": "published"}}', '{}', NULL, '*')
ON CONFLICT DO NOTHING;

-- =============================================
-- Seed Initial Agent Documents
-- =============================================

-- Global docs (accessible to all agents)
INSERT INTO agent_documents (agent_id, title, slug, content, is_global, category, status)
VALUES
  ('global', 'SynthStack Platform Overview', 'platform-overview',
   '# SynthStack Platform

SynthStack is an AI-native SaaS boilerplate designed for building modern applications with integrated AI capabilities.

## Key Features
- **AI Copilot**: Intelligent assistant powered by multiple specialized agents
- **Project Management**: Create and manage projects with AI-enhanced workflows
- **Team Collaboration**: Invite team members and collaborate in real-time
- **API Integration**: RESTful APIs with comprehensive documentation

## Getting Started
1. Create a new project from the dashboard
2. Configure your project settings
3. Invite team members
4. Start using AI agents to accelerate your work

## Support
Contact support@synthstack.app for assistance.',
   true, 'getting-started', 'published'),

  ('global', 'AI Agents Guide', 'ai-agents-guide',
   '# AI Agents

SynthStack includes specialized AI agents for different tasks:

## Available Agents

### General Assistant
Your all-purpose helper for questions and tasks.

### Research Agent
Deep research and competitive analysis specialist.

### Marketing Agent
Content strategy, campaigns, and growth tactics.

### Developer Agent
Code assistance, API integration, and technical guidance.

### SEO Writer
Search-optimized content creation.

### Design Agent
UI/UX and visual design recommendations.

## Switching Agents
Click the agent selector in the copilot panel to switch between agents. Each agent maintains its own conversation history.',
   true, 'features', 'published')
ON CONFLICT DO NOTHING;

-- Agent-specific docs
INSERT INTO agent_documents (agent_id, title, slug, content, is_global, category, status)
VALUES
  ('researcher', 'Research Methodology', 'research-methodology',
   '# Research Methodology

When conducting research:

## Best Practices
1. Define clear research questions
2. Use multiple authoritative sources
3. Cross-reference information
4. Cite sources properly
5. Synthesize findings into actionable insights

## Research Types
- **Competitive Analysis**: Analyze competitor products, pricing, features
- **Market Research**: Identify trends, opportunities, market size
- **User Research**: Understand user needs, pain points, behaviors
- **Technical Research**: Evaluate technologies, frameworks, solutions',
   false, 'methodology', 'published'),

  ('developer', 'API Documentation', 'api-documentation',
   '# SynthStack API

Base URL: `/api/v1`

## Authentication
Include Bearer token in Authorization header.

## Endpoints

### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project
- `PATCH /projects/:id` - Update project

### AI Chat
- `POST /copilot/chat` - Send message to AI
- `GET /copilot/conversations` - List conversations

## Rate Limits
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour',
   false, 'api', 'published'),

  ('marketer', 'Brand Guidelines', 'brand-guidelines',
   '# Brand Guidelines

## Voice & Tone
- Professional yet approachable
- Clear and concise
- Action-oriented
- Empowering

## Key Messages
- AI-native from the ground up
- Built for modern teams
- Accelerate your workflow

## Target Audience
- Founders and entrepreneurs
- Product managers
- Development teams
- Marketing professionals',
   false, 'brand', 'published'),

  ('seo_writer', 'SEO Best Practices', 'seo-best-practices',
   '# SEO Best Practices

## On-Page SEO
- Target one primary keyword per page
- Include keyword in title, H1, meta description
- Use natural keyword placement in content
- Optimize images with alt text

## Content Structure
- Use descriptive H2/H3 headings
- Write scannable paragraphs (2-3 sentences)
- Include internal and external links
- Add structured data where appropriate

## E-E-A-T Principles
- Experience: Share first-hand knowledge
- Expertise: Demonstrate subject authority
- Authoritativeness: Build credibility
- Trustworthiness: Be accurate and transparent',
   false, 'seo', 'published'),

  ('designer', 'Design System', 'design-system',
   '# SynthStack Design System

## Colors
- Primary: #6366F1 (Indigo)
- Success: #10B981 (Emerald)
- Warning: #F59E0B (Amber)
- Error: #EF4444 (Red)

## Typography
- Headings: Inter, sans-serif
- Body: Inter, sans-serif
- Code: JetBrains Mono, monospace

## Spacing
- Base unit: 4px
- Common: 8, 12, 16, 24, 32, 48, 64

## Components
- Use Quasar framework components
- Follow Material Design principles
- Ensure accessibility (WCAG 2.1 AA)',
   false, 'design', 'published')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE agent_documents IS 'Agent-specific knowledge base documents for AI copilot RAG system';
