<template>
  <Teleport to="body">
    <!-- Minimal Banner Mode -->
    <Transition name="slide-up">
      <div
        v-if="showBanner && !expandedMode"
        class="cookie-banner"
      >
        <div class="banner-content">
          <div class="banner-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-.34-.02-.68-.05-1.01-.63.41-1.38.66-2.2.66-2.14 0-3.87-1.73-3.87-3.87 0-.82.25-1.57.66-2.2-.33-.03-.67-.05-1.01-.05-.34 0-.68.02-1.01.05.41.63.66 1.38.66 2.2 0 2.14-1.73 3.87-3.87 3.87-.82 0-1.57-.25-2.2-.66C6.02 11.32 6 11.66 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-.34-.02-.68-.05-1.01-.63.41-1.38.66-2.2.66-2.14 0-3.87-1.73-3.87-3.87 0-.82.25-1.57.66-2.2-.33-.03-.67-.05-1.01-.05z"
                fill="currentColor"
              />
              <circle
                cx="8"
                cy="10"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="11"
                cy="14"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="15"
                cy="11"
                r="1.5"
                fill="currentColor"
              />
            </svg>
          </div>
          <div class="banner-text">
            <p>
              We use cookies to enhance your experience.
              <button
                class="link-btn"
                @click="expandedMode = true"
              >
                Customize
              </button> or
              <router-link to="/privacy">
                read our Privacy Policy
              </router-link>.
            </p>
          </div>
          <div class="banner-actions">
            <button
              class="btn-reject"
              @click="rejectAll"
            >
              Reject
            </button>
            <button
              class="btn-accept"
              @click="acceptAll"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Expanded Settings Panel -->
    <Transition name="fade-scale">
      <div
        v-if="showBanner && expandedMode"
        class="cookie-modal-overlay"
        @click.self="expandedMode = false"
      >
        <div class="cookie-modal">
          <div class="modal-header">
            <div class="header-title">
              <h2>Privacy Settings</h2>
              <p>Manage how we use data to improve your experience</p>
            </div>
            <button
              class="close-btn"
              aria-label="Close"
              @click="expandedMode = false"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Privacy Summary -->
            <div class="privacy-summary">
              <div class="summary-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div class="summary-text">
                <h4>Your Privacy Matters</h4>
                <p>We respect your right to privacy. Control exactly which cookies are used and how your data is processed.</p>
              </div>
            </div>

            <!-- Cookie Categories -->
            <div class="cookie-categories">
              <!-- Essential -->
              <div class="category-card essential">
                <div class="category-header">
                  <div class="category-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                  </div>
                  <div class="category-info">
                    <h4>Essential</h4>
                    <span class="category-badge required">Always Active</span>
                  </div>
                  <div class="category-toggle">
                    <div class="toggle-locked">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p class="category-description">
                  Required for core functionality like authentication, security, and preferences. These cannot be disabled.
                </p>
                <button
                  class="expand-details"
                  @click="toggleDetails('essential')"
                >
                  {{ expandedCategories.essential ? 'Hide details' : 'View details' }}
                  <svg
                    :class="{ rotated: expandedCategories.essential }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>
                <Transition name="expand">
                  <div
                    v-if="expandedCategories.essential"
                    class="category-details"
                  >
                    <ul>
                      <li><strong>Session cookies</strong> - Keep you logged in</li>
                      <li><strong>CSRF tokens</strong> - Protect against attacks</li>
                      <li><strong>Theme preference</strong> - Remember dark/light mode</li>
                    </ul>
                  </div>
                </Transition>
              </div>

              <!-- Functional -->
              <div class="category-card">
                <div class="category-header">
                  <div class="category-icon functional">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </div>
                  <div class="category-info">
                    <h4>Functional</h4>
                    <span class="category-badge optional">Optional</span>
                  </div>
                  <div class="category-toggle">
                    <label class="toggle">
                      <input
                        v-model="consents.functional"
                        type="checkbox"
                      >
                      <span class="slider" />
                    </label>
                  </div>
                </div>
                <p class="category-description">
                  Remember your preferences and provide enhanced features like chat history and project settings.
                </p>
                <button
                  class="expand-details"
                  @click="toggleDetails('functional')"
                >
                  {{ expandedCategories.functional ? 'Hide details' : 'View details' }}
                  <svg
                    :class="{ rotated: expandedCategories.functional }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>
                <Transition name="expand">
                  <div
                    v-if="expandedCategories.functional"
                    class="category-details"
                  >
                    <ul>
                      <li><strong>Preference cookies</strong> - Remember settings</li>
                      <li><strong>Chat history</strong> - Store conversation data locally</li>
                      <li><strong>Project state</strong> - Remember last viewed items</li>
                    </ul>
                  </div>
                </Transition>
              </div>

              <!-- Analytics -->
              <div class="category-card">
                <div class="category-header">
                  <div class="category-icon analytics">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                    </svg>
                  </div>
                  <div class="category-info">
                    <h4>Analytics</h4>
                    <span class="category-badge optional">Optional</span>
                  </div>
                  <div class="category-toggle">
                    <label class="toggle">
                      <input
                        v-model="consents.analytics"
                        type="checkbox"
                      >
                      <span class="slider" />
                    </label>
                  </div>
                </div>
                <p class="category-description">
                  Help us understand how you use SynthStack so we can improve the experience for everyone.
                </p>
                <button
                  class="expand-details"
                  @click="toggleDetails('analytics')"
                >
                  {{ expandedCategories.analytics ? 'Hide details' : 'View details' }}
                  <svg
                    :class="{ rotated: expandedCategories.analytics }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>
                <Transition name="expand">
                  <div
                    v-if="expandedCategories.analytics"
                    class="category-details"
                  >
                    <ul>
                      <li><strong>Google Analytics 4</strong> - Usage patterns and flows</li>
                      <li><strong>Microsoft Clarity</strong> - Session recordings and heatmaps</li>
                      <li><strong>Error tracking</strong> - Bug reports and crashes</li>
                      <li><strong>Performance</strong> - Page load times</li>
                    </ul>
                    <p class="privacy-note">
                      Data is anonymized and never sold to third parties.
                    </p>
                  </div>
                </Transition>
              </div>

              <!-- Marketing -->
              <div class="category-card">
                <div class="category-header">
                  <div class="category-icon marketing">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" />
                    </svg>
                  </div>
                  <div class="category-info">
                    <h4>Marketing</h4>
                    <span class="category-badge optional">Optional</span>
                  </div>
                  <div class="category-toggle">
                    <label class="toggle">
                      <input
                        v-model="consents.marketing"
                        type="checkbox"
                      >
                      <span class="slider" />
                    </label>
                  </div>
                </div>
                <p class="category-description">
                  Show you relevant content and measure ad effectiveness. You can always opt out.
                </p>
                <button
                  class="expand-details"
                  @click="toggleDetails('marketing')"
                >
                  {{ expandedCategories.marketing ? 'Hide details' : 'View details' }}
                  <svg
                    :class="{ rotated: expandedCategories.marketing }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>
                <Transition name="expand">
                  <div
                    v-if="expandedCategories.marketing"
                    class="category-details"
                  >
                    <ul>
                      <li><strong>Conversion tracking</strong> - Measure campaign effectiveness</li>
                      <li><strong>Retargeting</strong> - Show relevant ads on other sites</li>
                      <li><strong>Social pixels</strong> - Improve ad targeting</li>
                    </ul>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-links">
              <router-link to="/privacy">
                Privacy Policy
              </router-link>
              <router-link to="/terms">
                Terms of Service
              </router-link>
              <router-link to="/cookies">
                Cookie Policy
              </router-link>
              <router-link to="/security">
                Security
              </router-link>
            </div>
            <div class="footer-actions">
              <button
                class="btn-reject-all"
                @click="rejectNonEssential"
              >
                Reject Non-Essential
              </button>
              <button
                class="btn-save"
                @click="savePreferences"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating Settings Button (always visible after consent) -->
    <Transition name="fade">
      <button
        v-if="!showBanner && hasConsented"
        class="cookie-settings-fab"
        aria-label="Cookie settings"
        @click="openSettings"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-.34-.02-.68-.05-1.01-.63.41-1.38.66-2.2.66-2.14 0-3.87-1.73-3.87-3.87 0-.82.25-1.57.66-2.2-.33-.03-.67-.05-1.01-.05-.34 0-.68.02-1.01.05.41.63.66 1.38.66 2.2 0 2.14-1.73 3.87-3.87 3.87-.82 0-1.57-.25-2.2-.66C6.02 11.32 6 11.66 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-.34-.02-.68-.05-1.01-.63.41-1.38.66-2.2.66-2.14 0-3.87-1.73-3.87-3.87 0-.82.25-1.57.66-2.2-.33-.03-.67-.05-1.01-.05z"
            fill="currentColor"
          />
          <circle
            cx="8"
            cy="10"
            r="1"
            fill="currentColor"
          />
          <circle
            cx="11"
            cy="14"
            r="1"
            fill="currentColor"
          />
          <circle
            cx="15"
            cy="11"
            r="1.5"
            fill="currentColor"
          />
        </svg>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Clarity from '@microsoft/clarity'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

