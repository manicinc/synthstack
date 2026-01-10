<template>
  <section
    class="setup-journey"
    aria-labelledby="setup-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="setup-title">
          How AI Co-Founders Works
        </h2>
        <p>From setup to actionable results in four simple steps</p>
      </header>

      <div class="journey-timeline">
        <div class="timeline-line" />

        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="journey-step"
          :class="{ active: activeStep === index }"
          @mouseenter="activeStep = index"
        >
          <div
            class="step-marker"
            :style="{ '--step-color': step.color }"
          >
            <q-icon
              :name="step.icon"
              size="24px"
            />
            <span class="step-number">{{ index + 1 }}</span>
          </div>

          <div class="step-content">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
            <ul class="step-details">
              <li
                v-for="detail in step.details"
                :key="detail"
              >
                <q-icon
                  name="check_circle"
                  size="16px"
                  color="positive"
                />
                {{ detail }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="journey-cta">
        <q-btn
          unelevated
          color="primary"
          size="lg"
          label="Start Your AI Team"
          icon-right="arrow_forward"
          to="/app"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeStep = ref(0)

const steps = [
  {
    icon: 'link',
    title: 'Connect',
    color: '#6366F1',
    description: 'Connect your data sources in minutes. GitHub, your database, content, and more.',
    details: [
      'One-click GitHub PAT integration',
      'Auto-sync with your Directus CMS',
      'Automatic RAG indexing of your content',
      'Secure, encrypted connections',
    ],
  },
  {
    icon: 'tune',
    title: 'Configure',
    color: '#10B981',
    description: 'Customize each AI agent to match your workflow and preferences.',
    details: [
      'Enable/disable specific agents',
      'Set suggestion frequency (hourly, daily, weekly)',
      'Configure approval workflows',
      'Define agent permissions and scope',
    ],
  },
  {
    icon: 'school',
    title: 'Learn',
    color: '#F59E0B',
    description: 'Your AI team learns your business through RAG and continuous context.',
    details: [
      'Automatic knowledge base creation',
      'Learns from your interactions',
      'Shared context between agents',
      'Improves over time',
    ],
  },
  {
    icon: 'bolt',
    title: 'Act',
    color: '#3B82F6',
    description: 'Your AI co-founders proactively suggest and create real business outputs.',
    details: [
      'Draft blog posts and content',
      'Create GitHub pull requests',
      'Generate marketing campaigns',
      'All require your approval first',
    ],
  },
]
</script>

<style scoped lang="scss">
.setup-journey {
  padding: 100px 24px;
  background: var(--bg-base);
}

.section-container {
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;

    @media (max-width: 600px) {
      font-size: 2rem;
    }
  }

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
  }
}

.journey-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.timeline-line {
  position: absolute;
  left: 28px;
  top: 40px;
  bottom: 40px;
  width: 2px;
  background: linear-gradient(
    180deg,
    #6366F1 0%,
    #10B981 33%,
    #F59E0B 66%,
    #3B82F6 100%
  );
  opacity: 0.3;

  @media (max-width: 600px) {
    display: none;
  }
}

.journey-step {
  display: flex;
  gap: 24px;
  padding: 24px;
  border-radius: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  transition: all 0.3s ease;
  cursor: default;

  &:hover,
  &.active {
    border-color: var(--primary);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.1);

    .step-marker {
      transform: scale(1.1);
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
}

.step-marker {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--step-color) 15%, transparent);
  color: var(--step-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;

  .step-number {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--step-color);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 600px) {
    margin: 0 auto;
  }
}

.step-content {
  flex: 1;

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  p {
    font-size: 1rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 16px;
  }
}

.step-details {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--text-secondary);

    .q-icon {
      flex-shrink: 0;
    }
  }

  @media (max-width: 600px) {
    justify-content: center;

    li {
      justify-content: center;
    }
  }
}

.journey-cta {
  text-align: center;
  margin-top: 60px;
}
</style>
