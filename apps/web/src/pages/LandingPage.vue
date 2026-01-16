<template>
  <q-page
    class="landing-page"
    data-testid="landing-page"
  >
    <main data-testid="landing-main">
      <!-- Hero Section -->
      <HeroSection
        :page="page"
        :promo-stats="promoStats"
        :checkout-loading="checkoutLoading"
        @checkout="startLifetimeCheckout"
      />

      <!-- Tech Stack -->
      <TechStackSection />

      <!-- Features Grid -->
      <FeaturesGrid />

      <!-- Why Quasar -->
      <WhyQuasarSection />

      <!-- Theme System Showcase -->
      <ThemeSystemShowcase />

      <!-- COMMUNITY: Workflow Showcase removed - not available in Community Edition -->

      <!-- Admin Dashboard -->
      <AdminDashboardSection />

      <!-- Directus Admin Extensions Showcase -->
      <DirectusAdminShowcase />

      <!-- Directus Licensing Notice -->
      <DirectusLicensingBanner />

      <!-- COMMUNITY: Referral, AI Co-Founders, and 3D Visualization sections removed - not available in Community Edition -->

      <!-- Open Source Core -->
      <OpenSourceSection />

      <!-- Pricing -->
      <PricingSection />

      <!-- FAQ -->
      <FAQSection />

      <!-- CTA -->
      <CTASection />

      <!-- Footer -->
      <FooterSection />
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { usePages, type Page } from '@/composables/usePages'
import { useSeo } from '@/composables/useSeo'
import { logError } from '@/utils/devLogger'
import { API_BASE_URL } from '@/utils/apiUrl'
import { debugWarn } from '@/utils/debug'
import { analyticsEvents, adConversions } from '@/boot/analytics'

// Above-the-fold component (loaded synchronously for LCP)
import HeroSection from '@/components/landing/HeroSection.vue'

// Below-the-fold components (lazy loaded for better performance)
const TechStackSection = defineAsyncComponent(() =>
  import('@/components/landing/TechStackSection.vue'))
const FeaturesGrid = defineAsyncComponent(() =>
  import('@/components/landing/FeaturesGrid.vue'))
const WhyQuasarSection = defineAsyncComponent(() =>
  import('@/components/landing/WhyQuasarSection.vue'))
// COMMUNITY: WorkflowShowcase removed - not available in Community Edition
const AdminDashboardSection = defineAsyncComponent(() =>
  import('@/components/landing/AdminDashboardSection.vue'))
const DirectusAdminShowcase = defineAsyncComponent(() =>
  import('@/components/landing/DirectusAdminShowcase.vue'))
const ThemeSystemShowcase = defineAsyncComponent(() =>
  import('@/components/landing/ThemeSystemShowcase.vue'))
const OpenSourceSection = defineAsyncComponent(() =>
  import('@/components/landing/OpenSourceSection.vue'))
const PricingSection = defineAsyncComponent(() =>
  import('@/components/landing/PricingSection.vue'))
const FAQSection = defineAsyncComponent(() =>
  import('@/components/landing/FAQSection.vue'))
const CTASection = defineAsyncComponent(() =>
  import('@/components/landing/CTASection.vue'))
const FooterSection = defineAsyncComponent(() =>
  import('@/components/landing/FooterSection.vue'))
const DirectusLicensingBanner = defineAsyncComponent(() =>
  import('@/components/landing/DirectusLicensingBanner.vue'))
// COMMUNITY: ReferralShowcase, AICofounderShowcase, ThreeDGraphVisualization removed - not available in Community Edition

const { fetchPage } = usePages()
const { setPageSeo } = useSeo()
const $q = useQuasar()
const router = useRouter()

// Page content from Directus
const page = ref<Page | null>(null)

// Promo code stats
const promoStats = ref<{
  maxRedemptions: number | null;
  remaining: number | null;
  discount: string;
} | null>(null)

const apiUrl = API_BASE_URL
const promoCode = import.meta.env.VITE_STRIPE_LIFETIME_PROMO_CODE || 'EARLYSYNTH'