const CONSENT_KEY = 'synthstack_cookie_consent'
const CONSENT_VERSION = '2.0'

const showBanner = ref(false)
const expandedMode = ref(false)
const hasConsented = ref(false)

const expandedCategories = reactive({
  essential: false,
  functional: false,
  analytics: false,
  marketing: false
})

const consents = reactive({
  essential: true,
  functional: true,
  analytics: false,
  marketing: false
})

function toggleDetails(category: keyof typeof expandedCategories) {
  expandedCategories[category] = !expandedCategories[category]
}

onMounted(() => {
  const saved = localStorage.getItem(CONSENT_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.version === CONSENT_VERSION) {
        Object.assign(consents, parsed.consents)
        hasConsented.value = true
        applyConsents()
      } else {
        // Version mismatch - show banner again
        showBanner.value = true
      }
    } catch {
      showBanner.value = true
    }
  } else {
    showBanner.value = true
  }

  // Listen for settings open event from footer or other components
  window.addEventListener('open-cookie-settings', openSettings)
})

function openSettings() {
  showBanner.value = true
  expandedMode.value = true
}

function acceptAll() {
  consents.functional = true
  consents.analytics = true
  consents.marketing = true
  saveAndApply()
}

function rejectAll() {
  consents.functional = false
  consents.analytics = false
  consents.marketing = false
  saveAndApply()
}

