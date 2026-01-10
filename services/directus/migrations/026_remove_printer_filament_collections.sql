/**
 * Migration 026: Remove Printer and Filament Collections
 *
 * Removes obsolete 3D printing-related collections that are no longer needed
 * after pivoting to SynthStack AI platform.
 *
 * Removes:
 * - printers collection
 * - filaments collection
 * - print_profiles collection (junction table)
 * - Related indexes and foreign keys
 */

-- Drop print_profiles junction table first (has foreign keys to other tables)
DROP TABLE IF EXISTS print_profiles CASCADE;

-- Drop printers collection
DROP TABLE IF EXISTS printers CASCADE;

-- Drop filaments collection
DROP TABLE IF EXISTS filaments CASCADE;

-- Drop any related Directus metadata (collections, fields, relations)
DELETE FROM directus_collections WHERE collection IN ('printers', 'filaments', 'print_profiles');
DELETE FROM directus_fields WHERE collection IN ('printers', 'filaments', 'print_profiles');
DELETE FROM directus_relations WHERE many_collection IN ('printers', 'filaments', 'print_profiles')
  OR one_collection IN ('printers', 'filaments', 'print_profiles');
