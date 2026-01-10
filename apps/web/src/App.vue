<template>
  <router-view />
</template>

<script setup lang="ts">
/**
 * SynthStack - Your Agency in a Box
 *
 * Copyright (c) 2025 Manic Inc.
 *
 * This source code is licensed under:
 * - MIT License (Community Edition) - for non-commercial use
 * - Commercial License - for commercial production use
 *
 * See LICENSE and COMMERCIAL-LICENSE.md in the repository root for full terms.
 * Commercial licenses: https://synthstack.app/pricing
 */
import { onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';

const $q = useQuasar();
const authStore = useAuthStore();
const themeStore = useThemeStore();

// Initialize stores on mount
onMounted(async () => {
  // Initialize authentication
  await authStore.initialize();

  // Initialize theme
  themeStore.initialize();

  // Signal that app is ready for E2E tests
  if (typeof window !== 'undefined') {
    (window as unknown as { __APP_READY__: boolean }).__APP_READY__ = true;
  }
});

// Watch for dark mode changes and keep Quasar in sync
watch(() => themeStore.isDark, (isDark) => {
  $q.dark.set(isDark);
}, { immediate: true });
</script>

<style lang="scss">
// Global app styles are in src/css/app.scss
</style>

