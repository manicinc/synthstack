<template>
  <Teleport to="body">
    <!-- Newsletter Popup Modal -->
    <Transition name="slide-up-fade">
      <div
        v-if="showPopup && !dismissed"
        class="newsletter-popup"
        :class="{ 'popup-minimized': minimized }"
      >
        <!-- Minimized state (just an icon) -->
        <div
          v-if="minimized"
          class="popup-minimized-trigger"
          @click="minimized = false"
        >
          <q-icon name="mail" size="24px" />
          <span class="pulse-dot" />
        </div>

        <!-- Full popup -->
        <div v-else class="popup-content">
          <button
            class="popup-close"
            aria-label="Close"
            @click="handleDismiss('close')"
          >
            <q-icon name="close" size="18px" />
          </button>

          <div class="popup-header">
            <div class="popup-icon">
              <q-icon name="auto_awesome" size="28px" />
            </div>
            <h3>Stay in the Loop</h3>
            <p>Get weekly updates on SynthStack features, tips, and exclusive offers.</p>
          </div>

          <!-- Newsletter Form Embed (EmailOctopus or Beehiiv) -->
          <div class="popup-form">
            <!-- EmailOctopus -->
            <div
              v-if="provider === 'emailoctopus'"
              ref="formContainer"
              class="emailoctopus-form-container"
            />
            <!-- Beehiiv -->
            <iframe
              v-else-if="provider === 'beehiiv' && beehiivPublicationId"
              :src="`https://embeds.beehiiv.com/subscribe/${beehiivPublicationId}?slim=true`"
              data-test-id="beehiiv-embed"
              height="52"
              frameborder="0"
              scrolling="no"
              class="beehiiv-embed"
            />
          </div>

          <div class="popup-footer">
            <button
              class="btn-remind"
              @click="handleDismiss('later')"
            >
              Remind me later
            </button>
            <button
              class="btn-never"
              @click="handleDismiss('never')"
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating trigger button when popup is hidden -->
    <Transition name="fade">
      <button
        v-if="showFloatingTrigger && !showPopup && canShowPopup"
        class="newsletter-fab"
        aria-label="Subscribe to newsletter"
        @click="showPopup = true"
      >
        <q-icon name="mail_outline" size="22px" />
        <span class="fab-tooltip">Subscribe to Newsletter</span>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  /** Show floating button to reopen */
  showFloatingTrigger?: boolean
  /** Delay before showing popup (ms) */
  delay?: number
  /** Show on scroll percentage */
  showOnScroll?: number
  /** Newsletter provider: 'emailoctopus' or 'beehiiv' */
  provider?: 'emailoctopus' | 'beehiiv'
  /** Form ID from EmailOctopus */
  formId?: string
  /** Publication ID from Beehiiv */
  publicationId?: string
}>()

const STORAGE_KEY = 'synthstack_newsletter_popup'
const REMIND_LATER_DAYS = 7

// Provider detection (defaults to emailoctopus)
const provider = computed(() =>
  props.provider || (import.meta.env.VITE_NEWSLETTER_PROVIDER as string) || 'emailoctopus'
)

// EmailOctopus form ID
const formId = computed(() => props.formId || import.meta.env.VITE_EMAILOCTOPUS_FORM_ID)

// Beehiiv publication ID
const beehiivPublicationId = computed(() =>
  props.publicationId || import.meta.env.VITE_BEEHIIV_PUBLICATION_ID
)

const showPopup = ref(false)
const dismissed = ref(false)
const minimized = ref(false)
const formContainer = ref<HTMLElement | null>(null)
const formLoaded = ref(false)

const canShowPopup = computed(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return true

  try {
    const data = JSON.parse(stored)
    if (data.never) return false
    if (data.remindAt && new Date(data.remindAt) > new Date()) return false
    return true
  } catch {
    return true
  }
})

onMounted(() => {
  // Check if we should show the popup
  if (!canShowPopup.value) {
    dismissed.value = true
    return
  }

  // Show after delay or scroll
  if (props.showOnScroll) {
    window.addEventListener('scroll', handleScroll)
  } else {
    const delay = props.delay ?? 5000
    setTimeout(() => {
      if (canShowPopup.value) {
        showPopup.value = true
      }
    }, delay)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Load newsletter form when popup shows
watch(showPopup, async (show) => {
  if (show && !formLoaded.value) {
    await nextTick()
    // Only EmailOctopus needs dynamic loading; Beehiiv uses iframe
    if (provider.value === 'emailoctopus' && formId.value) {
      loadEmailOctopusForm()
    } else if (provider.value === 'beehiiv') {
      formLoaded.value = true // Iframe loads automatically
    }
  }
})

function handleScroll() {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  if (scrollPercent >= (props.showOnScroll ?? 50)) {
    showPopup.value = true
    window.removeEventListener('scroll', handleScroll)
  }
}

function loadEmailOctopusForm() {
  if (!formContainer.value || !formId.value) return

  // Create script element
  const script = document.createElement('script')
  script.src = `https://eomail5.com/form/${formId.value}.js`
  script.async = true
  script.setAttribute('data-form', formId.value)

  formContainer.value.appendChild(script)
  formLoaded.value = true
}

function handleDismiss(action: 'close' | 'later' | 'never') {
  if (action === 'never') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ never: true }))
    dismissed.value = true
  } else if (action === 'later') {
    const remindAt = new Date()
    remindAt.setDate(remindAt.getDate() + REMIND_LATER_DAYS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ remindAt: remindAt.toISOString() }))
    dismissed.value = true
  } else {
    // Just close for this session
    minimized.value = true
  }

  showPopup.value = false
}

