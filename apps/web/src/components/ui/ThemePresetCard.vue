<template>
  <button
    class="theme-preset-card"
    :class="{
      'is-active': isActive,
      'is-premium': preset.isPremium,
      [`category-${preset.category}`]: true
    }"
    @click="$emit('select', preset.slug)"
  >
    <!-- Color Swatches Preview -->
    <div class="preset-preview">
      <div class="swatch-row">
        <div
          class="swatch primary"
          :style="{ backgroundColor: preset.previewColors.primary }"
        />
        <div
          class="swatch secondary"
          :style="{ backgroundColor: preset.previewColors.secondary }"
        />
        <div
          class="swatch accent"
          :style="{ backgroundColor: preset.previewColors.accent }"
        />
      </div>

      <!-- Style indicator (border radius preview) -->
      <div class="style-indicator">
        <div
          class="style-box"
          :style="{
            borderRadius: preset.style.borderRadius.md,
            backgroundColor: preset.previewColors.primary + '20'
          }"
        />
      </div>
    </div>

    <!-- Preset Info -->
    <div class="preset-info">
      <div class="preset-header">
        <span class="preset-name">{{ preset.name }}</span>
        <span
          v-if="preset.isPremium"
          class="premium-badge"
        >
          <q-icon
            name="star"
            size="12px"
          />
        </span>
      </div>
      <p class="preset-description">
        {{ preset.description }}
      </p>
    </div>

    <!-- Active indicator -->
    <div
      v-if="isActive"
      class="active-indicator"
    >
      <q-icon
        name="check_circle"
        size="18px"
      />
    </div>
  </button>
</template>

<script setup lang="ts">
import type { ThemePreset } from '@/types/theme'

interface Props {
  preset: ThemePreset
  isActive?: boolean
}

defineProps<Props>()

defineEmits<{
  select: [slug: string]
}>()
</script>

<style lang="scss" scoped>
.theme-preset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--bg-elevated);
  border: 2px solid var(--border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast) var(--easing-default);
  text-align: left;
  width: 100%;

  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &.is-active {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--bg-elevated));

    .preset-name {
      color: var(--color-primary);
    }
  }

  &.is-premium {
    &::before {
      content: '';
      position: absolute;
      top: -1px;
      right: -1px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 24px 24px 0;
      border-color: transparent #F59E0B transparent transparent;
      border-top-right-radius: var(--radius-lg);
    }
  }
}

.preset-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.swatch-row {
  display: flex;
  gap: 6px;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  &.primary {
    width: 28px;
    height: 28px;
  }
}

.style-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.style-box {
  width: 32px;
  height: 20px;
  border: 1px solid var(--border-default);
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preset-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color var(--transition-fast);
}

.premium-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F59E0B;
}

.preset-description {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.active-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

// Compact variant for smaller spaces
.theme-preset-card.compact {
  padding: 12px;
  gap: 8px;

  .swatch {
    width: 18px;
    height: 18px;

    &.primary {
      width: 22px;
      height: 22px;
    }
  }

  .preset-name {
    font-size: 0.8125rem;
  }

  .preset-description {
    display: none;
  }
}
</style>


