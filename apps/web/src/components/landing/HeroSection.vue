<template>
  <section
    class="hero-section"
    aria-labelledby="hero-title"
    data-testid="hero-section"
  >
    <HeroDAGVisualization class="hero-dag-bg" />
    <div
      class="hero-grid-bg"
      aria-hidden="true"
    />
    <div class="hero-content">
      <div class="hero-text">
        <h1
          id="hero-title"
          class="hero-title"
          data-testid="hero-title"
          :data-directus="page ? editableAttr({
            collection: 'pages',
            item: page.id,
            fields: 'title',
            mode: 'popover'
          }) : undefined"
        >
          <span
            class="title-line title-line-1"
            :class="{ 'revealed': heroRevealed, 'colorized': heroColorized }"
          >
            <span
              v-for="(word, i) in heroWords"
              :key="i"
              class="word"
              :class="{ 'light-mode-visible': !themeStore.isDark }"
              :style="{
                '--delay': `${i * 400}ms`,
                '--color-delay': `${i * 300 + 800}ms`,
                ...lightModeTextStyle,
              }"
            >
              <AutonomousText
                v-if="word === 'Autonomous'"
                :delay="i * 400"
                class="autonomous-word"
              />
              <AnimatedBox
                v-else-if="word === 'Box'"
                :size="72"
                :delay="i * 400"
                :animated="heroRevealed"
                class="inline-box"
              />
              <span
                v-else
                :class="{ 'gradient-word': word === 'Agency' }"
              >{{ word }}</span>
            </span>
          </span>
          <br>
          <span
            class="title-line title-line-2"
            :class="{ 'revealed': taglineRevealed, 'colorized': taglineColorized, 'light-mode-visible': !themeStore.isDark }"
            :style="lightModeSubtitleStyle"
            :data-directus="page ? editableAttr({
              collection: 'pages',
              item: page.id,
              fields: 'description',
              mode: 'popover'
            }) : undefined"
          >
            <strong>{{ page?.description || 'AI-Native. Cross-Platform.' }}</strong>
          </span>
        </h1>
        <p
          class="hero-subtitle"
          data-testid="hero-subtitle"
          :class="{ 'light-mode-visible': !themeStore.isDark }"
          :style="lightModeSubtitleStyle"
          :data-directus="page ? editableAttr({
            collection: 'pages',
            item: page.id,
            fields: 'content',
            mode: 'drawer'
          }) : undefined"
        >
          {{ page?.content?.replace(/<[^>]*>/g, '').split('\n\n')[0] || 'Vue Quasar full-stack boilerplate with 6 AI Co-Founders that know your business and take action. Complete with CMS, analytics, email, payments, and AI agents that write code, blog posts, and marketing content. Ship your next project 10x faster.' }}
        </p>
        <!-- Theming Highlight Badge -->
        <div
          v-if="themingBadgeRevealed || !themeStore.isDark"
          class="theming-badge"
          :class="{ revealed: themingBadgeRevealed, 'light-mode-visible': !themeStore.isDark }"
        >
          <q-icon
            name="palette"
            size="20px"
          />
          <div class="badge-content">
            <span class="badge-title">{{ t('landing.hero.badge.title') }}</span>
            <span class="badge-subtitle">{{ t('landing.hero.badge.subtitle') }}</span>
          </div>
        </div>
        <div class="hero-cta" data-testid="hero-cta">
          <q-btn
            unelevated
            color="primary"
            size="lg"
            :label="checkoutLoading ? t('common.loading') : t('landing.hero.cta')"
            :icon-right="checkoutLoading ? undefined : 'shopping_cart'"
            :loading="checkoutLoading"
            data-testid="hero-cta-primary"
            @click="startCheckout"
          />
          <q-btn
            flat
            size="lg"
            :label="t('landing.hero.secondaryCta')"
            icon="code"
            class="demo-btn"
            data-testid="hero-cta-secondary"
            href="https://github.com/manicinc/synthstack"
            target="_blank"
          />
        </div>
        <div class="checkout-explainer">
          <q-icon name="check_circle" size="16px" color="positive" />
          <span>{{ t('landing.hero.checkout.access') }}</span>
          <q-icon name="fiber_manual_record" size="6px" class="separator" />
          <span>{{ t('landing.hero.checkout.updates') }}</span>
          <q-icon name="fiber_manual_record" size="6px" class="separator" />
          <span>{{ t('landing.hero.checkout.fees') }}</span>
        </div>
        <p class="early-bird-note">
          <q-icon
            name="local_fire_department"
            color="orange"
          />
          <template v-if="promoStats && promoStats.maxRedemptions && promoStats.remaining !== null">
            {{ t('landing.hero.promoWithStats', { max: promoStats.maxRedemptions, remaining: promoStats.remaining, discount: promoStats.discount }) }}
          </template>
          <template v-else>
            {{ t('landing.hero.promoDefault') }}
          </template>
        </p>
      </div>
      <div
        class="hero-visual"
        role="img"
        aria-label="SynthStack configuration wizard"
      >
        <InteractiveTerminal />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVisualEditing } from '@/composables/useVisualEditing'
