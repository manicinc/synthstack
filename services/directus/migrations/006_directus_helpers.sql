-- Migration 006: Directus Helper Functions
-- Shared trigger helpers used across multiple migrations

-- Directus-style timestamp updater (used by multiple tables that include date_updated)
CREATE OR REPLACE FUNCTION directus_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

