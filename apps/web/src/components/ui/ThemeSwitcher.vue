<template>
  <div class="theme-switcher">
    <!-- Mode Toggle (Light/Dark/System) - Always visible, independent of preset -->
    <div class="mode-section">
      <div class="section-label">
        <q-icon
          name="brightness_6"
          size="16px"
        />
        <span>Appearance</span>
      </div>
      <div class="mode-toggle">
        <q-btn-toggle
          v-model="currentMode"
          :options="modeOptions"
          unelevated
          rounded
          dense
          class="mode-buttons"
          @update:model-value="handleModeChange"
        >
          <template #light>
            <q-icon
              name="light_mode"
              size="18px"
            />
            <q-tooltip>Light Mode</q-tooltip>
          </template>
          <template #dark>
            <q-icon
              name="dark_mode"
              size="18px"
            />
            <q-tooltip>Dark Mode</q-tooltip>
          </template>
          <template #system>
            <q-icon
              name="contrast"
              size="18px"
            />
            <q-tooltip>System</q-tooltip>
          </template>
        </q-btn-toggle>
      </div>
    </div>

    <!-- Theme Preset Selector -->
    <div
      v-if="showPresetSelector"
      class="preset-section"
    >
      <div class="section-label">
        <q-icon
          name="palette"
          size="16px"
        />
        <span>Theme</span>
      </div>

      <!-- Category Filter -->
      <div
        v-if="showCategories"
        class="category-filter"
      >
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="category-btn"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Preset Grid -->
      <div
        class="preset-grid"
        :class="{ 'compact-grid': compact }"
      >
        <ThemePresetCard
          v-for="preset in filteredPresets"
          :key="preset.slug"
          :preset="preset"
          :is-active="preset.slug === currentPresetSlug"
          :class="{ compact }"
          @select="selectPreset"
        />
      </div>

      <!-- Premium Upsell -->
      <div
        v-if="showPremiumUpsell && premiumPresets.length > 0"
        class="premium-upsell"
      >
        <q-icon
          name="auto_awesome"
          size="16px"
          class="upsell-icon"
        />
        <span>{{ premiumPresets.length }} premium themes available</span>
        <q-btn
          flat
          dense
          color="primary"
          label="Upgrade"
          size="sm"
          @click="$emit('upgrade')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { themeCategories } from '@/config/themePresets'
import type { ColorMode, ThemeCategory } from '@/types/theme'
import ThemePresetCard from './ThemePresetCard.vue'

interface Props {
  showPresetSelector?: boolean
  showCategories?: boolean
  showPremiumUpsell?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showPresetSelector: true,
  showCategories: false,
  showPremiumUpsell: false,
  compact: false,
})

defineEmits<{
  upgrade: []
}>()

const themeStore = useThemeStore()

// Mode toggle
const currentMode = computed({
  get: () => themeStore.colorMode,
  set: (val: ColorMode) => themeStore.setColorMode(val),
})

const modeOptions = [
  { value: 'light', slot: 'light' },
  { value: 'dark', slot: 'dark' },
  { value: 'system', slot: 'system' },
]

function handleModeChange(mode: ColorMode) {
  themeStore.setColorMode(mode)
}

// Preset selection
const currentPresetSlug = computed(() => themeStore.currentPresetSlug)
const availablePresets = computed(() => themeStore.availablePresets)
const premiumPresets = computed(() => themeStore.premiumPresets)

// Category filter
const selectedCategory = ref<ThemeCategory>('all')
const categories = themeCategories

const filteredPresets = computed(() => {
  if (selectedCategory.value === 'all') {
    return availablePresets.value
  }
  return themeStore.getPresetsByCategory(selectedCategory.value)
})

function selectPreset(slug: string) {
  themeStore.setPreset(slug)
}
</script>

<style lang="scss" scoped>
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mode-section,
.preset-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-toggle {
  display: flex;
  justify-content: flex-start;
}

.mode-buttons {
  background: var(--bg-muted);
  border-radius: var(--radius-lg);
  padding: 4px;

  :deep(.q-btn) {
    min-width: 48px;
    min-height: 40px;
    border-radius: var(--radius-md) !important;
    color: var(--text-secondary);

    &.q-btn--active {
      background: var(--color-primary) !important;
      color: white !important;
    }

    &:not(.q-btn--active):hover {
      background: var(--bg-elevated);
    }
  }
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  &.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;

  &.compact-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
}

.premium-upsell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  color: var(--text-secondary);

  .upsell-icon {
    color: #F59E0B;
  }

  span {
    flex: 1;
  }
}

// Responsive
@media (max-width: 600px) {
  .preset-grid {
    grid-template-columns: 1fr;
  }

  .category-filter {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .category-btn {
    white-space: nowrap;
  }
}
</style>
