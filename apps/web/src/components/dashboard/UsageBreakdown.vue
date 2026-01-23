<script setup lang="ts">
/**
 * UsageBreakdown - Credit/token usage donut chart
 * Adapted from tailwind-admin YearlyBreakup.vue
 */
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'

interface UsageData {
  label: string
  value: number
  color: string
}

interface Props {
  data: UsageData[]
  total: number
  totalLabel?: string
  loading?: boolean
  error?: boolean
  errorMessage?: string
  change?: number
  changeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  totalLabel: 'Total',
  changeLabel: 'vs last period',
  loading: false,
  error: false,
  errorMessage: 'Failed to load usage data',
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const hasData = computed(() => props.data && props.data.length > 0)

const chartSeries = computed(() => props.data.map(d => d.value))

// Generate accessible chart summary
const chartSummary = computed(() => {
  if (!hasData.value) return 'No usage data available'
  
  const breakdown = props.data.map(d => `${d.label}: ${d.value.toLocaleString()}`).join(', ')
  return `Usage breakdown pie chart showing ${props.totalLabel}: ${props.total.toLocaleString()}. ${breakdown}.`
})

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
    foreColor: 'var(--text-secondary)',
    height: 160,
    toolbar: { show: false },
  },
  labels: props.data.map(d => d.label),
  colors: props.data.map(d => d.color),
  plotOptions: {
    pie: {
      startAngle: 0,
      endAngle: 360,
      donut: {
        size: '75%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            offsetY: -10,
          },
          value: {
            show: true,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            offsetY: 5,
            formatter: (val: number) => val.toLocaleString(),
          },
          total: {
            show: true,
            label: props.totalLabel,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            formatter: () => props.total.toLocaleString(),
          },
        },
      },
    },
  },
  stroke: {
    show: false,
  },
  dataLabels: {
    enabled: false,
  },
  legend: {
    show: false,
  },
  tooltip: {
    theme: 'dark',
    fillSeriesColor: false,
    y: {
      formatter: (value: number) => value.toLocaleString(),
    },
  },
}))

const formatChange = (change: number) => {
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change}%`
}
</script>

<template>
  <q-card
    class="dashboard-card usage-breakdown"
    flat
    role="figure"
    :aria-label="chartSummary"
  >
    <q-card-section class="q-pb-none">
      <h3 id="usage-breakdown-title" class="card-title">
        Usage Breakdown
      </h3>
    </q-card-section>
    
    <q-card-section>
      <!-- Loading state -->
      <div
        v-if="loading"
        class="loading-state"
        role="status"
        aria-label="Loading usage breakdown"
      >
        <div
          class="dashboard-skeleton"
          style="width: 160px; height: 160px; border-radius: 50%; margin: 0 auto"
          aria-hidden="true"
        />
        <div class="legend-loading q-mt-md" aria-hidden="true">
          <div
            v-for="i in 3"
            :key="i"
            class="dashboard-skeleton q-mb-sm"
            style="width: 80px; height: 16px"
          />
        </div>
      </div>
      
      <!-- Error state -->
      <div
        v-else-if="error"
        class="chart-error"
        role="alert"
      >
        <q-icon name="error_outline" size="32px" color="negative" />
        <p class="error-text">{{ errorMessage }}</p>
        <q-btn
          flat
          color="primary"
          icon="refresh"
          label="Retry"
          size="sm"
          @click="emit('retry')"
        />
      </div>
      
      <!-- Empty state -->
      <div
        v-else-if="!hasData"
        class="chart-empty"
      >
        <q-icon name="donut_large" size="48px" color="grey-5" aria-hidden="true" />
        <p class="empty-text">No usage data</p>
        <p class="empty-subtext">Start using credits to see breakdown</p>
      </div>
      
      <template v-else>
        <div class="breakdown-grid">
          <!-- Left side: stats -->
          <div class="breakdown-stats">
            <div class="total-value">
              {{ total.toLocaleString() }}
            </div>
            <div class="total-label">
              {{ totalLabel }}
            </div>
            
            <div
              v-if="change !== undefined"
              class="change-badge q-mt-md"
            >
              <span 
                class="stat-badge" 
                :class="change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'"
                :aria-label="`${change > 0 ? 'Increased' : change < 0 ? 'Decreased' : 'No change'} by ${Math.abs(change)}%`"
              >
                <q-icon 
                  :name="change > 0 ? 'arrow_upward' : change < 0 ? 'arrow_downward' : 'remove'" 
                  size="14px"
                  aria-hidden="true"
                />
                {{ formatChange(change) }}
              </span>
              <span class="change-label q-ml-xs">{{ changeLabel }}</span>
            </div>
            
            <!-- Legend -->
            <div class="legend-container q-mt-lg" role="list" aria-label="Usage categories">
              <div
                v-for="item in data"
                :key="item.label"
                class="legend-item"
                role="listitem"
              >
                <span
                  class="legend-dot"
                  :style="{ backgroundColor: item.color }"
                  aria-hidden="true"
                />
                <span class="legend-label">{{ item.label }}: {{ item.value.toLocaleString() }}</span>
              </div>
            </div>
          </div>
          
          <!-- Right side: chart -->
          <div class="chart-container" role="img" :aria-label="chartSummary">
            <VueApexCharts
              type="donut"
              :options="chartOptions"
              :series="chartSeries"
              height="160"
            />
          </div>
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<style lang="scss" scoped>
.usage-breakdown {
  height: 100%;
  
  .q-card__section {
    height: 100%;
  }
}

.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: center;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.breakdown-stats {
  .total-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .total-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .change-badge {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .change-label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
}

.legend-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-state {
  padding: 20px 0;
}

.legend-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-error,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  min-height: 160px;
  gap: 8px;
}

.error-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.empty-text {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
}

.empty-subtext {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}
</style>
