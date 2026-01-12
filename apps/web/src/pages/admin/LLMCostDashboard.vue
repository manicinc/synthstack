<template>
  <q-page class="llm-cost-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1>LLM Cost Dashboard</h1>
        <p class="subtitle">Monitor global AI API costs and usage across all organizations</p>
      </div>
      <div class="header-right">
        <q-btn-group flat>
          <q-btn
            :outline="selectedPeriod !== '7d'"
            :color="selectedPeriod === '7d' ? 'primary' : 'grey'"
            label="7D"
            @click="selectedPeriod = '7d'"
          />
          <q-btn
            :outline="selectedPeriod !== '30d'"
            :color="selectedPeriod === '30d' ? 'primary' : 'grey'"
            label="30D"
            @click="selectedPeriod = '30d'"
          />
          <q-btn
            :outline="selectedPeriod !== '90d'"
            :color="selectedPeriod === '90d' ? 'primary' : 'grey'"
            label="90D"
            @click="selectedPeriod = '90d'"
          />
        </q-btn-group>
        <q-btn
          icon="download"
          label="Export"
          color="secondary"
          outline
          @click="exportData"
        />
        <q-btn
          icon="refresh"
          round
          flat
          :loading="loading"
          @click="fetchData"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon cost">
          <q-icon name="payments" />
        </div>
        <div class="stat-content">
          <div class="stat-label">Month to Date</div>
          <div class="stat-value">${{ formatCost(globalStats?.mtdCostCents) }}</div>
          <div class="stat-trend positive">
            <q-icon name="trending_down" />
            12% vs last month
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon today">
          <q-icon name="today" />
        </div>
        <div class="stat-content">
          <div class="stat-label">Today's Spend</div>
          <div class="stat-value">${{ formatCost(globalStats?.todayCostCents) }}</div>
          <div class="stat-subtext">{{ globalStats?.totalRequests?.toLocaleString() || 0 }} requests</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon requests">
          <q-icon name="hub" />
        </div>
        <div class="stat-content">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value">{{ globalStats?.totalRequests?.toLocaleString() || 0 }}</div>
          <div class="stat-subtext">{{ globalStats?.successRate?.toFixed(1) || 100 }}% success rate</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon latency">
          <q-icon name="speed" />
        </div>
        <div class="stat-content">
          <div class="stat-label">Avg Latency</div>
          <div class="stat-value">{{ globalStats?.avgLatencyMs || 0 }}ms</div>
          <div class="stat-subtext">{{ formatTokens(globalStats?.totalTokens) }} tokens</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- Cost Trend Chart -->
      <div class="chart-card cost-trend">
        <div class="card-header">
          <h3>Cost Trend</h3>
          <q-select
            v-model="trendGroupBy"
            :options="['day', 'hour']"
            dense
            outlined
            class="trend-select"
          />
        </div>
        <div class="chart-container">
          <apexchart
            v-if="costTrendSeries.length"
            type="area"
            height="300"
            :options="costTrendOptions"
            :series="costTrendSeries"
          />
          <div v-else class="empty-state">
            <q-icon name="insights" size="48px" />
            <p>No cost data available</p>
          </div>
        </div>
      </div>

      <!-- Provider Breakdown -->
      <div class="chart-card provider-breakdown">
        <div class="card-header">
          <h3>Provider Breakdown</h3>
        </div>
        <div class="chart-container">
          <apexchart
            v-if="providerSeries.length"
            type="donut"
            height="300"
            :options="providerOptions"
            :series="providerSeries"
          />
          <div v-else class="empty-state">
            <q-icon name="donut_small" size="48px" />
            <p>No provider data</p>
          </div>
        </div>
        <div class="provider-legend">
          <div
            v-for="(stats, provider) in globalStats?.byProvider"
            :key="provider"
            class="legend-item"
          >
            <span class="legend-dot" :class="provider" />
            <span class="legend-label">{{ provider }}</span>
            <span class="legend-value">${{ formatCost(stats.costCents) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Usage Table -->
    <div class="table-card">
      <div class="card-header">
        <h3>Model Usage</h3>
        <q-input
          v-model="modelSearch"
          dense
          outlined
          placeholder="Search models..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <q-table
        :rows="filteredModels"
        :columns="modelColumns"
        row-key="model"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        class="model-table"
      >
        <template #body-cell-provider="props">
          <q-td :props="props">
            <q-chip
              :color="getProviderColor(props.row.provider)"
              text-color="white"
              size="sm"
            >
              {{ props.row.provider }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-tier="props">
          <q-td :props="props">
            <q-badge
              :color="getTierColor(props.row.tier)"
              :label="props.row.tier"
            />
          </q-td>
        </template>
        <template #body-cell-totalCostCents="props">
          <q-td :props="props">
            ${{ formatCost(props.value) }}
          </q-td>
        </template>
        <template #body-cell-costPer1kTokens="props">
          <q-td :props="props">
            ${{ props.value?.toFixed(4) || '0.0000' }}
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Quick Links -->
    <div class="quick-links">
      <q-btn
        to="/admin/llm-costs/orgs"
        label="Organization Breakdown"
        icon="business"
        flat
        color="primary"
      />
      <q-btn
        to="/admin/llm-costs/alerts"
        label="Manage Alerts"
        icon="notifications"
        flat
        color="primary"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/services/api';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

// State
const loading = ref(false);
const selectedPeriod = ref('30d');
const trendGroupBy = ref('day');
const modelSearch = ref('');

interface ProviderStats {
  requests: number;
  tokens: number;
  costCents: number;
  avgLatencyMs: number;
}

interface GlobalStats {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  avgLatencyMs: number;
  successRate: number;
  byProvider: Record<string, ProviderStats>;
  mtdCostCents: number;
  todayCostCents: number;
}

interface ModelUsage {
  provider: string;
  model: string;
  tier: string | null;
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  avgCostCents: number;
  avgLatencyMs: number;
  costPer1kTokens: number;
}

interface CostTrendPoint {
  date: string;
  provider: string;
  requests: number;
  tokens: number;
  costCents: number;
}

const globalStats = ref<GlobalStats | null>(null);
const modelUsage = ref<ModelUsage[]>([]);
const costTrends = ref<CostTrendPoint[]>([]);

// Computed
const filteredModels = computed(() => {
  if (!modelSearch.value) return modelUsage.value;
  const search = modelSearch.value.toLowerCase();
  return modelUsage.value.filter(
    (m) =>
      m.model.toLowerCase().includes(search) ||
      m.provider.toLowerCase().includes(search)
  );
});

const providerSeries = computed(() => {
  if (!globalStats.value?.byProvider) return [];
  return Object.values(globalStats.value.byProvider).map((p) => p.costCents);
});

const providerOptions = computed(() => ({
  labels: globalStats.value?.byProvider
    ? Object.keys(globalStats.value.byProvider)
    : [],
  colors: ['#3b82f6', '#8b5cf6', '#10b981'],
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            formatter: () => `$${formatCost(globalStats.value?.totalCostCents)}`,
          },
        },
      },
    },
  },
}));

