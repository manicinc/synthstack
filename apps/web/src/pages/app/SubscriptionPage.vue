<template>
  <q-page class="subscription-page">
    <div class="page-header">
      <div class="row items-start justify-between q-col-gutter-md">
        <div class="col-12 col-md">
          <h1 class="text-h4 q-mb-xs">
            Subscription
          </h1>
          <div class="text-subtitle2 text-grey-6">
            Manage your plan and billing
          </div>
        </div>
        <div class="col-12 col-md-auto">
          <div class="row items-center q-gutter-sm">
            <span class="text-caption text-grey-7">Monthly</span>
            <q-toggle
              v-model="isYearly"
              color="primary"
              aria-label="Toggle between monthly and yearly billing"
            />
            <span class="text-caption text-grey-7">Yearly</span>
          </div>
        </div>
      </div>
    </div>

    <q-banner
      v-if="checkoutError"
      dense
      class="q-mb-md"
      rounded
      inline-actions
    >
      <template #avatar>
        <q-icon
          name="error"
          color="negative"
        />
      </template>
      {{ checkoutError }}
      <template #action>
        <q-btn
          flat
          color="primary"
          label="Dismiss"
          @click="checkoutError = null"
        />
      </template>
    </q-banner>

    <!-- Current Subscription -->
    <q-card
      flat
      bordered
      class="current-plan-card"
    >
      <q-card-section>
        <div class="row items-start justify-between q-col-gutter-md">
          <div class="col-12 col-md">
            <div class="row items-center q-gutter-sm q-mb-sm">
              <q-badge
                :color="planColor"
                class="text-uppercase"
              >
                {{ currentTierLabel }}
              </q-badge>
              <q-chip
                v-if="subscription?.status"
                dense
                :color="subscription.status === 'active' ? 'positive' : 'grey-7'"
                text-color="white"
              >
                {{ subscription.status }}
              </q-chip>
              <q-chip
                v-if="subscription?.billing?.cancelAtPeriodEnd"
                dense
                color="warning"
                text-color="white"
                icon="event_busy"
              >
                Cancels at period end
              </q-chip>
            </div>

            <div class="text-h6">
              {{ subscription?.plan?.name || currentTierLabel }}
            </div>
            <div class="text-body2 text-grey-7">
              {{ subscription?.plan?.description || 'Manage your subscription and credits.' }}
            </div>
          </div>

          <div class="col-12 col-md-auto">
            <div class="plan-price">
              <div class="text-h4">
                {{ currentPriceDisplay }}
              </div>
              <div class="text-caption text-grey-6">
                {{ isYearly ? 'per year' : 'per month' }}
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-6">
              Credits remaining
            </div>
            <div class="text-h5 text-primary">
              {{ creditsRemaining }}
            </div>
            <div
              v-if="subscription?.credits?.resetsAt"
              class="text-caption text-grey-6"
            >
              Resets {{ formatDate(subscription.credits.resetsAt) }}
            </div>
          </div>

          <div class="col-12 col-md-8">
            <div
              v-if="authStats"
              class="q-mt-xs"
            >
              <div class="row justify-between text-caption text-grey-6">
                <span>Generations this month</span>
                <span>{{ authStats.generationsThisMonth }} / {{ authStats.generationsLimit }}</span>
              </div>
              <q-linear-progress
                :value="authStats.generationsLimit > 0 ? Math.min(1, authStats.generationsThisMonth / authStats.generationsLimit) : 0"
                color="primary"
                class="q-mt-sm"
              />
            </div>
            <div
              v-else
              class="text-caption text-grey-6 q-mt-sm"
            >
              Usage stats unavailable.
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          outline
          color="primary"
          icon="open_in_new"
          label="Billing Portal"
          :loading="portalLoading"
          :disable="!canOpenPortal"
          @click="openPortal"
        />
      </q-card-actions>
    </q-card>

    <!-- Available Plans -->
    <div class="row items-center justify-between q-mt-lg q-mb-sm">
      <div class="text-h6">
        Available Plans
      </div>
      <q-btn
        flat
        color="primary"
        icon="refresh"
        label="Refresh"
        :loading="loading"
        @click="loadAll"
      />
    </div>

    <div
      v-if="loading"
      class="row justify-center q-my-xl"
    >
      <q-spinner-dots
        size="40px"
        color="primary"
      />
    </div>

    <q-banner
      v-else-if="error"
      dense
      class="q-mb-md"
      rounded
    >
      <template #avatar>
        <q-icon
          name="error_outline"
          color="negative"
        />
      </template>
      {{ error }}
    </q-banner>

    <div
      v-else
      class="plans-grid"
    >
      <q-card
        v-for="tier in tiers"
        :key="tier.id"
        flat
        bordered
        :class="['plan-card', { current: isCurrentTier(tier.slug), featured: tier.isFeatured }]"
      >
        <q-card-section>
          <div class="row items-center justify-between q-mb-xs">
            <div class="text-subtitle1">
              {{ tier.name }}
            </div>
            <q-badge
              v-if="tier.badge"
              :color="tier.badgeColor || (tier.isFeatured ? 'primary' : 'grey-7')"
            >
              {{ tier.badge }}
            </q-badge>
          </div>
          <div class="text-body2 text-grey-7 q-mb-sm">
            {{ tier.description }}
          </div>
          <div class="text-h5">
            {{ tierPriceLabel(tier) }}
          </div>
          <div
            v-if="tier.priceYearly && isYearly && !tier.isEnterprise"
            class="text-caption text-grey-6"
          >
            Billed {{ formatPrice(tier.priceYearly) }}/year
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <ul class="features-list">
            <li
              v-for="(feature, idx) in tier.features"
              :key="idx"
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
            v-if="isCurrentTier(tier.slug)"
            disable
            label="Current Plan"
            class="full-width"
          />
          <q-btn
            v-else
            :color="tier.isFeatured ? 'primary' : 'grey-7'"
            :outline="!tier.isFeatured"
            class="full-width"
            :label="tier.isEnterprise ? (tier.ctaLabel || 'Contact') : 'Choose Plan'"
            :loading="checkoutLoading && checkoutTier === tier.slug"
            @click="selectTier(tier)"
          />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { billing, pricing, type PricingTier, type Subscription } from '@/services/api'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user, stats: authStats } = storeToRefs(authStore)

