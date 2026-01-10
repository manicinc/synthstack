<template>
  <q-card
    class="unified-credits-widget"
    :class="{ 'low-credits': isLowCredits }"
  >
    <q-card-section class="q-pb-none">
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6 text-weight-medium">
          <q-icon
            name="sym_o_account_balance_wallet"
            class="q-mr-sm"
          />
          Credits
        </div>
        <q-btn
          flat
          dense
          round
          icon="refresh"
          :loading="loading"
          @click="refresh"
        />
      </div>
      
      <!-- Main Credit Balance -->
      <div class="credit-balance q-mb-md">
        <div class="text-h3 text-weight-bold text-primary">
          {{ formatNumber(creditsRemaining) }}
        </div>
        <div class="text-caption text-grey-7">
          credits remaining
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <!-- AI, ML Service & Workflow Breakdown -->
    <q-card-section>
      <div class="row q-col-gutter-md">
        <!-- AI Credits -->
        <div class="col-4">
          <div class="credit-category">
            <div class="row items-center q-mb-xs">
              <q-icon
                name="sym_o_smart_toy"
                size="18px"
                class="q-mr-xs text-blue"
              />
              <span class="text-subtitle2">AI</span>
            </div>
            <div class="text-body2">
              <template v-if="aiCredits.unlimited">
                <q-icon
                  name="all_inclusive"
                  size="14px"
                  class="q-mr-xs"
                />
                Unlimited
              </template>
              <template v-else>
                {{ aiCredits.creditsUsedToday }} / {{ aiCredits.dailyLimit }} today
              </template>
            </div>
            <q-linear-progress
              v-if="!aiCredits.unlimited"
              :value="aiCredits.dailyLimit > 0 ? aiCredits.creditsUsedToday / aiCredits.dailyLimit : 0"
              color="blue"
              class="q-mt-xs"
              rounded
              size="4px"
            />
          </div>
        </div>

        <!-- ML Service Credits -->
        <div class="col-4">
          <div class="credit-category">
            <div class="row items-center q-mb-xs">
              <q-icon
                name="sym_o_psychology"
                size="18px"
                class="q-mr-xs text-green"
              />
              <span class="text-subtitle2">ML</span>
            </div>
            <div class="text-body2">
              {{ mlServiceCredits.creditsUsedToday }} credits
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              {{ mlServiceCredits.requestsToday }} requests today
            </div>
          </div>
        </div>

        <!-- Workflow Credits -->
        <div class="col-4">
          <div
            class="credit-category"
            :class="{ 'disabled': !workflowsEnabled }"
          >
            <div class="row items-center q-mb-xs">
              <q-icon
                name="sym_o_account_tree"
                size="18px"
                class="q-mr-xs text-purple"
              />
              <span class="text-subtitle2">Flows</span>
            </div>
            <template v-if="workflowsEnabled">
              <div class="text-body2">
                {{ workflowCredits.freeExecutionsRemaining }} free
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                {{ workflowCredits.creditMultiplier }}x multiplier
              </div>
            </template>
            <template v-else>
              <div class="text-body2 text-grey-6">
                Not available
              </div>
            </template>
          </div>
        </div>
      </div>
    </q-card-section>

    <!-- Today's Usage Summary -->
    <q-separator />
    <q-card-section class="q-py-sm">
      <div class="row items-center justify-between text-caption">
        <span class="text-grey-7">Today's usage</span>
        <span class="text-weight-medium">
          {{ totalUsedToday }} credits
        </span>
      </div>
    </q-card-section>

    <!-- Low Credits Warning -->
    <q-card-section
      v-if="isLowCredits"
      class="q-pt-none"
    >
      <q-banner
        dense
        rounded
        class="bg-warning text-dark"
      >
        <template #avatar>
          <q-icon name="warning" />
        </template>
        <div class="text-body2">
          Running low on credits!
        </div>
        <template #action>
          <q-btn
            flat
            dense
            color="dark"
            label="Upgrade"
            @click="navigateToPricing"
          />
        </template>
      </q-banner>
    </q-card-section>

    <!-- BYOK Tip Banner (Premium users) -->
    <q-card-section
      v-if="isPremium"
      class="q-pt-none"
    >
      <q-banner
        dense
        rounded
        class="bg-blue-1 text-blue-10"
      >
        <template #avatar>
          <q-icon
            name="vpn_key"
            color="blue-8"
          />
        </template>
        <div class="text-body2">
          <strong>Save Credits:</strong> Use your own API keys for unlimited AI usage!
        </div>
        <template #action>
          <q-btn
            flat
            dense
            color="blue-10"
            label="Setup BYOK"
            to="/app/api-keys"
          />
        </template>
      </q-banner>
    </q-card-section>

    <!-- Actions -->
    <q-card-actions
      align="right"
      class="q-pt-none"
    >
      <q-btn
        flat
        dense
        color="grey-7"
        label="View History"
        icon="history"
        @click="$emit('show-history')"
      />
      <q-btn
        flat
        dense
        color="primary"
        label="Get More"
        icon="add_circle"
        @click="navigateToPricing"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCreditsStore } from 'src/stores/credits'
import { useAuthStore } from 'src/stores/auth'
import { storeToRefs } from 'pinia'

// ============================================
// Emits
// ============================================

defineEmits<{
  (e: 'show-history'): void
}>()

// ============================================
// Store
// ============================================

const creditsStore = useCreditsStore()
const authStore = useAuthStore()
const {
  loading,
  creditsRemaining,
  aiCredits,
  mlServiceCredits,
  workflowCredits,
  isLowCredits,
  workflowsEnabled,
  unifiedCredits,
} = storeToRefs(creditsStore)

// ============================================
// Computed
// ============================================

const totalUsedToday = computed(() => {
  return unifiedCredits.value?.totalCreditsUsedToday ?? 0
})

const isPremium = computed(() => {
  const tier = authStore.user?.subscription_tier
  return tier === 'premium' || tier === 'lifetime'
})

// ============================================
// Methods
// ============================================

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

async function refresh(): Promise<void> {
  await creditsStore.refresh()
}

function navigateToPricing(): void {
  creditsStore.navigateToPricing()
}

// ============================================
// Lifecycle
// ============================================

onMounted(async () => {
  if (!unifiedCredits.value) {
    await creditsStore.initialize()
  }
})
</script>

<style lang="scss" scoped>
.unified-credits-widget {
  border-radius: 12px;
  transition: all 0.3s ease;

  &.low-credits {
    border: 1px solid var(--q-warning);
  }
}

.credit-balance {
  text-align: center;
}

.credit-category {
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--q-primary-rgb), 0.05);
  
  &.disabled {
    opacity: 0.6;
  }
}
</style>


