-- Migration: 136_email_unsubscribe.sql
-- Unsubscribe tokens and suppressions for every mail the API sends.
-- Dependencies: 005_email_system.sql (email_queue), 130_demo_credit_low_email_template.sql
--
-- Only hashes are stored: the SHA-256 of each unsubscribe token and of the
-- recipient's canonical address. The raw token exists only in the mail itself.

-- One row per mail sent: which address and which category its link stops.
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  address_hash VARCHAR(64) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_address
  ON email_unsubscribe_tokens(address_hash);

-- Read before every send. scope is a category name (one optional category),
-- 'optional' (every optional category) or 'all' (every mail, set by an operator).
CREATE TABLE IF NOT EXISTS email_suppressions (
  address_hash VARCHAR(64) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'unsubscribe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (address_hash, scope)
);

-- The category decides whether a suppression applies and which footer a mail gets.
-- A row queued without one is not sent.
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Callers reference Stripe sessions (cs_...), subscriptions (sub_...) and GitHub
-- usernames, which a UUID column refused, so those mails were never queued.
ALTER TABLE email_queue ALTER COLUMN reference_id TYPE VARCHAR(255) USING reference_id::text;

-- No text under 13px in mail.
UPDATE email_templates
SET html_template = replace(html_template, 'font-size:12px', 'font-size:13px')
WHERE slug = 'demo-credit-low';
