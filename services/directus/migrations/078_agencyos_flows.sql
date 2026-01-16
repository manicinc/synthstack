-- ============================================
-- Migration 078: AgencyOS Directus Flows (Documentation)
-- ============================================
-- Documents required Directus Flows for automation
-- Actual flows should be created via Directus UI or API
-- ============================================

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- Directus 11 Flows cannot be easily created via SQL migrations due to:
-- 1. Complex JSONB structure for operations
-- 2. JavaScript code execution requirements
-- 3. UUID reference dependencies between flows and operations
--
-- Instead, implement these flows via:
-- Option A: Create flows manually in Directus Admin UI (Settings > Flows)
-- Option B: Use Directus Extensions/Hooks (recommended for SynthStack)
-- Option C: Import via API after migration
--
-- Flow scripts are located in:
-- /services/directus/extensions/flows/*.js
-- ============================================

-- ============================================
-- Required Flows for AgencyOS Features
-- ============================================

-- Flow 1: Calculate Invoice Item Tax
-- Trigger: items.create, items.update on os_invoice_items
-- Purpose: Auto-calculate line_amount and tax_amount when items change
-- Fields Updated:
--   - line_amount = unit_price * quantity
--   - tax_amount = line_amount * (tax_rate.rate / 100)
-- Implementation: See /services/directus/extensions/flows/calculate-invoice-items.js

-- Flow 2: Calculate Invoice Totals
-- Trigger: items.create, items.update, items.delete on os_invoice_items
-- Purpose: Recalculate invoice totals when line items change
-- Fields Updated:
--   - subtotal = SUM(line_items.line_amount)
--   - total_tax = SUM(line_items.tax_amount)
--   - total = subtotal + total_tax
--   - amount_due = total - amount_paid
-- Implementation: See /services/directus/extensions/flows/calculate-invoice.js

-- Flow 3: Update Invoice Payment Status
-- Trigger: items.create, items.update on os_payments
-- Purpose: Update invoice status and amount_paid when payments are received
-- Logic:
--   - Update os_invoices.amount_paid += payment.amount
--   - Update os_invoices.amount_due = total - amount_paid
--   - Set status to 'paid' if amount_due <= 0
--   - Set status to 'partial' if amount_paid > 0 && amount_due > 0
-- Implementation: Directus Hook recommended

-- Flow 4: Mark Expenses as Invoiced
-- Trigger: items.create on os_invoice_items where billable_expense IS NOT NULL
-- Purpose: Mark expense as invoiced when added to an invoice
-- Logic:
--   - Set os_expenses.is_billable = false
--   - Set os_expenses.status = 'invoiced'
--   - Link os_expenses.invoice_item = new_invoice_item.id
-- Implementation: Directus Hook recommended

-- Flow 5: Extract Domain from Website URL
-- Trigger: items.create, items.update on organizations where website IS NOT NULL
-- Purpose: Extract and store clean domain from website URL
-- Logic:
--   - Extract domain from organizations.website using regex
--   - Store in organizations.domain field (add if needed)
-- Implementation: See /services/directus/extensions/flows/extract-domain.js
-- Note: May require adding 'domain' field to organizations table

-- Flow 6: Validate Proposal Approval Schema
-- Trigger: items.create, items.update on os_proposal_approvals
-- Purpose: Validate e-signature form data matches expected schema
-- Logic:
--   - Validate required fields (first_name, last_name, email, signature)
--   - Validate email format
--   - Ensure either signature_text or signature_image is provided
--   - Verify esignature_agreement is true
-- Implementation: See /services/directus/extensions/flows/validate-schema.js

-- ============================================
-- Recommended Implementation: Directus Hooks
-- ============================================
-- For production SynthStack deployment, implement these as Directus Hooks
-- Create: /services/directus/extensions/hooks/agencyos-automation/
--
-- Benefits of Hooks over Flows:
-- - Better performance (no HTTP overhead)
-- - Easier version control (code-based)
-- - More powerful (full Node.js access)
-- - Better error handling and logging
--
-- Example Hook Structure:
-- /services/directus/extensions/hooks/agencyos-automation/
--   ├── package.json
--   ├── src/
--   │   ├── index.js (register all hooks)
--   │   ├── invoice-calculations.js
--   │   ├── payment-tracking.js
--   │   ├── expense-tracking.js
--   │   └── organization-utils.js

-- ============================================
-- Alternative: Create Flows via API
-- ============================================
-- After running migrations, use this script to create flows:
-- node scripts/create-agencyos-flows.js
--
-- Script should:
-- 1. Authenticate with Directus API
-- 2. Create each flow with POST /flows
-- 3. Create operations for each flow with POST /operations
-- 4. Link operations to flows
--
-- See: /scripts/create-agencyos-flows.js (to be created)

-- ============================================
-- Flow Configuration Reference
-- ============================================

-- Create helper function for invoice calculations
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id UUID)
RETURNS TABLE(subtotal NUMERIC, total_tax NUMERIC, total NUMERIC, amount_due NUMERIC) AS $$
DECLARE
  v_subtotal NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_amount_paid NUMERIC := 0;
  v_amount_due NUMERIC := 0;
BEGIN
  -- Calculate subtotal and tax from line items
  SELECT
    COALESCE(SUM(line_amount), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_total_tax
  FROM os_invoice_items
  WHERE invoice = p_invoice_id;

  -- Calculate total
  v_total := v_subtotal + v_total_tax;

  -- Get amount paid
  SELECT COALESCE(amount_paid, 0) INTO v_amount_paid
  FROM os_invoices
  WHERE id = p_invoice_id;

  -- Calculate amount due
  v_amount_due := v_total - v_amount_paid;

  RETURN QUERY SELECT v_subtotal, v_total_tax, v_total, v_amount_due;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for invoice item calculations
CREATE OR REPLACE FUNCTION trigger_calculate_invoice_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line amount
  NEW.line_amount := NEW.unit_price * NEW.quantity;

  -- Calculate tax amount if tax rate is set
  IF NEW.tax_rate IS NOT NULL THEN
    DECLARE
      v_tax_rate NUMERIC;
    BEGIN
      SELECT rate INTO v_tax_rate FROM os_tax_rates WHERE id = NEW.tax_rate;
      NEW.tax_amount := NEW.line_amount * (v_tax_rate / 100);
    EXCEPTION WHEN OTHERS THEN
      NEW.tax_amount := 0;
    END;
  ELSE
    NEW.tax_amount := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to os_invoice_items
CREATE TRIGGER calculate_invoice_item_before_insert_update
BEFORE INSERT OR UPDATE ON os_invoice_items
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_invoice_item();

-- Create trigger function for invoice totals
CREATE OR REPLACE FUNCTION trigger_update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_totals RECORD;
BEGIN
  -- Get invoice ID from the affected row
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice;
  ELSE
    v_invoice_id := NEW.invoice;
  END IF;

  -- Calculate new totals
  SELECT * INTO v_totals FROM calculate_invoice_totals(v_invoice_id);

  -- Update invoice
  UPDATE os_invoices
  SET
    subtotal = v_totals.subtotal,
    total_tax = v_totals.total_tax,
    total = v_totals.total,
    amount_due = v_totals.amount_due
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to os_invoice_items (after changes)
CREATE TRIGGER update_invoice_totals_after_change
AFTER INSERT OR UPDATE OR DELETE ON os_invoice_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_invoice_totals();

-- Create trigger function for payment tracking
CREATE OR REPLACE FUNCTION trigger_update_invoice_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_invoice_total NUMERIC;
  v_new_status VARCHAR(50);
BEGIN
  IF NEW.invoice IS NOT NULL THEN
    -- Calculate total payments for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM os_payments
    WHERE invoice = NEW.invoice AND status = 'completed';

    -- Get invoice total
    SELECT total INTO v_invoice_total
    FROM os_invoices
    WHERE id = NEW.invoice;

    -- Determine new status
    IF v_total_paid >= v_invoice_total THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'sent'; -- or keep existing status
    END IF;

    -- Update invoice
    UPDATE os_invoices
    SET
      amount_paid = v_total_paid,
      amount_due = v_invoice_total - v_total_paid,
      status = v_new_status
    WHERE id = NEW.invoice;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to os_payments
CREATE TRIGGER update_invoice_payment_after_insert_update
AFTER INSERT OR UPDATE ON os_payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_invoice_payment();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 078: AgencyOS Flows completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Invoice automation implemented via PostgreSQL triggers';
  RAISE NOTICE '   - Invoice item calculations: AUTO (trigger)';
  RAISE NOTICE '   - Invoice totals recalculation: AUTO (trigger)';
  RAISE NOTICE '   - Payment tracking: AUTO (trigger)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Additional flows recommended for Directus Extensions:';
  RAISE NOTICE '   - Expense invoicing tracking';
  RAISE NOTICE '   - Domain extraction from website URLs';
  RAISE NOTICE '   - Proposal approval validation';
  RAISE NOTICE '';
  RAISE NOTICE '📁 Flow scripts available in: /services/directus/extensions/flows/';
END $$;
