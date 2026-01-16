<template>
  <section
    class="backend-section"
    aria-labelledby="backend-title"
  >
    <div class="section-container">
      <!-- Section Header -->
      <header class="section-header">
        <h2 id="backend-title">
          Choose Your Generative AI Backend
        </h2>
        <p>
          SynthStack provides two interchangeable Python backends for Generative AI features.
          Pick FastAPI or Django—both offer identical API endpoints for LLM operations.
        </p>
      </header>

      <!-- Architecture Diagram -->
      <div class="architecture-visual">
        <div class="arch-layer frontend-layer">
          <div class="layer-label">
            Frontend
          </div>
          <div class="layer-items">
            <div class="arch-item">
              <q-icon
                name="web"
                size="24px"
              />
              <span>Vue 3 + Quasar</span>
            </div>
            <div class="arch-item">
              <q-icon
                name="smart_toy"
                size="24px"
              />
              <span>AI Copilot</span>
            </div>
          </div>
        </div>

        <div class="connection-line">
          <div class="line" />
          <div class="arrow" />
        </div>

        <div class="arch-layer api-layer">
          <div class="layer-label">
            API Gateway
          </div>
          <div class="layer-items">
            <div class="arch-item">
              <q-icon
                name="bolt"
                size="24px"
              />
              <span>Fastify</span>
            </div>
          </div>
        </div>

        <div class="connection-line">
          <div class="line" />
          <div class="arrow" />
        </div>

        <div class="arch-layer ml-layer">
          <div class="layer-label">
            Generative AI
          </div>
          <div class="layer-items selectable">
            <div
              class="arch-item"
              :class="{ active: selectedBackend === 'fastapi' }"
              @click="selectedBackend = 'fastapi'"
            >
              <q-icon
                name="flash_on"
                size="24px"
              />
              <span>FastAPI</span>
            </div>
            <div class="or-divider">
              OR
            </div>
            <div
              class="arch-item"
              :class="{ active: selectedBackend === 'django' }"
              @click="selectedBackend = 'django'"
            >
              <q-icon
                name="layers"
                size="24px"
              />
              <span>Django</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Backend Cards -->
      <div class="backend-grid">
        <BackendCard
          v-for="backend in backends"
          :key="backend.id"
          :backend="backend"
        />
      </div>

      <!-- Comparison Table -->
      <div class="comparison-table">
        <h3>Feature Comparison</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>
                  <span class="backend-header fastapi">
                    <q-icon
                      name="flash_on"
                      size="18px"
                    />
                    FastAPI
                  </span>
                </th>
                <th>
                  <span class="backend-header django">
                    <q-icon
                      name="layers"
                      size="18px"
                    />
                    Django
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparisonData"
                :key="row.feature"
              >
                <td class="feature-name">
                  {{ row.feature }}
                </td>
                <td class="check-cell">
                  <q-icon
                    :name="row.fastapi ? 'check_circle' : 'remove_circle_outline'"
                    :color="row.fastapi ? 'positive' : 'grey'"
                    size="20px"
                  />
                </td>
                <td class="check-cell">
                  <q-icon
                    :name="row.django ? 'check_circle' : 'remove_circle_outline'"
                    :color="row.django ? 'positive' : 'grey'"
                    size="20px"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CTA -->
      <div class="backend-cta">
        <p class="cta-text">
          <q-icon
            name="swap_horiz"
            size="20px"
          />
          Switch backends anytime with Docker Compose profiles
        </p>
        <div class="cta-code">
          <code>docker compose --profile {{ selectedBackend }} up</code>
          <q-btn
            flat
            dense
            icon="content_copy"
            size="sm"
            @click="copyCommand"
          >
            <q-tooltip>Copy command</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import BackendCard, { type Backend } from './BackendCard.vue'

const $q = useQuasar()
const selectedBackend = ref<'fastapi' | 'django'>('fastapi')

const backends: Backend[] = [
  {
    id: 'fastapi',
    name: 'FastAPI',
    tagline: 'High-performance async Python API with automatic OpenAPI docs. Lightweight with no heavy dependencies.',
    icon: 'flash_on',
    color: '#009688',
    badge: 'Default',
    features: [
      'Native async/await support',
      'Automatic OpenAPI + Swagger UI',
      'Pydantic validation',
      'Lightweight (no heavy ML libs)'
    ],
    techStack: ['Python 3.11+', 'Uvicorn', 'Pydantic', 'OpenAI SDK'],
    docsUrl: '/docs/backend/fastapi',
    githubUrl: 'https://github.com/manicinc/synthstack/tree/main/packages/ml-service'
  },
  {
    id: 'django',
    name: 'Django',
    tagline: 'Battle-tested Python framework with Django REST Framework. Ideal for enterprise teams.',
    icon: 'layers',
    color: '#0c4b33',
    features: [
      'Django REST Framework',
      'Built-in admin interface',
      'ORM with migrations',
      'Extensive ecosystem & plugins'
    ],
    techStack: ['Python 3.11+', 'Django 4.2', 'DRF', 'drf-spectacular'],
    docsUrl: '/docs/backend/django',
    githubUrl: 'https://github.com/manicinc/synthstack/tree/main/packages/django-ml-service'
  }
]

