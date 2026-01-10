<template>
  <transition name="scroll-fade">
    <button
      v-if="visible"
      class="scroll-to-top"
      aria-label="Scroll to top"
      @click="scrollToTop"
    >
      <!-- Progress ring -->
      <svg
        class="progress-ring"
        viewBox="0 0 48 48"
      >
        <circle
          class="progress-bg"
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke-width="2"
        />
        <circle
          class="progress-fill"
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke-width="2"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
        />
      </svg>

      <!-- Arrow icon -->
      <svg
        class="arrow-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
const scrollProgress = ref(0)
const showThreshold = 300

// Circle math
const radius = 20
const circumference = 2 * Math.PI * radius

const strokeDashoffset = computed(() => {
  return circumference - (scrollProgress.value / 100) * circumference
})

/**
 * Calculate scroll progress (0-100)
 */
function updateScrollProgress() {
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  const scrollTop = window.scrollY

  visible.value = scrollTop > showThreshold

  const maxScroll = documentHeight - windowHeight
  scrollProgress.value = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
}

/**
 * Smooth scroll to top
 */
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

let scrollTimeout: ReturnType<typeof setTimeout> | null = null

function handleScroll() {
  if (scrollTimeout) return
  scrollTimeout = setTimeout(() => {
    updateScrollProgress()
    scrollTimeout = null
  }, 30)
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  updateScrollProgress()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollTimeout) clearTimeout(scrollTimeout)
})
</script>

<style lang="scss" scoped>
.scroll-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border: none;
  background: var(--bg-elevated, #fff);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 1000;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.2);

    .arrow-icon {
      color: var(--primary, #6366f1);
    }

    .progress-fill {
      stroke: var(--primary, #6366f1);
    }
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    bottom: 20px;
    right: 16px;
    width: 44px;
    height: 44px;
  }
}

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-bg {
  stroke: var(--border-default, rgba(0, 0, 0, 0.1));
}

.progress-fill {
  stroke: var(--text-secondary, #666);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.15s ease-out, stroke 0.2s ease;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: var(--text-primary, #333);
  transition: color 0.2s ease;
  z-index: 1;
}

// Transitions
.scroll-fade-enter-active,
.scroll-fade-leave-active {
  transition: all 0.3s ease;
}

.scroll-fade-enter-from,
.scroll-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

// Dark theme
:global(.body--dark) {
  .scroll-to-top {
    background: var(--bg-elevated, #1a1a1a);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .scroll-to-top {
    transition: none;
  }

  .scroll-fade-enter-active,
  .scroll-fade-leave-active {
    transition: opacity 0.15s ease;
  }

  .scroll-fade-enter-from,
  .scroll-fade-leave-to {
    transform: none;
  }
}

@media print {
  .scroll-to-top {
    display: none !important;
  }
}
</style>
