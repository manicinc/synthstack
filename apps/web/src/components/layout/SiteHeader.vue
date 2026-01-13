<template>
  <header class="site-header">
    <nav
      class="nav-container"
      role="navigation"
      aria-label="Main navigation"
    >
      <router-link
        to="/"
        class="logo"
      >
        <AnimatedLogo
          :size="32"
          class="logo-icon"
        />
        <span>{{ name.toLowerCase() }}</span>
      </router-link>

      <ul class="nav-links">
        <li>
          <router-link to="/pricing">
            Pricing
          </router-link>
        </li>
        <li>
          <router-link to="/docs">
            Docs
          </router-link>
        </li>
        <li v-if="social.github">
          <a
            :href="social.github"
            target="_blank"
          >GitHub</a>
        </li>
        <li
          ref="aboutDropdownEl"
          class="about-dropdown"
          @mouseenter="aboutOpen = true"
          @mouseleave="aboutOpen = false"
        >
          <button
            type="button"
            class="about-toggle"
            :aria-expanded="aboutOpen"
            aria-haspopup="menu"
            @click="aboutOpen = !aboutOpen"
          >
            Resources
            <span
              class="chevron"
              :class="{ open: aboutOpen }"
            >⌄</span>
          </button>
          <Transition name="dropdown-fade">
            <div
              v-if="aboutOpen"
              class="about-menu"
            >
              <router-link
                to="/docs"
                @click="aboutOpen = false"
              >
                Documentation
              </router-link>
              <router-link
                to="/blog"
                @click="aboutOpen = false"
              >
                Blog
              </router-link>
              <router-link
                to="/community"
                @click="aboutOpen = false"
              >
                Community
              </router-link>
              <router-link
                to="/about"
                @click="aboutOpen = false"
              >
                About
              </router-link>
              <router-link
                to="/contact"
                @click="aboutOpen = false"
              >
                Contact
              </router-link>
              <a
                v-if="social.discord"
                :href="social.discord"
                target="_blank"
                @click="aboutOpen = false"
              >Discord</a>
            </div>
          </Transition>
        </li>
      </ul>

      <div class="nav-actions">
        <button
          class="theme-toggle-btn"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          @click="toggleTheme"
        >
          <svg
            v-if="isDark"
            class="theme-icon sun"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
              fill="currentColor"
            />
            <path
              d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            class="theme-icon moon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z"
              fill="currentColor"
            />
          </svg>
        </button>
        <LanguageSwitcher
          v-if="showLanguageSwitcher"
          variant="compact"
        />
        <!-- Theme Preset Dropdown -->
        <div
          ref="themeDropdownEl"
          class="theme-preset-dropdown"
          @mouseenter="themeDropdownOpen = true"
          @mouseleave="themeDropdownOpen = false"
        >
          <button
            type="button"
            class="theme-preset-btn"
            :title="'Theme: ' + (currentPreset?.name || 'Default')"
            :aria-expanded="themeDropdownOpen"
            aria-haspopup="menu"
            @click="themeDropdownOpen = !themeDropdownOpen"
          >
            <svg
              class="palette-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zM5.5 12c-.83 0-1.5-.67-1.5-1.5S4.67 9 5.5 9 7 9.67 7 10.5 6.33 12 5.5 12zm3-4C7.67 8 7 7.33 7 6.5S7.67 5 8.5 5s1.5.67 1.5 1.5S9.33 8 8.5 8zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 5 15.5 5s1.5.67 1.5 1.5S16.33 8 15.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                fill="currentColor"
              />
            </svg>
          </button>
          <Transition name="dropdown-fade">
            <div
              v-if="themeDropdownOpen"
              class="theme-preset-menu"
              role="menu"
            >
              <div class="preset-menu-header">Theme Presets</div>
              <div class="preset-list">
                <button
                  v-for="preset in availablePresets"
                  :key="preset.slug"
                  type="button"
                  class="preset-option"
                  :class="{ active: currentPreset?.slug === preset.slug }"
                  role="menuitem"
                  @click="selectPreset(preset.slug)"
                >
                  <div class="preset-colors">
                    <span
                      class="color-dot"
                      :style="{ background: preset.colors.primary }"
                    />
                    <span
                      class="color-dot"
                      :style="{ background: preset.colors.secondary }"
                    />
                    <span
                      class="color-dot"
                      :style="{ background: preset.colors.accent }"
                    />
                  </div>
                  <span class="preset-name">{{ preset.name }}</span>
                  <span
                    v-if="preset.isPremium"
                    class="premium-badge"
                  >PRO</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
        <a
          :href="adminUrl"
          target="_blank"
          class="admin-btn"
        >Admin</a>
        <q-btn
          flat
          label="Sign In"
          to="/auth/login"
          class="sign-in-btn"
        />
        <q-btn
          unelevated
          color="primary"
          label="Get Started"
          to="/app"
        />
      </div>

      <div class="nav-mobile-actions">
        <button 
          class="theme-toggle-btn" 
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" 
          :title="isDark ? 'Light mode' : 'Dark mode'"
          @click="toggleTheme"
        >
          <svg
            v-if="isDark"
            class="theme-icon sun"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
              fill="currentColor"
            />
            <path
              d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            class="theme-icon moon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z"
              fill="currentColor"
            />
          </svg>
        </button>
        <!-- Theme Preset Button -->
        <button
          type="button"
          class="theme-preset-btn mobile-preset-btn"
          :title="'Theme: ' + (currentPreset?.name || 'Default')"
          @click="showThemeDialog = true"
        >
          <svg
            class="palette-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zM5.5 12c-.83 0-1.5-.67-1.5-1.5S4.67 9 5.5 9 7 9.67 7 10.5 6.33 12 5.5 12zm3-4C7.67 8 7 7.33 7 6.5S7.67 5 8.5 5s1.5.67 1.5 1.5S9.33 8 8.5 8zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 5 15.5 5s1.5.67 1.5 1.5S16.33 8 15.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          class="hamburger-btn"
          aria-label="Open menu"
          @click="mobileMenu = true"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>

    <Teleport to="body">
      <Transition name="slide-menu">
        <div
          v-if="mobileMenu"
          class="mobile-menu-overlay"
          @click.self="mobileMenu = false"
        >
          <div class="mobile-menu">
            <div class="mobile-menu-header">
              <div class="mobile-menu-title">
                <span class="menu-label">Menu</span>
                <span class="menu-subtitle">synthstack</span>
              </div>
              <div class="mobile-header-actions">
                <button
                  class="mobile-theme-toggle"
                  :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                  :title="isDark ? 'Light mode' : 'Dark mode'"
                  @click="toggleTheme"
                >
                  <svg
                    v-if="isDark"
                    class="theme-icon sun"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      fill="currentColor"
                    />
                    <path
                      d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  <svg
                    v-else
                    class="theme-icon moon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <LanguageSwitcher
                  v-if="showLanguageSwitcher"
                  variant="compact"
                />
                <button
                  class="close-btn"
                  aria-label="Close menu"
                  @click="mobileMenu = false"
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
            </div>
            
            <nav class="mobile-nav">
              <router-link
                to="/pricing"
                class="mobile-nav-link"
                @click="mobileMenu = false"
              >
                Pricing
              </router-link>
              <router-link
                to="/examples"
                class="mobile-nav-link"
                @click="mobileMenu = false"
              >
                Examples
              </router-link>
              <a
                href="https://github.com/synthstack/synthstack"
                target="_blank"
                class="mobile-nav-link"
                @click="mobileMenu = false"
              >
                GitHub
              </a>
              <router-link
                to="/community"
                class="mobile-nav-link"
                @click="mobileMenu = false"
              >
                Community
              </router-link>
              <router-link
                to="/about"
                class="mobile-nav-link secondary"
                @click="mobileMenu = false"
              >
                About
              </router-link>
              <router-link
                to="/blog"
                class="mobile-nav-link secondary"
                @click="mobileMenu = false"
              >
                Blog
              </router-link>
              <router-link
                to="/docs"
                class="mobile-nav-link secondary"
                @click="mobileMenu = false"
              >
                Documentation
              </router-link>
              <router-link
                to="/contact"
                class="mobile-nav-link secondary"
                @click="mobileMenu = false"
              >
                Contact
              </router-link>
              <a
                href="https://discord.gg/synthstack"
                target="_blank"
                class="mobile-nav-link secondary"
                @click="mobileMenu = false"
              >Discord</a>
              <a
                :href="adminUrl"
                target="_blank"
                class="mobile-nav-link admin-link"
                @click="mobileMenu = false"
              >Admin Panel</a>
            </nav>
            
            <div class="mobile-menu-footer">
              <router-link
                to="/auth/login"
                class="mobile-sign-in"
                @click="mobileMenu = false"
              >
                Sign In
              </router-link>
              <router-link
                to="/app"
                class="mobile-cta"
                @click="mobileMenu = false"
              >
                Get Started Free
              </router-link>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="showThemeDialog"
          class="theme-dialog-overlay"
          @click.self="showThemeDialog = false"
        >
          <div
            class="theme-preset-menu theme-preset-menu--dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Theme presets"
          >
            <div class="theme-dialog-header">
              <div class="theme-dialog-title">Theme Presets</div>
              <button
                type="button"
                class="theme-dialog-close"
                aria-label="Close"
                @click="showThemeDialog = false"
              >
                ×
              </button>
            </div>
            <div class="preset-list">
              <button
                v-for="preset in availablePresets"
                :key="preset.slug"
                type="button"
                class="preset-option"
                :class="{ active: currentPreset?.slug === preset.slug }"
                @click="selectPreset(preset.slug)"
              >
                <div class="preset-colors">
                  <span
                    class="color-dot"
                    :style="{ background: preset.colors.primary }"
                  />
                  <span
                    class="color-dot"
                    :style="{ background: preset.colors.secondary }"
                  />
                  <span
                    class="color-dot"
                    :style="{ background: preset.colors.accent }"
                  />
                </div>
                <span class="preset-name">{{ preset.name }}</span>
                <span
                  v-if="preset.isPremium"
                  class="premium-badge"
                >PRO</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useFeatureStore } from '@/stores/features'
