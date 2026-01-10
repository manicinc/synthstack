<script setup lang="ts">
/**
 * UpgradePrompt Component
 *
 * Shows a teaser/upgrade prompt when a premium feature is accessed
 * by a community/free user. Minimal and unobtrusive.
 *
 * Usage:
 *   <UpgradePrompt
 *     feature="ai_cofounders"
 *     title="AI Co-Founders"
 *     description="Get access to 6 specialized AI agents"
 *   />
 */

import { computed } from 'vue'
import { useFeatureStore } from 'src/stores/features'
import { useRouter } from 'vue-router'

interface Props {
  feature: string
  title?: string
  description?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
})

const featureStore = useFeatureStore()
const router = useRouter()

const hasAccess = computed(() => featureStore.hasFeature(props.feature))

const displayTitle = computed(() => {
  if (props.title) return props.title
  // Convert feature key to readable title
  return props.feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
})

function goToPricing() {
  router.push('/pricing')
}
</script>

<template>
  <div
    v-if="!hasAccess"
    class="upgrade-prompt"
    :class="{ compact }"
  >
    <div class="upgrade-content">
      <div class="upgrade-icon">
        <q-icon
          name="lock"
          size="md"
          color="amber"
        />
      </div>
      <div class="upgrade-text">
        <h4 class="upgrade-title">
          {{ displayTitle }}
        </h4>
        <p
          v-if="description && !compact"
          class="upgrade-description"
        >
          {{ description }}
        </p>
        <p class="upgrade-cta">
          <span class="premium-badge">Premium Feature</span>
        </p>
      </div>
    </div>
    <q-btn
      color="primary"
      :label="compact ? 'Upgrade' : 'Upgrade to Premium'"
      :size="compact ? 'sm' : 'md'"
      @click="goToPricing"
    />
  </div>
  <slot v-else />
</template>

<style scoped lang="scss">
.upgrade-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0, 212, 170, 0.05) 100%);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  text-align: center;
  gap: 1rem;

  &.compact {
    flex-direction: row;
    padding: 0.75rem 1rem;
    gap: 0.75rem;

    .upgrade-content {
      flex-direction: row;
      gap: 0.75rem;
    }

    .upgrade-text {
      text-align: left;
    }

    .upgrade-title {
      font-size: 0.9rem;
      margin: 0;
    }

    .upgrade-description {
      display: none;
    }

    .upgrade-cta {
      margin: 0;
    }
  }
}

.upgrade-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upgrade-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 50%;
}

.upgrade-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.upgrade-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.upgrade-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  max-width: 300px;
}

.upgrade-cta {
  margin-top: 0.25rem;
}

.premium-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
}
</style>