function rejectNonEssential() {
  consents.functional = false
  consents.analytics = false
  consents.marketing = false
  expandedMode.value = false
  saveAndApply()
}

function savePreferences() {
  expandedMode.value = false
  saveAndApply()
}

function saveAndApply() {
  const data = {
    version: CONSENT_VERSION,
    consents: { ...consents },
    timestamp: new Date().toISOString()
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
  showBanner.value = false
  hasConsented.value = true
  applyConsents()
}

function applyConsents() {
  // Dispatch event for analytics boot file and other components
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', {
    detail: { ...consents }
  }))

  // Google Analytics / gtag consent update (Google Consent Mode v2)
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consents.analytics ? 'granted' : 'denied',
      ad_storage: consents.marketing ? 'granted' : 'denied',
      ad_user_data: consents.marketing ? 'granted' : 'denied',
      ad_personalization: consents.marketing ? 'granted' : 'denied',
      functionality_storage: consents.functional ? 'granted' : 'denied'
    })
  }

  // Microsoft Clarity consent update using consentV2 API
  // This provides granular control over ad and analytics storage
  try {
    if (consents.analytics) {
      // Grant analytics consent with granular options
      Clarity.consentV2({
        ad_Storage: consents.marketing ? 'granted' : 'denied',
        analytics_Storage: 'granted'
      })
    } else {
      // Deny analytics consent
      Clarity.consentV2({
        ad_Storage: 'denied',
        analytics_Storage: 'denied'
      })
    }
  } catch (e) {
    // Clarity may not be initialized yet, that's okay
    devLog('[CookieConsent] Clarity consent will be applied when initialized')
  }
}

