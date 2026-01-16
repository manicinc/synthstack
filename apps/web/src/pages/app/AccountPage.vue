<template>
  <q-page class="account-page q-pa-md">
    <div
      class="text-h4 text-primary q-mb-lg"
      style="font-family: var(--font-mono, 'JetBrains Mono'), monospace"
    >
      Account Settings
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4">
        <!-- Profile Card -->
        <q-card
          flat
          bordered
          class="settings-card"
        >
          <q-card-section class="text-center">
            <q-avatar
              size="100px"
              class="q-mb-md"
            >
              <img src="https://cdn.quasar.dev/img/boy-avatar.png">
            </q-avatar>
            <div class="text-h6">
              John Doe
            </div>
            <div class="text-subtitle2 text-grey-5">
              Maker Tier
            </div>
            <q-btn
              flat
              color="primary"
              label="Change Avatar"
              size="sm"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>

        <!-- Subscription Status -->
        <q-card
          flat
          bordered
          class="settings-card q-mt-md"
        >
          <q-card-section>
            <div class="text-subtitle2 text-grey-5 q-mb-sm">
              Current Plan
            </div>
            <div class="text-h5 text-primary">
              Maker
            </div>
            <div class="q-mt-sm">
              <q-linear-progress
                :value="0.4"
                color="primary"
                class="q-mt-sm"
              />
              <div class="row justify-between text-caption text-grey-5 q-mt-xs">
                <span>12 / 30 Credits Used</span>
                <span>Resets in 14 days</span>
              </div>
            </div>
          </q-card-section>
          <q-card-actions>
            <q-btn
              outline
              color="primary"
              label="Upgrade Plan"
              class="full-width"
              to="/app/subscription"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card
          flat
          bordered
          class="settings-card"
        >
          <q-tabs
            v-model="tab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab
              name="general"
              label="General"
            />
            <q-tab
              name="appearance"
              label="Appearance"
            />
            <q-tab
              name="notifications"
              label="Notifications"
            />
          </q-tabs>

          <q-separator />

          <q-tab-panels
            v-model="tab"
            animated
            class="bg-transparent"
          >
            <!-- General Settings -->
            <q-tab-panel name="general">
              <div class="q-gutter-y-md">
                <q-input
                  v-model="name"
                  outlined
                  label="Display Name"
                />
                <q-input
                  v-model="email"
                  outlined
                  label="Email Address"
                  readonly
                />
                
                <div class="row justify-end q-mt-lg">
                  <q-btn
                    color="primary"
                    label="Save Changes"
                  />
                </div>
              </div>
            </q-tab-panel>

            <!-- Appearance / Theme Settings -->
            <q-tab-panel name="appearance">
              <div class="appearance-settings">
                <div class="section-intro q-mb-lg">
                  <div class="text-h6">
                    Theme & Appearance
                  </div>
                  <p class="text-grey-5 q-mb-none">
                    Customize how SynthStack looks. Choose a theme preset and toggle between light and dark mode independently.
                  </p>
                </div>

                <ThemeSwitcher
                  :show-preset-selector="true"
                  :show-categories="true"
                  :show-premium-upsell="true"
                  @upgrade="goToUpgrade"
                />

                <!-- Current Theme Preview -->
                <div class="theme-preview-section q-mt-xl">
                  <div class="text-subtitle1 text-weight-medium q-mb-md">
                    <q-icon
                      name="preview"
                      class="q-mr-sm"
                    />
                    Current Theme: {{ currentPreset?.name }}
                  </div>
                  
                  <div class="preview-card">
                    <div class="preview-header">
                      <div
                        class="preview-dot"
                        style="background: #ef4444"
                      />
                      <div
                        class="preview-dot"
                        style="background: #eab308"
                      />
                      <div
                        class="preview-dot"
                        style="background: #22c55e"
                      />
                    </div>
                    <div class="preview-content">
                      <div class="preview-sidebar">
                        <div class="preview-nav-item active" />
                        <div class="preview-nav-item" />
                        <div class="preview-nav-item" />
                      </div>
                      <div class="preview-main">
                        <div class="preview-title" />
                        <div class="preview-text" />
                        <div class="preview-text short" />
                        <div class="preview-buttons">
                          <div class="preview-btn primary" />
                          <div class="preview-btn secondary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Additional Appearance Options -->
                <div class="additional-options q-mt-xl">
                  <div class="text-subtitle1 text-weight-medium q-mb-md">
                    <q-icon
                      name="tune"
                      class="q-mr-sm"
                    />
                    Additional Options
                  </div>

                  <q-list
                    bordered
                    class="rounded-borders"
                  >
                    <q-item
                      v-ripple
                      tag="label"
                    >
                      <q-item-section>
                        <q-item-label>Reduce Motion</q-item-label>
                        <q-item-label caption>
                          Minimize animations for accessibility
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-toggle
                          v-model="reduceMotion"
                          color="primary"
                        />
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-ripple
                      tag="label"
                    >
                      <q-item-section>
                        <q-item-label>High Contrast</q-item-label>
                        <q-item-label caption>
                          Increase contrast for better visibility
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-toggle
                          v-model="highContrast"
                          color="primary"
                        />
                      </q-item-section>
                    </q-item>

                    <q-item
                      v-ripple
                      tag="label"
                    >
                      <q-item-section>
                        <q-item-label>Compact Mode</q-item-label>
                        <q-item-label caption>
                          Reduce spacing for more content density
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-toggle
                          v-model="compactMode"
                          color="primary"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </q-tab-panel>

            <!-- Notifications -->
            <q-tab-panel name="notifications">
              <q-list>
                <q-item
                  v-ripple
                  tag="label"
                >
                  <q-item-section>
                    <q-item-label>Email Notifications</q-item-label>
                    <q-item-label caption>
                      Receive updates about your generations
                    </q-item-label>
                  </q-item-section>
                  <q-item-section
                    side
                    top
                  >
                    <q-toggle
                      v-model="notifications.email"
                      color="primary"
                    />
                  </q-item-section>
                </q-item>
                <q-item
                  v-ripple
                  tag="label"
                >
                  <q-item-section>
                    <q-item-label>Marketing Updates</q-item-label>
                    <q-item-label caption>
                      Receive news about features and promotions
                    </q-item-label>
                  </q-item-section>
                  <q-item-section
                    side
                    top
                  >
                    <q-toggle
                      v-model="notifications.marketing"
                      color="primary"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'
