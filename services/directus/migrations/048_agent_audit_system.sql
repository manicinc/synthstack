-- SynthStack Agent Communication & Audit System
-- Migration 048: Agent Audit Log and Knowledge Entries
--
-- This migration creates tables for:
-- - Comprehensive agent action audit logging with full provenance
-- - Knowledge extraction and cross-agent sharing
-- - Embedding support for semantic search over shared context and knowledge

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- AI Agent Audit Log
-- ============================================
-- Comprehensive audit trail for all agent actions with full context provenance
CREATE TABLE IF NOT EXISTS ai_agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  agent_slug VARCHAR(50) NOT NULL,

  -- User and context
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,

  -- Action classification
  action_type VARCHAR(50) NOT NULL,  -- 'chat', 'suggestion', 'action', 'context_share', 'knowledge_extract'
  action_category VARCHAR(50),  -- 'query', 'generation', 'analysis', 'review', 'research'
  action_description TEXT,

  -- Context sources with full provenance (JSONB array)
  -- Each entry: { source_type, source_id, content_preview, relevance_score, retrieved_at }
  context_sources JSONB DEFAULT '[]'::jsonb,

  -- Input/Output summary
  input_summary TEXT,
  output_summary TEXT,

  -- Model and resource usage
  tokens_used INTEGER,
  model_used VARCHAR(100),

  -- Status and error tracking
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  error_message TEXT,

  -- Chain of thought reasoning trace (JSONB array of reasoning steps)
  reasoning_trace JSONB DEFAULT '[]'::jsonb,

  -- Derived insights extracted from this action (JSONB array)
  -- Each entry: { insight_type, content, confidence, extracted_at }
  derived_insights JSONB DEFAULT '[]'::jsonb,

  -- Cross-project consent for knowledge sharing
  cross_project_consent BOOLEAN DEFAULT false,

  -- Performance metrics
  latency_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- AI Agent Knowledge Entries
-- ============================================
-- Extracted knowledge and learnings from agent interactions
CREATE TABLE IF NOT EXISTS ai_agent_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  source_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  source_audit_log_id UUID REFERENCES ai_agent_audit_log(id) ON DELETE SET NULL,

  -- Knowledge content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,  -- 'insight', 'decision', 'pattern', 'solution', 'reference', 'best_practice'

  -- Vector embedding for semantic search (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),

  -- Categorization
  tags TEXT[] DEFAULT '{}',
  domain VARCHAR(100),  -- 'development', 'marketing', 'design', 'seo', 'research', 'general'

  -- Quality metrics
  applicability_score DECIMAL(3,2) DEFAULT 0.5,  -- 0-1 score for how applicable this knowledge is
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'deprecated')),
  usage_count INTEGER DEFAULT 0,

  -- Cross-project sharing
  is_cross_project BOOLEAN DEFAULT false,  -- Can be shared across projects
  anonymized BOOLEAN DEFAULT false,  -- Has been anonymized for sharing

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ALTER ai_shared_context to add embedding and indexing
-- ============================================
-- Add embedding column for semantic search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Add is_indexed flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'is_indexed'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN is_indexed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index_updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'index_updated_at'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN index_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add provenance JSONB for tracking source information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'provenance'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN provenance JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add tags array for categorization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'tags'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add category for classification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_shared_context' AND column_name = 'category'
  ) THEN
    ALTER TABLE ai_shared_context ADD COLUMN category VARCHAR(50);
  END IF;
END $$;

