<template>
  <!-- Fixed Header - MUST be outside q-layout for position:fixed to work -->
  <SiteHeader />

  <q-layout
    view="hHh Lpr fFf"
    class="auth-layout"
    :class="{ 'has-electron-titlebar': isElectronMac }"
  >
    <!-- Electron Title Bar (macOS only) -->
    <ElectronTitleBar />

    <!-- Main Content -->
    <q-page-container>
      <q-page class="auth-page">
        <div class="auth-container">
          <!-- Auth Form Card -->
          <div class="auth-card">
            <router-view v-slot="{ Component }">
              <transition
                name="fade"
                mode="out-in"
              >
                <component :is="Component" />
              </transition>
            </router-view>
          </div>

          <!-- Back to home -->
          <router-link
            to="/"
            class="auth-back"
          >
            <q-icon
              name="arrow_back"
              size="xs"
            />
            <span>Back to home</span>
          </router-link>
        </div>

        <!-- Background -->
        <div class="auth-bg">
          <div class="auth-bg-grid" />
          <div class="auth-bg-gradient" />
        </div>
      </q-page>
    </q-page-container>

    <SiteFooter />
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SiteHeader from 'components/layout/SiteHeader.vue'
import SiteFooter from 'components/layout/SiteFooter.vue'
import ElectronTitleBar from '@/components/layout/ElectronTitleBar.vue'

// Check if running in Electron on macOS
const isElectronMac = computed(() => {
  if (typeof window === 'undefined') return false
  const electron = (window as unknown as { electron?: { platform?: { isMac?: boolean } } }).electron
  return !!electron && (electron.platform?.isMac || navigator.platform.toLowerCase().includes('mac'))
})
</script>

<style lang="scss" scoped>
.auth-layout {
  min-height: 100vh;
  background: var(--color-bg-primary);

  &.has-electron-titlebar {
    padding-top: 38px;
  }
}

.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 64px); // Account for header
  padding: var(--space-8);
  position: relative;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-card {
  width: 100%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-bg-elevated);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
}

.auth-back {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-default);

  &:hover {
    color: var(--color-primary);
  }
}

// Background
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.auth-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 107, 53, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 107, 53, 0.02) 1px, transparent 1px);
  background-size: 32px 32px;
}

.auth-bg-gradient {
  position: absolute;
  top: -50%;
  left: -25%;
  width: 100%;
  height: 150%;
  background: radial-gradient(ellipse, var(--color-primary-muted) 0%, transparent 60%);
  opacity: 0;  // Disabled - was causing blur/overlay effect
  display: none;
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
