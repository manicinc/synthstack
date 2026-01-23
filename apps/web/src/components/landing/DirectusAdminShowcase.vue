<script setup lang="ts">
/**
 * DirectusAdminShowcase Component
 * 
 * Interactive showcase of all Directus admin panel extensions
 * with tabbed navigation and live-preview style mockups
 */

import { ref, computed } from 'vue'
import DirectusInvoicePreview from './directus/DirectusInvoicePreview.vue'
import DirectusCRMPreview from './directus/DirectusCRMPreview.vue'
import DirectusMetricsPreview from './directus/DirectusMetricsPreview.vue'
import DirectusSEOPreview from './directus/DirectusSEOPreview.vue'
import DirectusAISuggestionsPreview from './directus/DirectusAISuggestionsPreview.vue'
import DirectusVisualEditorPreview from './directus/DirectusVisualEditorPreview.vue'
import DirectusNodeREDPreview from './directus/DirectusNodeREDPreview.vue'

type PanelId = 'invoice' | 'crm' | 'metrics' | 'seo' | 'ai' | 'visual' | 'nodered'

interface Panel {
  id: PanelId
  name: string
  icon: string
  description: string
  color: string
  tags: string[]
}

const activePanel = ref<PanelId>('invoice')

const panels: Panel[] = [
  {
    id: 'invoice',
    name: 'Invoice Manager',
    icon: 'receipt_long',
    description: 'Professional invoicing with Stripe integration',
    color: '#10B981',
    tags: ['Stripe', 'PDF Export', 'Recurring']
  },
  {
    id: 'crm',
    name: 'CRM Pipeline',
    icon: 'view_kanban',
    description: 'Kanban-style deal management',
    color: '#3B82F6',
    tags: ['Drag & Drop', 'Forecasting', 'Activities']
  },
  {
    id: 'metrics',
    name: 'Business Metrics',
    icon: 'insights',
    description: 'Real-time KPI dashboard',
    color: '#F59E0B',
    tags: ['Charts', 'Trends', 'Alerts']
  },
  {
    id: 'seo',
    name: 'SEO Keywords',
    icon: 'search',
    description: 'Keyword research and tracking',
    color: '#8B5CF6',
    tags: ['Research', 'Rankings', 'Suggestions']
  },
  {
    id: 'ai',
    name: 'AI Suggestions',
    icon: 'lightbulb',
    description: 'Proactive AI recommendations',
    color: '#EC4899',
    tags: ['Content', 'SEO', 'Actions']
  },
  {
    id: 'visual',
    name: 'Visual Editor',
    icon: 'edit_note',
    description: 'In-place content editing',
    color: '#6366F1',
    tags: ['WYSIWYG', 'Live Preview', 'In-Context']
  },
  {
    id: 'nodered',
    name: 'Node-RED Admin',
    icon: 'account_tree',
    description: 'Workflow automation management',
    color: '#EF4444',
    tags: ['Flows', 'Tenants', 'Executions']
  }
]

const currentPanel = computed(() => panels.find(p => p.id === activePanel.value))
</script>

<template>
  <section
    class="directus-showcase"
    aria-labelledby="directus-title"
  >
    <!-- Background effects -->
    <div class="showcase-bg">
      <div class="bg-gradient" />
      <div class="bg-dots" />
    </div>

    <div class="showcase-container">
      <!-- Header -->
      <header class="showcase-header">
        <h2 id="directus-title">
          Powerful <span class="gradient-text">Directus Extensions</span>
        </h2>
        <p>
          Pre-built admin panels that extend Directus with business-critical features.
          Invoicing, CRM, analytics, SEO, and AI-powered suggestions — all integrated.
        </p>
      </header>

      <!-- Panel Navigation -->
      <nav
        class="panel-nav"
        role="tablist"
      >
        <button
          v-for="panel in panels"
          :key="panel.id"
          role="tab"
          class="panel-tab"
          :class="{ 'is-active': activePanel === panel.id }"
          :aria-selected="activePanel === panel.id"
          :style="{ '--panel-color': panel.color }"
          @click="activePanel = panel.id"
        >
          <span
            class="tab-icon"
            :style="{ background: panel.color }"
          >
            <q-icon
              :name="panel.icon"
              size="18px"
              color="white"
            />
          </span>
          <span class="tab-content">
            <span class="tab-name">{{ panel.name }}</span>
            <span class="tab-desc">{{ panel.description }}</span>
          </span>
        </button>
      </nav>

      <!-- Browser Chrome Frame -->
      <div class="browser-frame">
        <div class="browser-header">
          <div class="browser-controls">
            <span class="dot red" />
            <span class="dot yellow" />
            <span class="dot green" />
          </div>
          <div class="browser-address">
            <q-icon
              name="lock"
              size="12px"
            />
            <span>admin.synthstack.io/insights/{{ activePanel }}</span>
          </div>
          <div class="browser-actions">
            <q-icon
              name="refresh"
              size="14px"
            />
          </div>
        </div>

        <!-- Panel Content -->
        <div class="browser-content">
          <Transition
            name="panel-fade"
            mode="out-in"
          >
            <DirectusInvoicePreview
              v-if="activePanel === 'invoice'"
              key="invoice"
            />
            <DirectusCRMPreview
              v-else-if="activePanel === 'crm'"
              key="crm"
            />
            <DirectusMetricsPreview
              v-else-if="activePanel === 'metrics'"
              key="metrics"
            />
            <DirectusSEOPreview
              v-else-if="activePanel === 'seo'"
              key="seo"
            />
            <DirectusAISuggestionsPreview
              v-else-if="activePanel === 'ai'"
              key="ai"
            />
            <DirectusVisualEditorPreview
              v-else-if="activePanel === 'visual'"
              key="visual"
            />
            <DirectusNodeREDPreview
              v-else-if="activePanel === 'nodered'"
              key="nodered"
            />
          </Transition>
        </div>
      </div>

      <!-- Feature Tags -->
      <div
        v-if="currentPanel"
        class="feature-tags"
      >
        <span 
          v-for="tag in currentPanel.tags" 
          :key="tag" 
          class="feature-tag"
          :style="{ '--tag-color': currentPanel.color }"
        >
          {{ tag }}
        </span>
      </div>

      <!-- CTA -->
      <div class="showcase-cta">
        <q-btn
          label="Explore All Extensions"
          color="primary"
          size="lg"
          rounded
          unelevated
          class="cta-primary"
          to="/docs/directus-extensions"
        >
          <template #append>
            <q-icon name="arrow_forward" />
          </template>
        </q-btn>
        <q-btn
          label="View Live Demo"
          flat
          color="grey-5"
          size="lg"
          rounded
          class="cta-secondary"
          href="https://demo.synthstack.io/admin"
          target="_blank"
        >
          <template #prepend>
            <q-icon name="open_in_new" />
          </template>
        </q-btn>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.directus-showcase {
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
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%);
}

