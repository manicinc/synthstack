-- Migration: 101_kb_ingestion
-- Description: Knowledge base ingestion tracking
-- Created: 2026-01-07

-- KB ingestion logs
CREATE TABLE IF NOT EXISTS kb_ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) NOT NULL,
  
  -- Source info
  source VARCHAR(50) NOT NULL, -- url, text, gdrive, notion, file
  source_url TEXT,
  source_id VARCHAR(255), -- file ID, page ID, etc.
  
  -- Ingestion stats
  document_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  total_characters INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- pending, processing, completed, failed
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_kb_ingestion_org ON kb_ingestion_logs(organization_id);
CREATE INDEX idx_kb_ingestion_collection ON kb_ingestion_logs(collection_name);
CREATE INDEX idx_kb_ingestion_created ON kb_ingestion_logs(created_at DESC);

-- KB collections (track what collections exist per org)
CREATE TABLE IF NOT EXISTS kb_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Stats
  document_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  last_ingestion_at TIMESTAMPTZ,
  
  -- Settings
  default_chunk_size INTEGER DEFAULT 1000,
  default_chunk_overlap INTEGER DEFAULT 200,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);

-- Indexes
CREATE INDEX idx_kb_collections_org ON kb_collections(organization_id);

-- Trigger to update collection stats after ingestion
CREATE OR REPLACE FUNCTION update_kb_collection_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO kb_collections (organization_id, name, document_count, chunk_count, last_ingestion_at)
  VALUES (NEW.organization_id, NEW.collection_name, NEW.document_count, NEW.chunk_count, NOW())
  ON CONFLICT (organization_id, name) DO UPDATE SET
    document_count = kb_collections.document_count + NEW.document_count,
    chunk_count = kb_collections.chunk_count + NEW.chunk_count,
    last_ingestion_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kb_collection_stats
  AFTER INSERT ON kb_ingestion_logs
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_kb_collection_stats();

-- KB sources (track connected knowledge sources)
CREATE TABLE IF NOT EXISTS kb_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES kb_collections(id) ON DELETE SET NULL,
  
  -- Source type and config
  source_type VARCHAR(50) NOT NULL, -- gdrive_folder, notion_database, url_sitemap, manual
  source_config JSONB NOT NULL DEFAULT '{}',
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT false,
  sync_frequency VARCHAR(20) DEFAULT 'daily', -- hourly, daily, weekly, manual
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kb_sources_org ON kb_sources(organization_id);
CREATE INDEX idx_kb_sources_sync ON kb_sources(sync_enabled, next_sync_at) WHERE sync_enabled = true;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
VALUES 
  ('kb_ingestion_logs', 'upload_file', 'Knowledge base ingestion history', false, false),
  ('kb_collections', 'folder_special', 'Knowledge base collections', false, false),
  ('kb_sources', 'source', 'Connected knowledge sources for auto-sync', false, false)
ON CONFLICT (collection) DO NOTHING;

-- Add KB limits to flow_limits
ALTER TABLE nodered_flow_limits 
  ADD COLUMN IF NOT EXISTS max_kb_documents INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_kb_collections INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS kb_sync_enabled BOOLEAN DEFAULT false;

-- Update tier defaults
UPDATE nodered_flow_limits SET
  max_kb_documents = CASE 
    WHEN tier = 'free' THEN 0
    WHEN tier = 'pro' THEN 5000
    WHEN tier = 'agency' THEN 25000
    WHEN tier = 'enterprise' THEN 100000
    WHEN tier = 'lifetime' THEN 50000
    ELSE 0
  END,
  max_kb_collections = CASE 
    WHEN tier = 'free' THEN 0
    WHEN tier = 'pro' THEN 5
    WHEN tier = 'agency' THEN 20
    WHEN tier = 'enterprise' THEN 100
    WHEN tier = 'lifetime' THEN 25
    ELSE 0
  END,
  kb_sync_enabled = CASE 
    WHEN tier IN ('agency', 'enterprise', 'lifetime') THEN true
    ELSE false
  END;

-- Function to get KB usage stats
CREATE OR REPLACE FUNCTION get_kb_usage_stats(p_organization_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  collection_count BIGINT,
  source_count BIGINT,
  last_ingestion TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(c.document_count), 0) as total_documents,
    COALESCE(SUM(c.chunk_count), 0) as total_chunks,
    COUNT(DISTINCT c.id) as collection_count,
    (SELECT COUNT(*) FROM kb_sources WHERE organization_id = p_organization_id) as source_count,
    MAX(c.last_ingestion_at) as last_ingestion
  FROM kb_collections c
  WHERE c.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql;


