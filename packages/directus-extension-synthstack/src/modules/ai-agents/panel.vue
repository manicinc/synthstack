<template>
  <div class="ai-agents-panel" :class="{ 'has-header': showHeader }">
    <!-- License Gate -->
    <div v-if="!hasAccess" class="license-gate">
      <v-icon name="lock" />
      <p>AI Agents require a Pro license</p>
      <v-button x-small @click="openUpgrade">Upgrade</v-button>
    </div>

    <!-- Panel Content -->
    <template v-else>
      <!-- Header -->
      <div v-if="showHeader" class="panel-header">
        <h4>AI Co-Founders</h4>
        <v-button icon x-small @click="refresh">
          <v-icon name="refresh" />
        </v-button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <v-progress-circular indeterminate x-small />
      </div>

      <!-- Agents List -->
      <div v-else class="agents-list">
        <div 
          v-for="agent in filteredAgents" 
          :key="agent.id" 
          class="agent-card"
          @click="selectAgent(agent)"
        >
          <div class="agent-avatar" :style="{ background: agent.color }">
            <v-icon :name="agent.icon" />
          </div>
          <div class="agent-info">
            <span class="agent-name">{{ agent.name }}</span>
            <span class="agent-role">{{ agent.role }}</span>
          </div>
          <v-chip :class="agent.status" x-small>
            {{ agent.status }}
          </v-chip>
        </div>

        <div v-if="filteredAgents.length === 0" class="empty">
          <p>No agents configured</p>
        </div>
      </div>

      <!-- Metrics (if enabled) -->
      <div v-if="showMetrics && !loading" class="metrics">
        <div class="metric">
          <span class="metric-value">{{ totalInvocations }}</span>
          <span class="metric-label">Invocations</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ avgResponseTime }}ms</span>
          <span class="metric-label">Avg Response</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineProps } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { verifyLicense, hasFeature, getUpgradeUrl, type LicenseConfig, TIER_FEATURES } from '../../lib/license';

const props = defineProps<{
  showHeader?: boolean;
  showMetrics?: boolean;
  agentFilter?: string;
}>();

const api = useApi();
const { useSettingsStore } = useStores();
const settingsStore = useSettingsStore();

// State
const loading = ref(true);
const license = ref<LicenseConfig>({
  tier: 'community',
  features: TIER_FEATURES.community,
  valid: true
});

const agents = ref<Array<{
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error';
  icon: string;
  color: string;
  invocations: number;
  avgResponseTime: number;
}>>([]);

// Computed
const hasAccess = computed(() => hasFeature(license.value, 'ai_agents'));

const filteredAgents = computed(() => {
  if (props.agentFilter === 'active') {
    return agents.value.filter(a => a.status === 'active');
  }
  return agents.value;
});

const totalInvocations = computed(() => 
  agents.value.reduce((sum, a) => sum + a.invocations, 0)
);

const avgResponseTime = computed(() => {
  if (agents.value.length === 0) return 0;
  const total = agents.value.reduce((sum, a) => sum + a.avgResponseTime, 0);
  return Math.round(total / agents.value.length);
});

// Methods
function openUpgrade() {
  window.open(getUpgradeUrl('ai_agents'), '_blank');
}

function selectAgent(agent: any) {
  // Open agent detail or invoke
  console.log('Selected agent:', agent);
}

async function fetchAgents() {
  try {
    const response = await api.get('/synthstack/agents');
    if (response.data) {
      agents.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch agents:', err);
    // Mock data
    agents.value = [
      {
        id: 'ceo',
        name: 'CEO',
        role: 'Strategic Planning',
        status: 'active',
        icon: 'psychology',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        invocations: 234,
        avgResponseTime: 1250
      },
      {
        id: 'cto',
        name: 'CTO',
        role: 'Technical Architecture',
        status: 'active',
        icon: 'code',
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        invocations: 189,
        avgResponseTime: 980
      },
      {
        id: 'cmo',
        name: 'CMO',
        role: 'Marketing Strategy',
        status: 'idle',
        icon: 'campaign',
        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        invocations: 156,
        avgResponseTime: 1100
      },
      {
        id: 'cfo',
        name: 'CFO',
        role: 'Financial Analysis',
        status: 'active',
        icon: 'account_balance',
        color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        invocations: 98,
        avgResponseTime: 890
      }
    ];
  }
}

async function refresh() {
  loading.value = true;
  await fetchAgents();
  loading.value = false;
}

onMounted(async () => {
  const licenseKey = settingsStore.settings?.synthstack_license_key;
  license.value = await verifyLicense(licenseKey);
  
  if (hasAccess.value) {
    await fetchAgents();
  }
  
  loading.value = false;
});
</script>

<style scoped>
.ai-agents-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.license-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--foreground-subdued);
  text-align: center;
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subdued);
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.agents-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.agent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.2s;
}

.agent-card:hover {
  background: var(--background-normal-alt);
}

.agent-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: white;
}

.agent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--foreground-normal);
}

.agent-role {
  font-size: 12px;
  color: var(--foreground-subdued);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--foreground-subdued);
}

.metrics {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subdued);
  background: var(--background-subdued);
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--foreground-normal);
}

.metric-label {
  font-size: 11px;
  color: var(--foreground-subdued);
}

.v-chip.active {
  --v-chip-background-color: var(--success-10);
  --v-chip-color: var(--success);
}

.v-chip.idle {
  --v-chip-background-color: var(--warning-10);
  --v-chip-color: var(--warning);
}

.v-chip.error {
  --v-chip-background-color: var(--danger-10);
  --v-chip-color: var(--danger);
}
</style>


