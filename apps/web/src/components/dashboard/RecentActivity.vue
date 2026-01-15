<script setup lang="ts">
/**
 * RecentActivity - Recent executions log
 * Adapted from tailwind-admin RecentTransaction.vue
 */
import { computed } from 'vue'

interface ActivityItem {
  id: string
  type: 'workflow_execution' | 'copilot_message' | 'approval' | 'credit_usage' | 'sync' | 'memory'
  title: string
  description?: string
  timestamp: string
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending'
  link?: string
  metadata?: Record<string, unknown>
}

interface Props {
  activities: ActivityItem[]
  loading?: boolean
  error?: boolean
  errorMessage?: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
  errorMessage: 'Failed to load activity',
  limit: 10,
})

const emit = defineEmits<{
  (e: 'view', activity: ActivityItem): void
  (e: 'retry'): void
}>()

const displayedActivities = computed(() => 
  props.activities.slice(0, props.limit)
)

const hasActivities = computed(() => displayedActivities.value.length > 0)

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatTimeAccessible = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const getTypeIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'workflow_execution': return 'play_arrow'
    case 'copilot_message': return 'smart_toy'
    case 'approval': return 'task_alt'
    case 'credit_usage': return 'payments'
    case 'sync': return 'sync'
    case 'memory': return 'psychology'
    default: return 'circle'
  }
}

const getTypeLabel = (type: ActivityItem['type']) => {
  switch (type) {
    case 'workflow_execution': return 'Workflow execution'
    case 'copilot_message': return 'AI Copilot message'
    case 'approval': return 'Approval'
    case 'credit_usage': return 'Credit usage'
    case 'sync': return 'Data sync'
    case 'memory': return 'Memory created'
    default: return 'Activity'
  }
}

const getStatusColor = (status?: ActivityItem['status']) => {
  switch (status) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'info'
    case 'pending': return 'grey'
    default: return 'primary'
  }
}

const getStatusLabel = (status?: ActivityItem['status']) => {
  switch (status) {
    case 'success': return 'Completed successfully'
    case 'error': return 'Failed'
    case 'warning': return 'Warning'
    case 'info': return 'Information'
    case 'pending': return 'In progress'
    default: return ''
  }
}
</script>

<template>
  <q-card
    class="dashboard-card recent-activity"
    flat
    role="region"
    aria-label="Recent activity"
  >
    <q-card-section>
      <div class="section-header">
        <div>
          <h3 class="card-title">
            Recent Activity
          </h3>
          <p class="card-subtitle">
            Latest executions and events
          </p>
        </div>
        <!-- COMMUNITY: View All removed - workflows route not available -->
      </div>

      <!-- Loading state -->
      <div
        v-if="loading"
        class="activity-loading"
        role="status"
        aria-label="Loading recent activity"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="loading-item"
        >
          <div
            class="dashboard-skeleton"
            style="width: 60px; height: 14px"
            aria-hidden="true"
          />
          <div
            class="dashboard-skeleton"
            style="width: 12px; height: 12px; border-radius: 50%"
            aria-hidden="true"
          />
          <div
            class="dashboard-skeleton"
            style="width: 70%; height: 16px"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="error-state-inline"
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

      <!-- Activity timeline -->
      <div
        v-else-if="hasActivities"
        class="activity-timeline"
        role="feed"
        aria-label="Activity feed"
      >
        <article
          v-for="(activity, index) in displayedActivities"
          :key="activity.id"
          class="activity-item"
          :class="{ clickable: !!activity.link }"
          :role="activity.link ? 'button' : undefined"
          :tabindex="activity.link ? 0 : undefined"
          :aria-label="`${getTypeLabel(activity.type)}: ${activity.title}. ${getStatusLabel(activity.status)}. ${formatTimeAccessible(activity.timestamp)}`"
          @click="activity.link && emit('view', activity)"
          @keydown.enter="activity.link && emit('view', activity)"
          @keydown.space.prevent="activity.link && emit('view', activity)"
        >
          <!-- Time column -->
          <time class="activity-time" :datetime="activity.timestamp">
            {{ formatTime(activity.timestamp) }}
          </time>

          <!-- Indicator column -->
          <div class="activity-indicator" aria-hidden="true">
            <div 
              class="indicator-dot" 
              :class="getStatusColor(activity.status)"
            />
            <div 
              v-if="index < displayedActivities.length - 1" 
              class="indicator-line" 
            />
          </div>

          <!-- Content column -->
          <div class="activity-content">
            <div class="activity-header">
              <q-icon 
                :name="getTypeIcon(activity.type)" 
                size="16px" 
                class="activity-icon"
                aria-hidden="true"
              />
              <span class="activity-title">{{ activity.title }}</span>
            </div>
            <p
              v-if="activity.description"
              class="activity-description"
            >
              {{ activity.description }}
            </p>
            <router-link 
              v-if="activity.link" 
              :to="activity.link" 
              class="activity-link"
              @click.stop
            >
              View details →
            </router-link>
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="empty-state-inline"
      >
        <q-icon
          name="history"
          size="48px"
          color="grey-5"
          aria-hidden="true"
        />
        <p class="empty-text">No recent activity</p>
        <p class="empty-subtext">Start using the app to see activity here</p>
      </div>
    </q-card-section>
  </q-card>
</template>

<style lang="scss" scoped>
.recent-activity {
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.activity-loading {
  .loading-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    
    &:not(:last-child) {
      border-bottom: 1px solid var(--border-subtle);
    }
  }
}

.activity-timeline {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--border-subtle);
  }
  
  &.clickable {
    cursor: pointer;
    border-radius: var(--radius-sm, 4px);
    margin: 0 -8px;
    padding: 12px 8px;
    
    &:hover {
      background: var(--surface-hover);
      
      .activity-title {
        color: var(--accent-primary);
      }
    }
    
    &:focus-visible {
      outline: 2px solid var(--accent-primary);
      outline-offset: 2px;
    }
  }
}

.activity-time {
  min-width: 65px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-align: right;
  padding-top: 2px;
}

.activity-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .indicator-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid;
    background: var(--surface-1);
    z-index: 1;
    flex-shrink: 0;
    
    &.success { border-color: var(--success); }
    &.error { border-color: var(--error); }
    &.warning { border-color: var(--warning); }
    &.info { border-color: var(--info); }
    &.primary { border-color: var(--accent-primary); }
    &.grey { border-color: var(--text-tertiary); }
  }
  
  .indicator-line {
    position: absolute;
    top: 14px;
    width: 1px;
    height: calc(100% + 12px);
    background: var(--border-default);
  }
}

.activity-content {
  flex: 1;
  min-width: 0;
  
  .activity-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .activity-icon {
    color: var(--text-tertiary);
  }
  
  .activity-title {
    font-size: 0.875rem;
    color: var(--text-primary);
    transition: color 0.2s;
  }
  
  .activity-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 4px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .activity-link {
    font-size: 0.75rem;
    color: var(--accent-primary);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
    
    &:focus-visible {
      outline: 2px solid var(--accent-primary);
      outline-offset: 2px;
    }
  }
}

.error-state-inline,
.empty-state-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  min-height: 200px;
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

@media (max-width: 600px) {
  .activity-time {
    min-width: 50px;
    font-size: 0.6875rem;
  }
  
  .activity-content {
    .activity-title {
      font-size: 0.8125rem;
    }
    
    .activity-description {
      font-size: 0.6875rem;
    }
  }
}
</style>