async function fetchPromoStats() {
  try {
    const response = await fetch(`${apiUrl}/api/v1/billing/promo-stats?code=${promoCode}`)
    if (!response.ok) {
      debugWarn('api', 'promo-stats request failed', {
        url: `${apiUrl}/api/v1/billing/promo-stats`,
        status: response.status,
      })
      return
    }

    const data = await response.json()
    if (data.success && data.data) {
      promoStats.value = {
        maxRedemptions: data.data.maxRedemptions,
        remaining: data.data.remaining,
        discount: data.data.discount
      }
    }
  } catch (error) {
    debugWarn('api', 'promo-stats request threw', {
      url: `${apiUrl}/api/v1/billing/promo-stats`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Lifetime License Checkout
const checkoutLoading = ref(false)

async function startLifetimeCheckout() {
  if (checkoutLoading.value) return

  try {
    checkoutLoading.value = true

    // Track checkout initiation
    analyticsEvents.beginCheckout('SynthStack Pro - Lifetime', 297)

	    const response = await fetch(`${apiUrl}/api/v1/billing/lifetime-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promoCode })
    })

	    if (!response.ok) {
	      debugWarn('api', 'lifetime-checkout request failed', { status: response.status })
	      throw new Error('Failed to create checkout session')
	    }

    const data = await response.json()
    if (data.success && data.data?.checkoutUrl) {
      window.location.href = data.data.checkoutUrl
    } else {
      throw new Error('Invalid response from server')
    }
  } catch (error) {
    logError('Checkout error:', error)
    alert('Failed to start checkout. Please try again.')
  } finally {
    checkoutLoading.value = false
  }
}

onMounted(async () => {
  await nextTick()
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, 50)

  // Check for license purchase success/cancel
  const urlParams = new URLSearchParams(window.location.search)
  const licenseStatus = urlParams.get('license')
  const sessionId = urlParams.get('session_id')

  if (licenseStatus === 'success' && sessionId) {
    // Track purchase completion
    analyticsEvents.purchase('SynthStack Pro - Lifetime', 297, sessionId)
    adConversions.premiumSubscription(297)

    // Route directly to the License Access onboarding flow
    await router.replace({ name: 'license-access', query: { session: sessionId } })
    return
  } else if (licenseStatus === 'cancelled') {
    // Show cancelled notification
    $q.notify({
      type: 'info',
      message: 'Checkout cancelled',
      caption: 'No charges were made. Try again when ready!',
      timeout: 4000,
      icon: 'info',
      position: 'top',
    })

    // Clear URL params
    window.history.replaceState({}, '', '/')
  }

  // Set SEO meta tags
  setPageSeo({
    title: 'SynthStack - Your Agency in a Box | AI-Native SaaS Boilerplate with 6 AI Co-Founders',
    description: 'Production-ready Vue 3 + Quasar SaaS boilerplate with AI agents, visual workflows, Directus CMS, multi-auth, Stripe billing, and 50+ premium features. Ship faster with the best-looking Quasar UI template.',
    keywords: [
      'SaaS boilerplate',
      'Vue 3 SaaS template',
      'Quasar framework',
      'AI agents',
      'AI co-founders',
      'LangGraph workflows',
      'Directus CMS',
      'SaaS starter kit',
      'full-stack boilerplate',
      'startup template',
      'agency automation',
      'business automation',
      'RAG pipeline',
      'multi-agent orchestration',
      'visual workflow builder',
      'Node-RED workflows',
      'Stripe billing',
      'Supabase auth',
      'Vue Quasar template',
      'premium SaaS UI'
    ],
    ogImage: '/og-image.png',
    canonicalPath: '/'
  })

  // Fetch page content from Directus
  page.value = await fetchPage('home')

  // Fetch promo stats
  fetchPromoStats()

  // Track pricing view
  analyticsEvents.viewPricing()
})
</script>

<style lang="scss" scoped>
.landing-page {
  min-height: 100vh;
  background: var(--bg-base);
}

// 3D Section
.three-d-section {
  padding: 100px 24px;
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(139, 92, 246, 0.03) 50%, var(--bg-base) 100%);
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
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
}

// Light mode overrides
:global(.body--light) .three-d-section {
  background: linear-gradient(180deg, var(--bg-base) 0%, rgba(139, 92, 246, 0.03) 50%, var(--bg-base) 100%) !important;
}

:global(.body--light) .section-header h2 {
  color: var(--text-primary) !important;
}

:global(.body--light) .section-header p {
  color: var(--text-secondary) !important;
}
</style>
