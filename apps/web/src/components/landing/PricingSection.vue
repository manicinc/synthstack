<template>
  <section
    class="pricing-section"
    aria-labelledby="pricing-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="pricing-title">
          {{ t('landing.pricing.title') }}
        </h2>
        <p>{{ t('landing.pricing.subtitle') }}</p>
      </header>

      <div class="pricing-grid">
        <!-- Community Plan -->
        <div class="pricing-card">
          <h3>{{ t('landing.pricing.community.name') }}</h3>
          <div class="price">
            <span class="amount">{{ t('landing.pricing.community.price') }}</span>
            <span class="period">{{ t('landing.pricing.community.period') }}</span>
          </div>
          <p class="pricing-desc">
            {{ t('landing.pricing.community.description') }}
          </p>
          <ul class="features-list">
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.community.features.source') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.community.features.cms') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.community.features.billing') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.community.features.blog') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.community.features.crossPlatform') }}
            </li>
            <li class="disabled">
              <q-icon
                name="close"
                size="18px"
                color="negative"
              />
              {{ t('landing.pricing.community.features.noAgents') }}
            </li>
            <li class="disabled">
              <q-icon
                name="close"
                size="18px"
                color="negative"
              />
              {{ t('landing.pricing.community.features.noGithub') }}
            </li>
            <li class="disabled">
              <q-icon
                name="close"
                size="18px"
                color="negative"
              />
              {{ t('landing.pricing.community.features.noSuggestions') }}
            </li>
          </ul>
          <q-btn
            unelevated
            outline
            color="primary"
            :label="t('landing.pricing.community.cta')"
            class="full-width"
            href="https://github.com/manicinc/synthstack"
            target="_blank"
          />
        </div>

        <!-- Pro Plan (Featured) -->
        <div class="pricing-card featured">
          <div class="badge">
            {{ t('landing.pricing.pro.badge') }}
          </div>
          <h3>{{ t('landing.pricing.pro.name') }}</h3>
          <div class="price">
            <span class="amount">{{ t('landing.pricing.pro.price') }}</span>
            <span class="period">{{ t('landing.pricing.pro.period') }}</span>
          </div>
          <p class="pricing-desc">
            {{ t('landing.pricing.pro.description') }}
          </p>
          <ul class="features-list">
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.everything') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              <strong>{{ t('landing.pricing.pro.features.agents') }}</strong>
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.github') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.suggestions') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.rag') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.seoAudit') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.templates') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.support') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.pro.features.updates') }}
            </li>
          </ul>
          <q-btn
            unelevated
            color="primary"
            :label="t('landing.pricing.pro.cta')"
            class="full-width"
            to="/pricing"
          />
        </div>

        <!-- Enterprise Plan -->
        <div class="pricing-card">
          <h3>{{ t('landing.pricing.enterprise.name') }}</h3>
          <div class="price">
            <span class="amount">{{ t('landing.pricing.enterprise.price') }}</span>
          </div>
          <p class="pricing-desc">
            {{ t('landing.pricing.enterprise.description') }}
          </p>
          <ul class="features-list">
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.everything') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.whiteLabel') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.customAgents') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.sla') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.deployment') }}
            </li>
            <li>
              <q-icon
                name="check"
                size="18px"
                color="positive"
              />
              {{ t('landing.pricing.enterprise.features.training') }}
            </li>
          </ul>
          <q-btn
            unelevated
            outline
            color="primary"
            :label="t('landing.pricing.enterprise.cta')"
            class="full-width"
            href="mailto:enterprise@synthstack.io"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'

const { t } = useI18n()
const { setProductSeo } = useSeo()

onMounted(() => {
  // Add Product schema for the Pro plan (featured/main offering)
  setProductSeo({
    title: 'SynthStack Pro - Lifetime License',
    description: 'Complete SaaS boilerplate with AI agents, visual workflows, Directus CMS, and 50+ premium features. One-time payment, lifetime updates.',
    ogImage: '/og-image.png',
    price: 297,
    currency: 'USD',
    availability: 'InStock',
    brand: 'SynthStack by Manic Agency',
  })
})
</script>

<style lang="scss" scoped>
.pricing-section {
  padding: 100px 24px;
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(99, 102, 241, 0.03) 50%, var(--bg-base) 100%);
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  p {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin: 0;
  }
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: stretch;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
  }
}

.pricing-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }

  &.featured {
    background: linear-gradient(145deg, rgba(99, 102, 241, 0.1), var(--bg-elevated));
    border-color: var(--primary);
    transform: scale(1.02);

    &:hover {
      transform: scale(1.02) translateY(-4px);
    }

    @media (max-width: 900px) {
      transform: none;
      order: -1;

      &:hover {
        transform: translateY(-4px);
      }
    }
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, var(--primary), #818cf8);
    color: #fff;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.price {
  margin-bottom: 16px;

  .amount {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .period {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-left: 4px;
  }
}

.pricing-desc {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 24px;
  min-height: 48px;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    font-size: 0.9rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-subtle);

    &:last-child {
      border-bottom: none;
    }

    &.disabled {
      color: var(--text-tertiary);
      text-decoration: line-through;
      opacity: 0.7;
    }

    strong {
      color: var(--primary);
    }
  }
}

.full-width {
  width: 100%;
}

// Light mode overrides
:global(.body--light) .pricing-section {
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(99, 102, 241, 0.03) 50%, var(--bg-base) 100%) !important;
}

:global(.body--light) .section-header h2 {
  color: var(--text-primary) !important;
}

:global(.body--light) .section-header p {
  color: var(--text-secondary) !important;
}

:global(.body--light) .pricing-card {
  background: var(--bg-elevated) !important;
}

:global(.body--light) .pricing-card.featured {
  background: linear-gradient(145deg, rgba(99, 102, 241, 0.08), var(--bg-elevated)) !important;
}

:global(.body--light) .pricing-card h3 {
  color: var(--text-primary) !important;
}

:global(.body--light) .price .amount {
  color: var(--text-primary) !important;
}

:global(.body--light) .features-list li {
  color: var(--text-primary) !important;
}
</style>


