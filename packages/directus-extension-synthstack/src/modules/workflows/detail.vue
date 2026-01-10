<template>
  <private-view :title="workflow?.name || 'Workflow'">
    <template #title-outer:prepend>
      <v-button class="header-icon" rounded icon secondary @click="goBack">
        <v-icon name="arrow_back" />
      </v-button>
    </template>

    <template #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>

    <template #actions>
      <v-button secondary @click="openInEditor">
        <v-icon name="edit" left />
        Open in Editor
      </v-button>
      <v-button :kind="workflow?.status === 'active' ? 'warning' : 'primary'" @click="toggleStatus">
        <v-icon :name="workflow?.status === 'active' ? 'pause' : 'play_arrow'" left />
        {{ workflow?.status === 'active' ? 'Pause' : 'Activate' }}
      </v-button>
    </template>

    <div class="workflow-detail">
      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate />
      </div>

      <template v-else-if="workflow">
        <!-- Overview Section -->
        <div class="section">
          <h3 class="section-title">Overview</h3>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="overview-label">Status</span>
              <v-chip :class="workflow.status" small>{{ workflow.status }}</v-chip>
            </div>
            <div class="overview-item">
              <span class="overview-label">Created</span>
              <span class="overview-value">{{ formatDate(workflow.createdAt) }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">Last Execution</span>
              <span class="overview-value">{{ formatDate(workflow.lastExecution) }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">Total Executions</span>
              <span class="overview-value">{{ workflow.executionCount }}</span>
            </div>
          </div>
          <div v-if="workflow.description" class="description">
            {{ workflow.description }}
          </div>
        </div>

        <!-- Execution History -->
        <div class="section">
          <h3 class="section-title">Recent Executions</h3>
          <v-table
            v-if="executions.length > 0"
            :headers="executionHeaders"
            :items="executions"
            :loading="loadingExecutions"
          >
            <template #item.status="{ item }">
              <v-chip :class="item.status" x-small>{{ item.status }}</v-chip>
            </template>
            <template #item.startedAt="{ item }">
              {{ formatDate(item.startedAt) }}
            </template>
            <template #item.duration="{ item }">
              {{ formatDuration(item.duration) }}
            </template>
          </v-table>
          <div v-else class="empty-executions">
            <v-icon name="history" />
            <p>No executions yet</p>
          </div>
        </div>

        <!-- Nodes Used -->
        <div class="section">
          <h3 class="section-title">Nodes Used</h3>
          <div class="nodes-grid">
            <div v-for="node in workflow.nodes" :key="node.type" class="node-item">
              <v-icon :name="getNodeIcon(node.type)" />
              <span>{{ node.label || node.type }}</span>
              <v-chip x-small>{{ node.count }}</v-chip>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="error-state">
        <v-icon name="error" large />
        <p>Workflow not found</p>
        <v-button @click="goBack">Go Back</v-button>
      </div>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const route = useRoute();
const router = useRouter();

// State
const loading = ref(true);
const loadingExecutions = ref(false);
const workflow = ref<any>(null);
const executions = ref<any[]>([]);

// Computed
const breadcrumb = computed(() => [
  { name: 'SynthStack', to: '/synthstack-dashboard' },
  { name: 'Workflows', to: '/synthstack-workflows' },
  { name: workflow.value?.name || 'Detail', to: route.path }
]);

const executionHeaders = [
  { text: 'Status', value: 'status' },
  { text: 'Started', value: 'startedAt', sortable: true },
  { text: 'Duration', value: 'duration' },
  { text: 'Trigger', value: 'trigger' }
];

// Methods
function goBack() {
  router.push('/synthstack-workflows');
}

function openInEditor() {
  window.open(`/nodered/#flow/${route.params.id}`, '_blank');
}

async function toggleStatus() {
  if (!workflow.value) return;
  
  const newStatus = workflow.value.status === 'active' ? 'paused' : 'active';
  try {
    await api.patch(`/synthstack/workflows/${route.params.id}`, { status: newStatus });
    workflow.value.status = newStatus;
  } catch (err) {
    console.error('Failed to toggle status:', err);
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    'synthstack-agent': 'smart_toy',
    'synthstack-directus': 'storage',
    'synthstack-github': 'code',
    'synthstack-slack': 'chat',
    'synthstack-email': 'email',
    inject: 'play_circle',
    debug: 'bug_report',
    function: 'code',
    switch: 'call_split'
  };
  return icons[type] || 'extension';
}

async function fetchWorkflow() {
  try {
    const response = await api.get(`/synthstack/workflows/${route.params.id}`);
    if (response.data) {
      workflow.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch workflow:', err);
    // Mock data
    workflow.value = {
      id: route.params.id,
      name: 'Invoice Processing',
      description: 'Automatically process incoming invoices from email attachments',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 7),
      lastExecution: new Date(),
      executionCount: 156,
      nodes: [
        { type: 'synthstack-email', label: 'Email Trigger', count: 1 },
        { type: 'synthstack-agent', label: 'AI Processor', count: 1 },
        { type: 'synthstack-directus', label: 'Save to CMS', count: 2 }
      ]
    };
  }
}

async function fetchExecutions() {
  loadingExecutions.value = true;
  try {
    const response = await api.get(`/synthstack/workflows/${route.params.id}/executions`);
    if (response.data) {
      executions.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch executions:', err);
    // Mock data
    executions.value = [
      { id: '1', status: 'success', startedAt: new Date(), duration: 1250, trigger: 'Email' },
      { id: '2', status: 'success', startedAt: new Date(Date.now() - 3600000), duration: 980, trigger: 'Email' },
      { id: '3', status: 'error', startedAt: new Date(Date.now() - 7200000), duration: 150, trigger: 'Manual' }
    ];
  } finally {
    loadingExecutions.value = false;
  }
}

onMounted(async () => {
  await fetchWorkflow();
  await fetchExecutions();
  loading.value = false;
});
</script>

<style scoped>
.workflow-detail {
  padding: var(--content-padding);
  max-width: 1200px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  gap: 16px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--foreground-normal);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  padding: 20px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 12px;
  color: var(--foreground-subdued);
  text-transform: uppercase;
}

.overview-value {
  font-weight: 500;
  color: var(--foreground-normal);
}

.description {
  margin-top: 16px;
  padding: 16px;
  background: var(--background-subdued);
  border-radius: var(--border-radius);
  color: var(--foreground-subdued);
  line-height: 1.6;
}

.empty-executions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: var(--foreground-subdued);
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.nodes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.v-chip.active,
.v-chip.success {
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


