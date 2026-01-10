<template>
  <private-view title="Workflows">
    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="account_tree" />
      </v-button>
    </template>

    <template #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>

    <template #actions>
      <v-button v-if="hasAccess" kind="primary" @click="createWorkflow">
        <v-icon name="add" left />
        New Workflow
      </v-button>
    </template>

    <div class="workflows-module">
      <!-- License Gate -->
      <div v-if="!hasAccess" class="license-gate">
        <div class="gate-icon">
          <v-icon name="lock" x-large />
        </div>
        <h2>Workflows require a Pro license</h2>
        <p>
          Unlock powerful workflow automation with visual Node-RED integration,
          AI agents, and 20+ integrations.
        </p>
        <v-button kind="primary" @click="openUpgrade">
          <v-icon name="rocket_launch" left />
          Upgrade to Pro
        </v-button>
      </div>

      <!-- Workflows Content -->
      <template v-else>
        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ workflows.length }}</span>
            <span class="stat-label">Total Workflows</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ activeWorkflows }}</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ executionsToday }}</span>
            <span class="stat-label">Executions Today</span>
          </div>
        </div>

        <!-- Workflows Table -->
        <v-table
          v-if="workflows.length > 0"
          :headers="tableHeaders"
          :items="workflows"
          :loading="loading"
          @click:row="openWorkflow"
        >
          <template #item.status="{ item }">
            <v-chip :class="item.status" x-small>
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.lastExecution="{ item }">
            {{ formatDate(item.lastExecution) }}
          </template>
          <template #item.actions="{ item }">
            <v-button icon x-small @click.stop="toggleWorkflow(item)">
              <v-icon :name="item.status === 'active' ? 'pause' : 'play_arrow'" />
            </v-button>
            <v-button icon x-small @click.stop="editWorkflow(item)">
              <v-icon name="edit" />
            </v-button>
            <v-button icon x-small @click.stop="deleteWorkflow(item)">
              <v-icon name="delete" />
            </v-button>
          </template>
        </v-table>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <v-icon name="account_tree" x-large />
          <h3>No workflows yet</h3>
          <p>Create your first workflow to automate tasks with AI agents and integrations.</p>
          <v-button kind="primary" @click="createWorkflow">
            <v-icon name="add" left />
            Create Workflow
          </v-button>
        </div>
      </template>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApi, useStores } from '@directus/extensions-sdk';
import { verifyLicense, hasFeature, getUpgradeUrl, type LicenseConfig, TIER_FEATURES } from '../../lib/license';

const api = useApi();
const router = useRouter();
const { useSettingsStore } = useStores();
const settingsStore = useSettingsStore();

// State
const loading = ref(true);
const license = ref<LicenseConfig>({
  tier: 'community',
  features: TIER_FEATURES.community,
  valid: true
});

const workflows = ref<Array<{
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  lastExecution: Date | null;
  executionCount: number;
}>>([]);

// Computed
const hasAccess = computed(() => hasFeature(license.value, 'workflows'));
const activeWorkflows = computed(() => workflows.value.filter(w => w.status === 'active').length);
const executionsToday = computed(() => workflows.value.reduce((sum, w) => sum + w.executionCount, 0));

const breadcrumb = computed(() => [
  { name: 'SynthStack', to: '/synthstack-dashboard' },
  { name: 'Workflows', to: '/synthstack-workflows' }
]);

const tableHeaders = [
  { text: 'Name', value: 'name', sortable: true },
  { text: 'Description', value: 'description' },
  { text: 'Status', value: 'status', sortable: true },
  { text: 'Last Execution', value: 'lastExecution', sortable: true },
  { text: 'Actions', value: 'actions', align: 'right' }
];

// Methods
function openUpgrade() {
  window.open(getUpgradeUrl('workflows'), '_blank');
}

function createWorkflow() {
  // Open Node-RED editor for new flow
  window.open('/nodered/#flow/new', '_blank');
}

function openWorkflow(item: any) {
  router.push(`/synthstack-workflows/${item.id}`);
}

function editWorkflow(item: any) {
  window.open(`/nodered/#flow/${item.id}`, '_blank');
}

async function toggleWorkflow(item: any) {
  try {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    await api.patch(`/synthstack/workflows/${item.id}`, { status: newStatus });
    item.status = newStatus;
  } catch (err) {
    console.error('Failed to toggle workflow:', err);
  }
}

async function deleteWorkflow(item: any) {
  if (!confirm(`Delete workflow "${item.name}"? This cannot be undone.`)) return;
  
  try {
    await api.delete(`/synthstack/workflows/${item.id}`);
    workflows.value = workflows.value.filter(w => w.id !== item.id);
  } catch (err) {
    console.error('Failed to delete workflow:', err);
  }
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

async function fetchWorkflows() {
  try {
    const response = await api.get('/synthstack/workflows');
    if (response.data) {
      workflows.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch workflows:', err);
    // Mock data for demo
    workflows.value = [
      {
        id: 'flow-1',
        name: 'Invoice Processing',
        description: 'Automatically process incoming invoices',
        status: 'active',
        lastExecution: new Date(),
        executionCount: 45
      },
      {
        id: 'flow-2',
        name: 'Content Generation',
        description: 'Generate blog posts with AI',
        status: 'active',
        lastExecution: new Date(Date.now() - 3600000),
        executionCount: 12
      },
      {
        id: 'flow-3',
        name: 'GitHub Sync',
        description: 'Sync issues to project board',
        status: 'paused',
        lastExecution: new Date(Date.now() - 86400000),
        executionCount: 0
      }
    ];
  }
}

onMounted(async () => {
  const licenseKey = settingsStore.settings?.synthstack_license_key;
  license.value = await verifyLicense(licenseKey);
  
  if (hasAccess.value) {
    await fetchWorkflows();
  }
  
  loading.value = false;
});
</script>

<style scoped>
.workflows-module {
  padding: var(--content-padding);
}

.license-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.gate-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary-10);
  color: var(--primary);
  margin-bottom: 24px;
}

.license-gate h2 {
  margin: 0 0 12px;
  color: var(--foreground-normal);
}

.license-gate p {
  margin: 0 0 24px;
  color: var(--foreground-subdued);
  line-height: 1.6;
}

.stats-bar {
  display: flex;
  gap: 32px;
  padding: 20px 24px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  margin-bottom: 24px;
  border: 1px solid var(--border-subdued);
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--foreground-normal);
}

.stat-label {
  font-size: 13px;
  color: var(--foreground-subdued);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 40px;
  text-align: center;
  color: var(--foreground-subdued);
}

.empty-state h3 {
  margin: 16px 0 8px;
  color: var(--foreground-normal);
}

.empty-state p {
  margin: 0 0 24px;
  max-width: 400px;
}

.v-chip.active {
  --v-chip-background-color: var(--success-10);
  --v-chip-color: var(--success);
}

.v-chip.paused {
  --v-chip-background-color: var(--warning-10);
  --v-chip-color: var(--warning);
}

.v-chip.error {
  --v-chip-background-color: var(--danger-10);
  --v-chip-color: var(--danger);
}
</style>