import type { Page } from '@/composables/usePages'
import InteractiveTerminal from '@/components/landing/InteractiveTerminal.vue'
import AnimatedBox from '@/components/ui/AnimatedBox.vue'
import AutonomousText from './AutonomousText.vue'
import HeroDAGVisualization from './HeroDAGVisualization.vue'
import { analyticsEvents } from '@/boot/analytics'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// Computed style for light mode text visibility
const lightModeTextStyle = computed(() => {
  if (themeStore.isDark) return {}
  return {
    '--delay': '0ms',
    '--color-delay': '0ms',
    opacity: '1',
    visibility: 'visible' as const,
    color: 'var(--text-primary)',
    WebkitTextFillColor: 'var(--text-primary)'
  }
})

const lightModeSubtitleStyle = computed(() => {
  if (themeStore.isDark) return {}
  return {
    opacity: '1',
    visibility: 'visible' as const,
    color: 'var(--text-secondary)',
    WebkitTextFillColor: 'var(--text-secondary)'
  }
})

interface Props {
  page?: Page | null
  promoStats?: {
    maxRedemptions: number | null
    remaining: number | null
    discount: string
  } | null
  checkoutLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  page: null,
  promoStats: null,
  checkoutLoading: false
})

const emit = defineEmits<{
  (e: 'checkout'): void
}>()

const { t } = useI18n()
const { editableAttr } = useVisualEditing()

// Hero text reveal animation state
// Start revealed immediately to ensure visibility (animation is cosmetic)
const heroRevealed = ref(true)
const heroColorized = ref(false)
const taglineRevealed = ref(true)
const taglineColorized = ref(false)
const themingBadgeRevealed = ref(true)

// Hero words - "Your Autonomous Agency in a Box"
const heroWords = computed(() => {
  const title = props.page?.title || 'Your Autonomous Agency in a Box'
  return title.split(' ')
})

function startCheckout() {
  emit('checkout')
}

onMounted(async () => {
  await nextTick()

  // Phase 1: Reveal content quickly (critical for LCP)
  setTimeout(() => {
    heroRevealed.value = true
  }, 100)

  setTimeout(() => {
    taglineRevealed.value = true
  }, 200)

  setTimeout(() => {
    themingBadgeRevealed.value = true
  }, 300)

  // Phase 2: Defer non-critical colorization animations
  // Use requestIdleCallback to avoid blocking main thread during initial load
  const deferAnimations = () => {
    setTimeout(() => {
      heroColorized.value = true
    }, 800)

    setTimeout(() => {
      taglineColorized.value = true
    }, 1600)
  }

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(deferAnimations)
  } else {
    // Fallback for Safari (doesn't support requestIdleCallback)
    setTimeout(deferAnimations, 500)
  }

  // Track hero/pricing view
  analyticsEvents.viewPricing()
})
</script>

<style lang="scss" scoped>
// Hero DAG Background - positioned above terminal area
.hero-dag-bg {
  position: absolute;
  top: -20px;
  right: 0;
  height: 350px;
  left: 40%;
  z-index: 10;
  pointer-events: none;
  opacity: 0.6;

  :global(.body--light) & {
    opacity: 0.5;
  }

  @media (max-width: 900px) {
    display: none;
  }
}

// Hero Section
.hero-section {
  position: relative;
  padding: 0 24px 40px; // No top padding - content should start right after nav
  overflow: hidden;
  background: var(--bg-base);

  // Mobile: even less padding
  @media (max-width: 768px) {
    padding: 0 16px 24px;
  }
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  z-index: 0; // Behind content
  background-image:
    linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.5;

  // Light mode - completely hide grid to prevent any gray tint
  :global(.body--light) & {
    display: none;
  }

  // Mobile: reduce grid visibility since DAG is separate
  @media (max-width: 768px) {
    opacity: 0.25;
  }
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 2; // Above DAG background (z-index: 0)

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }

  // Mobile: ensure content appears below DAG
  @media (max-width: 768px) {
    text-align: center;
    gap: 24px;
  }
}

