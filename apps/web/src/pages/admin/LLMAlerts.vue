<template>
  <q-page class="llm-alerts-page">
    <!-- Header -->
    <div class="page-header">
      <q-btn
        icon="arrow_back"
        flat
        round
        to="/admin/llm-costs"
      />
      <div class="header-content">
        <h1>Budget Alerts</h1>
        <p class="subtitle">Configure cost threshold alerts for LLM usage</p>
      </div>
      <div class="header-actions">
        <q-btn
          icon="add"
          label="Create Alert"
          color="primary"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Active Alerts -->
    <div class="section">
      <h2>Active Alerts</h2>
      <div v-if="loading" class="loading-state">
        <q-spinner size="32px" color="primary" />
      </div>
      <div v-else-if="activeAlerts.length === 0" class="empty-state">
        <q-icon name="notifications_off" size="48px" />
        <p>No active alerts configured</p>
        <q-btn
          label="Create your first alert"
          color="primary"
          outline
          @click="openCreateDialog"
        />
      </div>
      <div v-else class="alerts-grid">
        <div
          v-for="alert in activeAlerts"
          :key="alert.id"
          class="alert-card"
        >
          <div class="alert-header">
            <div class="alert-type">
              <q-icon :name="getAlertIcon(alert.alertType)" />
              <span>{{ formatAlertType(alert.alertType) }}</span>
            </div>
            <q-toggle
              :model-value="alert.isActive"
              @update:model-value="toggleAlert(alert.id, $event)"
            />
          </div>
          <div class="alert-name">{{ alert.name }}</div>
          <div class="alert-threshold">
            <span class="label">Threshold:</span>
            <span class="value">${{ formatCost(alert.thresholdCents) }}</span>
          </div>
          <div v-if="alert.lastTriggeredAt" class="alert-last-triggered">
            Last triggered: {{ formatTimeAgo(alert.lastTriggeredAt) }}
          </div>
          <div class="alert-actions">
            <q-btn
              icon="play_arrow"
              flat
              size="sm"
              label="Test"
              @click="testAlert(alert.id)"
            />
            <q-btn
              icon="edit"
              flat
              size="sm"
              @click="editAlert(alert)"
            />
            <q-btn
              icon="delete"
              flat
              size="sm"
              color="negative"
              @click="confirmDeleteAlert(alert)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Alert History -->
    <div class="section">
      <h2>Alert History</h2>
      <q-table
        :rows="alertHistory"
        :columns="historyColumns"
        row-key="id"
        flat
        :loading="loadingHistory"
        :pagination="{ rowsPerPage: 10 }"
        class="history-table"
      >
        <template #body-cell-triggeredAt="props">
          <q-td :props="props">
            {{ formatDate(props.value) }}
          </q-td>
        </template>
        <template #body-cell-triggerValueCents="props">
          <q-td :props="props">
            <span class="cost-value">${{ formatCost(props.value) }}</span>
          </q-td>
        </template>
        <template #body-cell-thresholdCents="props">
          <q-td :props="props">
            ${{ formatCost(props.value) }}
          </q-td>
        </template>
        <template #body-cell-notificationSent="props">
          <q-td :props="props">
            <q-icon
              :name="props.value ? 'check_circle' : 'cancel'"
              :color="props.value ? 'positive' : 'negative'"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card class="alert-dialog">
        <q-card-section class="dialog-header">
          <h3>{{ isEditing ? 'Edit Alert' : 'Create Alert' }}</h3>
          <q-btn v-close-popup icon="close" flat round />
        </q-card-section>

        <q-separator />

        <q-card-section class="dialog-content">
          <q-form class="alert-form" @submit="saveAlert">
            <q-input
              v-model="formData.name"
              label="Alert Name"
              outlined
              :rules="[val => !!val || 'Name is required']"
            />

            <q-input
              v-model="formData.description"
              label="Description"
              outlined
              type="textarea"
              rows="2"
            />

            <q-select
              v-model="formData.alertType"
              :options="alertTypeOptions"
              label="Alert Type"
              outlined
              emit-value
              map-options
              :rules="[val => !!val || 'Type is required']"
            />

            <q-input
              v-model.number="formData.thresholdCents"
              label="Threshold (cents)"
              outlined
              type="number"
              :rules="[val => val > 0 || 'Threshold must be positive']"
            >
              <template #prepend>$</template>
              <template #hint>Enter amount in cents (e.g., 10000 = $100)</template>
            </q-input>

            <q-input
              v-if="formData.alertType === 'spike'"
              v-model.number="formData.spikePercent"
              label="Spike Percentage"
              outlined
              type="number"
              hint="Trigger when cost exceeds average by this percentage"
            >
              <template #append>%</template>
            </q-input>

            <q-select
              v-model="formData.notificationEmails"
              label="Notification Emails"
              outlined
              use-input
              use-chips
              multiple
              new-value-mode="add-unique"
              hint="Press Enter to add email"
            />

            <q-input
              v-model="formData.notificationSlackWebhook"
              label="Slack Webhook URL"
              outlined
              placeholder="https://hooks.slack.com/services/..."
            />

            <q-select
              v-model="formData.notificationFrequency"
              :options="frequencyOptions"
              label="Notification Frequency"
              outlined
              emit-value
              map-options
            />
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Save"
            :loading="saving"
            @click="saveAlert"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Test Result Dialog -->
    <q-dialog v-model="showTestResult">
      <q-card class="test-result-card">
        <q-card-section>
          <div class="text-h6">Alert Test Result</div>
        </q-card-section>
        <q-card-section>
          <div class="test-result">
            <q-icon
              :name="testResult?.triggered ? 'warning' : 'check_circle'"
              :color="testResult?.triggered ? 'warning' : 'positive'"
              size="48px"
            />
            <div class="result-text">
              <p class="status">
                {{ testResult?.triggered ? 'Would be triggered' : 'Would not trigger' }}
              </p>
              <p class="details">
                Current: ${{ formatCost(testResult?.currentValue) }} /
                Threshold: ${{ formatCost(testResult?.threshold) }}
              </p>
              <p class="message">{{ testResult?.message }}</p>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Close" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation -->
    <q-dialog v-model="showDeleteConfirm">
      <q-card>
        <q-card-section>
          <div class="text-h6">Delete Alert</div>
        </q-card-section>
        <q-card-section>
          Are you sure you want to delete "{{ alertToDelete?.name }}"?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="deleteAlert"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/services/api';
