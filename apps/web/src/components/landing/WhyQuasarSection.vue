<template>
  <section class="why-quasar-section">
    <div class="section-container-narrow">
      <q-expansion-item
        v-model="whyQuasarExpanded"
        class="why-quasar-expansion"
        expand-icon-class="expansion-icon"
      >
        <template #header>
          <div class="expansion-header">
            <q-icon
              name="help_outline"
              size="24px"
            />
            <span class="expansion-question">Why did we choose Vue 3 + Quasar?</span>
            <q-chip
              size="sm"
              color="primary"
              text-color="white"
              class="learn-more-chip"
            >
              Learn more
            </q-chip>
          </div>
        </template>

        <div class="expansion-content">
          <p class="lead">
            We evaluated Next.js, Nuxt, and SvelteKit before choosing Quasar.
            Beyond raw speed and flexibility, Quasar delivers a design-first experience
            with beautiful components and complete theming control—something few modern frameworks offer:
          </p>

          <div class="reasons-grid">
            <div
              v-for="reason in quasarReasons"
              :key="reason.title"
              class="reason-card"
            >
              <div class="reason-icon">
                <q-icon
                  :name="reason.icon"
                  size="28px"
                />
              </div>
              <h4>{{ reason.title }}</h4>
              <p>{{ reason.description }}</p>
            </div>
          </div>

          <div class="comparison-cta">
            <q-btn
              flat
              color="primary"
              label="View Full Framework Comparison"
              icon-right="open_in_new"
              href="/docs/frontend-framework-choices"
              target="_blank"
            />
          </div>
        </div>
      </q-expansion-item>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const whyQuasarExpanded = ref(false)

const quasarReasons = [
  {
    title: 'One Codebase, 6+ Platforms',
    description: 'Build iOS, Android, macOS, Windows, Linux, Web, and PWA from a single Vue.js codebase.',
    icon: 'devices'
  },
  {
    title: 'Vite-Native Speed',
    description: '~50ms HMR and ~15s builds. Nuxt is 2x slower, Next.js webpack is 3x slower.',
    icon: 'bolt'
  },
  {
    title: 'Flexible Architecture',
    description: 'Switch between SPA, SSR, PWA, Capacitor, or Electron with a CLI flag.',
    icon: 'tune'
  },
  {
    title: '100+ Components Built-In',
    description: 'Material Design components out of the box. No UI library hunting.',
    icon: 'widgets'
  },
  {
    title: 'Beautiful UI & Complete Theming',
    description: '10 stunning presets with independent light/dark mode (30+ combinations). 60+ CSS variables enable pixel-perfect customization. Premium themes include neon Cyberpunk, soft Neumorphic, and gradient Sunset.',
    icon: 'palette'
  }
]
</script>

<style lang="scss" scoped>
.why-quasar-section {
  padding: 60px 24px;
  background: var(--bg-base);
}

.section-container-narrow {
  max-width: 900px;
  margin: 0 auto;
}

.why-quasar-expansion {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  overflow: hidden;

  &:hover {
    border-color: var(--primary);
  }
}

.expansion-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  cursor: pointer;
  width: 100%;

  .q-icon {
    color: var(--primary);
  }

  .expansion-question {
    flex: 1;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .learn-more-chip {
    font-size: 0.75rem;
  }

  @media (max-width: 600px) {
    flex-wrap: wrap;
    gap: 8px;

    .expansion-question {
      flex-basis: 100%;
    }
  }
}

.expansion-content {
  padding: 0 24px 24px;

  .lead {
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: 32px;
    text-align: center;
  }
}

.reasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.reason-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--primary);
  }

  &:last-child {
    border-color: rgba(139, 92, 246, 0.3);

    &:hover {
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
    }

    .reason-icon .q-icon {
      color: #a78bfa;
    }
  }

  h4 {
    font-size: 1.0625rem;
    font-weight: 600;
    margin: 12px 0 8px;
    color: var(--text-primary);
  }

  p {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }
}

.reason-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent);
  display: flex;
  align-items: center;
  justify-content: center;

  .q-icon {
    color: var(--primary);
  }
}

.comparison-cta {
  text-align: center;
  padding-top: 8px;
}
</style>


