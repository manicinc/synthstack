<template>
  <private-view title="SynthStack Dashboard">
    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="auto_awesome" />
      </v-button>
    </template>

    <template #headline>
      <v-breadcrumb :items="[{ name: 'SynthStack', to: '/synthstack-dashboard' }]" />
    </template>

    <template #actions>
      <v-button
        v-if="!license.valid || license.tier === 'community'"
        kind="primary"
        @click="openUpgrade"
      >
        <v-icon name="rocket_launch" left />
        Upgrade to Pro
      </v-button>
      <v-button secondary @click="refresh">
        <v-icon name="refresh" left />
        Refresh
      </v-button>
    </template>

    <div class="synthstack-dashboard">
      <!-- License Banner -->
      <div v-if="license.tier === 'community'" class="license-banner">
        <v-icon name="info" />
        <span>
          You're using the Community Edition. 
          <a :href="upgradeUrl" target="_blank">Upgrade to Pro</a> 
          to unlock workflows, AI agents, and advanced analytics.
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate />
        <p>Loading dashboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <v-icon name="error" large />
        <p>{{ error }}</p>
        <v-button @click="refresh">Retry</v-button>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon workflows">
              <v-icon name="account_tree" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.workflows }}</span>
              <span class="stat-label">Active Workflows</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon executions">
              <v-icon name="play_circle" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.executionsToday }}</span>
              <span class="stat-label">Executions Today</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon agents">
              <v-icon name="smart_toy" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.activeAgents }}</span>
              <span class="stat-label">AI Agents</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon success">
              <v-icon name="check_circle" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.successRate }}%</span>
              <span class="stat-label">Success Rate</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section">
          <h3 class="section-title">Quick Actions</h3>
          <div class="actions-grid">
            <v-button 
              class="action-card"
              :disabled="!hasFeature('workflows')"
              @click="navigateTo('/synthstack-workflows')"
            >
              <v-icon name="add_circle" />
              <span>New Workflow</span>
              <v-chip v-if="!hasFeature('workflows')" x-small>Pro</v-chip>
            </v-button>

            <v-button 
              class="action-card"
              @click="openNodeRed"
            >
              <v-icon name="edit" />
              <span>Open Editor</span>
            </v-button>

            <v-button 
              class="action-card"
              :disabled="!hasFeature('ai_agents')"
              @click="navigateTo('/synthstack-ai-agents')"
            >
              <v-icon name="smart_toy" />
              <span>AI Agents</span>
              <v-chip v-if="!hasFeature('ai_agents')" x-small>Pro</v-chip>
            </v-button>

            <v-button 
              class="action-card"
              @click="navigateTo('/settings/data-model')"
            >
              <v-icon name="schema" />
              <span>Data Model</span>
            </v-button>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="section">
          <h3 class="section-title">Recent Activity</h3>
          <div class="activity-list">
            <div 
              v-for="activity in recentActivity" 
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="activity.status">
                <v-icon :name="getActivityIcon(activity.type)" />
              </div>
              <div class="activity-content">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
              </div>
              <v-chip :class="activity.status" x-small>
                {{ activity.status }}
              </v-chip>
            </div>

            <div v-if="recentActivity.length === 0" class="empty-state">
              <v-icon name="inbox" />
              <p>No recent activity</p>
            </div>
          </div>
        </div>

        <!-- System Health -->
        <div class="section">
          <h3 class="section-title">System Health</h3>
          <div class="health-grid">
            <div class="health-item">
              <span class="health-label">API Gateway</span>
              <v-chip :class="health.apiGateway" x-small>
                {{ health.apiGateway }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">Node-RED</span>
              <v-chip :class="health.nodeRed" x-small>
                {{ health.nodeRed }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">Database</span>
              <v-chip :class="health.database" x-small>
                {{ health.database }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">ML Service</span>
              <v-chip :class="health.mlService" x-small>
                {{ health.mlService }}
              </v-chip>
            </div>
          </div>
        </div>
      </template>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { verifyLicense, hasFeature as checkFeature, getUpgradeUrl, type LicenseConfig, TIER_FEATURES } from '../../lib/license';

const api = useApi();
const { useSettingsStore } = useStores();
const settingsStore = useSettingsStore();

// State
const loading = ref(true);
const error = ref<string | null>(null);
const license = ref<LicenseConfig>({
  tier: 'community',
  features: TIER_FEATURES.community,
  valid: true
});

const stats = ref({
  workflows: 0,
  executionsToday: 0,
  activeAgents: 0,
  successRate: 0
});

const recentActivity = ref<Array<{
  id: string;
  type: string;
  title: string;
  status: string;
  timestamp: Date;
}>>([]);

const health = ref({
  apiGateway: 'healthy',
  nodeRed: 'healthy',
  database: 'healthy',
  mlService: 'healthy'
});

// Computed
const upgradeUrl = computed(() => getUpgradeUrl());

// Methods
function hasFeature(feature: string): boolean {
  return checkFeature(license.value, feature);
}

function navigateTo(path: string) {
  window.location.href = path;
}

function openNodeRed() {
  window.open('/nodered', '_blank');
}

function openUpgrade() {
  window.open(upgradeUrl.value, '_blank');
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    workflow_executed: 'play_circle',
    workflow_created: 'add_circle',
    agent_invoked: 'smart_toy',
    error: 'error',
    webhook_received: 'webhook'
  };
  return icons[type] || 'circle';
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function fetchDashboardData() {
  try {
    // Fetch stats
    const statsResponse = await api.get('/synthstack/stats');
    if (statsResponse.data) {
      stats.value = statsResponse.data;
    }

    // Fetch recent activity
    const activityResponse = await api.get('/synthstack/activity', {
      params: { limit: 10 }
    });
    if (activityResponse.data) {
      recentActivity.value = activityResponse.data;
    }

    // Fetch health status
    const healthResponse = await api.get('/synthstack/health');
    if (healthResponse.data) {
      health.value = healthResponse.data;
    }
  } catch (err) {
    console.error('[SynthStack] Failed to fetch dashboard data:', err);
    // Use mock data for demo
    stats.value = {
      workflows: 12,
      executionsToday: 156,
      activeAgents: 4,
      successRate: 98.5
    };
    recentActivity.value = [
      { id: '1', type: 'workflow_executed', title: 'Invoice Processing', status: 'success', timestamp: new Date() },
      { id: '2', type: 'agent_invoked', title: 'Content Generator', status: 'success', timestamp: new Date(Date.now() - 300000) },
      { id: '3', type: 'webhook_received', title: 'GitHub Push Event', status: 'success', timestamp: new Date(Date.now() - 600000) }
    ];
  }
}

async function refresh() {
  loading.value = true;
  error.value = null;
  
  try {
    // Check license
    const licenseKey = settingsStore.settings?.synthstack_license_key;
    license.value = await verifyLicense(licenseKey);
    
    // Fetch dashboard data
    await fetchDashboardData();
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.synthstack-dashboard {
  padding: var(--content-padding);
  max-width: 1400px;
}

.license-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary-10) 0%, var(--primary-25) 100%);
  border-radius: var(--border-radius);
  margin-bottom: 24px;
  border: 1px solid var(--primary-25);
}

.license-banner a {
  color: var(--primary);
  font-weight: 600;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.stat-icon.workflows {
  background: var(--primary-10);
  color: var(--primary);
}

.stat-icon.executions {
  background: var(--success-10);
  color: var(--success);
}

.stat-icon.agents {
  background: var(--warning-10);
  color: var(--warning);
}

.stat-icon.success {
  background: var(--success-10);
  color: var(--success);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--foreground-normal);
}

.stat-label {
  font-size: 13px;
  color: var(--foreground-subdued);
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground-normal);
  margin-bottom: 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: var(--background-normal);
  border: 1px solid var(--border-subdued);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-10);
}

.action-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.activity-list {
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
  overflow: hidden;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subdued);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--background-subdued);
}

.activity-icon.success {
  background: var(--success-10);
  color: var(--success);
}

.activity-icon.error {
  background: var(--danger-10);
  color: var(--danger);
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.activity-title {
  font-weight: 500;
  color: var(--foreground-normal);
}

.activity-time {
  font-size: 12px;
  color: var(--foreground-subdued);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: var(--foreground-subdued);
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.health-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.health-label {
  font-weight: 500;
}

.v-chip.healthy {
  --v-chip-background-color: var(--success-10);
  --v-chip-color: var(--success);
}

.v-chip.degraded {
  --v-chip-background-color: var(--warning-10);
  --v-chip-color: var(--warning);
}

.v-chip.unhealthy {
  --v-chip-background-color: var(--danger-10);
  --v-chip-color: var(--danger);
}

.v-chip.success {
  --v-chip-background-color: var(--success-10);
  --v-chip-color: var(--success);
}

.v-chip.error {
  --v-chip-background-color: var(--danger-10);
  --v-chip-color: var(--danger);
}
</style>


