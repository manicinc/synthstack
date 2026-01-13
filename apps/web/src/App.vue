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
 * - Community License (modified MIT) - for non-commercial use
 * - Commercial License - for commercial production use
 *
 * See LICENSE and COMMERCIAL-LICENSE.md in the repository root for full terms.
 * Commercial licenses: https://synthstack.app/pricing
 */
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

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
