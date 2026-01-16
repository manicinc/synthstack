<script setup lang="ts">
/**
 * StatsCards - Quick stats display for dashboard
 * Adapted from tailwind-admin TopCards.vue
 */
import { computed } from 'vue'

interface StatItem {
  key: string
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  route?: string
}

interface Props {
  stats: StatItem[]
  loading?: boolean
  error?: boolean
  errorMessage?: string
  skeletonCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
  errorMessage: 'Failed to load statistics',
  skeletonCount: 4
})

const emit = defineEmits<{
  (e: 'click', stat: StatItem): void
  (e: 'retry'): void
}>()

const formatChange = (change: number) => {
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change}%`
}

const getChangeClass = (change: number | undefined) => {
  if (!change) return 'neutral'
  return change > 0 ? 'positive' : 'negative'
}

const hasStats = computed(() => props.stats && props.stats.length > 0)
</script>

<template>
  <div class="stats-row" role="region" aria-label="Dashboard statistics">
    <!-- Loading skeletons -->
    <template v-if="loading">
      <div
        v-for="i in skeletonCount"
        :key="`skeleton-${i}`"
        class="dashboard-card stat-card-skeleton"
        role="status"
        :aria-label="`Loading statistic ${i}`"
      >
        <div
          class="dashboard-skeleton"
          style="width: 48px; height: 48px; margin-bottom: 12px"
          aria-hidden="true"
        />
        <div
          class="dashboard-skeleton"
          style="width: 60%; height: 32px; margin-bottom: 8px"
          aria-hidden="true"
        />
        <div
          class="dashboard-skeleton"
          style="width: 40%; height: 16px"
          aria-hidden="true"
        />
      </div>
    </template>

    <!-- Error state -->
    <template v-else-if="error">
      <div class="dashboard-card stats-error-card">
        <div class="error-content">
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
      </div>
    </template>

    <!-- Empty state -->
    <template v-else-if="!hasStats">
      <div class="dashboard-card stats-empty-card">
        <div class="empty-content">
          <q-icon name="insert_chart_outlined" size="40px" color="grey-5" />
          <p class="empty-text">No statistics available yet</p>
          <p class="empty-subtext">Start using SynthStack to see your stats</p>
        </div>
      </div>
    </template>

    <!-- Stats cards -->
    <template v-else>
      <q-card
        v-for="stat in stats"
        :key="stat.key"
        class="dashboard-card stat-card interactive-scale cursor-pointer"
        flat
        role="button"
        :aria-label="`${stat.title}: ${stat.value}${stat.change !== undefined ? `, ${stat.change > 0 ? 'up' : 'down'} ${Math.abs(stat.change)}%` : ''}`"
        tabindex="0"
        @click="emit('click', stat)"
        @keydown.enter="emit('click', stat)"
        @keydown.space.prevent="emit('click', stat)"
      >
        <q-card-section>
          <div
            class="stat-icon"
            :class="stat.color"
            aria-hidden="true"
          >
            <q-icon
              :name="stat.icon"
              size="24px"
            />
          </div>
          
          <div class="stat-value">
            {{ stat.value }}
          </div>
          <div class="stat-label">
            {{ stat.title }}
          </div>
          
          <div
            v-if="stat.change !== undefined"
            class="stat-change q-mt-sm"
          >
            <span
              class="stat-badge"
              :class="getChangeClass(stat.change)"
              :aria-label="`${stat.change > 0 ? 'Increased' : stat.change < 0 ? 'Decreased' : 'No change'} by ${Math.abs(stat.change)}%`"
            >
              <q-icon 
                :name="stat.change > 0 ? 'trending_up' : stat.change < 0 ? 'trending_down' : 'trending_flat'" 
                size="14px"
                aria-hidden="true"
              />
              {{ formatChange(stat.change) }}
            </span>
            <span
              v-if="stat.changeLabel"
              class="change-label q-ml-xs"
            >
              {{ stat.changeLabel }}
            </span>
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.stat-card {
  .q-card__section {
    display: flex;
    flex-direction: column;
  }
  
  .stat-change {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .change-label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
  
  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }
}

.stat-card-skeleton {
  padding: 24px;
}

.stats-error-card,
.stats-empty-card {
  grid-column: 1 / -1;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-content,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 24px;
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

