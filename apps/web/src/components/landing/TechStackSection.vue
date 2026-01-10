<template>
  <section
    class="tech-section"
    aria-label="Tech stack"
    data-testid="tech-stack-section"
  >
    <p class="tech-label">
      {{ t('landing.tech.label') }}
    </p>
    <ul class="tech-list">
      <li
        v-for="tech in techStack"
        :key="tech.name"
        class="tech-badge"
      >
        {{ tech.name }}
        <q-tooltip
          anchor="top middle"
          self="bottom middle"
          :offset="[0, 10]"
          class="tech-tooltip"
        >
          <div class="tooltip-content">
            <strong>{{ tech.name }}</strong>
            <p>{{ tech.description }}</p>
            <span
              v-if="tech.benefit"
              class="tooltip-benefit"
            >
              <q-icon
                name="star"
                size="14px"
              />
              {{ tech.benefit }}
            </span>
          </div>
        </q-tooltip>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Tech stack with descriptions for tooltips
const techStack = [
  {
    name: 'Vue 3 + Quasar',
    description: 'Cross-platform framework for iOS, Android, Desktop, and Web from one codebase.',
    benefit: 'Build 6+ platforms from a single Vue.js app'
  },
  {
    name: 'Fastify API',
    description: 'Fast and low overhead Node.js framework with excellent TypeScript support.',
    benefit: '2x faster than Express'
  },
  {
    name: 'Directus CMS',
    description: 'Open-source headless CMS with visual editing and real-time collaboration.',
    benefit: 'No vendor lock-in, self-hostable'
  },
  {
    name: 'PostgreSQL',
    description: 'Advanced relational database with pgvector for AI embeddings.',
    benefit: 'Rock-solid reliability'
  },
  {
    name: 'Supabase Auth',
    description: 'Open-source authentication with OAuth, JWT, and RBAC.',
    benefit: 'Managed or self-hosted option'
  },
  {
    name: 'Qdrant Vector DB',
    description: 'Vector database for AI-powered semantic search and RAG.',
    benefit: 'Lightning-fast vector search'
  }
]
</script>

<style lang="scss" scoped>
.tech-section {
  padding: 40px 24px;
  text-align: center;
  border-top: 1px solid var(--border-default);
  border-bottom: 1px solid var(--border-default);
}

.tech-label {
  color: var(--text-secondary);
  margin: 0 0 24px;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

:global(.body--light) .tech-label {
  color: var(--text-secondary) !important;
}

.tech-list {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.125rem;
    cursor: help;
    transition: color 0.2s ease;

    &:hover {
      color: var(--primary);
    }
  }
}

// Tech tooltip styles
.tech-tooltip {
  max-width: 280px;
  padding: 12px;

  .tooltip-content {
    strong {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    p {
      font-size: 13px;
      margin-bottom: 8px;
      opacity: 0.9;
      line-height: 1.4;
    }

    .tooltip-benefit {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6366f1;
      font-weight: 500;

      .q-icon {
        color: #6366f1;
      }
    }
  }
}

:global(.body--light) .tech-section {
  border-color: var(--border-default) !important;
}

:global(.body--light) .tech-list li {
  color: var(--text-primary) !important;
}
</style>


