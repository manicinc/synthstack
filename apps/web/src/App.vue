<template>
  <router-view />
  <RuntimeDebugOverlay />
</template>

<script setup lang="ts">
/**
 * SynthStack - Your Agency in a Box
 *
 * Copyright (c) 2025 Manic Inc.
 *
 * This source code is licensed under the MIT License.
 *
 * See LICENSE in the repository root for full terms.
 * Pro edition: https://synthstack.app/pricing
 */
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import RuntimeDebugOverlay from './components/debug/RuntimeDebugOverlay.vue';

const authStore = useAuthStore();

// Initialize stores on mount
onMounted(async () => {
  // Initialize authentication
  await authStore.initialize();

  // Signal that app is ready for E2E tests
  if (typeof window !== 'undefined') {
    (window as unknown as { __APP_READY__: boolean }).__APP_READY__ = true;
  }
});
</script>

<style lang="scss">
// Global app styles are in src/css/app.scss
</style>