-- ============================================
-- User Cross-Project Consent Settings
-- ============================================
-- Track user consent for cross-project knowledge sharing
CREATE TABLE IF NOT EXISTS user_cross_project_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Global consent
  global_consent BOOLEAN DEFAULT false,

  -- Per-project consent (override global)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_consent BOOLEAN,

  -- Consent details
  consent_given_at TIMESTAMP WITH TIME ZONE,
  consent_revoked_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint for user + project combination
  UNIQUE(user_id, project_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- AI Agent Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_user ON ai_agent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_agent ON ai_agent_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_project ON ai_agent_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_session ON ai_agent_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_action_type ON ai_agent_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_status ON ai_agent_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_created ON ai_agent_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_user_created ON ai_agent_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_project_created ON ai_agent_audit_log(project_id, created_at DESC);

-- Index for filtering by cross-project consent
CREATE INDEX IF NOT EXISTS idx_ai_agent_audit_log_cross_consent ON ai_agent_audit_log(cross_project_consent) WHERE cross_project_consent = true;

-- AI Agent Knowledge Entries indexes
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_user ON ai_agent_knowledge_entries(source_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_project ON ai_agent_knowledge_entries(source_project_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_agent ON ai_agent_knowledge_entries(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_type ON ai_agent_knowledge_entries(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_domain ON ai_agent_knowledge_entries(domain);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_validation ON ai_agent_knowledge_entries(validation_status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_created ON ai_agent_knowledge_entries(created_at DESC);

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_tags ON ai_agent_knowledge_entries USING GIN (tags);

-- Index for cross-project knowledge
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_cross_project ON ai_agent_knowledge_entries(is_cross_project) WHERE is_cross_project = true;

-- pgvector IVFFlat indexes for semantic search
-- Knowledge entries embedding index
CREATE INDEX IF NOT EXISTS idx_ai_agent_knowledge_entries_embedding
ON ai_agent_knowledge_entries USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Shared context embedding index
CREATE INDEX IF NOT EXISTS idx_ai_shared_context_embedding
ON ai_shared_context USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for shared context is_indexed status
CREATE INDEX IF NOT EXISTS idx_ai_shared_context_is_indexed ON ai_shared_context(is_indexed) WHERE is_indexed = true;

-- User consent indexes
CREATE INDEX IF NOT EXISTS idx_user_cross_project_consent_user ON user_cross_project_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cross_project_consent_project ON user_cross_project_consent(project_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER ai_agent_knowledge_entries_updated_at
  BEFORE UPDATE ON ai_agent_knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

CREATE TRIGGER user_cross_project_consent_updated_at
  BEFORE UPDATE ON user_cross_project_consent
  FOR EACH ROW EXECUTE FUNCTION update_ai_tables_updated_at();

-- ============================================
-- Directus Collection Registrations
-- ============================================

-- Register ai_agent_audit_log collection
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'ai_agent_audit_log',
  'history',
  'Comprehensive audit trail for all AI agent actions with full context provenance',
  '{{agent_slug}} - {{action_type}} ({{status}})',
  false,
  false,
  100
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- Register ai_agent_knowledge_entries collection
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'ai_agent_knowledge_entries',
  'lightbulb',
  'Extracted knowledge and learnings from agent interactions with embeddings for semantic search',
  '{{title}} ({{content_type}})',
  false,
  false,
  101
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- Register user_cross_project_consent collection
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'user_cross_project_consent',
  'privacy_tip',
  'User consent settings for cross-project knowledge sharing',
  '{{user_id}} - Global: {{global_consent}}',
  false,
  false,
  102
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_audit_log TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_knowledge_entries TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_cross_project_consent TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE ai_agent_audit_log IS 'Comprehensive audit trail for all AI agent actions with full context provenance tracking';
COMMENT ON TABLE ai_agent_knowledge_entries IS 'Extracted knowledge and learnings from agent interactions with embeddings for semantic search';
COMMENT ON TABLE user_cross_project_consent IS 'User consent settings for cross-project knowledge sharing';

COMMENT ON COLUMN ai_agent_audit_log.context_sources IS 'JSONB array of context sources with provenance: [{source_type, source_id, content_preview, relevance_score, retrieved_at}]';
COMMENT ON COLUMN ai_agent_audit_log.derived_insights IS 'JSONB array of insights extracted: [{insight_type, content, confidence, extracted_at}]';
COMMENT ON COLUMN ai_agent_audit_log.reasoning_trace IS 'Chain of thought reasoning steps for transparency';
COMMENT ON COLUMN ai_agent_audit_log.cross_project_consent IS 'Whether user consented to share knowledge from this action across projects';

COMMENT ON COLUMN ai_agent_knowledge_entries.embedding IS 'Vector embedding (1536 dims) for semantic similarity search';
COMMENT ON COLUMN ai_agent_knowledge_entries.applicability_score IS 'How applicable/useful this knowledge is (0-1 scale)';
COMMENT ON COLUMN ai_agent_knowledge_entries.anonymized IS 'Whether content has been anonymized for cross-project sharing';

COMMENT ON COLUMN ai_shared_context.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN ai_shared_context.provenance IS 'Source tracking information: {source_type, source_id, original_context, extraction_method}';
