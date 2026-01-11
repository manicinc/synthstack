<template>
  <q-layout
    view="hHh lpr fFf"
    class="landing-layout"
    :class="{ 'has-electron-titlebar': isElectronMac }"
  >
    <!-- Electron Title Bar (macOS only) -->
    <ElectronTitleBar />
    <SiteHeader />
    <q-page-container>
      <!-- Render LandingPage directly at root path, use router-view for other paths -->
      <LandingPage v-if="isHomePage" />
      <router-view v-else />
    </q-page-container>
    <SiteFooter />
    <CookieConsent />
    <ScrollToTop />
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CookieConsent from '@/components/gdpr/CookieConsent.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import ScrollToTop from '@/components/ui/ScrollToTop.vue'
import ElectronTitleBar from '@/components/layout/ElectronTitleBar.vue'
import LandingPage from '@/pages/LandingPage.vue'

const route = useRoute()

// Check if at home page (root path)
const isHomePage = computed(() => route.path === '/' || route.path === '')

// Check if running in Electron on macOS
const isElectronMac = computed(() => {
  if (typeof window === 'undefined') return false
  const electron = (window as unknown as { electron?: { platform?: { isMac?: boolean } } }).electron
  return !!electron && (electron.platform?.isMac || navigator.platform.toLowerCase().includes('mac'))
})
</script>

<style lang="scss">
.landing-layout {
  min-height: 100vh;

  &.has-electron-titlebar {
    padding-top: 38px;

    .site-header {
      top: 38px !important;
    }
  }
}

// Fix scrolling on all pages
html, body {
  height: auto !important;
  min-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.q-layout {
  height: auto !important;
  min-height: 100vh !important;
}

.q-page-container {
  height: auto !important;
  min-height: auto !important;
}

.q-page {
  height: auto !important;
  min-height: auto !important;
}
</style>
