<script setup lang="ts">
/**
 * ThemeSystemShowcase Component
 * 
 * Interactive showcase of the 10 theme presets with live preview
 * and independent light/dark mode demonstration
 */

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { themePresetsList } from '@/config/themePresets'
import type { ThemePreset } from '@/types/theme'

const $q = useQuasar()
const activePreset = ref<ThemePreset>(themePresetsList[0])
// Preview mode is independent from site theme - starts matching site but can toggle independently
const isDarkMode = ref($q.dark.isActive)

const previewStyles = computed(() => {
  const preset = activePreset.value
  const mode = isDarkMode.value ? preset.dark : preset.light
  
  return {
    '--preview-bg': mode.bg.base,
    '--preview-bg-subtle': mode.bg.subtle,
    '--preview-bg-elevated': mode.bg.elevated,
    '--preview-text': mode.text.primary,
    '--preview-text-secondary': mode.text.secondary,
    '--preview-border': mode.border.default,
    '--preview-primary': preset.colors.primary,
    '--preview-secondary': preset.colors.secondary,
    '--preview-accent': preset.colors.accent,
    '--preview-radius': preset.style.borderRadius.md,
  }
})

function selectPreset(preset: ThemePreset) {
  activePreset.value = preset
}

function toggleMode() {
  isDarkMode.value = !isDarkMode.value
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    modern: 'Modern',
    minimal: 'Minimal',
    retro: 'Retro',
    nature: 'Nature',
    experimental: 'Experimental'
  }
  return labels[category] || category
}
</script>

