<script setup lang="ts">
/**
 * DirectusMetricsPreview
 * Mock preview of the Business Metrics Directus extension
 */

interface Metric {
  id: string
  label: string
  value: string | number
  detail: string
  icon: string
  color: string
  trend: 'up' | 'down' | 'neutral'
  trendValue: string
}

const metrics: Metric[] = [
  {
    id: 'invoices',
    label: 'Invoices Due This Week',
    value: 8,
    detail: '$24,500 total',
    icon: 'schedule',
    color: '#F59E0B',
    trend: 'up',
    trendValue: '+3'
  },
  {
    id: 'deals',
    label: 'Active Deals',
    value: 12,
    detail: '$302,500 pipeline',
    icon: 'trending_up',
    color: '#3B82F6',
    trend: 'up',
    trendValue: '+18%'
  },
  {
    id: 'projects',
    label: 'Active Projects',
    value: 5,
    detail: '23 / 47 tasks',
    icon: 'work',
    color: '#6366F1',
    trend: 'neutral',
    trendValue: '49%'
  },
  {
    id: 'tasks',
    label: 'Tasks Due Today',
    value: 7,
    detail: '2 overdue',
    icon: 'task',
    color: '#10B981',
    trend: 'down',
    trendValue: '-2'
  },
  {
    id: 'revenue',
    label: 'Monthly Revenue',
    value: '$45.2K',
    detail: 'vs $38.1K last month',
    icon: 'payments',
    color: '#EC4899',
    trend: 'up',
    trendValue: '+18.6%'
  },
  {
    id: 'users',
    label: 'Active Users',
    value: 847,
    detail: '23 new this week',
    icon: 'people',
    color: '#8B5CF6',
    trend: 'up',
    trendValue: '+2.8%'
  }
]
</script>

<template>
  <div class="metrics-preview">
    <div class="metrics-grid">
      <div 
        v-for="metric in metrics" 
        :key="metric.id" 
        class="metric-card"
        :style="{ '--metric-color': metric.color }"
      >
        <div class="card-header">
          <div
            class="card-icon"
            :style="{ background: metric.color }"
          >
            <q-icon
              :name="metric.icon"
              size="20px"
              color="white"
            />
          </div>
          <div 
            class="card-trend" 
            :class="{ 
              'trend-up': metric.trend === 'up', 
              'trend-down': metric.trend === 'down' 
            }"
          >
            <q-icon 
              :name="metric.trend === 'up' ? 'trending_up' : metric.trend === 'down' ? 'trending_down' : 'remove'" 
              size="14px" 
            />
            <span>{{ metric.trendValue }}</span>
          </div>
        </div>
        <div class="card-content">
          <div class="metric-value">
            {{ metric.value }}
          </div>
          <div class="metric-label">
            {{ metric.label }}
          </div>
          <div class="metric-detail">
            {{ metric.detail }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.metrics-preview {
  padding: 4px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--metric-color);
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);

  &.trend-up {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  &.trend-down {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-value {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}

.metric-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.metric-detail {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

// Light mode
:global(.body--light) {
  .metric-card {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.08);

    &:hover {
      background: #fff;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    }
  }

  .card-trend {
    background: rgba(0, 0, 0, 0.04);
    color: #64748b;

    &.trend-up {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    &.trend-down {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }
  }

  .metric-value {
    color: #1e293b;
  }

  .metric-label {
    color: #334155;
  }

  .metric-detail {
    color: #64748b;
  }
}
</style>


