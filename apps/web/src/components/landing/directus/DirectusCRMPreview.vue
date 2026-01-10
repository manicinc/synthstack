<script setup lang="ts">
/**
 * DirectusCRMPreview
 * Mock preview of the CRM Pipeline Directus extension
 */

interface Deal {
  id: string
  title: string
  company: string
  value: number
  probability: number
  priority: 'high' | 'medium' | 'low'
}

interface Stage {
  id: string
  name: string
  color: string
  deals: Deal[]
}

const stages: Stage[] = [
  {
    id: 'lead',
    name: 'Lead',
    color: '#64748b',
    deals: [
      { id: '1', title: 'Enterprise License', company: 'Acme Corp', value: 45000, probability: 20, priority: 'medium' },
      { id: '2', title: 'Annual Contract', company: 'TechStart', value: 12000, probability: 30, priority: 'low' },
    ]
  },
  {
    id: 'qualified',
    name: 'Qualified',
    color: '#3B82F6',
    deals: [
      { id: '3', title: 'Platform Migration', company: 'Global Inc', value: 85000, probability: 50, priority: 'high' },
    ]
  },
  {
    id: 'proposal',
    name: 'Proposal',
    color: '#8B5CF6',
    deals: [
      { id: '4', title: 'Custom Integration', company: 'DataFlow', value: 32000, probability: 70, priority: 'high' },
      { id: '5', title: 'Support Plan', company: 'StartupXYZ', value: 8500, probability: 60, priority: 'medium' },
    ]
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    color: '#F59E0B',
    deals: [
      { id: '6', title: 'Multi-Year Deal', company: 'Enterprise Co', value: 120000, probability: 85, priority: 'high' },
    ]
  }
]

const metrics = {
  totalValue: 302500,
  weightedValue: 142250,
  activeDeals: 6,
  winRate: 68
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function getStageValue(deals: Deal[]) {
  return deals.reduce((sum, d) => sum + d.value, 0)
}
</script>

<template>
  <div class="crm-preview">
    <!-- Metrics Bar -->
    <div class="metrics-bar">
      <div class="metric">
        <span class="metric-label">Total Pipeline</span>
        <span class="metric-value">{{ formatCurrency(metrics.totalValue) }}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Weighted Value</span>
        <span class="metric-value">{{ formatCurrency(metrics.weightedValue) }}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Active Deals</span>
        <span class="metric-value">{{ metrics.activeDeals }}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Win Rate</span>
        <span class="metric-value">{{ metrics.winRate }}%</span>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board">
      <div 
        v-for="stage in stages" 
        :key="stage.id" 
        class="kanban-column"
        :style="{ '--stage-color': stage.color }"
      >
        <div class="column-header">
          <span class="stage-name">{{ stage.name }}</span>
          <span class="stage-count">{{ stage.deals.length }}</span>
          <span class="stage-value">{{ formatCurrency(getStageValue(stage.deals)) }}</span>
        </div>
        <div class="deals-list">
          <div 
            v-for="deal in stage.deals" 
            :key="deal.id" 
            class="deal-card"
            :class="{ 'priority-high': deal.priority === 'high' }"
          >
            <div class="deal-header">
              <span class="deal-title">{{ deal.title }}</span>
              <q-icon 
                v-if="deal.priority === 'high'" 
                name="priority_high" 
                size="14px" 
                color="red-5" 
              />
            </div>
            <div class="deal-company">
              <q-icon
                name="business"
                size="12px"
              />
              {{ deal.company }}
            </div>
            <div class="deal-footer">
              <span class="deal-value">{{ formatCurrency(deal.value) }}</span>
              <span class="deal-probability">{{ deal.probability }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.crm-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metrics-bar {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  min-height: 280px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.kanban-column {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border-top: 3px solid var(--stage-color);
  overflow: hidden;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stage-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.stage-count {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.stage-value {
  margin-left: auto;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'JetBrains Mono', monospace;
}

.deals-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deal-card {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-2px);
  }

  &.priority-high {
    border-left: 3px solid #ef4444;
  }
}

.deal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.deal-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deal-company {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.deal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deal-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #10b981;
  font-family: 'JetBrains Mono', monospace;
}

.deal-probability {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 10px;
}

// Light mode
:global(.body--light) {
  .metrics-bar {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .metric-label {
    color: #64748b;
  }

  .metric-value {
    color: #1e293b;
  }

  .kanban-column {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .column-header {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.05);
  }

  .stage-name {
    color: #334155;
  }

  .stage-count {
    background: rgba(0, 0, 0, 0.05);
    color: #475569;
  }

  .stage-value {
    color: #64748b;
  }

  .deal-card {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.08);

    &:hover {
      background: rgba(99, 102, 241, 0.05);
    }
  }

  .deal-title {
    color: #1e293b;
  }

  .deal-company {
    color: #64748b;
  }

  .deal-probability {
    color: #475569;
    background: rgba(0, 0, 0, 0.05);
  }
}
</style>


