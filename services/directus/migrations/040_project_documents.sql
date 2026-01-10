-- Migration: Project Documents Management
-- Description: Create tables for project document uploads with RAG integration
-- Date: 2025-12-18

-- Create project_documents table for storing uploaded documents
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  content TEXT,
  storage_path VARCHAR(500),
  rag_indexed BOOLEAN DEFAULT false,
  rag_collection VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_created UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  user_updated UUID REFERENCES directus_users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_file_hash ON project_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_project_documents_user_created ON project_documents(user_created);
CREATE INDEX IF NOT EXISTS idx_project_documents_file_type ON project_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_project_documents_rag_collection ON project_documents(rag_collection);
CREATE INDEX IF NOT EXISTS idx_project_documents_date_created ON project_documents(date_created);

-- Create trigger to update date_updated timestamp
CREATE OR REPLACE FUNCTION update_project_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_documents_timestamp
BEFORE UPDATE ON project_documents
FOR EACH ROW
EXECUTE FUNCTION update_project_documents_timestamp();

-- Add comment to table
COMMENT ON TABLE project_documents IS 'Stores uploaded documents for projects with RAG integration';
COMMENT ON COLUMN project_documents.file_hash IS 'SHA256 hash for deduplication';
COMMENT ON COLUMN project_documents.rag_indexed IS 'Whether document has been indexed in RAG service';
COMMENT ON COLUMN project_documents.rag_collection IS 'RAG collection name (project_{project_id})';
COMMENT ON COLUMN project_documents.metadata IS 'Additional metadata (chunk_count, word_count, etc.)';
