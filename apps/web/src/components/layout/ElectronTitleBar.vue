<template>
  <div
    v-if="isElectronMac"
    class="electron-title-bar"
  >
    <div class="title-bar-content">
      <span class="app-title">SynthStack</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Check if running in Electron on macOS
const isElectronMac = computed(() => {
  if (typeof window === 'undefined') return false
  const electron = (window as unknown as { electron?: { platform?: { isMac?: boolean } } }).electron
  return !!electron && (electron.platform?.isMac || navigator.platform.toLowerCase().includes('mac'))
})
</script>

<style lang="scss" scoped>
.electron-title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  background: var(--surface-1, #1a1a1a);
  border-bottom: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
  z-index: 9999;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: center;

  .title-bar-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    pointer-events: none;
  }

  .app-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    user-select: none;
  }
}

// Add spacing for elements below the title bar
:global(body.electron-mac) {
  .site-header {
    top: 38px !important;
  }

  .q-layout {
    padding-top: 38px;
  }
}
</style>
