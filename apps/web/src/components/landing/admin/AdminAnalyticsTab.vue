<template>
  <div class="tab-content analytics-content">
    <div class="content-header">
      <h3>Analytics Dashboard</h3>
      <div class="date-range">
        <q-icon
          name="calendar_today"
          size="14px"
        />
        <span>Dec 1 - Dec 15, 2024</span>
      </div>
    </div>
    <div class="analytics-grid">
      <div class="analytics-card">
        <span class="card-label">Page Views</span>
        <span class="card-value">284.5K</span>
        <div class="mini-chart">
          <svg viewBox="0 0 100 30">
            <defs>
              <linearGradient
                id="gradient1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  style="stop-color:#fb923c;stop-opacity:1"
                />
                <stop
                  offset="100%"
                  style="stop-color:#ea580c;stop-opacity:1"
                />
              </linearGradient>
            </defs>
            <path
              d="M0,25 Q20,20 30,15 T60,18 T100,5"
              fill="none"
              stroke="url(#gradient1)"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
      <div class="analytics-card">
        <span class="card-label">Bounce Rate</span>
        <span class="card-value">32.4%</span>
        <div class="mini-chart down">
          <svg viewBox="0 0 100 30">
            <defs>
              <linearGradient
                id="gradient2"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  style="stop-color:#ef4444;stop-opacity:1"
                />
                <stop
                  offset="100%"
                  style="stop-color:#dc2626;stop-opacity:1"
                />
              </linearGradient>
            </defs>
            <path
              d="M0,5 Q20,10 30,15 T60,12 T100,25"
              fill="none"
              stroke="url(#gradient2)"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
      <div class="analytics-card">
        <span class="card-label">Avg. Session</span>
        <span class="card-value">4m 32s</span>
        <div class="mini-chart">
          <svg viewBox="0 0 100 30">
            <path
              d="M0,20 Q25,15 50,10 T100,8"
              fill="none"
              stroke="url(#gradient1)"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Static analytics tab component
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
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 14px;
  border-radius: 8px;

  .q-icon { color: #64748b; }
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.analytics-card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.03), transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
  position: relative;
  overflow: hidden;
}

.card-label {
  font-size: 0.8rem;
  color: #64748b;
  display: block;
  margin-bottom: 6px;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  display: block;
}

.mini-chart {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 60px;
  height: 24px;
  opacity: 0.8;

  svg {
    width: 100%;
    height: 100%;
  }
}

@media (max-width: 600px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .date-range {
    display: none;
  }
}
</style>


