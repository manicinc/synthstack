<template>
  <section
    class="frontend-section"
    aria-labelledby="frontend-title"
  >
    <div class="section-container">
      <!-- Section Header -->
      <header class="section-header">
        <h2 id="frontend-title">
          Cross-Platform from a Single Codebase
        </h2>
        <p>
          Vue 3 + Quasar enables iOS, Android, Desktop, and Web from one codebase.
          Fast builds, 100+ components, and flexible architecture.
        </p>
      </header>

      <!-- Value Props Grid -->
      <div class="value-props-grid">
        <div
          v-for="prop in valueProps"
          :key="prop.id"
          class="value-prop-card"
        >
          <div
            class="prop-icon"
            :style="{ '--prop-color': prop.color }"
          >
            <q-icon
              :name="prop.icon"
              size="32px"
            />
          </div>
          <h3>{{ prop.title }}</h3>
          <p>{{ prop.description }}</p>
          <div
            v-if="prop.metrics"
            class="prop-metrics"
          >
            <div
              v-for="metric in prop.metrics"
              :key="metric.label"
              class="metric"
            >
              <span class="metric-value">{{ metric.value }}</span>
              <span class="metric-label">{{ metric.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Table -->
      <div class="comparison-table">
        <h3>Framework Comparison</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th
                  v-for="fw in frameworks"
                  :key="fw.id"
                >
                  <span
                    class="framework-header"
                    :class="fw.id"
                  >
                    <q-icon
                      :name="fw.icon"
                      size="18px"
                    />
                    {{ fw.name }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="feature in comparisonFeatures"
                :key="feature.name"
              >
                <td class="feature-name">
                  {{ feature.name }}
                </td>
                <td
                  v-for="fw in frameworks"
                  :key="fw.id"
                  class="value-cell"
                >
                  <q-icon
                    v-if="feature.values[fw.id] === true"
                    name="check_circle"
                    color="positive"
                    size="20px"
                  />
                  <q-icon
                    v-else-if="feature.values[fw.id] === false"
                    name="cancel"
                    color="grey-5"
                    size="20px"
                  />
                  <span
                    v-else-if="feature.values[fw.id] === 'partial'"
                    class="partial-support"
                  >
                    <q-icon
                      name="remove_circle"
                      color="warning"
                      size="20px"
                    />
                    <q-tooltip>Manual setup required</q-tooltip>
                  </span>
                  <span
                    v-else
                    class="text-value"
                  >{{ feature.values[fw.id] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CTA -->
      <div class="frontend-cta">
        <p class="cta-text">
          <q-icon
            name="library_books"
            size="20px"
          />
          Want to dive deeper into our frontend framework choice?
        </p>
        <q-btn
          flat
          color="primary"
          label="Read Full Comparison"
          icon-right="arrow_forward"
          href="/docs/frontend-framework-choices"
          target="_blank"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type FrameworkId = 'quasar' | 'nuxt' | 'nextjs' | 'sveltekit'
type FeatureValue = boolean | 'partial' | string

interface Framework {
  id: FrameworkId
  name: string
  icon: string
}

interface ComparisonFeature {
  name: string
  values: Record<FrameworkId, FeatureValue>
}

const valueProps = [
  {
    id: 'cross-platform',
    title: 'Cross-Platform Native',
    description: 'Deploy to iOS, Android, macOS, Windows, Linux, and Web from a single Vue.js codebase using Capacitor and Electron.',
    icon: 'devices',
    color: '#6366f1',
    metrics: [
      { value: '6+', label: 'Platforms' },
      { value: '1x', label: 'Codebase' }
    ]
  },
  {
    id: 'build-speed',
    title: 'Lightning-Fast Builds',
    description: 'Vite-native build system delivers sub-second HMR and optimized production bundles. No webpack or hybrid configs.',
    icon: 'bolt',
    color: '#f59e0b',
    metrics: [
      { value: '~50ms', label: 'HMR' },
      { value: '~15s', label: 'Build' }
    ]
  },
  {
    id: 'flexibility',
    title: 'Flexible Architecture',
    description: 'Switch between SPA, SSR, PWA, Capacitor, or Electron modes with a single CLI flag. No refactoring needed.',
    icon: 'tune',
    color: '#10b981',
    metrics: [
      { value: '5', label: 'Build Modes' },
      { value: '100+', label: 'Components' }
    ]
  }
]

const frameworks: Framework[] = [
  { id: 'quasar', name: 'Quasar', icon: 'flash_on' },
  { id: 'nuxt', name: 'Nuxt', icon: 'layers' },
  { id: 'nextjs', name: 'Next.js', icon: 'code' },
  { id: 'sveltekit', name: 'SvelteKit', icon: 'rocket_launch' }
]

const comparisonFeatures: ComparisonFeature[] = [
  {
    name: 'iOS/Android Apps',
    values: {
      quasar: true,
      nuxt: false,
      nextjs: false,
      sveltekit: false
    }
  },
  {
    name: 'Desktop Apps',
    values: {
      quasar: true,
      nuxt: 'partial',
      nextjs: 'partial',
      sveltekit: 'partial'
    }
  },
  {
    name: 'SSR Support',
    values: {
      quasar: true,
      nuxt: true,
      nextjs: true,
      sveltekit: true
    }
  },
  {
    name: 'PWA Support',
    values: {
      quasar: true,
      nuxt: true,
      nextjs: 'partial',
      sveltekit: true
    }
  },
  {
    name: 'Build System',
    values: {
      quasar: 'Vite',
      nuxt: 'Vite+Nitro',
      nextjs: 'Webpack',
      sveltekit: 'Vite'
    }
  },
  {
    name: 'Component Library',
    values: {
      quasar: '100+ built-in',
      nuxt: 'BYO',
      nextjs: 'BYO',
      sveltekit: 'BYO'
    }
  },
  {
    name: 'Bundle Size',
    values: {
      quasar: '~50KB',
      nuxt: '~60KB',
      nextjs: '~90KB',
      sveltekit: '~30KB'
    }
  }
]
</script>

<style scoped lang="scss">
.frontend-section {
  padding: 100px 24px;
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(99, 102, 241, 0.03) 50%,
    var(--bg-base) 100%
  );
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 16px 0;
    color: var(--text-primary);
  }

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }
}

// Value Props Grid
.value-props-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 80px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.value-prop-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 32px 28px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--primary);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 16px 0 12px;
    color: var(--text-primary);
  }

  p {
    font-size: 0.9375rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }
}

