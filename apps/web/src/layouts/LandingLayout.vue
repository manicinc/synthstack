<template>
  <!-- Fixed Header - MUST be outside q-layout for position:fixed to work -->
  <SiteHeader />

  <q-layout
    view="hHh lpr fFf"
    class="landing-layout"
    :class="{ 'has-electron-titlebar': isElectronMac }"
  >
    <!-- Electron Title Bar (macOS only) -->
    <ElectronTitleBar />

    <q-page-container>
      <router-view />
    </q-page-container>
    <SiteFooter />
    <CookieConsent />
    <NewsletterPopup :delay="15000" :show-floating-trigger="true" />
    <ScrollToTop />
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CookieConsent from '@/components/gdpr/CookieConsent.vue'
import NewsletterPopup from '@/components/gdpr/NewsletterPopup.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import ScrollToTop from '@/components/ui/ScrollToTop.vue'
import ElectronTitleBar from '@/components/layout/ElectronTitleBar.vue'

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
  background: var(--bg-base);

  &.has-electron-titlebar {
    .site-header {
      top: 38px !important;
    }

    .q-page-container {
      padding-top: 102px !important; // 64px header + 38px electron titlebar
    }
  }
}

// NOTE: Scroll behavior and .site-header positioning handled by scroll-fix.scss
// Do not add duplicate html/body/q-layout rules here
</style>
