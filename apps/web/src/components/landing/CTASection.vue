<template>
  <section
    class="cta-section"
    aria-labelledby="cta-title"
  >
    <div class="cta-content">
      <h2 id="cta-title">
        {{ t('landing.cta.title') }}
      </h2>
      <p>{{ t('landing.cta.subtitle') }}</p>
      <div class="cta-buttons">
        <q-btn
          unelevated
          color="primary"
          size="lg"
          :label="t('landing.cta.primary')"
          icon-right="rocket_launch"
          href="https://github.com/manicinc/synthstack"
          target="_blank"
          @click="trackGitHubClick"
        />
        <q-btn
          flat
          size="lg"
          :label="t('landing.cta.secondary')"
          icon="auto_awesome"
          to="/pricing"
          @click="trackPricingClick"
        />
      </div>
      <p class="cta-note">
        {{ t('landing.cta.note') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { analyticsEvents } from '@/boot/analytics'

const { t } = useI18n()

function trackGitHubClick() {
  analyticsEvents.selectContent('cta_section', 'github_link')
}

function trackPricingClick() {
  analyticsEvents.selectContent('cta_section', 'pricing_action')
}
</script>

<style lang="scss" scoped>
.cta-section {
  padding: 120px 24px;
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(99, 102, 241, 0.08) 50%,
    var(--bg-base) 100%
  );
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 25% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 75% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
}

.cta-content {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;

  h2 {
    font-size: 2.75rem;
    font-weight: 800;
    margin: 0 0 20px;
    background: linear-gradient(135deg, var(--text-primary) 0%, var(--primary) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;

    @media (max-width: 600px) {
      font-size: 2rem;
    }
  }

  p {
    font-size: 1.25rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 32px;

    @media (max-width: 600px) {
      font-size: 1.0625rem;
    }
  }
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;

  .q-btn {
    min-width: 180px;
  }
}

.cta-note {
  font-size: 0.9rem !important;
  color: var(--text-tertiary) !important;
  margin: 0 !important;
}

// Light mode overrides
:global(.body--light) .cta-section {
  background: linear-gradient(
    180deg,
    var(--bg-base) 0%,
    rgba(99, 102, 241, 0.05) 50%,
    var(--bg-base) 100%
  ) !important;
}

:global(.body--light) .cta-section::before {
  background-image:
    radial-gradient(circle at 25% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 75% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%) !important;
}

:global(.body--light) .cta-content h2 {
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  color: var(--text-primary) !important;
}

:global(.body--light) .cta-content p {
  color: var(--text-secondary) !important;
}

:global(.body--light) .cta-buttons .q-btn--flat {
  color: var(--text-primary) !important;
}
</style>
