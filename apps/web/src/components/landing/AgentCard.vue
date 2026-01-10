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
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  padding: 28px;
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
    background: var(--agent-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);

    &::before {
      opacity: 1;
    }
  }
}

.agent-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--agent-color) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: var(--agent-color);
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
</style>