const costTrendSeries = computed(() => {
  if (!costTrends.value.length) return [];

  // Group by provider
  const providers = [...new Set(costTrends.value.map((t) => t.provider))];
  return providers.map((provider) => ({
    name: provider,
    data: costTrends.value
      .filter((t) => t.provider === provider)
      .map((t) => ({
        x: new Date(t.date).getTime(),
        y: t.costCents / 100,
      })),
  }));
});

const costTrendOptions = computed(() => ({
  chart: {
    type: 'area',
    stacked: true,
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  colors: ['#3b82f6', '#8b5cf6', '#10b981'],
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.5,
      opacityTo: 0.1,
    },
  },
  xaxis: {
    type: 'datetime',
    labels: {
      datetimeFormatter: {
        day: 'MMM dd',
        hour: 'HH:mm',
      },
    },
  },
  yaxis: {
    labels: {
      formatter: (val: number) => `$${val.toFixed(2)}`,
    },
  },
  tooltip: {
    shared: true,
    y: {
      formatter: (val: number) => `$${val.toFixed(2)}`,
    },
  },
  legend: {
    position: 'top',
  },
}));

const modelColumns = [
  { name: 'provider', label: 'Provider', field: 'provider', sortable: true },
  { name: 'model', label: 'Model', field: 'model', sortable: true, align: 'left' as const },
  { name: 'tier', label: 'Tier', field: 'tier', sortable: true },
  { name: 'totalRequests', label: 'Requests', field: 'totalRequests', sortable: true },
  { name: 'totalTokens', label: 'Tokens', field: 'totalTokens', sortable: true, format: (val: number) => val?.toLocaleString() || 0 },
  { name: 'totalCostCents', label: 'Cost', field: 'totalCostCents', sortable: true },
  { name: 'avgLatencyMs', label: 'Avg Latency', field: 'avgLatencyMs', sortable: true, format: (val: number) => `${val}ms` },
  { name: 'costPer1kTokens', label: 'Cost/1K', field: 'costPer1kTokens', sortable: true },
];