import { useBranding } from '@/composables/useBranding'
import { themePresets } from '@/config/themePresets'
import AnimatedLogo from '@/components/ui/AnimatedLogo.vue'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'

const themeStore = useThemeStore()
const featureStore = useFeatureStore()
const { name, social, demo } = useBranding()
// demo is a computed ref, so access its value
const adminUrl = computed(() => demo.value.adminUrl)
const mobileMenu = ref(false)
const aboutOpen = ref(false)
const themeDropdownOpen = ref(false)
const showThemeDialog = ref(false)

const aboutDropdownEl = ref<HTMLElement | null>(null)
const themeDropdownEl = ref<HTMLElement | null>(null)

const isDark = computed(() => themeStore.isDark)
const showLanguageSwitcher = computed(() => featureStore.hasLanguageSwitching)
const currentPreset = computed(() => themeStore.currentPreset)
const availablePresets = computed(() => Object.values(themePresets))

function toggleTheme() {
  themeStore.toggleDarkMode()
}

function selectPreset(slug: string) {
  themeStore.setPreset(slug)
  themeDropdownOpen.value = false
  showThemeDialog.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return

  if (showThemeDialog.value) {
    showThemeDialog.value = false
    return
  }
  if (themeDropdownOpen.value) {
    themeDropdownOpen.value = false
    return
  }
  if (aboutOpen.value) {
    aboutOpen.value = false
    return
  }
  if (mobileMenu.value) {
    mobileMenu.value = false
  }
}

function handleGlobalClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (!target) return

  if (aboutOpen.value && aboutDropdownEl.value && !aboutDropdownEl.value.contains(target)) {
    aboutOpen.value = false
  }

  if (themeDropdownOpen.value && themeDropdownEl.value && !themeDropdownEl.value.contains(target)) {
    themeDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleGlobalClick)
})
</script>


<style scoped lang="scss">
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--lp-bg, var(--bg-base, #09090b));
  border-bottom: 1px solid var(--lp-border, var(--border-default, rgba(255, 255, 255, 0.1)));
  transition: top 0.3s ease;
}


.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--lp-text, #111);
  text-decoration: none;
  font-weight: 700;
  font-size: 1.25rem;

  .logo-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
}

.nav-links {
  display: flex;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
  a {
    color: var(--lp-text-secondary, #444);
    text-decoration: none;
    font-weight: 500;
    &:hover, &:focus { color: var(--lp-primary, #0d9488); }
    &.router-link-active { color: var(--lp-primary, #0d9488); }
  }
  @media (max-width: 900px) { display: none; }
}

.about-dropdown {
  position: relative;

  .about-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--lp-text-secondary, #444);
    font-weight: 500;
    font-size: 1rem;
  }

  .chevron {
    transition: transform 0.2s ease;
    font-size: 0.9rem;
  }
  .chevron.open {
    transform: rotate(180deg);
  }

  .about-menu {
    position: absolute;
    top: 120%;
    left: 0;
    min-width: 200px;
    background: var(--lp-bg, #fff);
    border: 1px solid var(--lp-border, #e0e0e0);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    padding: 10px;
    display: grid;
    gap: 6px;
    z-index: 1000;

    a, :deep(a) {
      color: var(--lp-text, #111);
      text-decoration: none;
      font-weight: 600;
      padding: 8px 10px;
      border-radius: 8px;
      &:hover { background: var(--lp-bg-alt-hover, #f0f0f0); }
    }
  }
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  .sign-in-btn { color: var(--lp-text, #111); }
  @media (max-width: 900px) { display: none; }
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--surface-2, transparent);
  border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    background: var(--surface-hover, rgba(255, 255, 255, 0.05));
    border-color: var(--border-strong, rgba(255, 255, 255, 0.15));
    transform: scale(1.05);
  }
  &:active { transform: scale(0.95); }
  .theme-icon { width: 22px; height: 22px; }
  .sun { color: #f59e0b; }
  .moon { color: #3b82f6; }
}

.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  width: 44px;
  height: 44px;
  justify-content: center;
  align-items: center;
  background: var(--surface-2, transparent);
  border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  span { display: block; width: 18px; height: 2px; background: var(--text-primary, #fafafa); border-radius: 1px; }
  &:hover {
    background: var(--surface-hover, rgba(255, 255, 255, 0.05));
    border-color: var(--border-strong, rgba(255, 255, 255, 0.15));
  }
  @media (max-width: 900px) { display: flex; }
}

.nav-mobile-actions {
  display: none;
  align-items: center;
  gap: 10px;
  @media (max-width: 900px) { display: flex; }
}

.mobile-menu-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  backdrop-filter: blur(3px); z-index: 999;
  display: flex; justify-content: center; align-items: flex-start;
  padding: clamp(12px, 4vw, 24px);
}
.mobile-menu {
  width: min(520px, 96vw);
  background: var(--lp-bg, #fff);
  max-height: calc(100vh - 2 * clamp(12px, 4vw, 24px));
  display: flex; flex-direction: column;
  border: 1px solid var(--lp-border, #e0e0e0);
  box-shadow: 0 18px 50px rgba(0,0,0,0.18);
  padding: 20px;
  border-radius: 16px;
  overflow: hidden;
}
.mobile-menu-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--lp-border, #e0e0e0);
  .mobile-menu-title { display: flex; flex-direction: column; gap: 6px; }
  .menu-label { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--lp-text-secondary, #555); }
  .menu-subtitle { font-size: 1.1rem; font-weight: 800; color: var(--lp-text, #111); }
  .mobile-header-actions { display: flex; gap: 8px; align-items: center; }
}
.mobile-theme-toggle, .close-btn {
  width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); background: var(--surface-2, transparent); display: flex; justify-content: center; align-items: center; cursor: pointer;
  &:hover { background: var(--surface-hover, rgba(255, 255, 255, 0.05)); }
}
.mobile-nav { display: flex; flex-direction: column; gap: 10px; }
.mobile-nav-link {
  display: block; padding: 12px 14px; border-radius: 10px; background: var(--lp-bg-alt, #f8f9fa);
  color: var(--lp-text, #111); text-decoration: none; font-weight: 600; border: 1px solid var(--lp-border, #e0e0e0);
  &:hover { background: var(--lp-bg-alt-hover, #f0f0f0); }
  &.secondary { background: transparent; border-style: dashed; color: var(--lp-text-secondary, #444); }
}
.mobile-nav-divider { height: 1px; background: var(--lp-border, #e0e0e0); margin: 8px 0; }

.admin-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  color: #fff;
  background: linear-gradient(135deg,
    rgba(13, 148, 136, 1) 0%,
    rgba(20, 184, 166, 1) 50%,
    rgba(6, 182, 212, 1) 100%
  );
  border: none;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(13, 148, 136, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  // Shine effect
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.5s ease;
  }

  // Glow effect on hover
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 10px;
    background: linear-gradient(135deg,
      rgba(13, 148, 136, 0.6) 0%,
      rgba(6, 182, 212, 0.6) 100%
    );
    z-index: -1;
    opacity: 0;
    filter: blur(12px);
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
      0 8px 24px rgba(13, 148, 136, 0.4),
      0 4px 12px rgba(6, 182, 212, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);

    &::before {
      left: 100%;
    }

    &::after {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  // Admin icon
  &::before {
    font-family: 'Material Icons';
    content: '\e8b8'; // dashboard icon
    font-size: 1rem;
    margin-right: 2px;
  }
}
.mobile-nav-link.admin-link {
  position: relative;
  background: linear-gradient(135deg,
    rgba(13, 148, 136, 1) 0%,
    rgba(20, 184, 166, 1) 50%,
    rgba(6, 182, 212, 1) 100%
  );
  color: #fff !important;
  border: none;
  overflow: hidden;
  box-shadow:
    0 2px 8px rgba(13, 148, 136, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &::before {
    content: '\e8b8'; // dashboard icon
    font-family: 'Material Icons';
    font-size: 1.125rem;
    margin-right: 8px;
  }

  &:hover {
    background: linear-gradient(135deg,
      rgba(13, 148, 136, 1.1) 0%,
      rgba(20, 184, 166, 1.1) 50%,
      rgba(6, 182, 212, 1.1) 100%
    );
    box-shadow:
      0 4px 16px rgba(13, 148, 136, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transform: scale(1.01);
  }
}
.mobile-menu-footer {
  margin-top: auto; display: flex; flex-direction: column; gap: 10px;
  .mobile-sign-in { text-decoration: none; color: var(--lp-text, #111); font-weight: 600; text-align: center; }
  .mobile-cta { text-decoration: none; text-align: center; padding: 12px; border-radius: 10px; background: var(--lp-primary, #0d9488); color: #fff; font-weight: 700; }
}

// Dropdown fade transition
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// Dialog fade transition
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

// Theme Preset Dropdown
.theme-preset-dropdown {
  position: relative;
}

.theme-preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: var(--surface-2, transparent);
  border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  .palette-icon {
    width: 20px;
    height: 20px;
    color: var(--text-secondary, #666);
    transition: color 0.2s ease;
  }

  &:hover {
    background: var(--surface-hover, rgba(255, 255, 255, 0.05));
    border-color: var(--border-strong, rgba(255, 255, 255, 0.15));
    transform: scale(1.05);

    .palette-icon {
      color: var(--lp-primary, #0d9488);
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

.theme-preset-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--lp-bg, #fff);
  border: 1px solid var(--lp-border, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 1000;

  .preset-menu-header {
    padding: 8px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--lp-text-secondary, #666);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--lp-border, rgba(0, 0, 0, 0.08));
    margin-bottom: 4px;
  }

  .preset-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 320px;
    overflow-y: auto;
  }

  .preset-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    width: 100%;
    text-align: left;

    &:hover {
      background: var(--lp-bg-alt, rgba(0, 0, 0, 0.04));
    }

    &.active {
      background: var(--lp-primary-muted, rgba(13, 148, 136, 0.1));

      .preset-name {
        color: var(--lp-primary, #0d9488);
        font-weight: 600;
      }
    }

    .preset-colors {
      display: flex;
      gap: 3px;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .preset-name {
      flex: 1;
      font-size: 0.875rem;
      color: var(--lp-text, #111);
    }

    .premium-badge {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
    }
  }
}

.mobile-preset-btn {
  .palette-icon {
    width: 18px;
    height: 18px;
  }
}

// Mobile theme dialog
.theme-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1001;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}

.theme-preset-menu--dialog {
  position: relative;
  top: auto;
  right: auto;
  width: min(440px, calc(100vw - 32px));
  max-height: min(75vh, 560px);
  margin: 0 auto;
}

.theme-preset-menu--dialog .preset-list {
  max-height: min(60vh, 420px);
}

.theme-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--lp-border, rgba(0, 0, 0, 0.08));
  margin: -8px -8px 8px;
}

.theme-dialog-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lp-text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.theme-dialog-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--lp-border, rgba(0, 0, 0, 0.1));
  background: var(--lp-bg-alt, rgba(0, 0, 0, 0.04));
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lp-text, #111);

  &:hover {
    background: var(--lp-bg-alt-hover, rgba(0, 0, 0, 0.07));
  }
}
</style>

<!-- Unscoped styles for light mode - maximum specificity -->
<style lang="scss">
// FORCE light mode header text to be visible
body.body--light {
  .site-header {
    background: var(--bg-base, #ffffff) !important;
    border-bottom-color: rgba(0, 0, 0, 0.08) !important;
    
    .logo {
      color: #18181b !important;
      -webkit-text-fill-color: #18181b !important;
      
      span {
        color: #18181b !important;
        -webkit-text-fill-color: #18181b !important;
      }
    }
    
    .nav-links {
      a, button, span {
        color: #3f3f46 !important;
        -webkit-text-fill-color: #3f3f46 !important;
      }
      
      a:hover, a:focus {
        color: #0d9488 !important;
        -webkit-text-fill-color: #0d9488 !important;
      }
    }
    
    .about-toggle {
      color: #3f3f46 !important;
      -webkit-text-fill-color: #3f3f46 !important;
      
      .chevron {
        color: #3f3f46 !important;
        -webkit-text-fill-color: #3f3f46 !important;
      }
    }
    
    .preset-name {
      color: #18181b !important;
      -webkit-text-fill-color: #18181b !important;
    }
  }
}
</style>