const comparisonData = [
  { feature: 'RAG with pgvector', fastapi: true, django: true },
  { feature: 'OpenAI/Anthropic Integration', fastapi: true, django: true },
  { feature: 'Audio Transcription (Whisper)', fastapi: true, django: true },
  { feature: 'Complexity Estimation', fastapi: true, django: true },
  { feature: 'Text Analysis & Sentiment', fastapi: true, django: true },
  { feature: 'Embeddings Generation', fastapi: true, django: true },
  { feature: 'OpenAPI Documentation', fastapi: true, django: true },
  { feature: 'Docker Support', fastapi: true, django: true },
  { feature: 'Native Async', fastapi: true, django: true },
  { feature: 'Admin Interface', fastapi: false, django: true },
  { feature: 'ORM Migrations', fastapi: false, django: true }
]

async function copyCommand() {
  const command = `docker compose --profile ${selectedBackend.value} up`
  await copyToClipboard(command)
  $q.notify({
    message: 'Command copied to clipboard',
    color: 'positive',
    icon: 'check',
    timeout: 2000
  })
}
</script>

<style scoped lang="scss">
.backend-section {
  padding: 100px 24px;
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(13, 148, 136, 0.03) 50%,
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
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
}

// Architecture Visual
.architecture-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 60px;
  padding: 40px 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  overflow-x: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
}

.arch-layer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.layer-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.layer-items {
  display: flex;
  gap: 12px;

  &.selectable .arch-item {
    cursor: pointer;

    &:hover {
      border-color: var(--primary);
    }

    &.active {
      border-color: #0d9488;
      background: rgba(13, 148, 136, 0.1);

      .q-icon {
        color: #0d9488;
      }
    }
  }
}

.arch-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: var(--bg-base);
  border: 2px solid var(--border-default);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.2s ease;

  .q-icon {
    color: var(--primary);
  }
}

.or-divider {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 0 8px;
}

.connection-line {
  display: flex;
  align-items: center;
  width: 60px;

  .line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, var(--border-default), var(--primary), var(--border-default));
  }

  .arrow {
    width: 0;
    height: 0;
    border-left: 8px solid var(--primary);
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  @media (max-width: 768px) {
    width: auto;
    height: 40px;
    flex-direction: column;

    .line {
      width: 2px;
      height: 100%;
    }

    .arrow {
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 8px solid var(--primary);
    }
  }
}

// Backend Grid
.backend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-bottom: 60px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
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
  min-width: 500px;
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

.backend-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 700;

  &.fastapi {
    background: rgba(0, 150, 136, 0.1);
    color: #009688;
  }

  &.django {
    background: rgba(12, 75, 51, 0.1);
    color: #0c4b33;
  }
}

tbody tr {
  border-bottom: 1px solid var(--border-default);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.03);
  }
}

td {
  padding: 14px 20px;
  font-size: 0.9rem;
}

.feature-name {
  color: var(--text-primary);
  font-weight: 500;
}

.check-cell {
  text-align: center;
}

// CTA
.backend-cta {
  text-align: center;
  padding: 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
}

.cta-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 16px;

  .q-icon {
    color: var(--primary);
  }
}

.cta-code {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #0f172a;
  border-radius: 10px;

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    color: #0d9488;
  }

  .q-btn {
    color: #64748b;

    &:hover {
      color: #0d9488;
    }
  }
}

// Light mode
:global(.body--light) .backend-section {
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(13, 148, 136, 0.05) 50%,
    var(--bg-base) 100%
  );
}

:global(.body--light) .section-header h2 {
  color: var(--text-primary);
}

:global(.body--light) .section-header p {
  color: var(--text-secondary);
}

:global(.body--light) .architecture-visual {
  background: var(--bg-subtle);
}

:global(.body--light) .arch-item {
  background: var(--bg-base);
}

:global(.body--light) .comparison-table h3 {
  color: var(--text-primary);
}

:global(.body--light) .table-wrapper {
  background: var(--bg-base);
}

:global(.body--light) .cta-text {
  color: var(--text-secondary);
}

:global(.body--light) .backend-cta {
  background: var(--bg-subtle);
}
</style>