.prop-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--prop-color), transparent);
  display: flex;
  align-items: center;
  justify-content: center;

  .q-icon {
    color: var(--prop-color);
  }
}

.prop-metrics {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .metric-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }
}

// Comparison Table
.comparison-table {
  margin-bottom: 60px;

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 24px;
    text-align: center;
    color: var(--text-primary);
  }
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-default);
  border-radius: 16px;
  background: var(--bg-elevated);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;
}

thead {
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-default);
}

th {
  padding: 16px 20px;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);

  &:not(:first-child) {
    text-align: center;
  }
}

.framework-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;

  &.quasar {
    color: #6366f1;
  }

  &.nuxt {
    color: #00dc82;
  }

  &.nextjs {
    color: #000;
  }

  &.sveltekit {
    color: #ff3e00;
  }

  :global(.body--light) & {
    &.nextjs {
      color: #333;
    }
  }
}

tbody tr {
  border-bottom: 1px solid var(--border-default);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--bg-subtle);
  }
}

td {
  padding: 14px 20px;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.feature-name {
  font-weight: 600;
  color: var(--text-primary);
}

.value-cell {
  text-align: center;
}

.text-value {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.partial-support {
  cursor: help;
}

// CTA
.frontend-cta {
  text-align: center;
  padding: 40px 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;

  .cta-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 1.0625rem;
    color: var(--text-primary);
    margin-bottom: 20px;
    font-weight: 600;

    .q-icon {
      color: var(--primary);
    }
  }
}

// Light mode overrides
:global(.body--light) {
  .value-prop-card {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

    &:hover {
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    }
  }
}
</style>