// Type declarations
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}
</script>

<style lang="scss" scoped>
// Banner styles
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}

.banner-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%);
  border-radius: 12px;
  color: #f97316;

  svg {
    width: 24px;
    height: 24px;
  }
}

.banner-text {
  flex: 1;

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #e2e8f0;
    line-height: 1.5;
  }

  .link-btn {
    background: none;
    border: none;
    color: #f97316;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: #fb923c;
    }
  }

  a {
    color: #f97316;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: #fb923c;
    }
  }
}

.banner-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn-reject {
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
    color: #e2e8f0;
  }
}

.btn-accept {
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
  }
}

// Modal styles
.cookie-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.cookie-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .header-title {
    h2 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
      color: #94a3b8;
    }
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f8fafc;
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.privacy-summary {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 14px;
  margin-bottom: 1.5rem;

  .summary-icon {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    color: #60a5fa;

    svg {
      width: 24px;
      height: 24px;
    }
  }

  .summary-text {
    h4 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: #f8fafc;
    }

    p {
      margin: 0;
      font-size: 0.8125rem;
      color: #94a3b8;
      line-height: 1.5;
    }
  }
}

.cookie-categories {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &.essential {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.2);
  }
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  color: #10b981;

  svg {
    width: 20px;
    height: 20px;
  }

  &.functional {
    color: #ea580c;
    background: rgba(234, 88, 12, 0.1);
  }

  &.analytics {
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }

  &.marketing {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
  }
}

.category-info {
  flex: 1;

  h4 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f8fafc;
  }

  .category-badge {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    margin-top: 0.25rem;

    &.required {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }

    &.optional {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
    }
  }
}

.category-toggle {
  .toggle-locked {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(16, 185, 129, 0.15);
    border-radius: 8px;
    color: #34d399;
  }
}

// Toggle switch
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    }

    &:checked + .slider:before {
      transform: translateX(22px);
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 26px;
    transition: all 0.3s ease;

    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
}

.category-description {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: #94a3b8;
  line-height: 1.5;
}

.expand-details {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.75rem;
  padding: 0;
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }

  &:hover {
    color: #94a3b8;
  }
}

.category-details {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;

  ul {
    margin: 0;
    padding: 0 0 0 1.25rem;
    list-style-type: disc;

    li {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin-bottom: 0.35rem;

      strong {
        color: #cbd5e1;
      }
    }
  }

  .privacy-note {
    margin: 0.75rem 0 0;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-links {
  display: flex;
  gap: 1rem;

  a {
    font-size: 0.75rem;
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: #94a3b8;
    }
  }
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-reject-all {
  padding: 0.625rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.25);
    color: #e2e8f0;
  }
}

.btn-save {
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
  }
}

// Floating settings button
.cookie-settings-fab {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 999;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  svg {
    width: 22px;
    height: 22px;
  }

  &:hover {
    background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
    border-color: rgba(255, 255, 255, 0.2);
    color: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
}

// Transitions
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding: 0;
}

