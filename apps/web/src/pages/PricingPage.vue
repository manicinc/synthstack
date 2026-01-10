<template>
  <q-page class="pricing-page">
    <!-- Hero -->
    <section class="pricing-hero">
      <div class="hero-content">
        <h1>Simple, Transparent Pricing</h1>
        <p>Start free, upgrade when you need more</p>
      </div>
    </section>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <q-spinner-dots
        size="40px"
        color="primary"
      />
      <p>Loading pricing...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-container"
    >
      <q-icon
        name="error_outline"
        size="48px"
        color="negative"
      />
      <p>{{ error }}</p>
      <q-btn
        color="primary"
        label="Retry"
        @click="fetchPricing"
      />
    </div>

    <!-- Pricing Cards -->
    <template v-else>
      <!-- Billing Toggle -->
      <div class="billing-toggle-container">
        <div class="billing-toggle">
          <span :class="{ active: !isYearly }">Monthly</span>
          <q-toggle
            v-model="isYearly"
            color="primary"
          />
          <span :class="{ active: isYearly }">
            Yearly
            <q-badge
              color="positive"
              label="Save 17%"
              class="save-badge"
            />
          </span>
        </div>
      </div>

      <section class="pricing-section">
        <div class="pricing-grid">
          <div
            v-for="tier in tiers"
            :key="tier.id"
            class="pricing-card"
            :class="{
              featured: tier.isFeatured,
              enterprise: tier.isEnterprise,
              free: tier.priceMonthly === 0
            }"
          >
            <div
              v-if="tier.badge"
              class="card-badge"
            >
              {{ tier.badge }}
            </div>
            <div class="card-header">
              <h3>{{ tier.name }}</h3>
              <p class="tier-description">
                {{ tier.description }}
              </p>
              <div
                v-if="!tier.isEnterprise"
                class="price"
              >
                <span class="amount">{{ formatPrice(isYearly && tier.priceYearly ? tier.priceYearly / 12 : tier.priceMonthly) }}</span>
                <span class="period">/month</span>
              </div>
              <div
                v-else
                class="price enterprise-price"
              >
                <span class="amount-text">{{ tier.priceDisplay || 'Custom Pricing' }}</span>
              </div>
              <p
                v-if="isYearly && tier.priceYearly && !tier.isEnterprise && tier.priceMonthly !== 0"
                class="billed-note"
              >
                Billed {{ formatPrice(tier.priceYearly) }}/year
              </p>
            </div>
            <div class="card-features">
              <p
                v-if="tier.creditsIncluded"
                class="feature-highlight"
              >
                <q-icon
                  name="bolt"
                  color="warning"
                />
                <strong>{{ tier.creditsIncluded }}</strong>
              </p>
              <ul>
                <li
                  v-for="(feature, idx) in tier.features"
                  :key="idx"
                >
                  <q-icon
                    :name="feature.startsWith('-') ? 'close' : 'check'"
                    :color="feature.startsWith('-') ? 'grey' : 'positive'"
                  />
                  {{ feature.startsWith('-') ? feature.slice(1).trim() : feature }}
                </li>
              </ul>
            </div>
            <div class="card-action">
              <q-btn
                :color="tier.ctaStyle === 'outline' ? undefined : 'primary'"
                :outline="tier.ctaStyle === 'outline'"
                :label="tier.ctaLabel"
                class="full-width"
                @click="handleCta(tier)"
              />
              <p
                v-if="tier.priceMonthly === 0"
                class="action-note"
              >
                No credit card required
              </p>
              <p
                v-else-if="tier.isEnterprise"
                class="action-note"
              >
                Let's discuss your needs
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Feature Comparison -->
      <section
        v-if="tiers.length > 0"
        class="comparison-section"
      >
        <div class="section-container">
          <h2>Compare Plans</h2>
          <div class="comparison-table-wrapper">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    {{ tier.name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>AI Credits</td>
                  <td
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    {{ tier.creditsIncluded || (tier.creditsMonthly === null ? 'Unlimited' : tier.creditsMonthly + '/mo') }}
                  </td>
                </tr>
                <tr>
                  <td>Projects</td>
                  <td
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    {{ tier.isEnterprise ? 'Unlimited' : (tier.isFeatured ? 'Unlimited' : '3') }}
                  </td>
                </tr>
                <tr>
                  <td>Team Members</td>
                  <td
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    {{ tier.isEnterprise ? 'Unlimited' : (tier.isFeatured ? 'Up to 10' : '1') }}
                  </td>
                </tr>
                <tr>
                  <td>
                    BYOK (Bring Your Own Keys)
                    <q-icon
                      name="info_outline"
                      size="14px"
                      class="q-ml-xs cursor-pointer"
                    >
                      <q-tooltip max-width="300px">
                        Use your own API keys from OpenAI and Anthropic to save money and bypass rate limits
                      </q-tooltip>
                    </q-icon>
                  </td>
                  <td
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    <span v-if="tier.isFeatured || tier.isEnterprise">
                      <q-icon
                        name="check_circle"
                        color="positive"
                        size="20px"
                      />
                    </span>
                    <span v-else>
                      <q-icon
                        name="cancel"
                        color="grey-5"
                        size="20px"
                      />
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Support</td>
                  <td
                    v-for="tier in tiers"
                    :key="tier.id"
                  >
                    {{ tier.isEnterprise ? 'Dedicated' : (tier.isFeatured ? 'Email' : 'Community') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <!-- FAQ -->
    <section class="faq-section">
      <div class="section-container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-grid">
          <div class="faq-item">
            <h4>What are AI credits?</h4>
            <p>
              AI credits are used for AI-powered features like chat messages, agent interactions,
              and content generation. Free users get 3 generations per day (90/month).
            </p>
          </div>
          <div class="faq-item">
            <h4>Can I upgrade or downgrade anytime?</h4>
            <p>
              Yes! You can change your plan at any time. Upgrades take effect immediately,
              and downgrades apply at the end of your billing period.
            </p>
          </div>
          <div class="faq-item">
            <h4>Is there a free trial?</h4>
            <p>
              Yes, the Pro plan includes a 14-day free trial. You can also start with the
              Free plan with no credit card required.
            </p>
          </div>
          <div class="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>
              We accept all major credit cards, Apple Pay, and Google Pay through our
              secure Stripe payment integration.
            </p>
          </div>
          <div class="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>
              Yes, subscriptions can be cancelled at any time. You'll retain access until
              the end of your billing period.
            </p>
          </div>
          <div class="faq-item">
            <h4>Is there a refund policy?</h4>
            <p>
              We offer a 30-day money-back guarantee for first-time subscribers.
              If you're not satisfied, contact us for a full refund.
            </p>
          </div>
          <div class="faq-item">
            <h4>What is BYOK (Bring Your Own Keys)?</h4>
            <p>
              BYOK allows Premium and Enterprise users to use their own API keys from OpenAI
              and Anthropic instead of consuming SynthStack credits. This can save money at scale
              and provides unlimited usage. <router-link to="/faq">Learn more</router-link>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>Ready to get started?</h2>
        <p>Start building with AI-powered tools today. No credit card required.</p>
        <q-btn
          color="white"
          text-color="primary"
          size="lg"
          label="Get Started Free"
          to="/auth/register"
        />
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pricing, type PricingTier } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { analyticsEvents } from '@/boot/analytics'

const router = useRouter()
const isYearly = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const tiers = ref<PricingTier[]>([])

function formatPrice(amount: number | null): string {
  if (amount === null) return 'Custom'
  if (amount === 0) return '$0'
  return `$${amount.toLocaleString()}`
}

function handleCta(tier: PricingTier) {
  // Track plan selection
  const price = isYearly.value && tier.priceYearly ? tier.priceYearly / 12 : tier.priceMonthly || 0
  analyticsEvents.selectPlan(tier.name, price)

  if (tier.ctaUrl) {
    if (tier.ctaUrl.startsWith('http')) {
      window.open(tier.ctaUrl, '_blank')
    } else {
      router.push(tier.ctaUrl)
    }
    return
  }

  // Default behavior based on tier type
  if (tier.isEnterprise) {
    router.push('/contact')
  } else if (tier.priceMonthly === 0) {
    router.push('/auth/register')
  } else {
    const priceId = isYearly.value ? tier.stripePriceIdYearly : tier.stripePriceIdMonthly
    if (priceId) {
      // Track checkout initiation
      analyticsEvents.beginCheckout(tier.name, price)
      router.push({ path: '/app', query: { subscribe: tier.slug, yearly: isYearly.value ? '1' : '0' } })
    } else {
      router.push('/auth/register')
    }
  }
}

async function fetchPricing() {
  loading.value = true
  error.value = null

  try {
    tiers.value = await pricing.list()
  } catch (e: unknown) {
    logError('Failed to fetch pricing:', e)
    error.value = 'Failed to load pricing. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPricing()

  // Track pricing view
  analyticsEvents.viewPricing()
})
</script>

<style lang="scss" scoped>
.pricing-page {
  --section-padding: 80px 24px;
}

.pricing-hero {
  padding: 120px 24px 40px;
  text-align: center;
  background: linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-primary));

  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }

  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;

  p {
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.billing-toggle-container {
  text-align: center;
  margin: 40px 0 20px;
}

.billing-toggle {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--color-bg-tertiary);
  border-radius: 100px;

  span {
    font-size: 0.9rem;
    color: var(--color-text-muted);

    &.active {
      color: var(--color-text-primary);
      font-weight: 600;
    }
  }

  .save-badge {
    margin-left: 6px;
  }
}

.pricing-section {
  padding: var(--section-padding);
  padding-top: 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: start;
}

.pricing-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 32px;
  position: relative;

  &.featured {
    border-color: var(--q-primary);
    box-shadow: 0 0 0 1px var(--q-primary), 0 8px 32px rgba(99, 102, 241, 0.15);
    transform: scale(1.02);
  }

  .card-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--q-primary);
    color: white;
    padding: 4px 16px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }
}

