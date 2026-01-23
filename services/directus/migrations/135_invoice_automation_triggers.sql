-- Migration 135: Invoice Automation Triggers
-- Description: Make invoice totals/tax/payment status self-maintaining at the DB level.
-- Notes:
-- - This reduces reliance on Directus Flows for `invoice_items` + `payments`.
-- - Safe to run alongside existing Flows (may cause redundant updates, but values converge).

-- =============================================================================
-- Helper: Recalculate invoice totals from invoice_items
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_total NUMERIC := 0;
BEGIN
  SELECT
    COALESCE(SUM(line_amount), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_total_tax
  FROM invoice_items
  WHERE invoice_id = p_invoice_id;

  v_total := v_subtotal + v_total_tax;

  UPDATE invoices
  SET
    subtotal = v_subtotal,
    total_tax = v_total_tax,
    total = v_total
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Trigger: Calculate invoice_items.tax_amount from tax_rates
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_invoice_items_calculate_tax_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_tax_rate NUMERIC := 0;
  v_line_amount NUMERIC := 0;
BEGIN
  -- Compute line amount (column is generated, but we need it for tax calc)
  v_line_amount := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);

  IF NEW.tax_rate_id IS NOT NULL THEN
    SELECT COALESCE(rate, 0) INTO v_tax_rate
    FROM tax_rates
    WHERE id = NEW.tax_rate_id;
  END IF;

  NEW.tax_amount := ROUND(v_line_amount * (v_tax_rate / 100.0), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_items_calculate_tax_amount ON invoice_items;
CREATE TRIGGER invoice_items_calculate_tax_amount
  BEFORE INSERT OR UPDATE OF quantity, unit_price, tax_rate_id
  ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_invoice_items_calculate_tax_amount();

-- =============================================================================
-- Trigger: Recalculate invoices totals after invoice_items changes
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_invoice_items_update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  IF v_invoice_id IS NOT NULL THEN
    PERFORM recalculate_invoice_totals(v_invoice_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_items_update_invoice_totals ON invoice_items;
CREATE TRIGGER invoice_items_update_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE
  ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_invoice_items_update_invoice_totals();

-- =============================================================================
-- Helper: Recalculate invoices amount_paid/status from payments
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_invoice_payments(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid NUMERIC := 0;
  v_invoice_total NUMERIC := 0;
  v_current_status TEXT := NULL;
  v_next_status TEXT := NULL;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = p_invoice_id;

  SELECT COALESCE(total, 0), status INTO v_invoice_total, v_current_status
  FROM invoices
  WHERE id = p_invoice_id;

  -- Preserve draft/cancelled; those are deliberate user actions.
  IF v_current_status IN ('draft', 'cancelled') THEN
    v_next_status := v_current_status;
  ELSE
    IF v_invoice_total > 0 AND v_total_paid >= v_invoice_total THEN
      v_next_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_next_status := 'partial';
    ELSE
      -- If no payments exist, revert to 'sent' unless already overdue.
      v_next_status := CASE WHEN v_current_status = 'overdue' THEN 'overdue' ELSE 'sent' END;
    END IF;
  END IF;

  UPDATE invoices
  SET
    amount_paid = v_total_paid,
    status = v_next_status,
    paid_date = CASE WHEN v_next_status = 'paid' THEN CURRENT_DATE ELSE NULL END
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Trigger: Recalculate invoices amount_paid/status after payments changes
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_payments_update_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  IF v_invoice_id IS NOT NULL THEN
    PERFORM recalculate_invoice_payments(v_invoice_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_update_invoice ON payments;
CREATE TRIGGER payments_update_invoice
  AFTER INSERT OR UPDATE OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payments_update_invoice();

