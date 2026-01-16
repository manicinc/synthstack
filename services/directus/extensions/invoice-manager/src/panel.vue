<template>
  <div class="invoice-manager">
    <!-- Header with filters and actions -->
    <div class="header">
      <div class="filters">
        <v-select
          v-model="activeFilter"
          :items="filterOptions"
          item-text="label"
          item-value="value"
          placeholder="Filter invoices"
          class="filter-select"
        />
        <v-input
          v-model="searchQuery"
          type="search"
          placeholder="Search invoices..."
          class="search-input"
        >
          <template #prepend>
            <v-icon name="search" small />
          </template>
        </v-input>
      </div>

      <div v-if="showQuickActions" class="actions">
        <v-button
          icon
          rounded
          @click="createInvoice"
          v-tooltip="'Create Invoice'"
        >
          <v-icon name="add" />
        </v-button>
        <v-button
          icon
          rounded
          @click="refreshData"
          v-tooltip="'Refresh'"
        >
          <v-icon name="refresh" />
        </v-button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card">
        <div class="card-icon" style="background: #10B981">
          <v-icon name="paid" />
        </div>
        <div class="card-content">
          <div class="card-label">Total Paid</div>
          <div class="card-value">{{ formatCurrency(summary.totalPaid) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: #F59E0B">
          <v-icon name="schedule" />
        </div>
        <div class="card-content">
          <div class="card-label">Outstanding</div>
          <div class="card-value">{{ formatCurrency(summary.totalOutstanding) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: #EF4444">
          <v-icon name="warning" />
        </div>
        <div class="card-content">
          <div class="card-label">Overdue</div>
          <div class="card-value">{{ formatCurrency(summary.totalOverdue) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-icon" style="background: #6366F1">
          <v-icon name="receipt_long" />
        </div>
        <div class="card-content">
          <div class="card-label">Total Invoices</div>
          <div class="card-value">{{ summary.totalCount }}</div>
        </div>
      </div>
    </div>

    <!-- Invoice List -->
    <div class="invoice-list">
      <v-table
        v-if="!loading && invoices.length > 0"
        :headers="tableHeaders"
        :items="invoices"
        :loading="loading"
        show-select
        @click:row="viewInvoice"
      >
        <template #item.invoice_number="{ item }">
          <span class="invoice-number">{{ item.invoice_number }}</span>
        </template>

        <template #item.organization_id="{ item }">
          <span>{{ item.organization_id?.name || 'N/A' }}</span>
        </template>

        <template #item.status="{ item }">
          <v-badge :color="getStatusColor(item.status)">
            {{ getStatusLabel(item.status) }}
          </v-badge>
        </template>

        <template #item.total="{ item }">
          <span class="amount">{{ formatCurrency(item.total) }}</span>
        </template>

        <template #item.amount_due="{ item }">
          <span class="amount" :class="{ 'overdue': isOverdue(item) }">
            {{ formatCurrency(item.amount_due) }}
          </span>
        </template>

        <template #item.due_date="{ item }">
          <span :class="{ 'overdue': isOverdue(item) }">
            {{ formatDate(item.due_date) }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="row-actions">
            <v-icon
              v-if="item.status === 'draft'"
              name="send"
              small
              clickable
              @click.stop="sendInvoice(item)"
              v-tooltip="'Send Invoice'"
            />
            <v-icon
              v-if="item.stripe_checkout_url"
              name="credit_card"
              small
              clickable
              @click.stop="openStripeCheckout(item)"
              v-tooltip="'Pay with Stripe'"
            />
            <v-icon
              v-else-if="['sent', 'overdue'].includes(item.status)"
              name="add_card"
              small
              clickable
              @click.stop="createStripeCheckout(item)"
              v-tooltip="'Create Payment Link'"
            />
            <v-icon
              name="download"
              small
              clickable
              @click.stop="downloadPDF(item)"
              v-tooltip="'Download PDF'"
            />
          </div>
        </template>
      </v-table>

      <v-notice v-else-if="!loading && invoices.length === 0" type="info">
        No invoices found. Create your first invoice to get started.
      </v-notice>

      <v-progress-circular v-else indeterminate />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="7"
        show-first-last
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

interface Props {
  showQuickActions?: boolean;
  defaultFilter?: string;
  itemsPerPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showQuickActions: true,
  defaultFilter: 'all',
  itemsPerPage: 10
});

const api = useApi();

// State
const loading = ref(true);
const invoices = ref<any[]>([]);
const summary = ref({
  totalPaid: 0,
  totalOutstanding: 0,
  totalOverdue: 0,
  totalCount: 0
});
const activeFilter = ref(props.defaultFilter);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);

// Filter options
const filterOptions = [
  { label: 'All Invoices', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial Payment', value: 'partial' }
];

// Table headers
const tableHeaders = [
  { text: 'Invoice #', value: 'invoice_number', width: 120 },
  { text: 'Organization', value: 'organization_id', width: 200 },
  { text: 'Status', value: 'status', width: 120 },
  { text: 'Total', value: 'total', width: 120, align: 'right' },
  { text: 'Amount Due', value: 'amount_due', width: 120, align: 'right' },
  { text: 'Due Date', value: 'due_date', width: 120 },
  { text: 'Actions', value: 'actions', width: 120, sortable: false }
];

// Computed
const filter = computed(() => {
  const conditions: any = {};

  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'overdue') {
      conditions.status = { _eq: 'sent' };
      conditions.due_date = { _lt: new Date().toISOString() };
    } else {
      conditions.status = { _eq: activeFilter.value };
    }
  }

  if (searchQuery.value) {
    conditions._or = [
      { invoice_number: { _contains: searchQuery.value } },
      { 'organization_id.name': { _contains: searchQuery.value } }
    ];
  }

  return conditions;
});

// Methods
async function loadInvoices() {
  loading.value = true;

  try {
    const response = await api.get('/items/invoices', {
      params: {
        filter: filter.value,
        fields: [
          '*',
          'organization_id.name',
          'project_id.name'
        ],
        sort: ['-date_created'],
        limit: props.itemsPerPage,
        page: currentPage.value,
        meta: 'filter_count'
      }
    });

    invoices.value = response.data.data;
    totalPages.value = Math.ceil(response.data.meta.filter_count / props.itemsPerPage);

    await loadSummary();
  } catch (error) {
    console.error('Failed to load invoices:', error);
  } finally {
    loading.value = false;
  }
}

async function loadSummary() {
  try {
    const response = await api.get('/items/invoices', {
      params: {
        aggregate: {
          sum: ['total', 'amount_paid', 'amount_due'],
          count: ['id']
        },
        filter: {
          status: { _neq: 'cancelled' }
        }
      }
    });

    const data = response.data.data[0];

    summary.value = {
      totalPaid: data.sum?.amount_paid || 0,
      totalOutstanding: data.sum?.amount_due || 0,
      totalOverdue: 0, // Will need separate query
      totalCount: data.count?.id || 0
    };

    // Load overdue amount
    const overdueResponse = await api.get('/items/invoices', {
      params: {
        aggregate: { sum: ['amount_due'] },
        filter: {
          status: { _eq: 'sent' },
          due_date: { _lt: new Date().toISOString() }
        }
      }
    });

    summary.value.totalOverdue = overdueResponse.data.data[0]?.sum?.amount_due || 0;
  } catch (error) {
    console.error('Failed to load summary:', error);
  }
}

function refreshData() {
  loadInvoices();
}

function createInvoice() {
  // Navigate to invoice creation
  window.location.href = '/admin/content/invoices/+';
}

function viewInvoice(invoice: any) {
  window.location.href = `/admin/content/invoices/${invoice.id}`;
}

async function sendInvoice(invoice: any) {
  try {
    await api.patch(`/items/invoices/${invoice.id}`, {
      status: 'sent',
      sent_date: new Date().toISOString()
    });

    // Refresh list
    await loadInvoices();
  } catch (error) {
    console.error('Failed to send invoice:', error);
  }
}

async function createStripeCheckout(invoice: any) {
  try {
    // Call API gateway to create Stripe checkout
    const response = await api.post('/stripe/create-checkout', {
      invoice_id: invoice.id
    });

    if (response.data.url) {
      window.open(response.data.url, '_blank');
    }

    await loadInvoices();
  } catch (error) {
    console.error('Failed to create Stripe checkout:', error);
  }
}

function openStripeCheckout(invoice: any) {
  if (invoice.stripe_checkout_url) {
    window.open(invoice.stripe_checkout_url, '_blank');
  }
}

async function downloadPDF(invoice: any) {
  // TODO: Implement PDF generation
  console.log('Download PDF for invoice:', invoice.invoice_number);
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#94A3B8',
    sent: '#3B82F6',
    partial: '#F59E0B',
    paid: '#10B981',
    overdue: '#EF4444',
    cancelled: '#64748B'
  };
  return colors[status] || '#94A3B8';
}

function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0);
}

function formatDate(date: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function isOverdue(invoice: any): boolean {
  if (!invoice.due_date || invoice.status === 'paid') return false;
  return new Date(invoice.due_date) < new Date();
}

// Watch for filter changes
watch([activeFilter, searchQuery], () => {
  currentPage.value = 1;
  loadInvoices();
});

watch(currentPage, () => {
  loadInvoices();
});

// Load data on mount
onMounted(() => {
  loadInvoices();
});
</script>

<style scoped>
.invoice-manager {
  padding: var(--content-padding);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.filters {
  display: flex;
  gap: 12px;
  flex: 1;
}

.filter-select {
  min-width: 180px;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.actions {
  display: flex;
  gap: 8px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  margin-bottom: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.invoice-list {
  flex: 1;
  overflow: auto;
}

.invoice-number {
  font-weight: 600;
  color: var(--theme--primary);
}

.amount {
  font-variant-numeric: tabular-nums;
}

.amount.overdue {
  color: var(--theme--danger);
  font-weight: 600;
}

.overdue {
  color: var(--theme--danger);
}

.row-actions {
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid var(--theme--border-color-subdued);
}
</style>