import { analyticsEvents } from '@/boot/analytics'

const router = useRouter()
const themeStore = useThemeStore()

const tab = ref('general')
const name = ref('John Doe')
const email = ref('john@example.com')

// Appearance settings
const reduceMotion = ref(false)
const highContrast = ref(false)
const compactMode = ref(false)

const currentPreset = computed(() => themeStore.currentPreset)

const notifications = ref({
  email: true,
  marketing: false
})

function goToUpgrade() {
  // Track upgrade CTA click
  analyticsEvents.selectPlan('upgrade', 0)
  router.push('/app/subscription')
}
</script>

<style lang="scss" scoped>
.account-page {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-card {
  background: var(--bg-elevated);
  border-color: var(--border-default);
}

.appearance-settings {
  max-width: 800px;
}

.section-intro {
  p {
    font-size: 0.875rem;
    line-height: 1.6;
  }
}

// Theme Preview Card
.theme-preview-section {
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.preview-card {
  background: var(--bg-muted);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.preview-header {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.preview-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.preview-content {
  display: flex;
  min-height: 160px;
}

.preview-sidebar {
  width: 60px;
  padding: 12px 8px;
  background: var(--bg-subtle);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-nav-item {
  height: 8px;
  background: var(--border-default);
  border-radius: var(--radius-sm);

  &.active {
    background: var(--color-primary);
  }
}

.preview-main {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-title {
  width: 60%;
  height: 16px;
  background: var(--text-primary);
  opacity: 0.8;
  border-radius: var(--radius-sm);
}

.preview-text {
  width: 90%;
  height: 8px;
  background: var(--text-secondary);
  opacity: 0.5;
  border-radius: var(--radius-sm);

  &.short {
    width: 70%;
  }
}

.preview-buttons {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.preview-btn {
  height: 24px;
  border-radius: var(--radius-md);

  &.primary {
    width: 80px;
    background: var(--color-primary);
  }

  &.secondary {
    width: 60px;
    background: var(--border-default);
  }
}

.additional-options {
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);

  .q-list {
    background: var(--bg-muted);
  }
}

// Responsive
@media (max-width: 600px) {
  .preview-sidebar {
    width: 40px;
  }
}
</style>