.card-header {
  text-align: center;
  margin-bottom: 24px;

  h3 {
    margin: 0 0 8px;
    font-size: 1.5rem;
  }

  .tier-description {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin: 0 0 16px;
  }

  .price {
    .amount {
      font-size: 3rem;
      font-weight: 700;
    }

    .period {
      font-size: 1rem;
      color: var(--color-text-muted);
    }

    &.enterprise-price {
      .amount-text {
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--q-primary);
      }
    }
  }

  .billed-note {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: 8px 0 0;
  }
}

.card-features {
  margin-bottom: 24px;
  min-height: 200px;

  .feature-highlight {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 0.9rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
      font-size: 0.9rem;
      color: var(--color-text-secondary);

      .q-icon {
        font-size: 18px;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }
  }
}

.card-action {
  text-align: center;

  .action-note {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin: 8px 0 0;
  }
}

.comparison-section {
  padding: var(--section-padding);
  background: var(--color-bg-secondary);

  h2 {
    text-align: center;
    margin: 0 0 40px;
    font-size: 2rem;
  }
}

.section-container {
  max-width: 1000px;
  margin: 0 auto;
}

.comparison-table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 16px 24px;
    text-align: center;
    border-bottom: 1px solid var(--color-border);
  }

  th {
    background: var(--color-bg-tertiary);
    font-weight: 600;
    font-size: 1rem;

    &:first-child {
      text-align: left;
    }
  }

  td {
    font-size: 0.9rem;

    &:first-child {
      text-align: left;
      font-weight: 500;
    }
  }
}

.faq-section {
  padding: var(--section-padding);

  h2 {
    text-align: center;
    margin: 0 0 48px;
    font-size: 2rem;
  }
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.faq-item {
  h4 {
    margin: 0 0 12px;
    font-size: 1rem;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }
}

.cta-section {
  padding: var(--section-padding);
  background: linear-gradient(135deg, var(--q-primary), #14b8a6);
  text-align: center;
  color: white;

  h2 {
    margin: 0 0 12px;
    font-size: 2rem;
  }

  p {
    margin: 0 0 28px;
    opacity: 0.9;
    font-size: 1.1rem;
  }
}

@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
  }

  .pricing-card.featured {
    transform: none;
    order: -1;
  }

  .faq-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .pricing-hero h1 {
    font-size: 2rem;
  }

  .faq-grid {
    grid-template-columns: 1fr;
  }

  .card-header .price .amount {
    font-size: 2.5rem;
  }
}
</style>
