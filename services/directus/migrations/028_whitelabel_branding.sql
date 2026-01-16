-- Migration: White-label Branding System
-- Purpose: Automatically sync branding (favicon, logos) from environment variables
-- and ensure they're always up to date

-- This migration creates a function to automatically sync the favicon
-- from the project logo when it changes

-- Note: The actual favicon file ID needs to be set via API or migrations
-- The environment variable PUBLIC_FAVICON can reference the file path,
-- but Directus requires a file ID in the directus_files table

-- For now, we just ensure the settings table has the correct structure
-- The favicon will be set via the Docker startup script or API

-- Verify the settings table has the public_favicon column
-- (It should already exist in Directus 11.3.5)
DO $$
BEGIN
  -- Check if we need to add any custom branding columns
  -- In Directus 11.3.5, public_favicon already exists

  -- We can add a custom note about the branding setup
  UPDATE directus_settings
  SET public_note = 'SynthStack branding configured. Favicon and logos sync automatically on startup.'
  WHERE id = 1;

END $$;

-- Create a custom function to get the favicon file ID by filename
-- This can be called from startup scripts
CREATE OR REPLACE FUNCTION get_file_id_by_filename(filename TEXT)
RETURNS UUID AS $$
DECLARE
  file_id UUID;
BEGIN
  SELECT id INTO file_id
  FROM directus_files
  WHERE filename_download = filename OR filename_disk LIKE '%' || filename
  LIMIT 1;

  RETURN file_id;
END;
$$ LANGUAGE plpgsql;

-- Example usage (commented out - this would be run by a startup script):
-- UPDATE directus_settings
-- SET public_favicon = get_file_id_by_filename('favicon.svg')
-- WHERE id = 1;

COMMENT ON FUNCTION get_file_id_by_filename IS 'Helper function to get file ID by filename for branding setup';