// Methods
function formatCost(cents?: number): string {
  if (!cents) return '0.00';
  return (cents / 100).toFixed(2);
}

function formatTokens(tokens?: number): string {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'blue',
    anthropic: 'purple',
    openrouter: 'green',
  };
  return colors[provider] || 'grey';
}

function getTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    cheap: 'green',
    standard: 'blue',
    premium: 'orange',
  };
  return colors[tier || ''] || 'grey';
}

async function fetchData() {
  loading.value = true;
  try {
    const days = selectedPeriod.value === '7d' ? 7 : selectedPeriod.value === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [statsRes, modelsRes, trendsRes] = await Promise.all([
      api.get('/admin/llm-costs/global', { params: { startDate } }),
      api.get('/admin/llm-costs/by-model', { params: { startDate } }),
      api.get('/admin/llm-costs/trends', {
        params: { days, groupBy: trendGroupBy.value },
      }),
    ]);

    globalStats.value = statsRes.data;
    modelUsage.value = modelsRes.data;
    costTrends.value = trendsRes.data;
  } catch (error) {
    logError('Failed to fetch LLM cost data:', error);
  } finally {
    loading.value = false;
  }
}

async function exportData() {
  try {
    const days = selectedPeriod.value === '7d' ? 7 : selectedPeriod.value === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const response = await api.get('/admin/llm-costs/export', {
      params: { startDate },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `llm-costs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    logError('Failed to export data:', error);
  }
}

// Watchers
watch(selectedPeriod, fetchData);
watch(trendGroupBy, fetchData);

// Lifecycle
onMounted(fetchData);
</script>

<style lang="scss" scoped>
.llm-cost-dashboard {
  padding: 24px;
  background: var(--surface-ground, #f8fafc);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .subtitle {
    color: var(--text-secondary);
    margin: 4px 0 0;
  }

  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

    &.cost {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    &.today {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    &.requests {
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: white;
    }

    &.latency {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }
  }

  .stat-content {
    flex: 1;

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-trend {
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;

      &.positive {
        color: #10b981;
      }

      &.negative {
        color: #ef4444;
      }
    }

    .stat-subtext {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 4px;
    }
  }
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .trend-select {
      width: 100px;
    }
  }

  .chart-container {
    min-height: 300px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: var(--text-tertiary);

    .q-icon {
      margin-bottom: 12px;
      opacity: 0.5;
    }
  }
}

.provider-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e2e8f0);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;

      &.openai {
        background: #3b82f6;
      }

      &.anthropic {
        background: #8b5cf6;
      }

      &.openrouter {
        background: #10b981;
      }
    }

    .legend-label {
      flex: 1;
      font-size: 0.875rem;
      text-transform: capitalize;
    }

    .legend-value {
      font-weight: 600;
    }
  }
}

.table-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e2e8f0);
  margin-bottom: 24px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .search-input {
      width: 250px;
    }
  }
}

.model-table {
  :deep(.q-table__card) {
    box-shadow: none;
  }
}

.quick-links {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>

