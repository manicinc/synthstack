<template>
  <a
    href="https://manic.agency"
    target="_blank"
    rel="noopener noreferrer"
    class="manic-badge"
    :class="[variant, { compact }]"
    aria-label="Built by Manic Agency"
  >
    <span class="badge-content">
      <span class="badge-prefix">{{ compact ? '' : 'Built by' }}</span>
      <span class="badge-brand">
        <span class="brand-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5z"
              fill="currentColor"
              class="icon-top"
            />
            <path
              d="M2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon-layers"
            />
          </svg>
        </span>
        <span class="brand-text">manic<span class="brand-dot">.</span>agency</span>
      </span>
    </span>
    <span class="badge-shimmer" />
    <span class="badge-glow" />
  </a>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'minimal' | 'prominent'
  compact?: boolean
}>()
</script>

<style lang="scss" scoped>
.manic-badge {
  --badge-bg: rgba(99, 102, 241, 0.08);
  --badge-border: rgba(99, 102, 241, 0.2);
  --badge-text: #6366f1;
  --badge-glow: rgba(99, 102, 241, 0.4);

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  border-radius: 100px;
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--badge-text);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  cursor: pointer;

  &:hover {
    --badge-bg: rgba(99, 102, 241, 0.15);
    --badge-border: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--badge-glow);

    .badge-shimmer {
      transform: translateX(200%);
    }

    .badge-glow {
      opacity: 1;
    }

    .brand-icon {
      transform: rotate(10deg) scale(1.1);
    }

    .brand-dot {
      animation: pulse-dot 0.6s ease-in-out infinite alternate;
    }

    .icon-layers {
      stroke-dashoffset: 0;
    }
  }

  &:active {
    transform: translateY(0);
  }
}

.badge-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-prefix {
  opacity: 0.7;
  font-weight: 500;
}

.badge-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;

  svg {
    width: 100%;
    height: 100%;
  }

  .icon-top {
    opacity: 0.9;
  }

  .icon-layers {
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    transition: stroke-dashoffset 0.5s ease;
  }
}

.brand-text {
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-dot {
  color: #00d4aa;
  font-weight: 800;
}

.badge-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  transition: transform 0.6s ease;
  pointer-events: none;
}

.badge-glow {
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, #6366f1, #00d4aa);
  opacity: 0;
  z-index: -1;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

// Variants
.minimal {
  --badge-bg: transparent;
  --badge-border: transparent;
  padding: 4px 8px;

  &:hover {
    --badge-bg: rgba(99, 102, 241, 0.08);
  }
}

.prominent {
  --badge-bg: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(0, 212, 170, 0.1) 100%);
  --badge-border: rgba(99, 102, 241, 0.3);
  padding: 12px 24px;
  font-size: 0.9375rem;

  .brand-icon {
    width: 20px;
    height: 20px;
  }

  &:hover {
    --badge-bg: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(0, 212, 170, 0.2) 100%);
  }
}

.compact {
  padding: 4px 10px;
  font-size: 0.75rem;

  .brand-icon {
    width: 12px;
    height: 12px;
  }
}

// Dark mode adjustments
:global(.body--dark) .manic-badge {
  --badge-bg: rgba(99, 102, 241, 0.15);
  --badge-border: rgba(99, 102, 241, 0.3);
  --badge-text: #a5b4fc;

  &:hover {
    --badge-bg: rgba(99, 102, 241, 0.25);
    --badge-border: rgba(99, 102, 241, 0.5);
  }
}

// Animation
@keyframes pulse-dot {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.3);
  }
}
</style>
