-- Migration: 000_extensions.sql
-- Description: Ensure required Postgres extensions are enabled early
-- Notes:
-- - uuid-ossp is used by many tables via uuid_generate_v4()
-- - pgcrypto provides gen_random_uuid(), used across newer migrations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

