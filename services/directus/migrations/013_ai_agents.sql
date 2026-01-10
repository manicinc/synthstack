-- SynthStack AI Co-Founders System
-- Migration 013: Core AI Agent Infrastructure
--
-- This migration creates the foundation for the multi-agent AI Co-Founders system
-- featuring 6 specialized agents: General, Researcher, Marketer, Developer, SEO Writer, Designer

-- ============================================
-- AI Agent Definitions
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,  -- 'general', 'researcher', 'marketer', 'developer', 'seo_writer', 'designer'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'smart_toy',
  color VARCHAR(20) DEFAULT '#6366F1',

  -- System prompt configuration
  system_prompt TEXT NOT NULL,
  personality_traits JSONB DEFAULT '[]'::jsonb,  -- e.g., ["analytical", "thorough"]
  chain_of_thought_enabled BOOLEAN DEFAULT true,

  -- Model configuration
  preferred_model VARCHAR(100) DEFAULT 'gpt-4o',
  fallback_model VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,

  -- Agent capabilities
  capabilities JSONB DEFAULT '[]'::jsonb,  -- e.g., ["rag", "web_search", "github"]
  tools_enabled JSONB DEFAULT '[]'::jsonb,  -- Available function calls

  -- Suggestion configuration
  suggestion_frequency VARCHAR(20) DEFAULT 'daily' CHECK (suggestion_frequency IN ('hourly', 'daily', 'weekly', 'on_demand')),
  proactive_enabled BOOLEAN DEFAULT false,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT true,  -- All agents are premium
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Agent Prompt Templates (Reusable)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Template identification
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- e.g., 'analysis', 'generation', 'review'

  -- Template content
  template TEXT NOT NULL,  -- Uses {{variable}} syntax
  variables JSONB DEFAULT '[]'::jsonb,  -- Required variables with descriptions

  -- Chain of thought configuration
  reasoning_steps JSONB DEFAULT '[]'::jsonb,  -- Step-by-step reasoning prompts
  output_format VARCHAR(50) DEFAULT 'markdown',  -- 'markdown', 'json', 'code', 'html'

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),

  -- Status
  is_public BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(agent_id, slug)
);

-- ============================================
-- Agent Sessions (per-user, per-agent conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Session context
  title VARCHAR(255),
  context JSONB DEFAULT '{}'::jsonb,  -- Agent-specific session context
  shared_context JSONB DEFAULT '[]'::jsonb,  -- Context shared from other agents

  -- Session state
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Agent Messages
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,

  -- Message content
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,

  -- AI metadata
  model VARCHAR(100),
  tokens_used INTEGER,
  reasoning_trace JSONB,  -- Chain of thought steps
  context_used JSONB,  -- RAG sources used

  -- Tool calls (for function calling)
  tool_calls JSONB,
  tool_results JSONB,

  -- Shared context reference
  shared_from_agent VARCHAR(50),  -- If content was shared from another agent

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI Suggestions (Proactive recommendations - ALL require approval)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,

  -- Suggestion content
  type VARCHAR(50) NOT NULL,  -- 'blog_post', 'pr', 'marketing_content', 'seo_improvement', 'design_feedback', 'research_report'
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,  -- Full draft content

  -- Draft data (structured content ready to be published)
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Structured data for the draft
  target_collection VARCHAR(100),  -- Directus collection to publish to
  target_entity_id UUID,  -- If updating existing entity

  -- Context
  context_type VARCHAR(50),  -- 'website', 'repository', 'content', 'analytics'
  context_reference VARCHAR(500),  -- URL, repo name, etc.

  -- Priority and status (ALL start as draft, require human approval)
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published', 'expired')),

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Human review (required for all actions)
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- Feedback
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Agent Actions (Track executed actions - all require prior approval)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,
  suggestion_id UUID REFERENCES ai_suggestions(id) ON DELETE SET NULL,

  -- Action details
  action_type VARCHAR(50) NOT NULL,  -- 'create_pr', 'publish_blog', 'create_issue', 'update_content', etc.
  action_data JSONB NOT NULL,  -- Input parameters

  -- Execution (only runs after human approval)
  status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'in_progress', 'completed', 'failed', 'cancelled')),
  result JSONB,  -- Output/result data
  error_message TEXT,

  -- Human approval (REQUIRED)
  approved_by UUID REFERENCES app_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Agent Knowledge Bases (Both shared and agent-specific)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,  -- NULL for shared/common knowledge
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,  -- NULL for global knowledge

  -- Document info
  document_type VARCHAR(50) NOT NULL,  -- 'website', 'repository', 'file', 'api_doc', 'cms_content'
  source_url VARCHAR(500),
  source_collection VARCHAR(100),  -- Directus collection name
  source_item_id UUID,  -- Directus item ID
  title VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,

  -- Vector DB reference
  vector_collection VARCHAR(100) NOT NULL,  -- Qdrant collection name
  chunk_count INTEGER DEFAULT 0,

  -- Access control
  is_shared BOOLEAN DEFAULT true,  -- If true, all agents can access; if false, only agent_id can access

  -- Sync status
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency VARCHAR(20) DEFAULT 'daily',
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'stale')),
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User Agent Settings (Per-user customization)
-- ============================================
CREATE TABLE IF NOT EXISTS user_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- User preferences
  is_enabled BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  suggestion_frequency VARCHAR(20),  -- Overrides agent default

  -- Custom configuration
  custom_instructions TEXT,  -- Additional user-specific instructions
  preferred_model VARCHAR(100),  -- Override agent's model
  temperature DECIMAL(3,2),  -- Override agent's temperature

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, agent_id)
);

