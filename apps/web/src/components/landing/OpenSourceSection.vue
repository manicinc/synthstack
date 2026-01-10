<template>
  <section
    class="opensource-section"
    aria-labelledby="opensource-title"
  >
    <div class="section-container">
      <div class="opensource-card">
        <div class="opensource-badge">
          <q-icon
            name="favorite"
            size="16px"
          />
          {{ t('landing.opensource.badge') }}
        </div>
        <h2 id="opensource-title">
          {{ t('landing.opensource.title') }}
        </h2>
        <p class="opensource-description">
          {{ t('landing.opensource.description') }}
        </p>

        <div class="opensource-features">
          <div class="feature-pill highlight">
            <q-icon
              name="palette"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.themes') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="credit_card"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.payments') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="autorenew"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.subscriptions') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="article"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.blog') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="storage"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.cms') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="email"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.email') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="devices"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.crossPlatform') }}</span>
          </div>
          <div class="feature-pill">
            <q-icon
              name="code"
              size="18px"
            />
            <span>{{ t('landing.opensource.features.license') }}</span>
          </div>
        </div>

        <div class="opensource-cta">
          <a
            href="https://github.com/manicinc/synthstack"
            target="_blank"
            class="github-button"
          >
            <div class="github-icon">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div class="github-content">
              <span class="github-label">{{ t('landing.opensource.github.label') }}</span>
              <span class="github-repo">manicinc/synthstack</span>
            </div>
            <div class="github-stats">
              <div class="stat">
                <q-icon
                  name="star"
                  size="14px"
                />
                <span>{{ githubStats.stars }}</span>
              </div>
              <div class="stat">
                <q-icon
                  name="call_split"
                  size="14px"
                />
                <span>{{ githubStats.forks }}</span>
              </div>
            </div>
          </a>
        </div>

        <p class="opensource-note">
          <q-icon
            name="auto_awesome"
            size="16px"
          />
          {{ t('landing.opensource.note') }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// GitHub stats (would typically be fetched from API)
const githubStats = reactive({
  stars: '2.4k',
  forks: '312'
})
</script>

<style lang="scss" scoped>
.opensource-section {
  padding: 80px 24px;
  background: var(--bg-base);
}

.section-container {
  max-width: 900px;
  margin: 0 auto;
}

.opensource-card {
  background: linear-gradient(145deg, rgba(99, 102, 241, 0.05), transparent);
  border: 1px solid var(--border-default);
  border-radius: 24px;
  padding: 48px;
  text-align: center;

  @media (max-width: 600px) {
    padding: 32px 20px;
  }
}

.opensource-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 24px;

  .q-icon { color: #f87171; }
}

h2 {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.opensource-description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 32px;
}

.opensource-features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  padding: 10px 18px;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }

  &.highlight {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
    border-color: rgba(99, 102, 241, 0.3);

    .q-icon { color: #818cf8; }
  }

  .q-icon { color: var(--text-secondary); }
}

.opensource-cta {
  margin-bottom: 24px;
}

.github-button {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(145deg, #1f2937, #111827);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 24px;
  text-decoration: none;
  color: #f9fafb;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 500px) {
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    width: 100%;
  }
}

.github-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.github-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;

  .github-label {
    font-size: 0.75rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .github-repo {
    font-size: 1rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }
}

.github-stats {
  display: flex;
  gap: 16px;

  .stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9rem;
    color: #d1d5db;

    .q-icon { color: #fbbf24; }
  }
}

.opensource-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;

  .q-icon { color: #fbbf24; }
}

// Light mode overrides
:global(.body--light) .opensource-card {
  background: linear-gradient(145deg, rgba(99, 102, 241, 0.03), transparent) !important;
}

:global(.body--light) h2 {
  color: var(--text-primary) !important;
}

:global(.body--light) .opensource-description {
  color: var(--text-secondary) !important;
}

:global(.body--light) .feature-pill {
  background: var(--bg-subtle) !important;
  color: var(--text-primary) !important;
}

:global(.body--light) .github-button {
  background: linear-gradient(145deg, #f3f4f6, #e5e7eb) !important;
  color: #111827 !important;
  border-color: #d1d5db !important;
}

:global(.body--light) .github-icon {
  background: rgba(0, 0, 0, 0.08) !important;
}

:global(.body--light) .github-content .github-label {
  color: #6b7280 !important;
}

:global(.body--light) .github-content .github-repo {
  color: #111827 !important;
}

:global(.body--light) .github-stats .stat {
  color: #374151 !important;
}
</style>


