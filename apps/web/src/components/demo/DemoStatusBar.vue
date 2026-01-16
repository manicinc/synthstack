<script setup lang="ts">
/**
 * DemoStatusBar Component
 *
 * Sticky bar at top of app showing demo mode status.
 * Displays:
 * - Demo mode indicator (yellow badge)
 * - Credits remaining: X/5
 * - Requests today: X/20
 * - Referral earnings: +X credits
 * - "Sign Up for More" CTA button
 * - Time until reset
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDemoStore } from 'src/stores/demo'

const demoStore = useDemoStore()
const router = useRouter()

const creditsPercent = computed(() => {
  const max = demoStore.limits.initialCredits
  return ((max - demoStore.credits) / max) * 100
})

const requestsPercent = computed(() => {
  const max = demoStore.limits.rateLimits.requestsPerDay
  const current = demoStore.rateLimit?.current ?? 0
  return (current / max) * 100
})

const creditsColor = computed(() => {
  if (demoStore.credits <= 1) return 'negative'
  if (demoStore.credits <= 2) return 'warning'
  return 'positive'
})

function goToPricing() {
  router.push('/pricing')
}

function goToAuth() {
  router.push('/auth/register')
}
</script>

<template>
  <div
    v-if="demoStore.showBanner"
    class="demo-status-bar"
  >
    <div class="demo-status-content">
      <!-- Demo Badge -->
      <div class="demo-badge">
        <q-icon
          name="science"
          size="xs"
        />
        <span>Demo Mode</span>
      </div>

      <!-- Credits -->
      <div class="status-item">
        <q-icon
          name="stars"
          size="xs"
          :color="creditsColor"
        />
        <span class="label">Credits:</span>
        <span
          class="value"
          :class="creditsColor"
        >
          {{ demoStore.credits }}/{{ demoStore.limits.initialCredits }}
        </span>
        <q-linear-progress
          :value="creditsPercent / 100"
          :color="creditsColor"
          class="progress-bar"
          size="4px"
          rounded
        />
      </div>

      <!-- Requests -->
      <div
        v-if="demoStore.rateLimit"
        class="status-item"
      >
        <q-icon
          name="speed"
          size="xs"
        />
        <span class="label">Requests:</span>
        <span class="value">
          {{ demoStore.rateLimit.current ?? 0 }}/{{ demoStore.limits.rateLimits.requestsPerDay }}
        </span>
        <q-linear-progress
          :value="requestsPercent / 100"
          color="info"
          class="progress-bar"
          size="4px"
          rounded
        />
      </div>

      <!-- Referral Earnings -->
      <div
        v-if="demoStore.referralCreditsEarned > 0"
        class="status-item referral"
      >
        <q-icon
          name="group_add"
          size="xs"
          color="positive"
        />
        <span class="value positive">+{{ demoStore.referralCreditsEarned }}</span>
        <span class="label">from referrals</span>
      </div>

      <!-- Rate Limit Warning -->
      <div
        v-if="demoStore.isRateLimited"
        class="status-item warning"
      >
        <q-icon
          name="warning"
          size="xs"
          color="warning"
        />
        <span class="value warning">Rate limited</span>
        <span
          v-if="demoStore.timeUntilReset"
          class="label"
        >
          Resets in {{ demoStore.timeUntilReset }}
        </span>
      </div>

      <!-- Spacer -->
      <div class="spacer" />

      <!-- CTA Buttons -->
      <q-btn
        flat
        dense
        size="sm"
        color="white"
        icon="share"
        label="Share & Earn"
        @click="demoStore.copyReferralLink()"
      >
        <q-tooltip>Copy referral link to earn more credits</q-tooltip>
      </q-btn>

      <q-btn
        unelevated
        dense
        size="sm"
        color="primary"
        icon="rocket_launch"
        label="Sign Up"
        @click="goToAuth"
      >
        <q-tooltip>Get 50 free credits when you sign up!</q-tooltip>
      </q-btn>

      <!-- Close Button with Dropdown Menu -->
      <q-btn
        flat
        dense
        round
        size="sm"
        color="white"
        icon="close"
        class="close-btn"
      >
        <q-menu
          anchor="bottom right"
          self="top right"
        >
          <q-list
            dense
            style="min-width: 180px"
          >
            <q-item
              v-close-popup
              clickable
              @click="demoStore.dismissBanner()"
            >
              <q-item-section avatar>
                <q-icon
                  name="visibility_off"
                  size="sm"
                />
              </q-item-section>
              <q-item-section>Hide for now</q-item-section>
            </q-item>
            <q-item
              v-close-popup
              clickable
              @click="demoStore.neverShowBanner()"
            >
              <q-item-section avatar>
                <q-icon
                  name="do_not_disturb"
                  size="sm"
                />
              </q-item-section>
              <q-item-section>Never show again</q-item-section>
            </q-item>
            <q-separator />
            <q-item
              v-close-popup
              clickable
              @click="goToPricing"
            >
              <q-item-section avatar>
                <q-icon
                  name="info"
                  size="sm"
                />
              </q-item-section>
              <q-item-section>View pricing</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
        <q-tooltip>Dismiss banner</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.demo-status-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid rgba(251, 191, 36, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.demo-status-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  max-width: 1400px;
  margin: 0 auto;
  font-size: 0.85rem;
}

.demo-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 4px;
  color: #fbbf24;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: rgba(255, 255, 255, 0.9);

  .label {
    color: rgba(255, 255, 255, 0.6);
  }

  .value {
    font-weight: 600;

    &.positive {
      color: #10b981;
    }

    &.warning {
      color: #f59e0b;
    }

    &.negative {
      color: #ef4444;
    }
  }

  .progress-bar {
    width: 40px;
    margin-left: 0.25rem;
  }

  &.referral {
    background: rgba(16, 185, 129, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  &.warning {
    background: rgba(245, 158, 11, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
}

.spacer {
  flex: 1;
}

.close-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}

// Responsive
@media (max-width: 768px) {
  .demo-status-content {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .status-item {
    .label {
      display: none;
    }

    .progress-bar {
      display: none;
    }
  }

  .status-item.referral .label {
    display: none;
  }
}

@media (max-width: 480px) {
  .demo-status-content {
    justify-content: space-between;
  }

  .status-item:not(.referral):not(.warning) {
    display: none;
  }
}

</style>

<!-- Unscoped light mode styles - needed because :global() in scoped blocks doesn't cascade to nested selectors -->
<style lang="scss">
.body--light {
  .demo-status-bar {
    background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%) !important;
    border-bottom-color: rgba(251, 191, 36, 0.3) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  }

  .demo-status-content {
    .demo-badge {
      background: rgba(251, 191, 36, 0.12);
      border-color: rgba(251, 191, 36, 0.35);
      color: #b45309;
    }

    .status-item {
      color: rgba(0, 0, 0, 0.8);

      .label {
        color: rgba(0, 0, 0, 0.55);
      }

      .value {
        &.positive {
          color: #059669;
        }

        &.warning {
          color: #d97706;
        }

        &.negative {
          color: #dc2626;
        }
      }

      &.referral {
        background: rgba(16, 185, 129, 0.08);
      }

      &.warning {
        background: rgba(245, 158, 11, 0.08);
      }
    }

    .close-btn {
      color: rgba(0, 0, 0, 0.5) !important;

      &:hover {
        color: rgba(0, 0, 0, 0.8) !important;
      }
    }
  }

  // Quasar q-btn text colors in light mode
  .demo-status-bar .q-btn {
    &[class*="flat"] {
      color: rgba(0, 0, 0, 0.7) !important;
    }
  }
}
</style>
