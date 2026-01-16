<script setup lang="ts">
/**
 * AIControlsWidget - Polished horizontal AI feature quick-access
 * Replaces cramped GenerationQuickCard with clean icon row design
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCreditsStore } from '@/stores/credits'

interface AIFeature {
  id: string
  label: string
  icon: string
  to: string
  gradient: string
  description: string
  available: boolean
}

interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const router = useRouter()
const creditsStore = useCreditsStore()

// AI features configuration
const aiFeatures = computed<AIFeature[]>(() => [
  {
    id: 'text',
    label: 'Text',
    icon: 'article',
    to: '/app/text',
    gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    description: 'Blog posts, emails, docs',
    available: true
  },
  {
    id: 'image',
    label: 'Image',
    icon: 'image',
    to: '/app/images',
    gradient: 'linear-gradient(135deg, #ec4899, #f97316)',
    description: 'DALL-E powered images',
    available: true
  },
  {
    id: 'video',
    label: 'Video',
    icon: 'movie',
    to: '/app/video',
    gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
    description: 'AI video generation',
    available: false // Coming soon
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: 'graphic_eq',
    to: '/app/audio',
    gradient: 'linear-gradient(135deg, #f59e0b, #eab308)',
    description: 'Text-to-speech & music',
    available: false // Coming soon
  },
  {
    id: 'strategy',
    label: 'Strategy',
    icon: 'psychology',
    to: '/app/strategy',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    description: 'Multi-AI debate & insights',
    available: true
  }
])

const availableFeatures = computed(() => aiFeatures.value.filter(f => f.available))
const comingSoonFeatures = computed(() => aiFeatures.value.filter(f => !f.available))

const creditsRemaining = computed(() => creditsStore.unifiedCredits?.creditsRemaining ?? 0)
// Calculate total as remaining + used today (daily allocation perspective)
const creditsTotal = computed(() => {
  const uc = creditsStore.unifiedCredits
  if (!uc) return 200 // Default fallback
  // Total = remaining + what was used today
  return uc.creditsRemaining + (uc.totalCreditsUsedToday ?? 0)
})
const creditsProgress = computed(() => {
  if (creditsTotal.value === 0) return 0
  return Math.min(creditsRemaining.value / creditsTotal.value, 1)
})

const creditsStatus = computed(() => {
  if (creditsRemaining.value <= 0) return 'depleted'
  if (creditsProgress.value < 0.2) return 'low'
  return 'normal'
})

function navigateTo(feature: AIFeature) {
  if (feature.available) {
    router.push(feature.to)
  }
}

function goToAllFeatures() {
  router.push('/app/generate')
}

onMounted(() => {
  creditsStore.fetchUnifiedCredits()
})
</script>

<template>
  <div class="ai-controls-widget dashboard-card card-neumorphic">
    <!-- Header -->
    <div class="widget-header">
      <div class="title-section">
        <q-icon name="auto_awesome" color="primary" size="22px" />
        <span class="widget-title">AI Generation</span>
      </div>
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        icon-right="arrow_forward"
        label="All Features"
        size="sm"
        class="all-features-btn"
        @click="goToAllFeatures"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="features-skeleton">
      <div
        v-for="i in 5"
        :key="i"
        class="skeleton-item dashboard-skeleton"
      />
    </div>

    <!-- Feature buttons row -->
    <div v-else class="features-row">
      <button
        v-for="feature in availableFeatures"
        :key="feature.id"
        class="feature-btn"
        :aria-label="`${feature.label} - ${feature.description}`"
        @click="navigateTo(feature)"
      >
        <div
          class="feature-icon"
          :style="{ background: feature.gradient }"
        >
          <q-icon :name="feature.icon" size="24px" />
        </div>
        <span class="feature-label">{{ feature.label }}</span>
        <q-tooltip :delay="300">
          {{ feature.description }}
        </q-tooltip>
      </button>

      <!-- Coming soon badges -->
      <button
        v-for="feature in comingSoonFeatures"
        :key="feature.id"
        class="feature-btn coming-soon"
        disabled
        :aria-label="`${feature.label} - Coming soon`"
      >
        <div
          class="feature-icon"
          :style="{ background: feature.gradient }"
        >
          <q-icon :name="feature.icon" size="24px" />
        </div>
        <span class="feature-label">{{ feature.label }}</span>
        <q-badge
          class="soon-badge"
          color="grey-7"
          text-color="white"
          rounded
        >
          Soon
        </q-badge>
        <q-tooltip :delay="300">
          {{ feature.description }} - Coming soon
        </q-tooltip>
      </button>
    </div>

    <!-- Credits status bar -->
    <div class="credits-bar" :class="creditsStatus">
      <div class="credits-info">
        <q-icon
          name="stars"
          :color="creditsStatus === 'depleted' ? 'negative' : creditsStatus === 'low' ? 'warning' : 'amber'"
          size="16px"
        />
        <span class="credits-text">
          <strong>{{ creditsRemaining.toLocaleString() }}</strong> credits remaining
        </span>
      </div>
      <q-linear-progress
        :value="creditsProgress"
        :color="creditsStatus === 'depleted' ? 'negative' : creditsStatus === 'low' ? 'warning' : 'primary'"
        track-color="grey-3"
        rounded
        size="4px"
        class="credits-progress"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-controls-widget {
  padding: 20px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .title-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .widget-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .all-features-btn {
    font-weight: 500;

    :deep(.q-icon) {
      font-size: 16px;
    }
  }
}

.features-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;

  @media (max-width: 600px) {
    gap: 8px;
  }
}

.feature-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  min-width: 72px;
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg, 12px);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover:not(.coming-soon) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-primary-subtle);

    .feature-icon {
      transform: scale(1.05);
    }
  }

  &:active:not(.coming-soon) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  &.coming-soon {
    opacity: 0.6;
    cursor: not-allowed;

    .feature-icon {
      filter: grayscale(0.5);
    }
  }

  @media (max-width: 600px) {
    padding: 10px 12px;
    min-width: 60px;
  }
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.2s ease;

  @media (max-width: 600px) {
    width: 38px;
    height: 38px;

    :deep(.q-icon) {
      font-size: 20px !important;
    }
  }
}

.feature-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: center;
}

.soon-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.625rem;
  padding: 2px 6px;
}

.features-skeleton {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;

  .skeleton-item {
    width: 72px;
    height: 80px;
    border-radius: var(--radius-lg, 12px);
  }
}

.credits-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-subtle);

  &.low {
    background: color-mix(in srgb, var(--warning) 8%, var(--surface-2));
    border-color: color-mix(in srgb, var(--warning) 20%, var(--border-subtle));
  }

  &.depleted {
    background: color-mix(in srgb, var(--error) 8%, var(--surface-2));
    border-color: color-mix(in srgb, var(--error) 20%, var(--border-subtle));
  }

  .credits-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .credits-text {
    font-size: 0.8125rem;
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-weight: 600;
    }
  }

  .credits-progress {
    flex: 1;
    max-width: 120px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;

    .credits-progress {
      max-width: none;
    }
  }
}
</style>
