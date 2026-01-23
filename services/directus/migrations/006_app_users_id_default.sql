-- Migration: 006_app_users_id_default.sql
-- Description: Allow app_users.id to be generated automatically for local auth/OAuth/self-hosted installs
-- Notes:
-- - Supabase sync can still insert explicit UUIDs; this just provides a default when omitted.

ALTER TABLE app_users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

