-- Migration 132: Drop Legacy AgencyOS Invoicing
-- Description: Removes legacy os_* invoicing tables/automation in favor of canonical
--              invoices/invoice_items/payments/payment_sessions/items/tax_rates.
-- Safe to re-run (IF EXISTS / idempotent deletes).

-- =============================================================================
-- 1) Remove Directus metadata referencing legacy collections
-- =============================================================================

DELETE FROM directus_relations
WHERE many_collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
)
OR one_collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
);

DELETE FROM directus_fields
WHERE collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
);

DELETE FROM directus_permissions
WHERE collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
);

DELETE FROM directus_presets
WHERE collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
);

DELETE FROM directus_collections
WHERE collection IN (
  'os_invoices',
  'os_invoice_items',
  'os_payments',
  'os_expenses',
  'os_items',
  'os_tax_rates'
);

-- =============================================================================
-- 2) Drop legacy automation (created in 078_agencyos_flows.sql)
-- =============================================================================

DROP TRIGGER IF EXISTS calculate_invoice_item_before_insert_update ON os_invoice_items;
DROP TRIGGER IF EXISTS update_invoice_totals_after_change ON os_invoice_items;
DROP TRIGGER IF EXISTS update_invoice_payment_after_insert_update ON os_payments;

DROP FUNCTION IF EXISTS trigger_update_invoice_payment();
DROP FUNCTION IF EXISTS trigger_update_invoice_totals();
DROP FUNCTION IF EXISTS trigger_calculate_invoice_item();
DROP FUNCTION IF EXISTS calculate_invoice_totals(UUID);

-- =============================================================================
-- 3) Drop legacy AgencyOS invoicing tables
-- =============================================================================

DROP TABLE IF EXISTS os_expenses CASCADE;
DROP TABLE IF EXISTS os_payments CASCADE;
DROP TABLE IF EXISTS os_invoice_items CASCADE;
DROP TABLE IF EXISTS os_invoices CASCADE;
DROP TABLE IF EXISTS os_items CASCADE;
DROP TABLE IF EXISTS os_tax_rates CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 132: Dropped legacy AgencyOS invoicing tables (os_*)';
  RAISE NOTICE '   Canonical billing tables: invoices, invoice_items, payments, payment_sessions, items, tax_rates';
END $$;