const isYearly = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)

const subscription = ref<Subscription | null>(null)
const tiers = ref<PricingTier[]>([])

const portalLoading = ref(false)
const checkoutLoading = ref(false)
const checkoutTier = ref<string | null>(null)
const checkoutError = ref<string | null>(null)
const autoCheckoutStarted = ref(false)

const creditsRemaining = computed(() => subscription.value?.credits?.remaining ?? user.value?.credits ?? 0)

const currentTierLabel = computed(() => {
  const tier = subscription.value?.tier || user.value?.subscription_tier || user.value?.plan || 'free'
  if (tier === 'maker') return 'Maker'
  if (tier === 'pro') return 'Pro'
  if (tier === 'agency' || tier === 'unlimited') return 'Agency'
  return 'Free'
})

const planColor = computed(() => {
  const tier = subscription.value?.tier || user.value?.subscription_tier || user.value?.plan || 'free'
  if (tier === 'pro') return 'primary'
  if (tier === 'maker') return 'secondary'
  if (tier === 'agency' || tier === 'unlimited') return 'purple'
  return 'grey'
})

const currentPriceDisplay = computed(() => {
  if (!subscription.value?.plan) return '$0'
  const raw = isYearly.value ? subscription.value.plan.priceYearly : subscription.value.plan.priceMonthly
  if (raw === null || raw === undefined) return '—'
  return raw === 0 ? '$0' : `$${raw}`
})

const canOpenPortal = computed(() => Boolean(subscription.value?.billing?.stripeCustomerId))

function isCurrentTier(slug: string): boolean {
  const current = (subscription.value?.tier || user.value?.subscription_tier || user.value?.plan || 'free').toLowerCase()
  // Legacy mapping
  if (current === 'unlimited' && slug === 'agency') return true
  if (current === 'agency' && slug === 'unlimited') return true
  return slug.toLowerCase() === current
}

function formatPrice(amount: number | null): string {
  if (amount === null) return 'Custom'
  if (amount === 0) return '$0'
  return `$${amount.toLocaleString()}`
}