.bg-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse 60% 40% at 50% 30%, black 0%, transparent 100%);
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
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
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

// Panel Navigation
.panel-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
  padding: 0 16px;

  @media (max-width: 768px) {
    gap: 8px;
  }
}

.panel-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(15, 15, 35, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: radial-gradient(circle at top, var(--panel-color, rgba(99, 102, 241, 0.4)) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  &:hover {
    background: rgba(20, 20, 45, 0.6);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);

    &::before {
      opacity: 0.15;
    }
  }

  &.is-active {
    background: rgba(20, 20, 45, 0.8);
    border-color: var(--panel-color);
    box-shadow: 0 0 24px rgba(var(--panel-color), 0.3), 0 8px 16px rgba(0, 0, 0, 0.2);

    &::before {
      opacity: 0.2;
    }

    .tab-name {
      color: #fff;
      font-weight: 700;
    }
  }
}

.tab-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tab-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-desc {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1100px) {
    display: none;
  }
}

// Browser Frame
.browser-frame {
  position: relative;
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 32px;
  box-shadow:
    0 0 40px rgba(99, 102, 241, 0.15),
    0 25px 50px -12px rgba(0, 0, 0, 0.5);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.5) 30%,
      rgba(236, 72, 153, 0.5) 70%,
      transparent 100%
    );
  }
}

.browser-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  background: rgba(20, 20, 40, 0.5);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.browser-controls {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &.red { background: #ff5f57; }
  &.yellow { background: #ffbd2e; }
  &.green { background: #28ca41; }
}

.browser-address {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'JetBrains Mono', monospace;

  .q-icon {
    color: #10b981;
  }
}

.browser-actions {
  color: rgba(255, 255, 255, 0.4);
}

.browser-content {
  min-height: 420px;
  padding: 20px;
}

// Panel transitions
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: all 0.3s ease;
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Feature Tags
.feature-tags {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.feature-tag {
  position: relative;
  padding: 10px 18px;
  background: rgba(15, 15, 35, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: radial-gradient(circle, var(--tag-color, #6366f1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: rgba(20, 20, 45, 0.6);
    border-color: var(--tag-color);
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(var(--tag-color), 0.3);

    &::before {
      opacity: 0.15;
    }
  }
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
  .panel-fade-enter-active,
  .panel-fade-leave-active {
    transition: none;
  }
}
</style>

<!-- Unscoped light mode styles - must be separate to work properly with theme switching -->
<style lang="scss">
.body--light {
  .directus-showcase {
    .showcase-header h2 {
      color: #1e293b !important;
    }

    .showcase-header p {
      color: #475569 !important;
    }

    .bg-gradient {
      background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 60%) !important;
    }

    .bg-dots {
      background-image: radial-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px) !important;
    }

    .panel-tab {
      background: rgba(255, 255, 255, 0.85) !important;
      border-color: rgba(0, 0, 0, 0.08) !important;

      &:hover {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(0, 0, 0, 0.12) !important;
      }

      &.is-active {
        background: #ffffff !important;
        box-shadow: 0 0 24px rgba(99, 102, 241, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08) !important;
      }
    }

    .tab-name {
      color: #334155 !important;
    }

    .tab-desc {
      color: #64748b !important;
    }

    .browser-frame {
      background: rgba(255, 255, 255, 0.9) !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
      box-shadow:
        0 0 40px rgba(99, 102, 241, 0.1),
        0 25px 50px -12px rgba(0, 0, 0, 0.12) !important;
    }

    .browser-header {
      background: rgba(248, 250, 252, 0.95) !important;
      border-color: rgba(0, 0, 0, 0.08) !important;
    }

    .browser-address {
      background: rgba(0, 0, 0, 0.05) !important;
      color: #64748b !important;
    }

    .browser-actions {
      color: #94a3b8 !important;
    }

    .feature-tag {
      background: #ffffff !important;
      border-color: var(--tag-color) !important;
      border-width: 2px !important;
      color: var(--tag-color) !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;

      &:hover {
        background: var(--tag-color) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
      }
    }
  }
}
</style>
