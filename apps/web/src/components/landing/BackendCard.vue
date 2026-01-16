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
  background: linear-gradient(145deg, rgba(18, 18, 42, 0.85) 0%, rgba(12, 12, 30, 0.9) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);

  // Gradient glow layer
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    background: radial-gradient(
      ellipse at 50% -20%,
      color-mix(in srgb, var(--backend-color) 20%, transparent) 0%,
      transparent 70%
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
    left: 15%;
    right: 15%;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--backend-color), transparent);
    opacity: 0;
    transition: all 0.4s ease;
  }

  &:hover {
    transform: translateY(-8px);
    border-color: color-mix(in srgb, var(--backend-color) 50%, transparent);
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.35),
      0 12px 24px rgba(0, 0, 0, 0.2),
      0 0 60px color-mix(in srgb, var(--backend-color) 12%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);

    &::before {
      opacity: 1;
    }

    &::after {
      opacity: 1;
      left: 10%;
      right: 10%;
    }

    .backend-icon {
      transform: scale(1.08) translateY(-2px);
      box-shadow:
        0 12px 32px color-mix(in srgb, var(--backend-color) 30%, transparent),
        0 4px 12px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
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
  background: linear-gradient(145deg,
    color-mix(in srgb, var(--backend-color) 15%, rgba(20, 20, 45, 1)),
    color-mix(in srgb, var(--backend-color) 8%, rgba(10, 10, 30, 1))
  );
  border: 1px solid color-mix(in srgb, var(--backend-color) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--backend-color);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 6px 20px color-mix(in srgb, var(--backend-color) 15%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
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
// LIGHT MODE - Premium Neumorphic Style
// ===========================================
:global(.body--light) {
  .backend-card {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.06),
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.02);

    &::before {
      background: radial-gradient(
        ellipse at 50% -20%,
        color-mix(in srgb, var(--backend-color) 12%, transparent) 0%,
        transparent 70%
      );
    }

    &:hover {
      border-color: color-mix(in srgb, var(--backend-color) 35%, transparent);
      box-shadow:
        0 24px 64px rgba(0, 0, 0, 0.1),
        0 8px 24px rgba(0, 0, 0, 0.06),
        0 0 48px color-mix(in srgb, var(--backend-color) 10%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    }
  }

  .backend-icon {
    background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
    border: 1px solid color-mix(in srgb, var(--backend-color) 20%, transparent);
    box-shadow:
      0 4px 12px color-mix(in srgb, var(--backend-color) 12%, transparent),
      0 2px 4px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.03);
  }

  .backend-card:hover .backend-icon {
    box-shadow:
      0 10px 28px color-mix(in srgb, var(--backend-color) 20%, transparent),
      0 4px 8px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }

  .backend-name {
    color: #0f172a;
    font-weight: 800;
  }

  .backend-tagline {
    color: #475569;
  }

  .feature-item {
    color: #334155;
  }

  .tech-tag {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #475569;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);

    &:hover {
      border-color: color-mix(in srgb, var(--backend-color) 30%, transparent);
      color: var(--backend-color);
    }
  }

  .card-footer {
    border-top-color: rgba(0, 0, 0, 0.06);
  }

  .docs-link {
    background: linear-gradient(145deg,
      color-mix(in srgb, var(--backend-color) 10%, white),
      color-mix(in srgb, var(--backend-color) 6%, #f8fafc)
    );
    box-shadow:
      0 2px 6px color-mix(in srgb, var(--backend-color) 10%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);

    &:hover {
      background: linear-gradient(145deg,
        color-mix(in srgb, var(--backend-color) 15%, white),
        color-mix(in srgb, var(--backend-color) 10%, #f8fafc)
      );
      box-shadow:
        0 4px 12px color-mix(in srgb, var(--backend-color) 15%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }

  .github-link {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #475569;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);

    &:hover {
      border-color: color-mix(in srgb, var(--backend-color) 30%, transparent);
      color: var(--backend-color);
      box-shadow:
        0 3px 8px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }
}
</style>