import { formatDistanceToNow, format } from 'date-fns';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

// Types
interface BudgetAlert {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  alertType: 'daily_limit' | 'weekly_limit' | 'monthly_limit' | 'spike' | 'threshold';
  thresholdCents: number;
  thresholdRequests: number | null;
  spikePercent: number | null;
  notificationEmails: string[];
  notificationSlackWebhook: string | null;
  notificationFrequency: 'once' | 'hourly' | 'daily';
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastValueCents: number | null;
  triggerCount: number;
  createdAt: string;
}

interface AlertHistory {
  id: string;
  alertId: string;
  triggeredAt: string;
  triggerValueCents: number;
  thresholdCents: number;
  notificationSent: boolean;
  notificationError: string | null;
}

interface TestResult {
  triggered: boolean;
  currentValue: number;
  threshold: number;
  message: string;
}

// State
const loading = ref(false);
const loadingHistory = ref(false);
const saving = ref(false);
const deleting = ref(false);
const alerts = ref<BudgetAlert[]>([]);
const alertHistory = ref<AlertHistory[]>([]);
const showDialog = ref(false);
const showTestResult = ref(false);
const showDeleteConfirm = ref(false);
const isEditing = ref(false);
const editingAlertId = ref<string | null>(null);
const alertToDelete = ref<BudgetAlert | null>(null);
const testResult = ref<TestResult | null>(null);

const formData = ref({
  name: '',
  description: '',
  alertType: 'daily_limit' as BudgetAlert['alertType'],
  thresholdCents: 10000,
  spikePercent: 200,
  notificationEmails: ['team@manic.agency'],
  notificationSlackWebhook: '',
  notificationFrequency: 'once' as BudgetAlert['notificationFrequency'],
});

const alertTypeOptions = [
  { label: 'Daily Limit', value: 'daily_limit' },
  { label: 'Weekly Limit', value: 'weekly_limit' },
  { label: 'Monthly Limit', value: 'monthly_limit' },
  { label: 'Cost Spike', value: 'spike' },
  { label: 'Threshold', value: 'threshold' },
];

const frequencyOptions = [
  { label: 'Once per period', value: 'once' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
];

const historyColumns = [
  { name: 'triggeredAt', label: 'Triggered At', field: 'triggeredAt', sortable: true },
  { name: 'triggerValueCents', label: 'Value', field: 'triggerValueCents', sortable: true },
  { name: 'thresholdCents', label: 'Threshold', field: 'thresholdCents', sortable: true },
  { name: 'notificationSent', label: 'Notified', field: 'notificationSent' },
];

// Computed
const activeAlerts = computed(() => alerts.value.filter((a) => a.isActive));

// Methods
function formatCost(cents?: number): string {
  if (!cents) return '0.00';
  return (cents / 100).toFixed(2);
}

function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

function formatAlertType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    daily_limit: 'today',
    weekly_limit: 'date_range',
    monthly_limit: 'calendar_month',
    spike: 'trending_up',
    threshold: 'notifications',
  };
  return icons[type] || 'notifications';
}

