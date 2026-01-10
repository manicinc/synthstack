<template>
  <slot />
</template>

<script setup lang="ts">
import { reactive, provide } from 'vue';
import { useI18n } from 'vue-i18n';
import { byokTooltipsKey } from '@/composables/useBYOKTooltips';

const { t } = useI18n();

/**
 * BYOK Tooltip Content Provider
 *
 * Provides centralized tooltip content for BYOK-related UI elements.
 * Child components can inject this content using the 'byokTooltips' key.
 *
 * Usage in child components:
 * ```
 * const tooltips = inject('byokTooltips');
 * ```
 */
const tooltipContent = reactive({
  // 1. Provider Selection Tooltip
  provider: {
    title: t('apiKeys.tooltips.provider.title', 'API Provider'),
    description: t(
      'apiKeys.tooltips.provider.description',
      'Choose which AI provider to configure. OpenAI provides GPT models, while Anthropic provides Claude models.'
    ),
    icon: 'info',
    color: 'primary',
  },

  // 2. Rate Limits Tooltip
  rateLimits: {
    title: t('apiKeys.tooltips.rateLimits.title', 'Rate Limits Bypassed'),
    description: t(
      'apiKeys.tooltips.rateLimits.description',
      'When using your own API keys (BYOK), platform rate limits are bypassed. You\'ll use your own provider\'s rate limits and quotas instead.'
    ),
    icon: 'speed',
    color: 'positive',
  },

  // 3. Usage Statistics Tooltip
  usageStats: {
    title: t('apiKeys.tooltips.usageStats.title', 'Usage Tracking'),
    description: t(
      'apiKeys.tooltips.usageStats.description',
      'Track your BYOK API usage including total requests, tokens used, and estimated costs. Data is updated in real-time and stored separately from internal credit usage.'
    ),
    icon: 'analytics',
    color: 'info',
  },

  // 4. Fallback Behavior Tooltip
  fallback: {
    title: t('apiKeys.tooltips.fallback.title', 'Graceful Fallback'),
    description: t(
      'apiKeys.tooltips.fallback.description',
      'If your BYOK key becomes invalid or hits rate limits, the system automatically falls back to internal platform credits (if available) to ensure uninterrupted service.'
    ),
    icon: 'swap_horiz',
    color: 'warning',
  },

  // 5. Key Validation Tooltip
  validation: {
    title: t('apiKeys.tooltips.validation.title', 'Key Validation'),
    description: t(
      'apiKeys.tooltips.validation.description',
      'API keys are validated immediately upon adding them. You can re-test keys at any time to verify they\'re still valid and active.'
    ),
    icon: 'verified',
    color: 'positive',
  },

  // 6. Routing Mode Tooltip
  routingMode: {
    title: t('apiKeys.tooltips.routingMode.title', 'Routing Mode'),
    description: t(
      'apiKeys.tooltips.routingMode.description',
      'Determines whether to use your API keys (BYOK) or internal credits first. BYOK-first mode (default) uses your keys when available, falling back to credits if needed.'
    ),
    icon: 'route',
    color: 'primary',
  },

  // 7. Credit Savings Tooltip (for Credits Widget)
  creditSavings: {
    title: t('credits.tooltips.byokSavings.title', 'Save Credits with BYOK'),
    description: t(
      'credits.tooltips.byokSavings.description',
      'Configure your own OpenAI or Anthropic API keys to stop using platform credits. Your keys will be used automatically, and you\'ll only pay your provider\'s API costs.'
    ),
    icon: 'savings',
    color: 'positive',
  },

  // 8. Current Key Source Tooltip (for Copilot/Chat)
  keySource: {
    title: t('copilot.tooltips.keySource.title', 'Current Key Source'),
    description: t(
      'copilot.tooltips.keySource.description',
      'Shows whether you\'re currently using your own API keys (BYOK) or platform credits for AI responses.'
    ),
    icon: 'key',
    color: 'info',
  },

  // 9. Security & Privacy Tooltip
  security: {
    title: t('apiKeys.tooltips.security.title', 'Security & Privacy'),
    description: t(
      'apiKeys.tooltips.security.description',
      'Your API keys are encrypted with AES-256-GCM before storage. They are never logged, exposed in responses, or shared with third parties.'
    ),
    icon: 'lock',
    color: 'primary',
  },

  // 10. Cost Estimation Tooltip
  costEstimation: {
    title: t('apiKeys.tooltips.costEstimation.title', 'Cost Estimation'),
    description: t(
      'apiKeys.tooltips.costEstimation.description',
      'Estimated costs are calculated based on token usage and current provider pricing. Actual costs may vary slightly based on your provider\'s billing.'
    ),
    icon: 'payments',
    color: 'warning',
  },
});

// Provide tooltip content to all child components
provide(byokTooltipsKey, tooltipContent);
</script>

<style scoped>
/* This component is a provider only - no visual rendering */
</style>