// Expose method to programmatically show popup
defineExpose({
  show: () => {
    dismissed.value = false
    showPopup.value = true
  },
  hide: () => {
    showPopup.value = false
  }
})
</script>

<style lang="scss" scoped>
.newsletter-popup {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9998;
  width: 380px;
  max-width: calc(100vw - 48px);
}

.popup-content {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.popup-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #f8fafc;
  }
}

.popup-header {
  padding: 2rem 1.5rem 1rem;
  text-align: center;

  .popup-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    border-radius: 16px;
    color: white;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #94a3b8;
    line-height: 1.5;
  }
}

.popup-form {
  padding: 0 1.5rem;
  min-height: 80px;

  .beehiiv-embed {
    width: 100%;
    border-radius: 10px;
    background: transparent;
  }

  :deep(.emailoctopus-form) {
    .emailoctopus-form-row {
      margin-bottom: 0.75rem;
    }

    input[type="email"] {
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      color: #f8fafc;
      font-size: 0.95rem;

      &::placeholder {
        color: #64748b;
      }

      &:focus {
        outline: none;
        border-color: #6366F1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      }
    }

    button[type="submit"] {
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
      }
    }

    .emailoctopus-success-message {
      text-align: center;
      color: #10b981;
      font-weight: 500;
    }
  }
}

.popup-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 1rem;
}

.btn-remind,
.btn-never {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #94a3b8;
  }
}

// Minimized state
.popup-minimized-trigger {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border-radius: 16px;
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: scale(1.05);
  }

  .pulse-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
}

// Floating FAB
.newsletter-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9997;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border: none;
  border-radius: 16px;
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);

    .fab-tooltip {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .fab-tooltip {
    position: absolute;
    right: 100%;
    margin-right: 12px;
    padding: 0.5rem 0.75rem;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #f8fafc;
    font-size: 0.8rem;
    white-space: nowrap;
    opacity: 0;
    transform: translateX(8px);
    transition: all 0.2s ease;
    pointer-events: none;
  }
}

// Animations
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.slide-up-fade-enter-active,
.slide-up-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-up-fade-enter-from,
.slide-up-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Responsive
@media (max-width: 480px) {
  .newsletter-popup {
    bottom: 16px;
    right: 16px;
    left: 16px;
    width: auto;
    max-width: none;
  }

  .popup-header {
    padding: 1.5rem 1rem 0.75rem;
  }

  .popup-form {
    padding: 0 1rem;
  }

  .popup-footer {
    padding: 0.75rem 1rem 1rem;
  }
}
</style>

<!-- Unscoped light mode styles -->
<style lang="scss">
.body--light {
  .newsletter-popup .popup-content {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }

  .newsletter-popup .popup-close {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.5);

    &:hover {
      background: rgba(0, 0, 0, 0.1);
      color: rgba(0, 0, 0, 0.8);
    }
  }

  .newsletter-popup .popup-header {
    h3 {
      color: rgba(0, 0, 0, 0.9);
    }

    p {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .newsletter-popup .popup-form {
    :deep(.emailoctopus-form) {
      input[type="email"] {
        background: rgba(0, 0, 0, 0.03);
        border-color: rgba(0, 0, 0, 0.15);
        color: rgba(0, 0, 0, 0.9);

        &::placeholder {
          color: rgba(0, 0, 0, 0.4);
        }

        &:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      }
    }
  }

  .newsletter-popup .popup-footer {
    border-top-color: rgba(0, 0, 0, 0.08);
  }

  .newsletter-popup .btn-remind,
  .newsletter-popup .btn-never {
    color: rgba(0, 0, 0, 0.5);

    &:hover {
      color: rgba(0, 0, 0, 0.75);
    }
  }

  .newsletter-popup .popup-minimized-trigger {
    // Keep gradient colors for FAB
  }

  .newsletter-fab {
    // Keep gradient colors for FAB
    .fab-tooltip {
      background: #ffffff;
      border-color: rgba(0, 0, 0, 0.1);
      color: rgba(0, 0, 0, 0.9);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}
</style>