-- ============================================
-- GitHub Integration (PAT-based, no bot needed)
-- ============================================
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,

  -- GitHub credentials (encrypted)
  github_pat_encrypted TEXT NOT NULL,  -- Encrypted PAT using AES-256-GCM
  github_username VARCHAR(100) NOT NULL,

  -- Repository access
  accessible_repos JSONB DEFAULT '[]'::jsonb,  -- List of repos the agent can access
  default_repo VARCHAR(255),
  default_branch VARCHAR(100) DEFAULT 'main',

  -- Permissions (all require human approval before execution)
  can_create_pr BOOLEAN DEFAULT true,
  can_create_issues BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  can_read_code BOOLEAN DEFAULT true,
  can_analyze_repo BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_error TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Shared Context (Cross-agent knowledge sharing)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_shared_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Context content
  content TEXT NOT NULL,
  context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('insight', 'decision', 'data', 'reference', 'research')),

  -- Target agents (empty array = all agents)
  target_agent_ids UUID[] DEFAULT '{}',

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- AI Agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agents_enabled ON ai_agents(is_enabled) WHERE is_enabled = true;

-- Agent Prompts
CREATE INDEX IF NOT EXISTS idx_ai_agent_prompts_agent ON ai_agent_prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_prompts_category ON ai_agent_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_agent_prompts_slug ON ai_agent_prompts(slug);

-- Agent Sessions
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_user ON ai_agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_agent ON ai_agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_status ON ai_agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_user_agent ON ai_agent_sessions(user_id, agent_id);

-- Agent Messages
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_session ON ai_agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_created ON ai_agent_messages(created_at);

-- Suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_agent ON ai_suggestions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON ai_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_pending ON ai_suggestions(user_id) WHERE status IN ('draft', 'pending_review');

-- Actions
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_user ON ai_agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_agent ON ai_agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_status ON ai_agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_suggestion ON ai_agent_actions(suggestion_id);

-- Knowledge
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_agent ON ai_agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_user ON ai_agent_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_shared ON ai_agent_knowledge(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_type ON ai_agent_knowledge(document_type);

-- User Settings
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_user ON user_agent_settings(user_id);

-- GitHub
CREATE INDEX IF NOT EXISTS idx_github_integrations_user ON github_integrations(user_id);

-- Shared Context
CREATE INDEX IF NOT EXISTS idx_ai_shared_context_user ON ai_shared_context(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_shared_context_from_agent ON ai_shared_context(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_shared_context_target ON ai_shared_context USING GIN (target_agent_ids);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_ai_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER ai_agent_prompts_updated_at
  BEFORE UPDATE ON ai_agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER ai_agent_sessions_updated_at
  BEFORE UPDATE ON ai_agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER ai_suggestions_updated_at
  BEFORE UPDATE ON ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER ai_agent_knowledge_updated_at
  BEFORE UPDATE ON ai_agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER user_agent_settings_updated_at
  BEFORE UPDATE ON user_agent_settings
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER github_integrations_updated_at
  BEFORE UPDATE ON github_integrations
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agents TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_prompts TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_sessions TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_messages TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestions TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_actions TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_knowledge TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_agent_settings TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON github_integrations TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_shared_context TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE ai_agents IS 'AI Co-Founder agent definitions - 6 specialized agents (General, Researcher, Marketer, Developer, SEO Writer, Designer)';
COMMENT ON TABLE ai_agent_prompts IS 'Reusable prompt templates with chain-of-thought reasoning for each agent';
COMMENT ON TABLE ai_agent_sessions IS 'User conversation sessions per agent with context tracking';
COMMENT ON TABLE ai_agent_messages IS 'Individual messages within agent sessions including reasoning traces';
COMMENT ON TABLE ai_suggestions IS 'Proactive AI recommendations - ALL saved as drafts requiring human approval';
COMMENT ON TABLE ai_agent_actions IS 'Actions executed by agents (PRs, blog posts, etc.) - ALL require human approval';
COMMENT ON TABLE ai_agent_knowledge IS 'Agent knowledge bases - both shared common RAG and agent-specific';
COMMENT ON TABLE user_agent_settings IS 'Per-user, per-agent customization settings';
COMMENT ON TABLE github_integrations IS 'GitHub PAT storage for Developer agent - encrypted, PAT-based (no bot)';
COMMENT ON TABLE ai_shared_context IS 'Cross-agent context sharing for collaborative intelligence';
COMMENT ON COLUMN ai_suggestions.status IS 'All suggestions start as draft and require human approval before any action';
COMMENT ON COLUMN ai_agent_actions.status IS 'All actions require pending_approval -> approved before execution';