function tierPriceLabel(tier: PricingTier): string {
  if (tier.isEnterprise) return tier.priceDisplay || 'Custom'
  const price = isYearly.value && tier.priceYearly ? tier.priceYearly : tier.priceMonthly
  return price === null ? (tier.priceDisplay || 'Custom') : formatPrice(price) + (tier.priceMonthly === 0 ? '' : isYearly.value ? '/yr' : '/mo')
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function asCheckoutTier(slug: string): 'maker' | 'pro' | 'agency' | 'unlimited' | null {
  const normalized = slug.toLowerCase()
  if (normalized === 'maker' || normalized === 'pro' || normalized === 'agency' || normalized === 'unlimited') {
    return normalized as any
  }
  return null
}

async function openPortal() {
  portalLoading.value = true
  try {
    const result = await billing.createPortal()
    if (result?.portalUrl) {
      window.open(result.portalUrl, '_blank')
      return
    }
    throw new Error('Portal URL missing')
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message || 'Failed to open billing portal' })
  } finally {
    portalLoading.value = false
  }
}

async function beginCheckout(tierSlug: string) {
  if (!authStore.accessToken) {
    $q.notify({ type: 'info', message: 'Please sign in to subscribe.' })
    router.push({
      path: '/auth/login',
      query: { redirect: `/app/subscription?subscribe=${encodeURIComponent(tierSlug)}&yearly=${isYearly.value ? '1' : '0'}` }
    })
    return
  }

  const tier = asCheckoutTier(tierSlug)
  if (!tier) {
    if (tierSlug.toLowerCase() === 'enterprise') {
      router.push('/contact')
      return
    }
    checkoutError.value = `Unknown subscription tier: "${tierSlug}"`
    return
  }

  if (tier === 'unlimited') {
    // Legacy installs: allow checkout to proceed, backend will map appropriately.
  }

  checkoutLoading.value = true
  checkoutTier.value = tierSlug
  checkoutError.value = null

  try {
    const result = await billing.createCheckout({
      tier,
      isYearly: isYearly.value,
    })

    if (!result?.checkoutUrl) {
      throw new Error('Checkout URL missing')
    }

    window.location.href = result.checkoutUrl
  } catch (e: any) {
    checkoutError.value = e?.message || 'Failed to start checkout'
    $q.notify({ type: 'negative', message: checkoutError.value || 'Failed to start checkout' })
  } finally {
    checkoutLoading.value = false
    checkoutTier.value = null
  }
}

async function selectTier(tier: PricingTier) {
  if (tier.isEnterprise) {
    if (tier.ctaUrl) {
      if (tier.ctaUrl.startsWith('http')) window.open(tier.ctaUrl, '_blank')
      else router.push(tier.ctaUrl)
      return
    }
    router.push('/contact')
    return
  }

  if (tier.slug === 'free') {
    $q.notify({ type: 'info', message: 'You are already on the free plan.' })
    return
  }

  await beginCheckout(tier.slug)
}

async function loadAll() {
  loading.value = true
  error.value = null

  try {
    const [sub, tiersResult] = await Promise.all([
      billing.subscription().catch(() => null),
      pricing.list().catch(() => []),
    ])
    subscription.value = sub
    tiers.value = tiersResult
  } catch (e: any) {
    error.value = e?.message || 'Failed to load subscription'
  } finally {
    loading.value = false
  }
}

async function maybeAutoCheckoutFromQuery() {
  const subscribe = route.query.subscribe
  if (autoCheckoutStarted.value) return
  if (typeof subscribe !== 'string' || !subscribe.trim()) return

  autoCheckoutStarted.value = true
  isYearly.value = route.query.yearly === '1'

  // Avoid immediately re-checking out if user clicked their current plan
  if (isCurrentTier(subscribe)) return

  await beginCheckout(subscribe)
}

onMounted(async () => {
  await loadAll()
  await maybeAutoCheckoutFromQuery()
})

watch(
  () => route.query.subscribe,
  async () => {
    await maybeAutoCheckoutFromQuery()
  }
)
</script>

<style lang="scss" scoped>
.subscription-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.current-plan-card {
  margin-bottom: 32px;
}

.plan-price {
  text-align: right;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.plan-card {
  position: relative;

  &.featured {
    border: 2px solid var(--q-primary);
  }

  &.current {
    opacity: 0.8;
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

@media (max-width: 900px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .subscription-page {
    padding: 16px;
  }

  .plan-price {
    text-align: left;
  }
}
</style>
