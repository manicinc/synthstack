<template>
  <div class="crm-pipeline">
    <!-- Header with metrics and controls -->
    <div class="header">
      <div class="metrics" v-if="showMetrics">
        <div class="metric">
          <div class="metric-label">Total Pipeline</div>
          <div class="metric-value">{{ formatCurrency(metrics.totalValue) }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Weighted Value</div>
          <div class="metric-value">{{ formatCurrency(metrics.weightedValue) }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Active Deals</div>
          <div class="metric-value">{{ metrics.activeCount }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Win Rate</div>
          <div class="metric-value">{{ metrics.winRate }}%</div>
        </div>
      </div>

      <div class="controls">
        <v-button
          icon
          rounded
          @click="viewMode = viewMode === 'kanban' ? 'list' : 'kanban'"
          v-tooltip="viewMode === 'kanban' ? 'Switch to List' : 'Switch to Kanban'"
        >
          <v-icon :name="viewMode === 'kanban' ? 'view_list' : 'view_kanban'" />
        </v-button>
        <v-button
          icon
          rounded
          @click="createDeal"
          v-tooltip="'Create Deal'"
        >
          <v-icon name="add" />
        </v-button>
        <v-button
          icon
          rounded
          @click="refreshData"
          v-tooltip="'Refresh'"
        >
          <v-icon name="refresh" />
        </v-button>
      </div>
    </div>

    <!-- Kanban Board View -->
    <div v-if="viewMode === 'kanban'" class="kanban-board">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="kanban-column"
        :style="{ borderTopColor: stage.color }"
      >
        <!-- Column Header -->
        <div class="column-header">
          <div class="column-title">
            <span class="stage-name">{{ stage.name }}</span>
            <v-badge>{{ getDealsInStage(stage.id).length }}</v-badge>
          </div>
          <div class="column-stats">
            <span class="column-value">{{ formatCurrency(getStageValue(stage.id)) }}</span>
          </div>
        </div>

        <!-- Deals in this stage -->
        <div
          class="deals-container"
          @drop="handleDrop($event, stage.id)"
          @dragover.prevent
          @dragenter.prevent
        >
          <div
            v-for="deal in getDealsInStage(stage.id)"
            :key="deal.id"
            class="deal-card"
            draggable="true"
            @dragstart="handleDragStart($event, deal)"
            @click="viewDeal(deal)"
          >
            <div class="deal-header">
              <span class="deal-title">{{ deal.title }}</span>
              <v-icon
                v-if="deal.priority === 'high'"
                name="priority_high"
                small
                color="var(--theme--danger)"
              />
            </div>

            <div class="deal-org">
              <v-icon name="business" x-small />
              {{ deal.organization_id?.name || 'No organization' }}
            </div>

            <div class="deal-footer">
              <span class="deal-value">{{ formatCurrency(deal.value) }}</span>
              <span class="deal-probability">{{ deal.probability }}%</span>
            </div>

            <div v-if="deal.expected_close_date" class="deal-date">
              <v-icon name="event" x-small />
              {{ formatDate(deal.expected_close_date) }}
            </div>

            <div class="deal-actions">
              <v-icon
                name="visibility"
                x-small
                clickable
                @click.stop="viewDeal(deal)"
                v-tooltip="'View Details'"
              />
              <v-icon
                v-if="!stage.is_closed"
                name="arrow_forward"
                x-small
                clickable
                @click.stop="moveToNextStage(deal)"
                v-tooltip="'Move to Next Stage'"
              />
              <v-icon
                v-if="stage.is_closed && stage.is_won"
                name="assignment"
                x-small
                clickable
                @click.stop="convertToProject(deal)"
                v-tooltip="'Convert to Project'"
              />
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="getDealsInStage(stage.id).length === 0" class="empty-stage">
            <v-icon name="inbox" large />
            <p>No deals in {{ stage.name.toLowerCase() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="list-view">
      <v-table
        :headers="tableHeaders"
        :items="deals"
        :loading="loading"
        show-select
        @click:row="viewDeal"
      >
        <template #item.title="{ item }">
          <span class="deal-title-cell">{{ item.title }}</span>
        </template>

        <template #item.organization_id="{ item }">
          <span>{{ item.organization_id?.name || 'N/A' }}</span>
        </template>

        <template #item.stage_id="{ item }">
          <v-badge :color="item.stage_id?.color">
            {{ item.stage_id?.name }}
          </v-badge>
        </template>

        <template #item.value="{ item }">
          <span class="amount">{{ formatCurrency(item.value) }}</span>
        </template>

        <template #item.probability="{ item }">
          <div class="probability-bar">
            <div class="probability-fill" :style="{ width: item.probability + '%' }"></div>
            <span class="probability-text">{{ item.probability }}%</span>
          </div>
        </template>

        <template #item.expected_close_date="{ item }">
          {{ formatDate(item.expected_close_date) }}
        </template>

        <template #item.actions="{ item }">
          <div class="row-actions">
            <v-icon
              name="visibility"
              small
              clickable
              @click.stop="viewDeal(item)"
              v-tooltip="'View'"
            />
            <v-icon
              name="edit"
              small
              clickable
              @click.stop="editDeal(item)"
              v-tooltip="'Edit'"
            />
          </div>
        </template>
      </v-table>
    </div>

    <!-- Loading state -->
    <v-progress-circular v-if="loading" indeterminate />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

interface Props {
  showMetrics?: boolean;
  groupBy?: string;
  defaultView?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showMetrics: true,
  groupBy: 'stage',
  defaultView: 'kanban'
});

const api = useApi();

// State
const loading = ref(true);
const stages = ref<any[]>([]);
const deals = ref<any[]>([]);
const viewMode = ref(props.defaultView);
const draggedDeal = ref<any>(null);

// Metrics
const metrics = computed(() => {
  const totalValue = deals.value
    .filter(d => !d.stage_id?.is_closed)
    .reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);

  const weightedValue = deals.value
    .filter(d => !d.stage_id?.is_closed)
    .reduce((sum, d) => sum + ((parseFloat(d.value) || 0) * (d.probability / 100)), 0);

  const activeCount = deals.value.filter(d => !d.stage_id?.is_closed).length;

  const closedDeals = deals.value.filter(d => d.stage_id?.is_closed);
  const wonDeals = closedDeals.filter(d => d.stage_id?.is_won);
  const winRate = closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0;

  return {
    totalValue,
    weightedValue,
    activeCount,
    winRate
  };
});

// Table headers for list view
const tableHeaders = [
  { text: 'Deal', value: 'title', width: 250 },
  { text: 'Organization', value: 'organization_id', width: 200 },
  { text: 'Stage', value: 'stage_id', width: 150 },
  { text: 'Value', value: 'value', width: 120, align: 'right' },
  { text: 'Probability', value: 'probability', width: 120 },
  { text: 'Expected Close', value: 'expected_close_date', width: 140 },
  { text: 'Actions', value: 'actions', width: 100, sortable: false }
];

// Methods
async function loadData() {
  loading.value = true;

  try {
    // Load stages
    const stagesResponse = await api.get('/items/deal_stages', {
      params: {
        sort: ['order_index'],
        fields: ['*']
      }
    });
    stages.value = stagesResponse.data.data;

    // Load deals
    const dealsResponse = await api.get('/items/deals', {
      params: {
        fields: [
          '*',
          'organization_id.name',
          'stage_id.name',
          'stage_id.color',
          'stage_id.is_closed',
          'stage_id.is_won',
          'contact_id.first_name',
          'contact_id.last_name'
        ],
        sort: ['-date_created']
      }
    });
    deals.value = dealsResponse.data.data;
  } catch (error) {
    console.error('Failed to load pipeline data:', error);
  } finally {
    loading.value = false;
  }
}

function refreshData() {
  loadData();
}

function getDealsInStage(stageId: string) {
  return deals.value.filter(d => d.stage_id?.id === stageId);
}

function getStageValue(stageId: string) {
  return getDealsInStage(stageId)
    .reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
}

function handleDragStart(event: DragEvent, deal: any) {
  draggedDeal.value = deal;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

async function handleDrop(event: DragEvent, stageId: string) {
  event.preventDefault();

  if (!draggedDeal.value) return;

  const deal = draggedDeal.value;
  const newStage = stages.value.find(s => s.id === stageId);

  if (!newStage || deal.stage_id?.id === stageId) {
    draggedDeal.value = null;
    return;
  }

  try {
    // Update deal stage
    await api.patch(`/items/deals/${deal.id}`, {
      stage_id: stageId,
      probability: newStage.default_probability
    });

    // Reload data
    await loadData();
  } catch (error) {
    console.error('Failed to move deal:', error);
  } finally {
    draggedDeal.value = null;
  }
}

async function moveToNextStage(deal: any) {
  const currentStageIndex = stages.value.findIndex(s => s.id === deal.stage_id?.id);
  if (currentStageIndex === -1 || currentStageIndex >= stages.value.length - 1) return;

  const nextStage = stages.value[currentStageIndex + 1];

  try {
    await api.patch(`/items/deals/${deal.id}`, {
      stage_id: nextStage.id,
      probability: nextStage.default_probability
    });

    await loadData();
  } catch (error) {
    console.error('Failed to move deal:', error);
  }
}

function createDeal() {
  window.location.href = '/admin/content/deals/+';
}

function viewDeal(deal: any) {
  window.location.href = `/admin/content/deals/${deal.id}`;
}

function editDeal(deal: any) {
  window.location.href = `/admin/content/deals/${deal.id}`;
}

async function convertToProject(deal: any) {
  if (!confirm(`Convert "${deal.title}" to a project?`)) return;

  try {
    // Create project from deal
    const projectResponse = await api.post('/items/projects', {
      name: deal.title,
      description: deal.description,
      organization_id: deal.organization_id?.id,
      deal_id: deal.id,
      budget: deal.value,
      status: 'planning'
    });

    const projectId = projectResponse.data.data.id;

    // Link project back to deal
    await api.patch(`/items/deals/${deal.id}`, {
      project_id: projectId
    });

    // Navigate to new project
    window.location.href = `/admin/content/projects/${projectId}`;
  } catch (error) {
    console.error('Failed to convert deal to project:', error);
  }
}

function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(date: string): string {
  if (!date) return 'No date set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Load data on mount
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.crm-pipeline {
  padding: var(--content-padding);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.metrics {
  display: flex;
  gap: 24px;
  flex: 1;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.controls {
  display: flex;
  gap: 8px;
}

/* Kanban Board */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  overflow-x: auto;
  flex: 1;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  border-top: 3px solid var(--theme--primary);
  min-height: 400px;
}

.column-header {
  padding: 16px;
  border-bottom: 1px solid var(--theme--border-color-subdued);
}

.column-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stage-name {
  font-weight: 600;
  font-size: 14px;
}

.column-stats {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.column-value {
  font-weight: 600;
}

.deals-container {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.deal-card {
  background: var(--theme--background-subdued);
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deal-card:hover {
  border-color: var(--theme--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.deal-card:active {
  cursor: grabbing;
  opacity: 0.5;
}

.deal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 8px;
}

.deal-title {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.deal-org {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.deal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deal-value {
  font-weight: 600;
  color: var(--theme--primary);
}

.deal-probability {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.deal-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--theme--foreground-subdued);
}

.deal-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--theme--border-color-subdued);
}

.empty-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--theme--foreground-subdued);
  text-align: center;
}

.empty-stage p {
  margin-top: 8px;
  font-size: 12px;
}

/* List View */
.list-view {
  flex: 1;
  overflow: auto;
}

.deal-title-cell {
  font-weight: 600;
}

.amount {
  font-variant-numeric: tabular-nums;
}

.probability-bar {
  position: relative;
  height: 24px;
  background: var(--theme--background-subdued);
  border-radius: 12px;
  overflow: hidden;
}

.probability-fill {
  position: absolute;
  height: 100%;
  background: var(--theme--primary);
  opacity: 0.2;
  transition: width 0.3s;
}

.probability-text {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 11px;
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
