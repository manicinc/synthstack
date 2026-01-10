<template>
  <button
    class="mode-toggle"
    :class="{ 'is-dark': isDark }"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleMode"
  >
    <span class="toggle-track">
      <span class="toggle-thumb">
        <transition
          name="icon-fade"
          mode="out-in"
        >
          <svg
            v-if="isDark"
            key="moon"
            class="toggle-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg
            v-else
            key="sun"
            class="toggle-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="5"
            />
            <line
              x1="12"
              y1="1"
              x2="12"
              y2="3"
            />
            <line
              x1="12"
              y1="21"
              x2="12"
              y2="23"
            />
            <line
              x1="4.22"
              y1="4.22"
              x2="5.64"
              y2="5.64"
            />
            <line
              x1="18.36"
              y1="18.36"
              x2="19.78"
              y2="19.78"
            />
            <line
              x1="1"
              y1="12"
              x2="3"
              y2="12"
            />
            <line
              x1="21"
              y1="12"
              x2="23"
              y2="12"
            />
            <line
              x1="4.22"
              y1="19.78"
              x2="5.64"
              y2="18.36"
            />
            <line
              x1="18.36"
              y1="5.64"
              x2="19.78"
              y2="4.22"
            />
          </svg>
        </transition>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useQuasar } from 'quasar'

const themeStore = useThemeStore()
const $q = useQuasar()

const isDark = computed(() => themeStore.isDark)

function toggleMode() {
  themeStore.toggleDarkMode()
  $q.dark.set(themeStore.isDark)
}
</script>

<style lang="scss" scoped>
.mode-toggle {
  position: relative;
  width: 52px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;

  &:focus-visible {
    .toggle-track {
      box-shadow: 0 0 0 2px var(--color-primary);
    }
  }
}

.toggle-track {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #87CEEB 0%, #FFD700 100%);
  border-radius: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .is-dark & {
    &::before {
      opacity: 1;
    }
  }
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 1;

  .is-dark & {
    left: calc(100% - 26px);
    background: #1e1e2e;
  }
}

.toggle-icon {
  width: 14px;
  height: 14px;
  color: #f59e0b;

  .is-dark & {
    color: #fcd34d;
  }
}

// Icon fade transition
.icon-fade-enter-active,
.icon-fade-leave-active {
  transition: all 0.15s ease;
}

.icon-fade-enter-from {
  opacity: 0;
  transform: scale(0.8) rotate(-30deg);
}

.icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.8) rotate(30deg);
}
</style>
