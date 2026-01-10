<template>
  <q-page class="llm-org-breakdown">
    <!-- Header -->
    <div class="page-header">
      <q-btn
        icon="arrow_back"
        flat
        round
        to="/admin/llm-costs"
      />
      <div class="header-content">
        <h1>Organization Breakdown</h1>
        <p class="subtitle">LLM usage and costs per organization</p>
      </div>
      <div class="header-actions">
        <q-btn
          icon="refresh"
          round
          flat
          :loading="loading"
          @click="fetchData"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <q-input
        v-model="searchQuery"
        dense
        outlined
        placeholder="Search organizations..."
        class="search-input"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-select
        v-model="sortBy"
        :options="sortOptions"
        dense
        outlined
        label="Sort by"
        emit-value
        map-options
        class="sort-select"
      />

      <q-input
        v-model.number="minSpend"
        dense
        outlined
        type="number"
        label="Min spend ($)"
        class="min-spend"
      />
    </div>

    <!-- Organizations Table -->
    <div class="org-table-container">
      <q-table
        :rows="filteredOrgs"
        :columns="columns"
        row-key="organizationId"
        flat
        :loading="loading"
        :pagination="pagination"
        class="org-table"
        @row-click="openOrgDetail"
      >
        <template #body-cell-organizationName="props">
          <q-td :props="props">
            <div class="org-name-cell">
              <q-avatar size="32px" color="primary" text-color="white">
                {{ getInitials(props.row.organizationName) }}
              </q-avatar>
              <span>{{ props.row.organizationName }}</span>
            </div>
          </q-td>
        </template>

        <template #body-cell-totalCostCents="props">
          <q-td :props="props">
            <span class="cost-value">${{ formatCost(props.value) }}</span>
          </q-td>
        </template>

        <template #body-cell-mtdCostCents="props">
          <q-td :props="props">
            <span class="cost-value">${{ formatCost(props.value) }}</span>
          </q-td>
        </template>

        <template #body-cell-todayCostCents="props">
          <q-td :props="props">
            <span :class="['cost-value', { highlight: props.value > 0 }]">
              ${{ formatCost(props.value) }}
            </span>
          </q-td>
        </template>

        <template #body-cell-lastRequestAt="props">
          <q-td :props="props">
            <span v-if="props.value" class="time-ago">
              {{ formatTimeAgo(props.value) }}
            </span>
            <span v-else class="no-data">Never</span>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              icon="visibility"
              flat
              round
              size="sm"
              @click.stop="openOrgDetail(null, props.row)"
            >
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Organization Detail Dialog -->
    <q-dialog v-model="showDetailDialog" maximized>
      <q-card class="org-detail-dialog">
        <q-card-section class="dialog-header">
          <div class="header-info">
            <q-avatar size="48px" color="primary" text-color="white">
              {{ getInitials(selectedOrg?.organizationName) }}
            </q-avatar>
            <div>
              <h2>{{ selectedOrg?.organizationName }}</h2>
              <p>Organization ID: {{ selectedOrg?.organizationId }}</p>
            </div>
          </div>
          <q-btn v-close-popup icon="close" flat round />
        </q-card-section>

        <q-separator />

        <q-card-section class="dialog-content">
          <div v-if="loadingDetail" class="loading-state">
            <q-spinner size="48px" color="primary" />
          </div>

          <template v-else-if="orgDetail">
            <!-- Summary Stats -->
            <div class="detail-stats">
              <div class="stat-item">
                <div class="stat-label">Total Cost</div>
                <div class="stat-value">${{ formatCost(orgDetail.summary?.totalCostCents) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Total Requests</div>
                <div class="stat-value">{{ orgDetail.summary?.totalRequests?.toLocaleString() }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Unique Users</div>
                <div class="stat-value">{{ orgDetail.summary?.uniqueUsers }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Models Used</div>
                <div class="stat-value">{{ orgDetail.summary?.modelsUsed }}</div>
              </div>
            </div>

            <!-- Model Breakdown -->
            <div class="section">
              <h3>Model Usage</h3>
              <q-table
                :rows="orgDetail.byModel"
                :columns="modelColumns"
                row-key="model"
                flat
                dense
                :pagination="{ rowsPerPage: 5 }"
              >
                <template #body-cell-totalCostCents="props">
                  <q-td :props="props">
                    ${{ formatCost(props.value) }}
                  </q-td>
                </template>
              </q-table>
            </div>

            <!-- Cost Trend -->
            <div class="section">
              <h3>Cost Trend (30 Days)</h3>
              <apexchart
                v-if="orgDetail.trends?.length"
                type="area"
                height="250"
                :options="trendOptions"
                :series="trendSeries"
              />
              <div v-else class="empty-state">No trend data available</div>
            </div>

            <!-- Recent Requests -->
            <div class="section">
              <h3>Recent Requests</h3>
              <q-table
                :rows="orgDetail.recentRequests"
                :columns="requestColumns"
                row-key="id"
                flat
                dense
                :pagination="{ rowsPerPage: 10 }"
              >
                <template #body-cell-estimated_cost_cents="props">
                  <q-td :props="props">
                    ${{ formatCost(props.value) }}
                  </q-td>
                </template>
                <template #body-cell-created_at="props">
                  <q-td :props="props">
                    {{ formatDate(props.value) }}
                  </q-td>
                </template>
              </q-table>
            </div>
          </template>
        </q-card-section>
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
interface OrgUsageSummary {
  organizationId: string;
  organizationName: string;
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  uniqueUsers: number;
  modelsUsed: number;
  lastRequestAt: string | null;
  mtdRequests: number;
  mtdCostCents: number;
  todayRequests: number;
  todayCostCents: number;
}

interface OrgDetail {
  summary: OrgUsageSummary | null;
  byModel: any[];
  trends: any[];
  recentRequests: any[];
}

// State
const loading = ref(false);
const loadingDetail = ref(false);
const searchQuery = ref('');
const sortBy = ref('cost');
const minSpend = ref(0);
const organizations = ref<OrgUsageSummary[]>([]);
const showDetailDialog = ref(false);
const selectedOrg = ref<OrgUsageSummary | null>(null);
const orgDetail = ref<OrgDetail | null>(null);

const pagination = ref({
  rowsPerPage: 20,
  page: 1,
});

const sortOptions = [
  { label: 'Total Cost', value: 'cost' },
  { label: 'Requests', value: 'requests' },
  { label: 'Name', value: 'name' },
];

// Computed
const filteredOrgs = computed(() => {
  let result = [...organizations.value];

  // Filter by search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((org) =>
      org.organizationName.toLowerCase().includes(q)
    );
  }

  // Filter by min spend
  if (minSpend.value > 0) {
    result = result.filter(
      (org) => org.totalCostCents >= minSpend.value * 100
    );
  }

  return result;
});

const trendSeries = computed(() => {
  if (!orgDetail.value?.trends?.length) return [];

  const providers = [...new Set(orgDetail.value.trends.map((t: any) => t.provider))];
  return providers.map((provider) => ({
    name: provider,
    data: orgDetail.value!.trends
      .filter((t: any) => t.provider === provider)
      .map((t: any) => ({
        x: new Date(t.date).getTime(),
        y: t.costCents / 100,
      })),
  }));
});

const trendOptions = computed(() => ({
  chart: {
    type: 'area',
    stacked: true,
    toolbar: { show: false },
  },
  colors: ['#3b82f6', '#8b5cf6', '#10b981'],
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
  xaxis: { type: 'datetime' },
  yaxis: {
    labels: { formatter: (val: number) => `$${val.toFixed(2)}` },
  },
}));

// Columns
const columns = [
  { name: 'organizationName', label: 'Organization', field: 'organizationName', sortable: true, align: 'left' as const },
  { name: 'totalRequests', label: 'Total Requests', field: 'totalRequests', sortable: true },
  { name: 'totalCostCents', label: 'Total Cost', field: 'totalCostCents', sortable: true },
  { name: 'mtdCostCents', label: 'MTD Cost', field: 'mtdCostCents', sortable: true },
  { name: 'todayCostCents', label: 'Today', field: 'todayCostCents', sortable: true },
  { name: 'uniqueUsers', label: 'Users', field: 'uniqueUsers', sortable: true },
  { name: 'lastRequestAt', label: 'Last Request', field: 'lastRequestAt', sortable: true },
  { name: 'actions', label: '', field: 'actions' },
];

const modelColumns = [
  { name: 'provider', label: 'Provider', field: 'provider', sortable: true },
  { name: 'model', label: 'Model', field: 'model', sortable: true, align: 'left' as const },
  { name: 'totalRequests', label: 'Requests', field: 'totalRequests', sortable: true },
  { name: 'totalCostCents', label: 'Cost', field: 'totalCostCents', sortable: true },
];

const requestColumns = [
  { name: 'provider', label: 'Provider', field: 'provider' },
  { name: 'model', label: 'Model', field: 'model', align: 'left' as const },
  { name: 'request_type', label: 'Type', field: 'request_type' },
  { name: 'total_tokens', label: 'Tokens', field: 'total_tokens' },
  { name: 'estimated_cost_cents', label: 'Cost', field: 'estimated_cost_cents' },
  { name: 'latency_ms', label: 'Latency', field: 'latency_ms', format: (val: number) => `${val}ms` },
  { name: 'created_at', label: 'Date', field: 'created_at' },
];

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
    return format(new Date(dateStr), 'MMM d, HH:mm');
  } catch {
    return dateStr;
  }
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function fetchData() {
  loading.value = true;
  try {
    const response = await api.get('/admin/llm-costs/by-org', {
      params: {
        sortBy: sortBy.value,
        sortOrder: 'desc',
        minCostCents: minSpend.value * 100,
        limit: 100,
      },
    });
    organizations.value = response.data;
  } catch (error) {
    logError('Failed to fetch organizations:', error);
  } finally {
    loading.value = false;
  }
}

async function openOrgDetail(_evt: Event | null, row: OrgUsageSummary) {
  selectedOrg.value = row;
  showDetailDialog.value = true;
  loadingDetail.value = true;
  orgDetail.value = null;

  try {
    const response = await api.get(`/admin/llm-costs/by-org/${row.organizationId}`);
    orgDetail.value = response.data;
  } catch (error) {
    logError('Failed to fetch org detail:', error);
  } finally {
    loadingDetail.value = false;
  }
}

// Lifecycle
onMounted(fetchData);
</script>

<style lang="scss" scoped>
.llm-org-breakdown {
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

.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  .search-input {
    width: 300px;
  }

  .sort-select {
    width: 180px;
  }

  .min-spend {
    width: 150px;
  }
}

.org-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);
}

.org-table {
  :deep(.q-table__card) {
    box-shadow: none;
  }

  :deep(tbody tr) {
    cursor: pointer;

    &:hover {
      background: var(--surface-hover, #f1f5f9);
    }
  }
}

.org-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cost-value {
  font-weight: 600;

  &.highlight {
    color: #10b981;
  }
}

.time-ago {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.no-data {
  color: var(--text-tertiary);
  font-style: italic;
}

// Dialog styles
.org-detail-dialog {
  max-width: 900px;
  margin: 0 auto;

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-info {
      display: flex;
      gap: 16px;
      align-items: center;

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin: 4px 0 0;
      }
    }
  }

  .dialog-content {
    padding: 24px;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  .stat-item {
    background: var(--surface-ground, #f8fafc);
    border-radius: 8px;
    padding: 16px;
    text-align: center;

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }
  }
}

.section {
  margin-bottom: 24px;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-tertiary);
}
</style>

