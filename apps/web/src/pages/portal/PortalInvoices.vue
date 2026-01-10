<template>
  <q-page padding>
    <q-pull-to-refresh @refresh="handleRefresh">
      <div class="q-mb-lg">
        <h4 class="text-h4 q-mt-none q-mb-sm">
          Invoices
        </h4>
        <p class="text-subtitle1 text-grey-7">
          View and manage your invoices
        </p>
      </div>

      <!-- Filters -->
      <q-card
        flat
        bordered
        class="q-mb-md"
      >
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-select
                v-model="statusFilter"
                :options="statusOptions"
                label="Status"
                outlined
                dense
                clearable
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="searchQuery"
                label="Search invoices"
                outlined
                dense
                clearable
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Loading State -->
      <SkeletonLoader
        v-if="loading"
        type="list"
        :count="3"
      />

      <!-- Empty State -->
      <EmptyState
        v-else-if="filteredInvoices.length === 0"
        icon="receipt_long"
        title="No invoices found"
        description="Invoices will appear here once they are created"
      />

      <div
        v-else
        class="q-gutter-md"
      >
        <q-card
          v-for="invoice in filteredInvoices"
          :key="invoice.id"
          flat
          bordered
          class="invoice-card"
        >
          <q-card-section>
            <div class="row items-center">
              <div class="col-12 col-md-8">
                <div class="row items-center q-gutter-sm">
                  <div>
                    <div class="text-h6">
                      {{ invoice.invoice_number }}
                    </div>
                    <div class="text-caption text-grey-7">
                      {{ invoice.project?.name || 'No Project' }}
                    </div>
                  </div>
                  <q-chip
                    :color="getStatusColor(invoice.status)"
                    text-color="white"
                    size="sm"
                  >
                    {{ invoice.status }}
                  </q-chip>
                </div>
              </div>

              <div class="col-12 col-md-4 text-right">
                <div class="text-h6 text-primary">
                  {{ formatCurrency(invoice.total) }}
                </div>
                <div class="text-caption text-grey-7">
                  Due {{ formatDate(invoice.due_date) }}
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <div class="row items-center justify-between">
              <div class="col-auto">
                <div class="text-caption text-grey-7">
                  <div>Issued: {{ formatDate(invoice.issue_date) }}</div>
                  <div v-if="invoice.paid_at">
                    Paid: {{ formatDate(invoice.paid_at) }}
                  </div>
                </div>
              </div>

              <!-- Desktop: Horizontal buttons -->
              <div
                v-if="$q.screen.gt.sm"
                class="col-auto"
              >
                <q-btn
                  outline
                  color="primary"
                  label="View"
                  icon="visibility"
                  size="sm"
                  class="q-mr-sm"
                  @click="viewInvoice(invoice.id)"
                />
                <q-btn
                  outline
                  color="primary"
                  label="Download"
                  icon="download"
                  size="sm"
                  class="q-mr-sm"
                  @click="downloadInvoice(invoice.id)"
                />
                <q-btn
                  v-if="invoice.status === 'sent' || invoice.status === 'overdue'"
                  unelevated
                  color="positive"
                  label="Pay Now"
                  icon="payment"
                  size="sm"
                  @click="payInvoice(invoice.id)"
                />
              </div>

              <!-- Mobile: Action button -->
              <div
                v-else
                class="col-12 q-mt-sm"
              >
                <q-btn
                  unelevated
                  color="primary"
                  label="Actions"
                  icon="more_vert"
                  size="sm"
                  class="full-width"
                  @click="openActions(invoice)"
                />
              </div>
            </div>

            <!-- Line Items Preview -->
            <q-expansion-item
              v-if="invoice.line_items && invoice.line_items.length > 0"
              label="Line Items"
              header-class="text-caption text-grey-7"
              class="q-mt-md"
            >
              <q-list
                bordered
                separator
              >
                <q-item
                  v-for="(item, index) in invoice.line_items"
                  :key="index"
                  dense
                >
                  <q-item-section>
                    <q-item-label>{{ item.description }}</q-item-label>
                    <q-item-label caption>
                      {{ item.quantity }} × {{ formatCurrency(item.unit_price) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label>{{ formatCurrency(item.total) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-expansion-item>
          </q-card-section>
        </q-card>
      </div>

      <!-- View Invoice Dialog -->
      <q-dialog
        v-model="showInvoiceDialog"
        maximized
      >
        <q-card>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">
              Invoice {{ selectedInvoice?.invoice_number }}
            </div>
            <q-space />
            <q-btn
              v-close-popup
              icon="close"
              flat
              round
              dense
            />
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div
              v-if="selectedInvoice"
              class="invoice-preview q-pa-md"
            >
              <!-- Invoice content would go here - this could be a PDF viewer or formatted HTML -->
              <p class="text-center text-grey-7">
                Invoice preview coming soon
              </p>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Mobile Action Sheet -->
      <ActionSheet
        v-model="showActionSheet"
        :actions="invoiceActions"
      />
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar, date } from 'quasar';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';
import { usePortal } from 'src/composables/usePortal';
import { usePullToRefresh } from 'src/composables/usePullToRefresh';
import { useHaptics } from 'src/composables/useHaptics';
import SkeletonLoader from 'src/components/ui/SkeletonLoader.vue';
import EmptyState from 'src/components/ui/EmptyState.vue';
import ActionSheet from 'src/components/ui/ActionSheet.vue';
import type { Action } from 'src/components/ui/ActionSheet.vue';

const $q = useQuasar();
const { getInvoices, createPaymentSession, downloadInvoicePDF } = usePortal();
const { success, medium } = useHaptics();

const invoices = ref<any[]>([]);
const loading = ref(false);
const statusFilter = ref<string | null>(null);
const searchQuery = ref('');
const showInvoiceDialog = ref(false);
const showActionSheet = ref(false);
const selectedInvoice = ref<any>(null);
const currentInvoice = ref<any>(null);

const statusOptions = [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
];

const filteredInvoices = computed(() => {
  let filtered = invoices.value;

  if (statusFilter.value) {
    filtered = filtered.filter(inv => inv.status === statusFilter.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(inv =>
      inv.invoice_number.toLowerCase().includes(query) ||
      inv.project?.name?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const loadInvoices = async () => {
  loading.value = true;
  try {
    const response = await getInvoices();
    invoices.value = response.data;
    success(); // Haptic feedback
  } catch (error) {
    logError('Failed to load invoices:', error);
  } finally {
    loading.value = false;
  }
};

// Pull-to-refresh handler
const { handleRefresh } = usePullToRefresh(loadInvoices);

// Invoice actions for ActionSheet
const invoiceActions = computed<Action[]>(() => {
  if (!currentInvoice.value) return [];

  const actions: Action[] = [
    {
      label: 'View Invoice',
      icon: 'visibility',
      handler: () => {
        medium();
        viewInvoice(currentInvoice.value.id);
      }
    },
    {
      label: 'Download PDF',
      icon: 'download',
      handler: () => {
        medium();
        downloadInvoice(currentInvoice.value.id);
      }
    }
  ];

  // Add Pay Now action if invoice can be paid
  if (currentInvoice.value.status === 'sent' || currentInvoice.value.status === 'overdue') {
    actions.push({
      label: 'Pay Now',
      icon: 'payment',
      color: 'positive',
      handler: () => {
        medium();
        payInvoice(currentInvoice.value.id);
      }
    });
  }

  return actions;
});

// Open action sheet for mobile
const openActions = (invoice: any) => {
  currentInvoice.value = invoice;
  showActionSheet.value = true;
  medium(); // Haptic feedback
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'grey',
    sent: 'blue',
    paid: 'positive',
    overdue: 'negative',
    cancelled: 'grey-7'
  };
  return colors[status] || 'grey';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return date.formatDate(dateStr, 'MMM D, YYYY');
};

const viewInvoice = (invoiceId: string) => {
  selectedInvoice.value = invoices.value.find(inv => inv.id === invoiceId);
  showInvoiceDialog.value = true;
};

const downloadInvoice = async (invoiceId: string) => {
  try {
    loading.value = true;

    // Get the invoice to find its number for the filename
    const invoice = invoices.value.find(inv => inv.id === invoiceId);
    const filename = invoice?.invoice_number
      ? `invoice-${invoice.invoice_number}.pdf`
      : `invoice-${invoiceId}.pdf`;

    // Download PDF blob from API
    const blob = await downloadInvoicePDF(invoiceId);

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    $q.notify({
      type: 'positive',
      message: 'Invoice downloaded successfully',
      position: 'top'
    });
    success(); // Haptic feedback
  } catch (error) {
    logError('Failed to download invoice:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to download invoice. Please try again.',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
};

const payInvoice = async (invoiceId: string) => {
  try {
    loading.value = true;

    // Create Stripe payment session
    const { paymentUrl } = await createPaymentSession(invoiceId);

    // Show loading notification while redirecting
    $q.notify({
      type: 'info',
      message: 'Redirecting to payment page...',
      position: 'top',
      timeout: 2000
    });

    // Redirect to Stripe Checkout
    window.location.href = paymentUrl;
  } catch (error) {
    logError('Failed to initiate payment:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to initiate payment. Please try again.',
      position: 'top'
    });
    loading.value = false;
  }
};

onMounted(() => {
  loadInvoices();
});
</script>

<style scoped lang="scss">
.invoice-card {
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
</style>
