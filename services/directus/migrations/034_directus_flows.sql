-- Migration 034: Directus Flows for Business Logic
-- Create Directus flows that trigger Run Scripts for automatic calculations

-- ======================
-- 1. FLOW: Calculate Invoice Item Amounts
-- ======================

-- Create the flow
INSERT INTO directus_flows (id, name, icon, color, description, status, trigger, accountability, options)
VALUES (
  gen_random_uuid(),
  'Calculate Invoice Item Amounts',
  'calculate',
  '#6366F1',
  'Auto-calculate line amounts and tax when invoice items are created or updated',
  'active',
  'event',
  'all',
  jsonb_build_object(
    'type', 'action',
    'scope', ARRAY['items.create', 'items.update'],
    'collections', ARRAY['invoice_items']
  )
) RETURNING id AS flow_id_1
\gset

-- Create the operation (run script)
INSERT INTO directus_operations (id, name, key, type, position_x, position_y, options, resolve, reject, flow)
VALUES (
  gen_random_uuid(),
  'Calculate Item Amounts',
  'calculate_amounts',
  'exec',
  19, 1,
  jsonb_build_object('code', 'module.exports = async function(data, { services, database, getSchema }) {
  const { ItemsService } = services;
  const schema = await getSchema();

  const itemId = data.key || data.keys?.[0];

  const invoiceItemsService = new ItemsService(''invoice_items'', {
    schema,
    accountability: { admin: true }
  });

  const item = await invoiceItemsService.readOne(itemId, {
    fields: [''id'', ''invoice_id'', ''quantity'', ''unit_price'', ''tax_rate_id'', ''tax_rate_id.rate'']
  });

  const lineAmount = (item.quantity || 0) * (item.unit_price || 0);
  const taxRate = item.tax_rate_id?.rate || 0;
  const taxAmount = lineAmount * (taxRate / 100);

  await invoiceItemsService.updateOne(itemId, {
    tax_amount: taxAmount
  });

  if (item.invoice_id) {
    const invoicesService = new ItemsService(''invoices'', {
      schema,
      accountability: { admin: true }
    });

    const allItems = await invoiceItemsService.readByQuery({
      filter: { invoice_id: { _eq: item.invoice_id } },
      fields: [''line_amount'', ''tax_amount'']
    });

    const subtotal = allItems.reduce((sum, item) => sum + (parseFloat(item.line_amount) || 0), 0);
    const totalTax = allItems.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0);
    const total = subtotal + totalTax;

    await invoicesService.updateOne(item.invoice_id, {
      subtotal: subtotal.toFixed(2),
      total_tax: totalTax.toFixed(2),
      total: total.toFixed(2)
    });
  }

  return data;
};'),
  NULL,
  NULL,
  :'flow_id_1'
);

-- ======================
-- 2. FLOW: Update Payment Status
-- ======================

-- Create the flow
INSERT INTO directus_flows (id, name, icon, color, description, status, trigger, accountability, options)
VALUES (
  gen_random_uuid(),
  'Update Invoice Payment Status',
  'payments',
  '#10B981',
  'Auto-update invoice status and amount_paid when payments are recorded',
  'active',
  'event',
  'all',
  jsonb_build_object(
    'type', 'action',
    'scope', ARRAY['items.create', 'items.update'],
    'collections', ARRAY['payments']
  )
) RETURNING id AS flow_id_2
\gset

-- Create the operation
INSERT INTO directus_operations (id, name, key, type, position_x, position_y, options, resolve, reject, flow)
VALUES (
  gen_random_uuid(),
  'Update Invoice Status',
  'update_status',
  'exec',
  19, 1,
  jsonb_build_object('code', 'module.exports = async function(data, { services, database, getSchema }) {
  const { ItemsService } = services;
  const schema = await getSchema();

  const paymentId = data.key || data.keys?.[0];

  const paymentsService = new ItemsService(''payments'', {
    schema,
    accountability: { admin: true }
  });

  const payment = await paymentsService.readOne(paymentId, {
    fields: [''id'', ''invoice_id'', ''amount'', ''status'']
  });

  if (!payment.invoice_id) return data;

  const allPayments = await paymentsService.readByQuery({
    filter: {
      invoice_id: { _eq: payment.invoice_id },
      status: { _eq: ''completed'' }
    },
    fields: [''amount'']
  });

  const totalPaid = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const invoicesService = new ItemsService(''invoices'', {
    schema,
    accountability: { admin: true }
  });

  const invoice = await invoicesService.readOne(payment.invoice_id, {
    fields: [''id'', ''total'', ''status'']
  });

  let newStatus = invoice.status;
  const total = parseFloat(invoice.total) || 0;

  if (totalPaid >= total) {
    newStatus = ''paid'';
  } else if (totalPaid > 0) {
    newStatus = ''partial'';
  }

  await invoicesService.updateOne(payment.invoice_id, {
    amount_paid: totalPaid.toFixed(2),
    status: newStatus
  });

  return data;
};'),
  NULL,
  NULL,
  :'flow_id_2'
);

-- ======================
-- 3. FLOW: Auto-mark Expenses as Invoiced
-- ======================

-- Create the flow
INSERT INTO directus_flows (id, name, icon, color, description, status, trigger, accountability, options)
VALUES (
  gen_random_uuid(),
  'Mark Expenses as Invoiced',
  'receipt',
  '#F59E0B',
  'Auto-mark expenses as invoiced when linked to invoice items',
  'active',
  'event',
  'all',
  jsonb_build_object(
    'type', 'action',
    'scope', ARRAY['items.update'],
    'collections', ARRAY['expenses']
  )
) RETURNING id AS flow_id_3
\gset

-- Create the operation
INSERT INTO directus_operations (id, name, key, type, position_x, position_y, options, resolve, reject, flow)
VALUES (
  gen_random_uuid(),
  'Update Expense Status',
  'mark_invoiced',
  'exec',
  19, 1,
  jsonb_build_object('code', 'module.exports = async function(data, { services, getSchema }) {
  const { ItemsService } = services;
  const schema = await getSchema();

  const expenseId = data.key || data.keys?.[0];
  const payload = data.payload || {};

  // Only proceed if invoice_item_id was set
  if (payload.invoice_item_id) {
    const expensesService = new ItemsService(''expenses'', {
      schema,
      accountability: { admin: true }
    });

    await expensesService.updateOne(expenseId, {
      is_invoiced: true
    });
  }

  return data;
};'),
  NULL,
  NULL,
  :'flow_id_3'
);

-- ======================
-- MIGRATION COMPLETE
-- ======================

DO $$
BEGIN
  RAISE NOTICE 'Migration 034 completed successfully';
  RAISE NOTICE 'Created 3 Directus flows:';
  RAISE NOTICE '  1. Calculate Invoice Item Amounts';
  RAISE NOTICE '  2. Update Invoice Payment Status';
  RAISE NOTICE '  3. Mark Expenses as Invoiced';
END $$;
