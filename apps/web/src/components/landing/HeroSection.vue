<template>
  <section
    class="hero-section"
    aria-labelledby="hero-title"
    data-testid="hero-section"
  >
    <!-- COMMUNITY: HeroDAGVisualization removed (PRO feature) -->
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
              :style="{ '--delay': `${i * 400}ms`, '--color-delay': `${i * 300 + 800}ms` }"
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
            :class="{ 'revealed': taglineRevealed, 'colorized': taglineColorized }"
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
          v-if="themingBadgeRevealed"
          class="theming-badge"
          :class="{ revealed: themingBadgeRevealed }"
        >
          <q-icon
            name="palette"
            size="20px"
          />
          <div class="badge-content">
            <span class="badge-title">Best-Looking Quasar UX on the Web</span>
            <span class="badge-subtitle">Full Theming & Customization Built-In</span>
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
          <span>Instant access to private GitHub repo</span>
          <q-icon name="fiber_manual_record" size="6px" class="separator" />
          <span>Lifetime updates</span>
          <q-icon name="fiber_manual_record" size="6px" class="separator" />
          <span>No monthly fees</span>
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
        aria-label="SynthStack visualization"
      >
        <AnimatedTerminal />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVisualEditing } from '@/composables/useVisualEditing'
import type { Page } from '@/composables/usePages'
import AnimatedTerminal from '@/components/ui/AnimatedTerminal.vue'
import AnimatedBox from '@/components/ui/AnimatedBox.vue'
import AutonomousText from './AutonomousText.vue'
// COMMUNITY: HeroDAGVisualization removed (PRO feature)
import { analyticsEvents } from '@/boot/analytics'

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
const heroRevealed = ref(false)
const heroColorized = ref(false)
const taglineRevealed = ref(false)
const taglineColorized = ref(false)
const themingBadgeRevealed = ref(false)

// Hero words - "Your Autonomous Agency in a Box"
const heroWords = computed(() => {
  const title = props.page?.title || 'Your Autonomous Agency in a Box'
  return title.split(' ')
})

function startCheckout() {
  // Track checkout initiation
  analyticsEvents.beginCheckout('SynthStack Pro - Lifetime', 297)
  emit('checkout')
}

onMounted(async () => {
  await nextTick()

  // Phase 1: Start the slow fade-in
  setTimeout(() => {
    heroRevealed.value = true
  }, 300)

  // Phase 2: Gradually add colors
  setTimeout(() => {
    heroColorized.value = true
  }, 2500)

  // Phase 3: Reveal the tagline
  setTimeout(() => {
    taglineRevealed.value = true
  }, 3500)

  // Phase 4: Colorize the tagline
  setTimeout(() => {
    taglineColorized.value = true
  }, 4500)

  // Phase 5: Reveal the theming badge (early, right after initial content is visible)
  setTimeout(() => {
    themingBadgeRevealed.value = true
  }, 1500)

  // Track hero/pricing view
  analyticsEvents.viewPricing()
})
</script>

<style lang="scss" scoped>
// Hero DAG Background
.hero-dag-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.4;
  pointer-events: none;
}

// Hero Section
.hero-section {
  position: relative;
  padding: 120px 24px 80px;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 80px 16px 60px;
  }
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.5;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px;

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
      opacity: 0;
      margin-right: 0.25em;
      transition: opacity 1.8s cubic-bezier(0.4, 0, 0.2, 1);
      transition-delay: var(--delay, 0ms);

      &:last-child {
        margin-right: 0;
      }

      > span {
        color: var(--text-primary);
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

    &.revealed .word {
      opacity: 1;
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

  .title-line-2 {
    opacity: 0;
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

    &.revealed {
      opacity: 1;
    }

    &.colorized strong {
      background: linear-gradient(135deg, #0d9488 0%, #00d4aa 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
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
  opacity: 0;
  transform: translateY(10px);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);

  &.revealed {
    opacity: 1;
    transform: translateY(0);
  }

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
}

.checkout-explainer {
  display: flex;
  align-items: center;
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

  @media (max-width: 900px) {
    width: 100%;
  }
}

// Light mode overrides
:global(.body--light) .hero-title .title-line-1 .word > span {
  color: var(--text-primary) !important;
}

:global(.body--light) .hero-title .title-line-2 strong {
  color: var(--text-secondary) !important;
  -webkit-text-fill-color: var(--text-secondary) !important;
}

:global(.body--light) .hero-title .title-line-2.colorized strong {
  background: linear-gradient(135deg, #0d9488 0%, #00d4aa 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

:global(.body--light) .demo-btn {
  color: var(--text-primary) !important;
}
</style>


