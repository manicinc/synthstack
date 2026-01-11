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
          class="about-dropdown"
          @mouseenter="aboutOpen = true"
          @mouseleave="aboutOpen = false"
        >
          <button class="about-toggle">
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
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useFeatureStore } from '@/stores/features'
import { useQuasar } from 'quasar'
import { useBranding } from '@/composables/useBranding'
import AnimatedLogo from '@/components/ui/AnimatedLogo.vue'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'

const themeStore = useThemeStore()
const featureStore = useFeatureStore()
const $q = useQuasar()
const { name, mark, social, links, demo } = useBranding()
// demo is a computed ref, so access its value
const adminUrl = computed(() => demo.value.adminUrl)
const mobileMenu = ref(false)
const aboutOpen = ref(false)

const isDark = computed(() => themeStore.isDark)
const showLanguageSwitcher = computed(() => featureStore.hasLanguageSwitching)

function toggleTheme() {
  themeStore.toggleDarkMode()
  $q.dark.set(themeStore.isDark)
}
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
</style>