<template>
  <section
    class="theme-showcase"
    aria-labelledby="theme-title"
  >
    <!-- Background -->
    <div class="showcase-bg">
      <div class="bg-gradient" />
      <div class="bg-pattern" />
    </div>

    <div class="showcase-container">
      <!-- Header -->
      <header class="showcase-header">
        <h2 id="theme-title">
          Beautiful Themes, <span class="gradient-text">Your Way</span>
        </h2>
        <p>
          Choose from 10 aesthetic presets with independent light/dark mode.
          Every theme is fully customizable and includes complete CSS variable mappings.
        </p>
      </header>

      <!-- Theme Grid + Preview Layout -->
      <div class="showcase-layout">
        <!-- Theme Grid -->
        <div class="theme-grid">
          <button
            v-for="preset in themePresetsList"
            :key="preset.slug"
            class="theme-card"
            :class="{ 'is-active': activePreset.slug === preset.slug }"
            @click="selectPreset(preset)"
          >
            <!-- Color Swatches -->
            <div class="theme-swatches">
              <span 
                class="swatch" 
                :style="{ background: preset.previewColors.primary }"
              />
              <span 
                class="swatch" 
                :style="{ background: preset.previewColors.secondary }"
              />
              <span 
                class="swatch" 
                :style="{ background: preset.previewColors.accent }"
              />
            </div>
            
            <!-- Theme Info -->
            <div class="theme-info">
              <span class="theme-name">{{ preset.name }}</span>
              <span class="theme-category">{{ getCategoryLabel(preset.category) }}</span>
            </div>

            <!-- Premium Badge -->
            <span
              v-if="preset.isPremium"
              class="premium-badge"
            >
              <q-icon
                name="star"
                size="10px"
              />
              Pro
            </span>

            <!-- Active Indicator -->
            <div
              v-if="activePreset.slug === preset.slug"
              class="active-indicator"
            >
              <q-icon
                name="check"
                size="14px"
              />
            </div>
          </button>
        </div>

        <!-- Live Preview Panel -->
        <div
          class="preview-panel"
          :style="previewStyles"
        >
          <!-- Preview Header -->
          <div class="preview-header">
            <div class="preview-title-row">
              <span class="preview-title">{{ activePreset.name }}</span>
              <button
                class="mode-toggle"
                @click="toggleMode"
              >
                <q-icon
                  :name="isDarkMode ? 'dark_mode' : 'light_mode'"
                  size="16px"
                />
                {{ isDarkMode ? 'Dark' : 'Light' }}
              </button>
            </div>
            <p class="preview-description">
              {{ activePreset.description }}
            </p>
          </div>

          <!-- Mock UI Preview -->
          <div class="preview-ui">
            <!-- Mock Card -->
            <div class="mock-card">
              <div class="mock-card-header">
                <div class="mock-avatar" />
                <div class="mock-text-group">
                  <div class="mock-text-line" />
                  <div class="mock-text-line short" />
                </div>
              </div>
              <div class="mock-content">
                <div class="mock-text-line" />
                <div class="mock-text-line" />
                <div class="mock-text-line medium" />
              </div>
              <div class="mock-actions">
                <button class="mock-btn primary">
                  Primary
                </button>
                <button class="mock-btn secondary">
                  Secondary
                </button>
              </div>
            </div>

            <!-- Mock Stats -->
            <div class="mock-stats">
              <div class="mock-stat">
                <span class="stat-value">247</span>
                <span class="stat-label">Users</span>
              </div>
              <div class="mock-stat">
                <span class="stat-value">$12.4K</span>
                <span class="stat-label">Revenue</span>
              </div>
              <div class="mock-stat">
                <span class="stat-value">98%</span>
                <span class="stat-label">Uptime</span>
              </div>
            </div>

            <!-- Mock Input -->
            <div class="mock-input-group">
              <div class="mock-input">
                <q-icon
                  name="search"
                  size="16px"
                />
                <span>Search...</span>
              </div>
              <button class="mock-btn accent">
                Go
              </button>
            </div>
          </div>

          <!-- Color Palette Display -->
          <div class="color-palette">
            <div class="palette-item">
              <span
                class="color-dot"
                :style="{ background: activePreset.colors.primary }"
              />
              <span class="color-label">Primary</span>
            </div>
            <div class="palette-item">
              <span
                class="color-dot"
                :style="{ background: activePreset.colors.secondary }"
              />
              <span class="color-label">Secondary</span>
            </div>
            <div class="palette-item">
              <span
                class="color-dot"
                :style="{ background: activePreset.colors.accent }"
              />
              <span class="color-label">Accent</span>
            </div>
            <div class="palette-item">
              <span
                class="color-dot"
                :style="{ background: activePreset.colors.success }"
              />
              <span class="color-label">Success</span>
            </div>
            <div class="palette-item">
              <span
                class="color-dot"
                :style="{ background: activePreset.colors.error }"
              />
              <span class="color-label">Error</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Row -->
      <div class="features-row">
        <div class="feature-item">
          <q-icon
            name="check_circle"
            size="20px"
            color="green-5"
          />
          <span>Independent Light/Dark Modes</span>
        </div>
        <div class="feature-item">
          <q-icon
            name="check_circle"
            size="20px"
            color="green-5"
          />
          <span>CSS Variable System</span>
        </div>
        <div class="feature-item">
          <q-icon
            name="check_circle"
            size="20px"
            color="green-5"
          />
          <span>Custom Theme Support</span>
        </div>
        <div class="feature-item">
          <q-icon
            name="check_circle"
            size="20px"
            color="green-5"
          />
          <span>Directus Integration</span>
        </div>
      </div>

      <!-- CTA -->
      <div class="showcase-cta">
        <q-btn
          label="Explore Theme System"
          color="primary"
          size="lg"
          rounded
          unelevated
          class="cta-primary"
          to="/docs/themes"
        >
          <template #append>
            <q-icon name="arrow_forward" />
          </template>
        </q-btn>
        <q-btn
          label="Try in Settings"
          flat
          color="grey-5"
          size="lg"
          rounded
          class="cta-secondary"
          to="/app/account?tab=appearance"
        >
          <template #prepend>
            <q-icon name="settings" />
          </template>
        </q-btn>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.theme-showcase {
  position: relative;
  padding: 120px 24px;
  overflow: hidden;
}

// Background
.showcase-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(139, 92, 246, 0.12) 0%, transparent 60%);
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(139, 92, 246, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 50% 50% at 50% 70%, black 0%, transparent 100%);
}

.showcase-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

// Header
.showcase-header {
  text-align: center;
  margin-bottom: 48px;
}

.showcase-header h2 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  margin: 0 0 16px;
  color: #fff;
  line-height: 1.2;
}

.gradient-text {
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.showcase-header p {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.7;
}

// Layout
.showcase-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 32px;
  margin-bottom: 48px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

// Theme Grid
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  align-content: start;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.theme-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  &.is-active {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
  }
}

.theme-swatches {
  display: flex;
  gap: 4px;
}

.swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.theme-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.theme-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.theme-category {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.premium-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}

.active-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  background: #8b5cf6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

// Preview Panel
.preview-panel {
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.4s ease;
}

.preview-header {
  margin-bottom: 20px;
}

.preview-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preview-text);
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--preview-bg-subtle);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  color: var(--preview-text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--preview-bg-elevated);
  }
}

.preview-description {
  font-size: 0.875rem;
  color: var(--preview-text-secondary);
  margin: 0;
}

// Mock UI
.preview-ui {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.mock-card {
  background: var(--preview-bg-elevated);
  border: 1px solid var(--preview-border);
  border-radius: var(--preview-radius);
  padding: 16px;
}

.mock-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.mock-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--preview-primary), var(--preview-accent));
}

.mock-text-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mock-text-line {
  height: 10px;
  background: var(--preview-bg-subtle);
  border-radius: 4px;

  &.short { width: 60%; }
  &.medium { width: 80%; }
}

.mock-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.mock-actions {
  display: flex;
  gap: 10px;
}

.mock-btn {
  padding: 8px 16px;
  border-radius: var(--preview-radius);
  border: none;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: var(--preview-primary);
    color: white;
  }

  &.secondary {
    background: var(--preview-bg-subtle);
    color: var(--preview-text);
    border: 1px solid var(--preview-border);
  }

  &.accent {
    background: var(--preview-accent);
    color: white;
  }
}

.mock-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.mock-stat {
  text-align: center;
  padding: 12px;
  background: var(--preview-bg-elevated);
  border: 1px solid var(--preview-border);
  border-radius: var(--preview-radius);
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--preview-text, #F8FAFC);
  font-family: 'JetBrains Mono', monospace;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--preview-text-secondary, #94A3B8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mock-input-group {
  display: flex;
  gap: 10px;
}

.mock-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--preview-bg-subtle);
  border: 1px solid var(--preview-border);
  border-radius: var(--preview-radius);
  color: var(--preview-text-secondary);
  font-size: 0.875rem;
}

// Color Palette
.color-palette {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--preview-border);

  @media (max-width: 500px) {
    flex-wrap: wrap;
    gap: 12px;
  }
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--preview-border);
}

.color-label {
  font-size: 0.75rem;
  color: var(--preview-text-secondary);
}

// Features Row
.features-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 48px;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

// CTA
.showcase-cta {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cta-primary {
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  
  :deep(.q-btn__content) {
    gap: 8px;
  }
}

.cta-secondary {
  font-weight: 500;
}


// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .theme-card,
  .preview-panel,
  .mode-toggle {
    transition: none;
  }
}
</style>

<!-- Unscoped light mode styles - must be separate to work properly with theme switching -->
<style lang="scss">
.body--light {
  .theme-showcase {
    // Header
    .showcase-header h2 {
      color: #1e293b !important;
    }

    .showcase-header p {
      color: #475569 !important;
    }

    // Background elements - much lighter for light mode
    .bg-gradient {
      background: radial-gradient(ellipse 70% 50% at 50% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 60%) !important;
    }

    .bg-pattern {
      background-image:
        linear-gradient(to right, rgba(139, 92, 246, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(139, 92, 246, 0.04) 1px, transparent 1px) !important;
    }

    // Theme Grid Cards - light backgrounds
    .theme-grid {
      .theme-card {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

        &:hover {
          background: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.15) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        &.is-active {
          background: rgba(139, 92, 246, 0.08) !important;
          border-color: rgba(139, 92, 246, 0.4) !important;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);
        }
      }
    }

    .swatch {
      border-color: rgba(0, 0, 0, 0.15) !important;
    }

    .theme-name {
      color: #1e293b !important;
    }

    .theme-category {
      color: #64748b !important;
    }

    // Features Row - light background
    .features-row {
      background: rgba(255, 255, 255, 0.7) !important;
      border-color: rgba(0, 0, 0, 0.08) !important;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }

    .feature-item {
      color: #334155 !important;
    }

    // CTA Buttons
    .cta-secondary {
      color: #475569 !important;

      &:hover {
        color: #1e293b !important;
      }
    }

    // Premium badge - keep visible in light mode
    .premium-badge {
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
    }

    // Active indicator
    .active-indicator {
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }
  }
}
</style>
