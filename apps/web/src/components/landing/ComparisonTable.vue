<template>
  <section
    class="comparison-section"
    aria-labelledby="comparison-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="comparison-title">
          Why AI Co-Founders?
        </h2>
        <p>The difference between a chatbot and a team</p>
      </header>

      <div class="comparison-table">
        <div class="comparison-header">
          <div class="header-cell feature-cell" />
          <div class="header-cell traditional">
            <div class="header-icon">
              <q-icon
                name="smart_toy"
                size="24px"
              />
            </div>
            <span>Traditional AI Chat</span>
          </div>
          <div class="header-cell cofounders">
            <div class="header-icon highlight">
              <q-icon
                name="groups"
                size="24px"
              />
            </div>
            <span>AI Co-Founders</span>
            <div class="recommended-badge">
              Recommended
            </div>
          </div>
        </div>

        <div
          v-for="(row, index) in comparisonRows"
          :key="row.feature"
          class="comparison-row"
          :class="{ 'alt': index % 2 === 0 }"
        >
          <div class="feature-cell">
            <q-icon
              :name="row.icon"
              size="20px"
            />
            <span>{{ row.feature }}</span>
          </div>
          <div class="value-cell traditional">
            <q-icon
              :name="row.traditional ? 'check_circle' : 'cancel'"
              :color="row.traditional ? 'positive' : 'grey-5'"
              size="20px"
            />
            <span v-if="typeof row.traditional === 'string'">{{ row.traditional }}</span>
          </div>
          <div class="value-cell cofounders">
            <q-icon
              name="check_circle"
              color="positive"
              size="20px"
            />
            <span v-if="typeof row.cofounders === 'string'">{{ row.cofounders }}</span>
          </div>
        </div>
      </div>

      <div class="comparison-cta">
        <p>Ready to upgrade from a chatbot to a full AI team?</p>
        <q-btn
          unelevated
          color="primary"
          size="lg"
          label="Meet Your Team"
          icon-right="arrow_forward"
          to="/pricing"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const comparisonRows = [
  {
    feature: 'Specialized Roles',
    icon: 'badge',
    traditional: false,
    cofounders: '6 specialized agents',
  },
  {
    feature: 'Knows Your Business',
    icon: 'psychology',
    traditional: false,
    cofounders: 'RAG-powered context',
  },
  {
    feature: 'Takes Action',
    icon: 'bolt',
    traditional: false,
    cofounders: 'PRs, blog posts, campaigns',
  },
  {
    feature: 'Human Approval',
    icon: 'verified_user',
    traditional: false,
    cofounders: 'Everything requires approval',
  },
  {
    feature: 'Proactive Suggestions',
    icon: 'lightbulb',
    traditional: false,
    cofounders: 'Hourly, daily, weekly',
  },
  {
    feature: 'GitHub Integration',
    icon: 'code',
    traditional: false,
    cofounders: 'Full PR/issue automation',
  },
  {
    feature: 'Context Sharing',
    icon: 'share',
    traditional: false,
    cofounders: 'Agents collaborate',
  },
  {
    feature: 'Chat Interface',
    icon: 'chat',
    traditional: true,
    cofounders: true,
  },
]
</script>

<style scoped lang="scss">
.comparison-section {
  padding: 100px 24px;
  background: var(--bg-subtle);
}

.section-container {
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;

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

.comparison-table {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  overflow: hidden;
}

.comparison-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 1px;
  background: var(--border-default);
  border-bottom: 1px solid var(--border-default);

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.header-cell {
  background: var(--bg-elevated);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;

  span {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  &.feature-cell {
    padding: 16px;
  }

  @media (max-width: 600px) {
    padding: 12px 8px;

    span {
      font-size: 0.75rem;
    }
  }
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);

  &.highlight {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(0, 212, 170, 0.15) 100%);
    color: var(--primary);
  }

  @media (max-width: 600px) {
    width: 40px;
    height: 40px;
  }
}

.recommended-badge {
  background: var(--primary);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.comparison-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 1px;
  background: var(--border-default);

  &.alt {
    .feature-cell,
    .value-cell {
      background: var(--bg-base);
    }
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.feature-cell {
  background: var(--bg-elevated);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  color: var(--text-primary);

  .q-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    padding: 12px 8px;
    font-size: 0.75rem;
    gap: 6px;

    .q-icon {
      display: none;
    }
  }
}

.value-cell {
  background: var(--bg-elevated);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  span {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  &.cofounders {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(0, 212, 170, 0.03) 100%);

    .q-icon {
      color: var(--primary) !important;
    }

    span {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  @media (max-width: 600px) {
    padding: 12px 8px;

    span {
      display: none;
    }
  }
}

.comparison-cta {
  text-align: center;
  margin-top: 48px;

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0 0 24px;
  }
}
</style>
