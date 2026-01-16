<template>
  <q-page class="subscription-page">
    <div class="page-header">
      <h1>Subscription</h1>
      <p>Manage your plan and billing</p>
    </div>

    <!-- Current Plan -->
    <q-card class="current-plan-card">
      <q-card-section>
        <div class="plan-header">
          <div class="plan-info">
            <div class="plan-badge">
              <q-badge
                :color="planColor"
                size="lg"
              >
                {{ currentPlan.name }}
              </q-badge>
            </div>
            <h2>{{ currentPlan.displayName }}</h2>
            <p>{{ currentPlan.description }}</p>
          </div>
          <div class="plan-price">
            <span class="price">${{ currentPlan.price }}</span>
            <span class="period">/ month</span>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <h4>Usage This Month</h4>
        <div class="usage-grid">
          <div class="usage-item">
            <div class="usage-label">
              Generations
            </div>
            <q-linear-progress
              :value="usage.generations / currentPlan.limits.generations"
              color="primary"
              class="usage-bar"
            />
            <div class="usage-text">
              {{ usage.generations }} / {{ currentPlan.limits.generations }}
            </div>
          </div>
          <div class="usage-item">
            <div class="usage-label">
              Downloads
            </div>
            <q-linear-progress
              :value="usage.downloads / currentPlan.limits.downloads"
              color="secondary"
              class="usage-bar"
            />
            <div class="usage-text">
              {{ usage.downloads }} / {{ currentPlan.limits.downloads }}
            </div>
          </div>
          <div class="usage-item">
            <div class="usage-label">
              Storage
            </div>
            <q-linear-progress
              :value="usage.storage / currentPlan.limits.storage"
              color="accent"
              class="usage-bar"
            />
            <div class="usage-text">
              {{ usage.storage }} MB / {{ currentPlan.limits.storage }} MB
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Available Plans -->
    <h3 class="section-title">
      Available Plans
    </h3>
    <div class="plans-grid">
      <q-card
        v-for="plan in plans"
        :key="plan.id"
        :class="['plan-card', { 'current': plan.id === currentPlan.id, 'popular': plan.popular }]"
      >
        <div
          v-if="plan.popular"
          class="popular-badge"
        >
          Most Popular
        </div>
        <q-card-section>
          <h4>{{ plan.displayName }}</h4>
          <div class="plan-price-tag">
            <span class="price">${{ plan.price }}</span>
            <span class="period">/ month</span>
          </div>
          <p class="plan-description">
            {{ plan.description }}
          </p>
        </q-card-section>

        <q-card-section>
          <ul class="features-list">
            <li
              v-for="feature in plan.features"
              :key="feature"
            >
              <q-icon
                name="check"
                color="positive"
                size="18px"
              />
              {{ feature }}
            </li>
          </ul>
        </q-card-section>

        <q-card-actions>
          <q-btn
            v-if="plan.id === currentPlan.id"
            disable
            label="Current Plan"
            class="full-width"
          />
          <q-btn
            v-else
            :color="plan.id === 'pro' ? 'primary' : 'grey-7'"
            :outline="plan.id !== 'pro'"
            :label="plan.price > currentPlan.price ? 'Upgrade' : 'Downgrade'"
            class="full-width"
            @click="selectPlan(plan)"
          />
        </q-card-actions>
      </q-card>
    </div>

    <!-- Billing History -->
    <q-card class="billing-card">
      <q-card-section>
        <div class="billing-header">
          <h3>Billing History</h3>
          <q-btn
            flat
            color="primary"
            label="Download All"
            icon="download"
          />
        </div>
        <q-list separator>
          <q-item
            v-for="invoice in invoices"
            :key="invoice.id"
          >
            <q-item-section>
              <q-item-label>{{ invoice.description }}</q-item-label>
              <q-item-label caption>
                {{ invoice.date }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>${{ invoice.amount }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                icon="receipt"
                size="sm"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const currentPlan = ref({
  id: 'pro',
  name: 'PRO',
  displayName: 'Pro Plan',
  description: 'For growing teams building with SynthStack',
  price: 19,
  limits: {
    generations: 100,
    downloads: 200,
    storage: 1000
  }
})

const usage = ref({
  generations: 47,
  downloads: 89,
  storage: 342
})

const planColor = computed(() => {
  const colors: Record<string, string> = {
    free: 'grey',
    pro: 'primary',
    enterprise: 'purple'
  }
  return colors[currentPlan.value.id] || 'grey'
})

const plans = ref([
  {
    id: 'free',
    displayName: 'Free',
    price: 0,
    description: 'Get started with basic features',
    popular: false,
    features: [
      'Daily AI credits',
      'Public docs + templates',
      'Single workspace',
      'Community support'
    ]
  },
  {
    id: 'pro',
    displayName: 'Pro',
    price: 19,
    description: 'For serious builders',
    popular: true,
    features: [
      'Higher daily credits',
      'AI agents + Strategy Debates',
      'RAG Copilot (knowledge base)',
      'API access',
      'Priority support',
      'Team collaboration'
    ]
  },
  {
    id: 'enterprise',
    displayName: 'Enterprise',
    price: 49,
    description: 'For teams and businesses',
    popular: false,
    features: [
      'Custom limits',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'Team management'
    ]
  }
])

const invoices = ref([
  { id: '1', description: 'Pro Plan - December 2024', date: 'Dec 1, 2024', amount: '19.00' },
  { id: '2', description: 'Pro Plan - November 2024', date: 'Nov 1, 2024', amount: '19.00' },
  { id: '3', description: 'Pro Plan - October 2024', date: 'Oct 1, 2024', amount: '19.00' }
])

function selectPlan(plan: any) {
  $q.dialog({
    title: `${plan.price > currentPlan.value.price ? 'Upgrade' : 'Change'} to ${plan.displayName}`,
    message: `Your new plan will be $${plan.price}/month. Changes take effect immediately.`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    $q.notify({ type: 'positive', message: `Switched to ${plan.displayName} plan!` })
  })
}
</script>

<style lang="scss" scoped>
.subscription-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
  }
}

.current-plan-card {
  margin-bottom: 32px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  h2 {
    font-size: 1.5rem;
    margin: 8px 0 4px;
  }
  
  p {
    color: var(--text-secondary);
    margin: 0;
  }
}

.plan-price {
  text-align: right;
  
  .price {
    font-size: 2.5rem;
    font-weight: 700;
    font-family: var(--font-display);
  }
  
  .period {
    color: var(--text-secondary);
  }
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 16px;
}

.usage-item {
  .usage-label {
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .usage-bar {
    margin-bottom: 4px;
  }
  
  .usage-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

.section-title {
  margin-bottom: 16px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.plan-card {
  position: relative;
  
  &.popular {
    border: 2px solid var(--q-primary);
  }
  
  &.current {
    opacity: 0.7;
  }
  
  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--q-primary);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  h4 {
    font-size: 1.25rem;
    margin-bottom: 8px;
  }
  
  .plan-price-tag {
    margin-bottom: 8px;
    
    .price {
      font-size: 2rem;
      font-weight: 700;
    }
    
    .period {
      color: var(--text-secondary);
    }
  }
  
  .plan-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0;
  }
  
  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
    }
  }
}

.billing-card {
  .billing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h3 {
      margin: 0;
    }
  }
}

@media (max-width: 900px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .usage-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .subscription-page {
    padding: 16px;
  }
  
  .plan-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .plan-price {
    text-align: left;
  }
}
</style>
