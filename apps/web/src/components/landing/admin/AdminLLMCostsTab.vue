<template>
  <div class="tab-content llm-costs-content">
    <div class="content-header">
      <h3>LLM Cost Dashboard</h3>
      <div class="date-range">
        <q-icon
          name="calendar_today"
          size="14px"
        />
        <span>Last 30 days</span>
      </div>
    </div>
    
    <!-- Global Stats -->
    <div class="cost-stats">
      <div class="stat-card total">
        <div class="stat-icon">
          <q-icon name="payments" size="20px" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Spend</span>
          <span class="stat-value">$2,847.32</span>
          <span class="stat-change up">+12.4%</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <q-icon name="api" size="20px" />
        </div>
        <div class="stat-info">
          <span class="stat-label">API Requests</span>
          <span class="stat-value">1.24M</span>
          <span class="stat-change up">+8.2%</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <q-icon name="token" size="20px" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Tokens</span>
          <span class="stat-value">892M</span>
          <span class="stat-change down">-3.1%</span>
        </div>
      </div>
    </div>
    
    <!-- Provider Breakdown -->
    <div class="providers-section">
      <div class="section-label">Provider Breakdown</div>
      <div class="provider-bars">
        <div class="provider-bar">
          <div class="provider-info">
            <span class="provider-name">OpenAI</span>
            <span class="provider-cost">$1,842.50</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill openai" style="width: 65%" />
          </div>
        </div>
        <div class="provider-bar">
          <div class="provider-info">
            <span class="provider-name">Anthropic</span>
            <span class="provider-cost">$812.40</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill anthropic" style="width: 28%" />
          </div>
        </div>
        <div class="provider-bar">
          <div class="provider-info">
            <span class="provider-name">OpenRouter</span>
            <span class="provider-cost">$192.42</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill openrouter" style="width: 7%" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Active Alerts -->
    <div class="alerts-section">
      <div class="section-label">
        <q-icon name="notifications_active" size="14px" />
        Budget Alerts
      </div>
      <div class="alert-item warning">
        <q-icon name="warning" size="16px" />
        <span>OpenAI approaching 80% of monthly budget</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Static LLM costs tab component for landing page preview
</script>

<style lang="scss" scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 6px;

  .q-icon { color: #64748b; }
}

.cost-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03), transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &.total {
    background: linear-gradient(145deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.02));
    border-color: rgba(34, 197, 94, 0.2);
    
    .stat-icon {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
  }
}

.stat-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
}

.stat-change {
  font-size: 0.7rem;
  font-weight: 600;
  
  &.up { color: #22c55e; }
  &.down { color: #ef4444; }
}

.providers-section {
  margin-bottom: 14px;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  .q-icon { color: #fb923c; }
}

.provider-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-bar {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  padding: 8px 10px;
}

.provider-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.provider-name {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-weight: 500;
}

.provider-cost {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

.bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
  
  &.openai {
    background: linear-gradient(90deg, #10b981, #059669);
  }
  
  &.anthropic {
    background: linear-gradient(90deg, #f97316, #ea580c);
  }
  
  &.openrouter {
    background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  }
}

.alerts-section {
  background: rgba(251, 146, 60, 0.05);
  border: 1px solid rgba(251, 146, 60, 0.15);
  border-radius: 8px;
  padding: 10px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #fcd34d;
  
  .q-icon { color: #f59e0b; }
  
  &.warning {
    color: #fcd34d;
  }
}

@media (max-width: 600px) {
  .cost-stats {
    grid-template-columns: 1fr;
  }
  
  .date-range {
    display: none;
  }
  
  .stat-card {
    padding: 10px;
  }
}
</style>