// Mobile responsive
@media (max-width: 600px) {
  .banner-content {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }

  .banner-icon {
    margin: 0 auto;
  }

  .banner-actions {
    width: 100%;
    flex-direction: column;

    button {
      width: 100%;
    }
  }

  .cookie-modal {
    max-height: 95vh;
    border-radius: 16px 16px 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-width: 100%;
  }

  .modal-footer {
    flex-direction: column;
    gap: 0.75rem;
  }

  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }

  .footer-actions {
    width: 100%;
    flex-direction: column;

    button {
      width: 100%;
    }
  }

  .cookie-settings-fab {
    bottom: 1rem;
    left: 1rem;
    width: 40px;
    height: 40px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

</style>

<!-- Unscoped light mode styles - needed because :global() in scoped blocks doesn't cascade to nested selectors -->
<style lang="scss">
.body--light {
  .cookie-banner {
    background: rgba(255, 255, 255, 0.98) !important;
    border-top-color: rgba(0, 0, 0, 0.1) !important;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.1) !important;
  }

  .banner-text p {
    color: rgba(0, 0, 0, 0.75) !important;
  }

  .banner-content .btn-reject {
    border-color: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.6);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.3);
      color: rgba(0, 0, 0, 0.8);
    }
  }

  .cookie-modal-overlay {
    background: rgba(0, 0, 0, 0.5) !important;
  }

  .cookie-modal {
    background: #ffffff !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2) !important;
  }

  .modal-header {
    border-bottom-color: rgba(0, 0, 0, 0.08) !important;

    .header-title {
      h2 {
        color: rgba(0, 0, 0, 0.9) !important;
      }

      p {
        color: rgba(0, 0, 0, 0.6) !important;
      }
    }

    .close-btn {
      background: rgba(0, 0, 0, 0.05) !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
      color: rgba(0, 0, 0, 0.5) !important;

      &:hover {
        background: rgba(0, 0, 0, 0.1) !important;
        color: rgba(0, 0, 0, 0.8) !important;
      }
    }
  }

  .privacy-summary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%) !important;
    border-color: rgba(59, 130, 246, 0.15) !important;

    .summary-text {
      h4 {
        color: rgba(0, 0, 0, 0.9) !important;
      }

      p {
        color: rgba(0, 0, 0, 0.6) !important;
      }
    }
  }

  .category-card {
    background: rgba(0, 0, 0, 0.02) !important;
    border-color: rgba(0, 0, 0, 0.08) !important;

    &:hover {
      background: rgba(0, 0, 0, 0.04) !important;
      border-color: rgba(0, 0, 0, 0.12) !important;
    }

    &.essential {
      background: rgba(16, 185, 129, 0.06) !important;
      border-color: rgba(16, 185, 129, 0.15) !important;
    }
  }

  .category-info {
    h4 {
      color: rgba(0, 0, 0, 0.9) !important;
    }
  }

  .category-description {
    color: rgba(0, 0, 0, 0.6) !important;
  }

  .expand-details {
    color: rgba(0, 0, 0, 0.5) !important;

    &:hover {
      color: rgba(0, 0, 0, 0.7) !important;
    }
  }

  .category-details {
    background: rgba(0, 0, 0, 0.03) !important;

    ul li {
      color: rgba(0, 0, 0, 0.6) !important;

      strong {
        color: rgba(0, 0, 0, 0.8) !important;
      }
    }

    .privacy-note {
      border-top-color: rgba(0, 0, 0, 0.08) !important;
      color: rgba(0, 0, 0, 0.5) !important;
    }
  }

  .category-icon {
    background: rgba(0, 0, 0, 0.05) !important;
  }

  .toggle .slider {
    background: rgba(0, 0, 0, 0.15) !important;
  }

  .modal-footer {
    background: rgba(0, 0, 0, 0.02) !important;
    border-top-color: rgba(0, 0, 0, 0.08) !important;
  }

  .footer-links a {
    color: rgba(0, 0, 0, 0.5) !important;

    &:hover {
      color: rgba(0, 0, 0, 0.75) !important;
    }
  }

  .btn-reject-all {
    border-color: rgba(0, 0, 0, 0.2) !important;
    color: rgba(0, 0, 0, 0.6) !important;

    &:hover {
      background: rgba(0, 0, 0, 0.05) !important;
      border-color: rgba(0, 0, 0, 0.3) !important;
      color: rgba(0, 0, 0, 0.8) !important;
    }
  }

  .cookie-settings-fab {
    background: rgba(255, 255, 255, 0.9) !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
    color: rgba(0, 0, 0, 0.5) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;

    &:hover {
      background: #ffffff !important;
      border-color: rgba(0, 0, 0, 0.15) !important;
      color: rgba(0, 0, 0, 0.8) !important;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
    }
  }
}
</style>