.hero-text {
  display: flex;
  flex-direction: column;
  
  @media (max-width: 900px) {
    align-items: center;
  }
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px;

  @media (max-width: 768px) {
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    margin: 0 0 12px;
  }

  .gradient-text {
    background: linear-gradient(
      90deg,
      #0d9488 0%,
      #00d4aa 25%,
      #2d9cdb 50%,
      #14b8a6 75%,
      #0d9488 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 4s ease infinite;
  }

  strong {
    background: linear-gradient(135deg, #0d9488 0%, #00d4aa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .title-line {
    display: inline-block;
  }

  .title-line-1 {
    font-size: clamp(2rem, 5vw, 3rem);

    .word {
      display: inline-block;
      // Default: visible
      opacity: 1;
      margin-right: 0.25em;
      transition: opacity 1.8s cubic-bezier(0.4, 0, 0.2, 1);
      transition-delay: var(--delay, 0ms);

      &:last-child {
        margin-right: 0;
      }

      > span {
        color: var(--text-primary);
        -webkit-text-fill-color: var(--text-primary);
        background: none;
        transition: all 2s cubic-bezier(0.4, 0, 0.2, 1);
        transition-delay: var(--color-delay, 0ms);
      }

      .gradient-word {
        background: var(--text-primary);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        transition: background 2.5s cubic-bezier(0.4, 0, 0.2, 1);
        transition-delay: var(--color-delay, 0ms);
      }

      .inline-box {
        vertical-align: middle;
        margin-bottom: 0.15em;
        transform: translateY(-2px);
      }

      .autonomous-word {
        vertical-align: baseline;
      }
    }

    &.colorized .word {
      .gradient-word {
        background: linear-gradient(
          90deg,
          #0d9488 0%,
          #00d4aa 25%,
          #2d9cdb 50%,
          #14b8a6 75%,
          #0d9488 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradient-shift 4s ease infinite;
        animation-delay: var(--color-delay, 0ms);
      }
    }
  }
  
  // DARK MODE ANIMATION: Use global selectors with matching specificity
  // These must be at root level to use :global() properly
  :global(.body--dark) .title-line-1 .word {
    opacity: 0;
  }
  
  :global(.body--dark) .title-line-1.revealed .word {
    opacity: 1;
  }

  .title-line-2 {
    opacity: 1; // Default visible
    transition: opacity 2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: clamp(1rem, 2.5vw, 1.5rem);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-top: 8px;

    strong {
      color: var(--text-secondary);
      -webkit-text-fill-color: var(--text-secondary);
      background: none;
      font-weight: 600;
      transition: all 2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &.colorized strong {
      background: linear-gradient(135deg, #0d9488 0%, #00d4aa 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }
  
  // DARK MODE ANIMATION for title-line-2
  :global(.body--dark) .title-line-2 {
    opacity: 0;
  }
  
  :global(.body--dark) .title-line-2.revealed {
    opacity: 1;
  }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 32px;
  max-width: 600px;

  strong {
    color: var(--text-primary);
  }
}

// Light mode hero improvements
:global(.body--light) .hero-subtitle {
  color: var(--text-secondary) !important;
  -webkit-text-fill-color: var(--text-secondary) !important;
}

// Theming Badge
.theming-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin-top: 24px;
  margin-bottom: 8px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  opacity: 1; // Default visible
  transform: translateY(0);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);

  .q-icon {
    color: #a5b4fc;
    flex-shrink: 0;
  }

  .badge-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .badge-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #e0e7ff;
    letter-spacing: 0.01em;
  }

  .badge-subtitle {
    font-size: 0.75rem;
    font-weight: 500;
    color: #a5b4fc;
  }
}

// DARK MODE ANIMATION for theming badge
:global(.body--dark) .theming-badge {
  opacity: 0;
  transform: translateY(10px);
}

:global(.body--dark) .theming-badge.revealed {
  opacity: 1;
  transform: translateY(0);
}

// Light mode overrides for theming badge
:global(.body--light) .theming-badge {
  background: rgba(99, 102, 241, 0.08) !important;
  border-color: rgba(99, 102, 241, 0.2) !important;

  .q-icon {
    color: #6366f1 !important;
  }

  .badge-title {
    color: #4338ca !important;
  }

  .badge-subtitle {
    color: #6366f1 !important;
  }
}

// Mobile responsive for theming badge
@media (max-width: 900px) {
  .theming-badge {
    padding: 10px 16px;
    gap: 10px;

    .badge-title {
      font-size: 0.8125rem;
    }

    .badge-subtitle {
      font-size: 0.6875rem;
    }
  }
}

.hero-cta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  justify-content: center;
}

.checkout-explainer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  flex-wrap: wrap;

  span {
    color: var(--text-secondary);
  }

  .separator {
    color: var(--text-tertiary);
    opacity: 0.5;
  }

  @media (max-width: 768px) {
    font-size: 0.8125rem;
    gap: 6px;
  }
}

.early-bird-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 24px;
  font-weight: 600;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  // CLS Prevention - explicit dimensions to prevent layout shift
  width: 520px;
  min-height: 400px;
  contain: layout style;

  @media (max-width: 900px) {
    width: 100%;
    max-width: 520px;
    min-height: 350px;
  }

  @media (max-width: 600px) {
    min-height: 320px;
  }
}

// ==============================================
// LIGHT MODE OVERRIDES - EXPLICIT DARK TEXT
// Using !important to ensure these rules win
// ==============================================

// Hero section background - use CSS variable
:global(.body--light) .hero-section {
  background: var(--bg-base) !important;
}

// CRITICAL: Disable ALL animations in light mode to prevent flashing
:global(.body--light) .hero-title .title-line-1 .word {
  opacity: 1 !important;
  transition: none !important;
  transition-delay: 0ms !important;
  animation: none !important;
}

:global(.body--light) .hero-title .title-line-1 .word > span {
  transition: none !important;
  transition-delay: 0ms !important;
}

:global(.body--light) .hero-title .title-line-2 {
  opacity: 1 !important;
  transition: none !important;
  transition-delay: 0ms !important;
}

:global(.body--light) .hero-title .title-line-2 strong {
  transition: none !important;
}

:global(.body--light) .theming-badge {
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: none !important;
  backdrop-filter: none !important;
}

:global(.body--light) .hero-subtitle {
  transition: none !important;
}

:global(.body--light) .hero-cta .q-btn {
  transition: background-color 0.2s, transform 0.15s !important;
}

// ALL text in hero title - dark color
:global(.body--light) .hero-title,
:global(.body--light) .hero-title span,
:global(.body--light) .hero-title .title-line,
:global(.body--light) .hero-title .title-line-1,
:global(.body--light) .hero-title .title-line-1 .word,
:global(.body--light) .hero-title .title-line-1 .word > span:not(.gradient-word) {
  color: #18181b !important;
  -webkit-text-fill-color: #18181b !important;
}

// Gradient words - use solid text in light mode (transparent-fill gradients can flicker in Chrome)
:global(.body--light) .hero-title .title-line-1 .word .gradient-word {
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  -webkit-text-fill-color: #18181b !important;
  color: #18181b !important;
  animation: none !important;
}

// Title line 2 (tagline) - dark text
:global(.body--light) .hero-title .title-line-2,
:global(.body--light) .hero-title .title-line-2 strong {
  color: #3f3f46 !important;
  -webkit-text-fill-color: #3f3f46 !important;
  background: none !important;
}

// Colorized tagline - keep solid text in light mode
:global(.body--light) .hero-title .title-line-2.colorized strong {
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  -webkit-text-fill-color: #3f3f46 !important;
  color: #3f3f46 !important;
  animation: none !important;
}

// Demo button
:global(.body--light) .demo-btn {
  color: #18181b !important;
  -webkit-text-fill-color: #18181b !important;
}

// Subtitle
:global(.body--light) .hero-subtitle {
  color: #3f3f46 !important;
  -webkit-text-fill-color: #3f3f46 !important;
}

// Early bird note
:global(.body--light) .early-bird-note {
  color: #3f3f46 !important;
  -webkit-text-fill-color: #3f3f46 !important;
}

// Checkout explainer
:global(.body--light) .checkout-explainer,
:global(.body--light) .checkout-explainer span {
  color: #3f3f46 !important;
  -webkit-text-fill-color: #3f3f46 !important;
}

// ==============================================
// LIGHT MODE INSTANT VISIBILITY CLASS
// Applied via Vue binding when not in dark mode
// This is SCOPED so it has the right specificity to override .word { opacity: 0 }
// ==============================================

// For .word elements (hero title words)
.word.light-mode-visible {
  opacity: 1 !important;
  visibility: visible !important;
  
  // Inner span text color (not gradient words)
  > span:not(.gradient-word) {
    color: #18181b !important;
    -webkit-text-fill-color: #18181b !important;
  }
}

// For title-line-2 (tagline)
.title-line-2.light-mode-visible {
  opacity: 1 !important;
  visibility: visible !important;
  
  strong {
    color: #3f3f46 !important;
    -webkit-text-fill-color: #3f3f46 !important;
    background: none !important;
  }
}

// For hero subtitle
.hero-subtitle.light-mode-visible {
  color: #3f3f46 !important;
  -webkit-text-fill-color: #3f3f46 !important;
}

// For theming badge
.theming-badge.light-mode-visible {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
}
</style>
