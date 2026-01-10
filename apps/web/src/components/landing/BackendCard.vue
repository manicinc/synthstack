<template>
  <div
    class="backend-card"
    :style="{ '--backend-color': backend.color }"
  >
    <div class="card-header">
      <div class="backend-icon">
        <q-icon
          :name="backend.icon"
          size="32px"
        />
      </div>
      <div
        v-if="backend.badge"
        class="backend-badge"
      >
        {{ backend.badge }}
      </div>
    </div>

    <h3 class="backend-name">
      {{ backend.name }}
    </h3>
    <p class="backend-tagline">
      {{ backend.tagline }}
    </p>

    <div class="backend-features">
      <div
        v-for="feature in backend.features.slice(0, 4)"
        :key="feature"
        class="feature-item"
      >
        <q-icon
          name="check_circle"
          size="16px"
        />
        <span>{{ feature }}</span>
      </div>
    </div>

    <div class="tech-stack">
      <span
        v-for="tech in backend.techStack"
        :key="tech"
        class="tech-tag"
      >
        {{ tech }}
      </span>
    </div>

    <div class="card-footer">
      <a
        :href="backend.docsUrl"
        class="docs-link"
        target="_blank"
        rel="noopener"
      >
        <q-icon
          name="menu_book"
          size="18px"
        />
        Documentation
      </a>
      <a
        :href="backend.githubUrl"
        class="github-link"
        target="_blank"
        rel="noopener"
      >
        <q-icon
          name="code"
          size="18px"
        />
        Source
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Backend {
  id: string
  name: string
  tagline: string
  icon: string
  color: string
  badge?: string
  features: string[]
  techStack: string[]
  docsUrl: string
  githubUrl: string
}

defineProps<{
  backend: Backend
}>()
</script>

<style scoped lang="scss">
.backend-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 32px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--backend-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
    border-color: var(--backend-color);

    &::before {
      opacity: 1;
    }

    .backend-icon {
      transform: scale(1.1);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--backend-color) 30%, transparent);
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.backend-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--backend-color) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--backend-color);
  transition: all 0.3s ease;
}

.backend-badge {
  background: var(--backend-color);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.backend-name {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.backend-tagline {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 24px;
}

.backend-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-primary);

  .q-icon {
    color: var(--backend-color);
    flex-shrink: 0;
  }
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.tech-tag {
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--backend-color);
    color: var(--backend-color);
  }
}

.card-footer {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border-default);
}

.docs-link,
.github-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.docs-link {
  background: color-mix(in srgb, var(--backend-color) 10%, transparent);
  color: var(--backend-color);
  flex: 1;
  justify-content: center;

  &:hover {
    background: color-mix(in srgb, var(--backend-color) 20%, transparent);
    transform: translateY(-2px);
  }
}

.github-link {
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);

  &:hover {
    border-color: var(--backend-color);
    color: var(--backend-color);
    transform: translateY(-2px);
  }
}

// Light mode overrides
:global(.body--light) .backend-card {
  background: var(--bg-base);
}

:global(.body--light) .backend-tagline {
  color: var(--text-secondary);
}

:global(.body--light) .tech-tag {
  background: var(--bg-subtle);
}
</style>