function openCreateDialog() {
  isEditing.value = false;
  editingAlertId.value = null;
  formData.value = {
    name: '',
    description: '',
    alertType: 'daily_limit',
    thresholdCents: 10000,
    spikePercent: 200,
    notificationEmails: ['team@manic.agency'],
    notificationSlackWebhook: '',
    notificationFrequency: 'once',
  };
  showDialog.value = true;
}

function editAlert(alert: BudgetAlert) {
  isEditing.value = true;
  editingAlertId.value = alert.id;
  formData.value = {
    name: alert.name,
    description: alert.description || '',
    alertType: alert.alertType,
    thresholdCents: alert.thresholdCents,
    spikePercent: alert.spikePercent || 200,
    notificationEmails: alert.notificationEmails,
    notificationSlackWebhook: alert.notificationSlackWebhook || '',
    notificationFrequency: alert.notificationFrequency,
  };
  showDialog.value = true;
}

function confirmDeleteAlert(alert: BudgetAlert) {
  alertToDelete.value = alert;
  showDeleteConfirm.value = true;
}

async function fetchAlerts() {
  loading.value = true;
  try {
    const response = await api.get('/admin/llm-costs/alerts');
    alerts.value = response.data;
  } catch (error) {
    logError('Failed to fetch alerts:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchHistory() {
  loadingHistory.value = true;
  try {
    const response = await api.get('/admin/llm-costs/alerts/history', {
      params: { limit: 50 },
    });
    alertHistory.value = response.data;
  } catch (error) {
    logError('Failed to fetch alert history:', error);
  } finally {
    loadingHistory.value = false;
  }
}

async function saveAlert() {
  saving.value = true;
  try {
    if (isEditing.value && editingAlertId.value) {
      await api.put(`/admin/llm-costs/alerts/${editingAlertId.value}`, formData.value);
    } else {
      await api.post('/admin/llm-costs/alerts', formData.value);
    }
    showDialog.value = false;
    await fetchAlerts();
  } catch (error) {
    logError('Failed to save alert:', error);
  } finally {
    saving.value = false;
  }
}

async function toggleAlert(alertId: string, isActive: boolean) {
  try {
    await api.put(`/admin/llm-costs/alerts/${alertId}`, { isActive });
    await fetchAlerts();
  } catch (error) {
    logError('Failed to toggle alert:', error);
  }
}

async function deleteAlert() {
  if (!alertToDelete.value) return;
  
  deleting.value = true;
  try {
    await api.delete(`/admin/llm-costs/alerts/${alertToDelete.value.id}`);
    showDeleteConfirm.value = false;
    alertToDelete.value = null;
    await fetchAlerts();
  } catch (error) {
    logError('Failed to delete alert:', error);
  } finally {
    deleting.value = false;
  }
}

async function testAlert(alertId: string) {
  try {
    const response = await api.post(`/admin/llm-costs/alerts/${alertId}/test`);
    testResult.value = response.data;
    showTestResult.value = true;
  } catch (error) {
    logError('Failed to test alert:', error);
  }
}

// Lifecycle
onMounted(() => {
  fetchAlerts();
  fetchHistory();
});
</script>

<style lang="scss" scoped>
.llm-alerts-page {
  padding: 24px;
  background: var(--surface-ground, #f8fafc);
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  .header-content {
    flex: 1;

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .subtitle {
      color: var(--text-secondary);
      margin: 4px 0 0;
    }
  }
}

.section {
  margin-bottom: 32px;

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 16px;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: white;
  border-radius: 12px;
  color: var(--text-tertiary);

  .q-icon {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    margin-bottom: 16px;
  }
}

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.alert-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .alert-type {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
  }

  .alert-name {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .alert-threshold {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .label {
      color: var(--text-secondary);
    }

    .value {
      font-weight: 600;
      color: var(--primary);
    }
  }

  .alert-last-triggered {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-bottom: 12px;
  }

  .alert-actions {
    display: flex;
    gap: 8px;
    border-top: 1px solid var(--border-color, #e2e8f0);
    padding-top: 12px;
    margin-top: 12px;
  }
}

.history-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);

  :deep(.q-table__card) {
    box-shadow: none;
  }
}

.cost-value {
  font-weight: 600;
  color: #ef4444;
}

// Dialog styles
.alert-dialog {
  width: 500px;
  max-width: 90vw;

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }
  }

  .dialog-content {
    padding: 24px;
  }

  .alert-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.test-result-card {
  width: 400px;
  max-width: 90vw;

  .test-result {
    display: flex;
    align-items: center;
    gap: 16px;

    .result-text {
      .status {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 8px;
      }

      .details {
        color: var(--text-secondary);
        margin: 0 0 8px;
      }

      .message {
        font-size: 0.875rem;
        color: var(--text-tertiary);
        margin: 0;
      }
    }
  }
}
</style>

