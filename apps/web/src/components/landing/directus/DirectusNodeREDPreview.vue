<script setup lang="ts">
/**
 * DirectusNodeREDPreview
 * Mock preview of the Node-RED Admin Directus extension
 */

interface Execution {
  id: string
  flowName: string
  tenant: string
  status: 'success' | 'failed' | 'running'
  duration: string
  time: string
}

const stats = {
  activeTenants: 12,
  totalFlows: 47,
  executionsToday: 1284,
  failedToday: 3
}

const executions: Execution[] = [
  { id: '1', flowName: 'Lead Qualification', tenant: 'Acme Corp', status: 'success', duration: '1.2s', time: '2 min ago' },
  { id: '2', flowName: 'Invoice Generator', tenant: 'TechStart', status: 'success', duration: '0.8s', time: '5 min ago' },
  { id: '3', flowName: 'Slack Notifier', tenant: 'Global Inc', status: 'running', duration: '—', time: 'now' },
  { id: '4', flowName: 'Data Sync', tenant: 'StartupXYZ', status: 'failed', duration: '4.5s', time: '12 min ago' },
  { id: '5', flowName: 'Email Campaign', tenant: 'Acme Corp', status: 'success', duration: '2.1s', time: '15 min ago' },
]

function getStatusIcon(status: string) {
  const icons: Record<string, string> = {
    success: 'check_circle',
    failed: 'error',
    running: 'sync'
  }
  return icons[status] || 'help'
}
</script>

<template>
  <div class="nodered-preview">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon tenants">
          <q-icon
            name="business"
            size="20px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.activeTenants }}</span>
          <span class="stat-label">Active Tenants</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon flows">
          <q-icon
            name="account_tree"
            size="20px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalFlows }}</span>
          <span class="stat-label">Total Flows</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon executions">
          <q-icon
            name="play_circle"
            size="20px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.executionsToday.toLocaleString() }}</span>
          <span class="stat-label">Executions Today</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon failed">
          <q-icon
            name="error"
            size="20px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.failedToday }}</span>
          <span class="stat-label">Failed Today</span>
        </div>
      </div>
    </div>

    <!-- Recent Executions -->
    <div class="executions-section">
      <div class="section-header">
        <h3>Recent Executions</h3>
        <button class="view-all-btn">
          View All
          <q-icon
            name="arrow_forward"
            size="14px"
          />
        </button>
      </div>
      <div class="executions-list">
        <div 
          v-for="exec in executions" 
          :key="exec.id" 
          class="execution-row"
          :class="exec.status"
        >
          <div class="exec-status">
            <q-icon 
              :name="getStatusIcon(exec.status)" 
              size="18px" 
              :class="exec.status"
            />
          </div>
          <div class="exec-info">
            <span class="exec-flow">{{ exec.flowName }}</span>
            <span class="exec-tenant">{{ exec.tenant }}</span>
          </div>
          <div class="exec-duration">
            <span
              v-if="exec.status === 'running'"
              class="running-indicator"
            >
              <span class="dot" />
              Running
            </span>
            <span v-else>{{ exec.duration }}</span>
          </div>
          <div class="exec-time">
            {{ exec.time }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nodered-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.tenants { background: #10B981; }
  &.flows { background: #3B82F6; }
  &.executions { background: #F59E0B; }
  &.failed { background: #EF4444; }
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.executions-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

.executions-list {
  display: flex;
  flex-direction: column;
}

.execution-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 100px;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  transition: background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 600px) {
    grid-template-columns: 32px 1fr 80px;

    .exec-time {
      display: none;
    }
  }
}

.exec-status {
  .q-icon {
    &.success { color: #10b981; }
    &.failed { color: #ef4444; }
    &.running { 
      color: #3b82f6;
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.exec-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exec-flow {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exec-tenant {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.exec-duration {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
}

.running-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #3b82f6;
  font-size: 0.75rem;

  .dot {
    width: 6px;
    height: 6px;
    background: #3b82f6;
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.exec-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
}

// Light mode
:global(.body--light) {
  .stat-card {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.08);

    &:hover {
      background: #fff;
    }
  }

  .stat-value {
    color: #1e293b;
  }

  .stat-label {
    color: #64748b;
  }

  .executions-section {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .section-header {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);

    h3 {
      color: #1e293b;
    }
  }

  .view-all-btn {
    border-color: rgba(0, 0, 0, 0.1);
    color: #64748b;

    &:hover {
      background: rgba(0, 0, 0, 0.03);
      color: #1e293b;
    }
  }

  .execution-row {
    border-color: rgba(0, 0, 0, 0.05);

    &:hover {
      background: rgba(0, 0, 0, 0.02);
    }
  }

  .exec-flow {
    color: #1e293b;
  }

  .exec-tenant {
    color: #64748b;
  }

  .exec-duration {
    color: #475569;
  }

  .exec-time {
    color: #94a3b8;
  }
}
</style>


