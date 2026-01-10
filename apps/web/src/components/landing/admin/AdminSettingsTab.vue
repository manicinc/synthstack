<template>
  <div class="tab-content settings-content">
    <div class="content-header">
      <h3>Site Settings</h3>
    </div>
    <div class="settings-sections">
      <div class="settings-group">
        <div class="group-header">
          <q-icon
            name="palette"
            size="18px"
          />
          <span>Branding</span>
        </div>
        <div class="setting-row">
          <span>Site Name</span>
          <div class="setting-input">
            SynthStack
          </div>
        </div>
        <div class="setting-row">
          <span>Primary Color</span>
          <div
            class="color-swatch"
            style="background: #ea580c"
          />
        </div>
      </div>
      <div class="settings-group">
        <div class="group-header">
          <q-icon
            name="toggle_on"
            size="18px"
          />
          <span>Feature Flags</span>
        </div>
        <div class="setting-row">
          <span>AI Copilot</span>
          <div class="toggle active" />
        </div>
        <div class="setting-row">
          <span>Beta Features</span>
          <div class="toggle" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Static settings tab component
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

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-group {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .q-icon { color: #fb923c; }

  span {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:last-child { border-bottom: none; }

  > span {
    font-size: 0.85rem;
    color: #94a3b8;
  }
}

.setting-input {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.toggle {
  width: 44px;
  height: 24px;
  background: rgba(100, 116, 139, 0.4);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  &.active {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);

    &::after {
      left: 23px;
    }
  }
}
</style>


