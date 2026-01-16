<template>
  <div
    class="agent-card"
    :style="{ '--agent-color': agent.color }"
  >
    <div class="agent-icon">
      <q-icon
        :name="agent.icon"
        size="40px"
      />
    </div>
    <h3 class="agent-name">
      {{ agent.name }}
    </h3>
    <p class="agent-description">
      {{ agent.description }}
    </p>
    <div class="agent-capabilities">
      <span
        v-for="capability in agent.capabilities.slice(0, 3)"
        :key="capability"
        class="capability-tag"
      >
        {{ capability }}
      </span>
    </div>
    <div class="agent-footer">
      <q-btn
        flat
        dense
        :label="expanded ? 'Less' : 'Learn More'"
        :icon-right="expanded ? 'expand_less' : 'expand_more'"
        class="expand-btn"
        @click="expanded = !expanded"
      />
    </div>
    <q-slide-transition>
      <div
        v-show="expanded"
        class="agent-details"
      >
        <div class="details-section">
          <h4>What {{ agent.name }} Does</h4>
          <ul>
            <li
              v-for="cap in agent.capabilities"
              :key="cap"
            >
              {{ cap }}
            </li>
          </ul>
        </div>
        <div
          v-if="agent.outputs?.length"
          class="details-section"
        >
          <h4>Creates</h4>
          <div class="output-tags">
            <span
              v-for="output in agent.outputs"
              :key="output"
              class="output-tag"
            >
              {{ output }}
            </span>
          </div>
        </div>
      </div>
    </q-slide-transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Agent {
  slug: string
  name: string
  icon: string
  color: string
  description: string
  capabilities: string[]
  outputs?: string[]
}

defineProps<{
  agent: Agent
}>()

const expanded = ref(false)
</script>

<style scoped lang="scss">
.agent-card {
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
      color-mix(in srgb, var(--agent-color) 20%, transparent) 0%,
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
    background: linear-gradient(90deg, transparent, var(--agent-color), transparent);
    opacity: 0;
    transition: all 0.4s ease;
  }

  &:hover {
    transform: translateY(-8px);
    border-color: color-mix(in srgb, var(--agent-color) 50%, transparent);
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.35),
      0 12px 24px rgba(0, 0, 0, 0.2),
      0 0 60px color-mix(in srgb, var(--agent-color) 12%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);

    &::before {
      opacity: 1;
    }

    &::after {
      opacity: 1;
      left: 10%;
      right: 10%;
    }
  }
}

.agent-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(145deg,
    color-mix(in srgb, var(--agent-color) 15%, rgba(20, 20, 45, 1)),
    color-mix(in srgb, var(--agent-color) 8%, rgba(10, 10, 30, 1))
  );
  border: 1px solid color-mix(in srgb, var(--agent-color) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: var(--agent-color);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 6px 20px color-mix(in srgb, var(--agent-color) 15%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);

  .agent-card:hover & {
    transform: scale(1.08) translateY(-2px);
    box-shadow:
      0 12px 32px color-mix(in srgb, var(--agent-color) 30%, transparent),
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  }
}

.agent-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary);
}

.agent-description {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px;
}

.agent-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.capability-tag {
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.agent-footer {
  display: flex;
  justify-content: center;
}

.expand-btn {
  color: var(--agent-color);
  font-weight: 600;
}

.agent-details {
  padding-top: 20px;
  border-top: 1px solid var(--border-default);
  margin-top: 20px;
}

.details-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 6px;
    }
  }
}

.output-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.output-tag {
  background: color-mix(in srgb, var(--agent-color) 10%, transparent);
  color: var(--agent-color);
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
}

// ===========================================
// LIGHT MODE - Premium Neumorphic Style
// ===========================================
:global(.body--light) {
  .agent-card {
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
        color-mix(in srgb, var(--agent-color) 12%, transparent) 0%,
        transparent 70%
      );
    }

    &:hover {
      border-color: color-mix(in srgb, var(--agent-color) 35%, transparent);
      box-shadow:
        0 24px 64px rgba(0, 0, 0, 0.1),
        0 8px 24px rgba(0, 0, 0, 0.06),
        0 0 48px color-mix(in srgb, var(--agent-color) 10%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    }
  }

  .agent-icon {
    background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
    border: 1px solid color-mix(in srgb, var(--agent-color) 20%, transparent);
    box-shadow:
      0 4px 12px color-mix(in srgb, var(--agent-color) 12%, transparent),
      0 2px 4px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.03);
  }

  .agent-card:hover .agent-icon {
    box-shadow:
      0 10px 28px color-mix(in srgb, var(--agent-color) 20%, transparent),
      0 4px 8px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }

  .agent-name {
    color: #0f172a;
    font-weight: 800;
  }

  .agent-description {
    color: #475569;
  }

  .capability-tag {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #475569;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);

    &:hover {
      border-color: color-mix(in srgb, var(--agent-color) 30%, transparent);
      color: var(--agent-color);
    }
  }

  .agent-details {
    border-top-color: rgba(0, 0, 0, 0.06);
  }

  .details-section {
    h4 {
      color: #0f172a;
    }

    ul li {
      color: #475569;
    }
  }

  .output-tag {
    background: linear-gradient(145deg,
      color-mix(in srgb, var(--agent-color) 10%, white),
      color-mix(in srgb, var(--agent-color) 6%, #f8fafc)
    );
    box-shadow:
      0 1px 3px color-mix(in srgb, var(--agent-color) 8%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }
}
</style>
