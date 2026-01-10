-- SynthStack AI Copilot Chat Tables
-- Migration 007: Chat history and document indexing

-- Copilot chat sessions
CREATE TABLE IF NOT EXISTS copilot_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Copilot messages
CREATE TABLE IF NOT EXISTS copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES copilot_chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  model VARCHAR(100),
  tokens_used INTEGER,
  context_used JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Copilot document indexing queue
-- Tracks which documents have been indexed in the vector database
CREATE TABLE IF NOT EXISTS copilot_indexed_documents (
  id VARCHAR(255) PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_copilot_chats_user_id ON copilot_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_chats_created_at ON copilot_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_chat_id ON copilot_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_created_at ON copilot_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_copilot_indexed_documents_type ON copilot_indexed_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_copilot_indexed_documents_updated_at ON copilot_indexed_documents(updated_at DESC);

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_copilot_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copilot_chats_updated_at
  BEFORE UPDATE ON copilot_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_copilot_chat_updated_at();

CREATE TRIGGER copilot_indexed_documents_updated_at
  BEFORE UPDATE ON copilot_indexed_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_copilot_chat_updated_at();

-- Grant permissions to app role
GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_chats TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_messages TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON copilot_indexed_documents TO synthstack;

-- Comments
COMMENT ON TABLE copilot_chats IS 'AI Copilot chat sessions for users';
COMMENT ON TABLE copilot_messages IS 'Individual messages within copilot chat sessions';
COMMENT ON TABLE copilot_indexed_documents IS 'Tracks documents indexed in vector database for RAG';
COMMENT ON COLUMN copilot_messages.context_used IS 'RAG context snippets used to generate response';
COMMENT ON COLUMN copilot_indexed_documents.content_hash IS 'SHA-256 hash of content to detect changes';
