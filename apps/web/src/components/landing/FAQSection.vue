<template>
  <section
    class="faq-section"
    aria-labelledby="faq-title"
  >
    <div class="section-container">
      <header class="section-header">
        <h2 id="faq-title">
          {{ t('landing.faq.title') }}
        </h2>
        <p>{{ t('landing.faq.subtitle') }}</p>
      </header>

      <div class="faq-grid">
        <div class="faq-item">
          <h3>{{ t('landing.faq.items.free.question') }}</h3>
          <p>{{ t('landing.faq.items.free.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.included.question') }}</h3>
          <p>{{ t('landing.faq.items.included.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.referral.question') }}</h3>
          <p>{{ t('landing.faq.items.referral.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.aiDifference.question') }}</h3>
          <p>{{ t('landing.faq.items.aiDifference.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.customAgents.question') }}</h3>
          <p>{{ t('landing.faq.items.customAgents.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.apiKeys.question') }}</h3>
          <p>{{ t('landing.faq.items.apiKeys.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.subscription.question') }}</h3>
          <p>{{ t('landing.faq.items.subscription.answer') }}</p>
        </div>

        <div class="faq-item">
          <h3>{{ t('landing.faq.items.byok.question') }}</h3>
          <p>{{ t('landing.faq.items.byok.answer') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSeo } from '@/composables/useSeo'

const { t } = useI18n()
const { setFaqSeo } = useSeo()

// FAQ items for schema markup
const faqItems = computed(() => [
  {
    question: t('landing.faq.items.free.question'),
    answer: t('landing.faq.items.free.answer')
  },
  {
    question: t('landing.faq.items.included.question'),
    answer: t('landing.faq.items.included.answer')
  },
  {
    question: t('landing.faq.items.referral.question'),
    answer: t('landing.faq.items.referral.answer')
  },
  {
    question: t('landing.faq.items.aiDifference.question'),
    answer: t('landing.faq.items.aiDifference.answer')
  },
  {
    question: t('landing.faq.items.customAgents.question'),
    answer: t('landing.faq.items.customAgents.answer')
  },
  {
    question: t('landing.faq.items.apiKeys.question'),
    answer: t('landing.faq.items.apiKeys.answer')
  },
  {
    question: t('landing.faq.items.subscription.question'),
    answer: t('landing.faq.items.subscription.answer')
  },
  {
    question: t('landing.faq.items.byok.question'),
    answer: t('landing.faq.items.byok.answer')
  }
])

onMounted(() => {
  // Set FAQ structured data for SEO
  setFaqSeo(faqItems.value)
})
</script>

<style lang="scss" scoped>
.faq-section {
  padding: 100px 24px;
  background: var(--bg-base);
}

.section-container {
  max-width: 1000px;
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

.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.faq-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  padding: 28px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--primary);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  h3 {
    font-size: 1.0625rem;
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text-primary);
    line-height: 1.4;
  }

  p {
    font-size: 0.9375rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
}

// Light mode overrides
:global(.body--light) .faq-section {
  background: var(--bg-base) !important;
}

:global(.body--light) .section-header h2 {
  color: var(--text-primary) !important;
}

:global(.body--light) .section-header p {
  color: var(--text-secondary) !important;
}

:global(.body--light) .faq-item {
  background: var(--bg-elevated) !important;
}

:global(.body--light) .faq-item h3 {
  color: var(--text-primary) !important;
}

:global(.body--light) .faq-item p {
  color: var(--text-secondary) !important;
}
</style>


