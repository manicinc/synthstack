-- Migration 133: Invoices Partial Status
-- Description: Allow partially paid invoices and align Directus UI configuration.
-- Dependencies: invoices (030), payments (031)

-- =============================================================================
-- INVOICES: Allow 'partial' status
-- =============================================================================

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'));

-- =============================================================================
-- TRIGGER FUNCTION: Treat partial invoices as overdue when past due
-- =============================================================================

CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoice is outstanding (sent/partial) and past due date, mark as overdue
  IF NEW.status IN ('sent', 'partial') AND NEW.due_date < CURRENT_DATE AND NEW.amount_due > 0 THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEW: invoice_summary (status labels)
-- =============================================================================

CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.paid_date,
  i.status,
  i.subtotal,
  i.total_tax,
  i.total,
  i.amount_paid,
  i.amount_due,
  i.payment_terms,
  o.id as organization_id,
  o.name as organization_name,
  o.billing_email,
  p.id as project_id,
  p.name as project_name,
  CASE
    WHEN i.status = 'paid' THEN 'Paid'
    WHEN i.status = 'overdue' THEN 'Overdue'
    WHEN i.due_date < CURRENT_DATE AND i.status IN ('sent', 'partial') THEN 'Past Due'
    WHEN i.due_date <= CURRENT_DATE + INTERVAL '7 days' AND i.status IN ('sent', 'partial') THEN 'Due Soon'
    WHEN i.status = 'partial' THEN 'Partially Paid'
    ELSE i.status
  END as status_label,
  CASE
    WHEN i.status = 'paid' THEN 0
    WHEN i.status = 'overdue' THEN i.due_date - CURRENT_DATE
    WHEN i.status IN ('sent', 'partial') THEN i.due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due
FROM invoices i
JOIN organizations o ON o.id = i.organization_id
LEFT JOIN projects p ON p.id = i.project_id;

-- =============================================================================
-- DIRECTUS UI: Add Partial option for invoices.status
-- =============================================================================

UPDATE directus_fields
SET
  options = '{
    "choices": [
      { "text": "Draft", "value": "draft" },
      { "text": "Sent", "value": "sent" },
      { "text": "Partial", "value": "partial" },
      { "text": "Paid", "value": "paid" },
      { "text": "Overdue", "value": "overdue" },
      { "text": "Cancelled", "value": "cancelled" }
    ]
  }'::json,
  display_options = '{
    "choices": [
      { "text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#6B7280" },
      { "text": "Sent", "value": "sent", "foreground": "#FFFFFF", "background": "#3B82F6" },
      { "text": "Partial", "value": "partial", "foreground": "#FFFFFF", "background": "#F59E0B" },
      { "text": "Paid", "value": "paid", "foreground": "#FFFFFF", "background": "#10B981" },
      { "text": "Overdue", "value": "overdue", "foreground": "#FFFFFF", "background": "#EF4444" },
      { "text": "Cancelled", "value": "cancelled", "foreground": "#FFFFFF", "background": "#6B7280" }
    ]
  }'::json
WHERE collection = 'invoices' AND field = 'status';

