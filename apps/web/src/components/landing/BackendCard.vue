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
  background: rgba(15, 15, 35, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 32px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  // Gradient glow layer
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: radial-gradient(
      ellipse at 50% -20%,
      color-mix(in srgb, var(--backend-color) 18%, transparent) 0%,
      transparent 65%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  // Top accent line with gradient
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 20%;
    right: 20%;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--backend-color), transparent);
    opacity: 0;
    transition: all 0.4s ease;
  }

  &:hover {
    transform: translateY(-8px);
    border-color: color-mix(in srgb, var(--backend-color) 40%, transparent);
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.3),
      0 0 50px color-mix(in srgb, var(--backend-color) 12%, transparent);

    &::before {
      opacity: 1;
    }

    &::after {
      opacity: 1;
      left: 10%;
      right: 10%;
    }

    .backend-icon {
      transform: scale(1.1);
      box-shadow:
        0 12px 32px color-mix(in srgb, var(--backend-color) 30%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
  background: color-mix(in srgb, var(--backend-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--backend-color) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--backend-color);
  transition: all 0.3s ease;
  box-shadow:
    0 4px 16px color-mix(in srgb, var(--backend-color) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

// ===========================================
// LIGHT MODE - Neumorphic clean style
// ===========================================
:global(.body--light) {
  .backend-card {
    background: #ffffff;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.04),
      0 1px 3px rgba(0, 0, 0, 0.02),
      inset 0 1px 0 rgba(255, 255, 255, 1);

    &::before {
      background: radial-gradient(
        ellipse at 50% -20%,
        color-mix(in srgb, var(--backend-color) 10%, transparent) 0%,
        transparent 65%
      );
    }

    &:hover {
      border-color: color-mix(in srgb, var(--backend-color) 30%, transparent);
      box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.08),
        0 8px 24px rgba(0, 0, 0, 0.04),
        0 0 40px color-mix(in srgb, var(--backend-color) 8%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    }
  }

  .backend-icon {
    background: color-mix(in srgb, var(--backend-color) 8%, white);
    border-color: color-mix(in srgb, var(--backend-color) 15%, transparent);
    box-shadow:
      0 2px 8px color-mix(in srgb, var(--backend-color) 8%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .backend-card:hover .backend-icon {
    box-shadow:
      0 8px 24px color-mix(in srgb, var(--backend-color) 20%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .backend-name {
    color: #1e293b;
  }

  .backend-tagline {
    color: #475569;
  }

  .feature-item {
    color: #334155;
  }

  .tech-tag {
    background: #f8fafc;
    border-color: rgba(0, 0, 0, 0.06);
    color: #475569;

    &:hover {
      background: color-mix(in srgb, var(--backend-color) 8%, white);
    }
  }

  .card-footer {
    border-top-color: rgba(0, 0, 0, 0.06);
  }

  .docs-link {
    background: color-mix(in srgb, var(--backend-color) 8%, white);

    &:hover {
      background: color-mix(in srgb, var(--backend-color) 15%, white);
    }
  }

  .github-link {
    background: #f8fafc;
    border-color: rgba(0, 0, 0, 0.06);
    color: #475569;

    &:hover {
      background: #f1f5f9;
    }
  }
}
</style>
