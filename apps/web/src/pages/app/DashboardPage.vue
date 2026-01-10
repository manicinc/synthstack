<template>
  <q-page class="dashboard-page" data-testid="dashboard-page">
    <!-- Welcome Card with Quick Actions -->
    <WelcomeCard 
      :user="authStore.user" 
      :quick-actions="quickActions"
      :loading="loading"
      data-testid="welcome-card"
    />

    <!-- Stats Row -->
    <StatsCards 
      :stats="dashboardStore.quickStats" 
      :loading="loading"
      data-testid="stats-cards"
      @click="handleStatClick"
    />

    <!-- Charts Row -->
    <!-- COMMUNITY: WorkflowChart removed (PRO feature) -->
    <div class="charts-row" data-testid="charts-row">
      <UsageBreakdown
        :data="dashboardStore.usageBreakdown.data"
        :total="dashboardStore.usageBreakdown.total"
        total-label="Credits Used"
        :change="dashboardStore.usageBreakdown.change"
        change-label="projected this month"
        :loading="loading"
        data-testid="usage-breakdown"
      />
    </div>

    <!-- Activity Row -->
    <!-- COMMUNITY: TopWorkflows and AIUsageCard removed (PRO features) -->
    <div class="tables-row" data-testid="tables-row">
      <RecentActivity
        :activities="dashboardStore.recentActivity"
        :loading="loading"
        data-testid="recent-activity"
        @view="viewActivity"
      />
    </div>

    <!-- Last updated indicator -->
    <div
      v-if="dashboardStore.lastUpdated"
      class="last-updated"
      data-testid="last-updated"
    >
      <q-icon 
        :name="isConnected ? 'wifi' : 'wifi_off'" 
        :class="['connection-indicator', { connected: isConnected }]"
        size="14px"
        data-testid="connection-indicator"
      />
      <q-icon
        name="schedule"
        size="14px"
        class="q-mr-xs"
      />
      Last updated {{ formatLastUpdated }}
      <q-btn 
        flat 
        dense 
        icon="refresh" 
        size="sm" 
        :loading="refreshing"
        @click="refreshDashboard"
      />
      <q-tooltip v-if="isConnected">
        Real-time updates active
      </q-tooltip>
      <q-tooltip v-else>
        Using periodic refresh (every 5 min)
      </q-tooltip>
    </div>
  </q-page>
</template>

<script setup lang="ts">
/**
 * DashboardPage - Complete dashboard overhaul
 * Integrates tailwind-admin components with SynthStack theme
 * Includes real-time SSE updates for live dashboard data
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useDashboardEvents } from '@/composables/useDashboardEvents'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
// COMMUNITY: WorkflowChart, TopWorkflows, AIUsageCard removed (PRO features)
import {
  WelcomeCard,
  StatsCards,
  UsageBreakdown,
  RecentActivity,
} from '@/components/dashboard'

const router = useRouter()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const { isConnected, connectionStatus, connect, disconnect, on } = useDashboardEvents()

// State
const loading = ref(true)
const refreshing = ref(false)
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Quick actions for welcome card
// COMMUNITY: Workflow and Copilot links removed (PRO features)
const quickActions = [
  { label: 'View Projects', icon: 'folder', to: '/app/projects', color: 'primary' },
  { label: 'Documentation', icon: 'menu_book', to: '/app/docs' },
  { label: 'Settings', icon: 'settings', to: '/app/settings' },
]

// Computed
const formatLastUpdated = computed(() => {
  if (!dashboardStore.lastUpdated) return ''
  const diff = Date.now() - dashboardStore.lastUpdated.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  return dashboardStore.lastUpdated.toLocaleTimeString()
})

// Methods
async function loadDashboard() {
  loading.value = true
  try {
    await dashboardStore.refreshAll()
  } catch (error) {
    logError('Failed to load dashboard:', error)
  } finally {
    loading.value = false
  }
}

async function refreshDashboard() {
  refreshing.value = true
  try {
    await dashboardStore.refreshAll()
  } finally {
    refreshing.value = false
  }
}

function handleStatClick(stat: { route?: string }) {
  if (stat.route) {
    router.push(stat.route)
  }
}

// COMMUNITY: handlePeriodChange and goToWorkflow removed (PRO features)

function viewActivity(activity: { link?: string }) {
  if (activity.link) {
    router.push(activity.link)
  }
}

// Real-time event listeners
const eventUnsubscribers: Array<() => void> = []

function setupEventListeners() {
  // COMMUNITY: Workflow event listener removed (PRO feature)

  // Listen for stats updates
  eventUnsubscribers.push(
    on('stats_updated', (data) => {
      dashboardStore.handleStatsUpdate(data)
    })
  )
}

function cleanupEventListeners() {
  eventUnsubscribers.forEach(unsubscribe => unsubscribe())
  eventUnsubscribers.length = 0
}

// Watch for connection status changes
watch(connectionStatus, (status) => {
  if (status === 'connected') {
    devLog('[Dashboard] Real-time updates connected')
  } else if (status === 'error') {
    devWarn('[Dashboard] Real-time updates disconnected, falling back to polling')
  }
})

// Lifecycle
onMounted(async () => {
  await loadDashboard()
  
  // Setup real-time event listeners
  setupEventListeners()
  
  // Connect to SSE for real-time updates
  if (authStore.isAuthenticated) {
    connect()
  }
  
  // Fallback: Auto-refresh every 5 minutes if SSE not connected
  refreshInterval = setInterval(() => {
    if (!isConnected.value) {
      dashboardStore.refreshAll()
    }
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  cleanupEventListeners()
  disconnect()
})
</script>

<style lang="scss" scoped>
@import '@/css/dashboard-components.scss';

.dashboard-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.tables-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.ai-row {
  margin-bottom: 24px;
  
  :deep(.ai-usage-card) {
    max-width: 400px;
  }
}

.last-updated {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 16px 0;
  
  .connection-indicator {
    color: var(--text-tertiary);
    margin-right: 4px;
    
    &.connected {
      color: var(--accent-success, #10b981);
    }
  }
}

// Mobile responsive
@media (max-width: 600px) {
  .dashboard-page {
    padding: 16px;
  }
}
</style>
