<template>
  <div class="tab-content dashboard-content">
    <div class="content-header">
      <h3>Dashboard Overview</h3>
      <div class="header-actions">
        <span class="time-badge">Last 7 days</span>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-icon users">
          <q-icon
            name="group"
            size="20px"
          />
        </div>
        <div class="stat-data">
          <span class="stat-value">12,847</span>
          <span class="stat-label">Active Users</span>
        </div>
        <span class="stat-trend positive">+12.5%</span>
      </div>
      <div class="stat-box">
        <div class="stat-icon revenue">
          <q-icon
            name="payments"
            size="20px"
          />
        </div>
        <div class="stat-data">
          <span class="stat-value">$28.4K</span>
          <span class="stat-label">Revenue</span>
        </div>
        <span class="stat-trend positive">+8.2%</span>
      </div>
      <div class="stat-box">
        <div class="stat-icon ai">
          <q-icon
            name="smart_toy"
            size="20px"
          />
        </div>
        <div class="stat-data">
          <span class="stat-value">847K</span>
          <span class="stat-label">AI Requests</span>
        </div>
        <span class="stat-trend positive">+23.1%</span>
      </div>
    </div>
    <div class="chart-section">
      <div class="chart-header">
        <span>User Growth</span>
        <div class="chart-legend">
          <span class="legend-dot active" />Active
          <span class="legend-dot new" />New
        </div>
      </div>
      <div class="chart-visual">
        <div class="chart-line" />
        <div class="chart-bars">
          <div
            v-for="i in 7"
            :key="i"
            class="bar-group"
          >
            <div
              class="bar active"
              :style="{ height: `${barHeights[i - 1].active}%` }"
            />
            <div
              class="bar new"
              :style="{ height: `${barHeights[i - 1].new}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Pre-compute random heights for consistent rendering
const barHeights = [
  { active: 65, new: 35 },
  { active: 78, new: 42 },
  { active: 52, new: 28 },
  { active: 85, new: 48 },
  { active: 68, new: 38 },
  { active: 92, new: 55 },
  { active: 75, new: 45 }
]
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
  margin-bottom: 24px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .time-badge {
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    padding: 6px 12px;
    border-radius: 6px;
    color: #94a3b8;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03), transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(234, 88, 12, 0.3);
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.users {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), transparent);
    .q-icon { color: #60a5fa; }
  }

  &.revenue {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), transparent);
    .q-icon { color: #4ade80; }
  }

  &.ai {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), transparent);
    .q-icon { color: #c084fc; }
  }
}

.stat-data {
  flex: 1;

  .stat-value {
    display: block;
    font-size: 1.3rem;
    font-weight: 800;
    color: #f8fafc;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #64748b;
  }
}

.stat-trend {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;

  &.positive {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }
}

// Chart section
.chart-section {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.02), transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  span {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #94a3b8;

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 4px;

    &.active { background: #fb923c; }
    &.new { background: #60a5fa; }
  }
}

.chart-visual {
  position: relative;
  height: 120px;
}

.chart-line {
  position: absolute;
  top: 30%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.5), transparent);
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 100%;
  padding: 0 10px;
}

.bar-group {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}

.bar {
  width: 18px;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;

  &.active {
    background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
  }

  &.new {
    background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
  }
}

@media (max-width: 600px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>


