<script setup lang="ts">
/**
 * DirectusInvoicePreview
 * Mock preview of the Invoice Manager Directus extension
 */

const invoices = [
  { id: 'INV-001', client: 'Acme Corp', amount: 12500, status: 'paid', date: '2024-01-15' },
  { id: 'INV-002', client: 'TechStart Inc', amount: 8750, status: 'pending', date: '2024-01-18' },
  { id: 'INV-003', client: 'Global Media', amount: 24000, status: 'overdue', date: '2024-01-05' },
  { id: 'INV-004', client: 'StartupXYZ', amount: 5200, status: 'paid', date: '2024-01-20' },
]

const summary = {
  totalPaid: 45250,
  outstanding: 8750,
  overdue: 24000,
  total: 4
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function getStatusClass(status: string) {
  return {
    paid: 'status-paid',
    pending: 'status-pending',
    overdue: 'status-overdue'
  }[status] || ''
}
</script>

<template>
  <div class="invoice-preview">
    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-icon paid">
          <q-icon
            name="paid"
            size="20px"
          />
        </div>
        <div class="card-content">
          <span class="card-label">Total Paid</span>
          <span class="card-value">{{ formatCurrency(summary.totalPaid) }}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon pending">
          <q-icon
            name="schedule"
            size="20px"
          />
        </div>
        <div class="card-content">
          <span class="card-label">Outstanding</span>
          <span class="card-value">{{ formatCurrency(summary.outstanding) }}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon overdue">
          <q-icon
            name="warning"
            size="20px"
          />
        </div>
        <div class="card-content">
          <span class="card-label">Overdue</span>
          <span class="card-value">{{ formatCurrency(summary.overdue) }}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon total">
          <q-icon
            name="receipt_long"
            size="20px"
          />
        </div>
        <div class="card-content">
          <span class="card-label">Total Invoices</span>
          <span class="card-value">{{ summary.total }}</span>
        </div>
      </div>
    </div>

    <!-- Invoice List -->
    <div class="invoice-table">
      <div class="table-header">
        <span class="col-invoice">Invoice</span>
        <span class="col-client">Client</span>
        <span class="col-amount">Amount</span>
        <span class="col-status">Status</span>
        <span class="col-date">Date</span>
      </div>
      <div 
        v-for="invoice in invoices" 
        :key="invoice.id" 
        class="table-row"
      >
        <span class="col-invoice">
          <code>{{ invoice.id }}</code>
        </span>
        <span class="col-client">{{ invoice.client }}</span>
        <span class="col-amount">{{ formatCurrency(invoice.amount) }}</span>
        <span class="col-status">
          <span
            class="status-badge"
            :class="getStatusClass(invoice.status)"
          >
            {{ invoice.status }}
          </span>
        </span>
        <span class="col-date">{{ invoice.date }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.invoice-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.paid { background: #10B981; }
  &.pending { background: #F59E0B; }
  &.overdue { background: #EF4444; }
  &.total { background: #6366F1; }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

.invoice-table {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 1fr 120px 100px 100px;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (max-width: 768px) {
    display: none;
  }
}

.table-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px 100px 100px;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.08);
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}

.col-invoice code {
  font-size: 0.8125rem;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
}

.col-client {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.col-amount {
  font-family: 'JetBrains Mono', monospace;
  color: #fff;
  font-weight: 600;
}

.col-date {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;

  &.status-paid {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  &.status-pending {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  &.status-overdue {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
}

// Light mode
:global(.body--light) {
  .summary-card {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .card-label {
    color: #64748b;
  }

  .card-value {
    color: #1e293b;
  }

  .invoice-table {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .table-header {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
    color: #64748b;
  }

  .table-row {
    border-color: rgba(0, 0, 0, 0.05);

    &:hover {
      background: rgba(99, 102, 241, 0.05);
    }
  }

  .col-invoice code {
    color: #4f46e5;
    background: rgba(99, 102, 241, 0.1);
  }

  .col-client {
    color: #334155;
  }

  .col-amount {
    color: #1e293b;
  }

  .col-date {
    color: #64748b;
  }
}
</style>


