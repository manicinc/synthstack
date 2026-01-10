<template>
  <span
    ref="textRef"
    class="autonomous-text"
    :class="{
      'is-visible': isVisible,
      'is-revealed': isRevealed,
      'is-glowing': isGlowing,
      'reduced-motion': prefersReducedMotion
    }"
    :style="{ '--delay': `${delay}ms` }"
  >
    <!-- Space reservation (invisible but takes up space) -->
    <span
      class="space-holder"
      aria-hidden="true"
    >Autonomous</span>

    <!-- Main text layer with clip-path reveal -->
    <span
      class="text-layer text-content"
      aria-label="Autonomous"
    >
      Autonomous
    </span>

    <!-- Glow layer (blurred duplicate for glow effect) -->
    <span
      class="text-layer text-glow"
      aria-hidden="true"
    >
      Autonomous
    </span>

    <!-- Shimmer sweep overlay -->
    <span
      class="shimmer-sweep"
      :class="{ 'animate': isRevealed }"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface Props {
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  delay: 400
})

const textRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
const isRevealed = ref(false)
const isGlowing = ref(false)

// Check for reduced motion preference
const prefersReducedMotion = ref(false)

let timeouts: number[] = []

function startAnimation() {
  if (prefersReducedMotion.value) {
    // Instant reveal for reduced motion
    isVisible.value = true
    isRevealed.value = true
    isGlowing.value = true
    return
  }

  // Step 1: Make visible (after initial delay)
  const t1 = window.setTimeout(() => {
    isVisible.value = true
  }, props.delay)
  timeouts.push(t1)

  // Step 2: Start clip-path reveal (50ms after visible)
  const t2 = window.setTimeout(() => {
    isRevealed.value = true
  }, props.delay + 50)
  timeouts.push(t2)

  // Step 3: Start glow pulse (after reveal completes)
  const t3 = window.setTimeout(() => {
    isGlowing.value = true
  }, props.delay + 700)
  timeouts.push(t3)
}

onMounted(() => {
  // Check reduced motion preference
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }
    mediaQuery.addEventListener('change', handler)

    // Start animation
    startAnimation()

    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handler)
      timeouts.forEach(t => window.clearTimeout(t))
    })
  }
})
</script>

<style scoped lang="scss">
.autonomous-text {
  position: relative;
  display: inline-block;
  vertical-align: baseline;

  // Premium gradient colors
  --gradient-1: #6366f1;  // Indigo
  --gradient-2: #00d4aa;  // Teal/emerald
  --gradient-3: #8b5cf6;  // Purple

  // Space holder keeps layout stable (invisible but takes space)
  .space-holder {
    visibility: hidden;
    display: inline-block;
  }
}

.text-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  // Premium gradient text
  background: linear-gradient(
    135deg,
    var(--gradient-1) 0%,
    var(--gradient-2) 50%,
    var(--gradient-3) 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;

  // Text styling
  font-weight: inherit;
  font-size: inherit;
  line-height: inherit;
  letter-spacing: inherit;
}

// Main text content with clip-path reveal
.text-content {
  // Hidden initially via clip-path (reveals left to right)
  clip-path: inset(0 100% 0 0);
  opacity: 0;

  // Smooth reveal transition
  transition:
    clip-path 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;

  .is-visible & {
    opacity: 1;
  }

  .is-revealed & {
    clip-path: inset(0 0% 0 0);
  }

  // Subtle gradient animation when glowing
  .is-glowing & {
    animation: gradient-shift 4s ease-in-out infinite;
  }
}

// Glow layer (blurred duplicate)
.text-glow {
  filter: blur(8px);
  opacity: 0;
  transition: opacity 0.4s ease;

  .is-glowing & {
    opacity: 0.6;
    animation: glow-pulse 3s ease-in-out infinite;
  }
}

// Shimmer sweep effect
.shimmer-sweep {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-position: 200% 0;
  opacity: 0;
  pointer-events: none;

  &.animate {
    opacity: 1;
    animation: shimmer-once 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    animation-delay: 0.4s;  // Start after clip-path is mostly done
  }
}

// Gradient shift animation for subtle color movement
@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

// Glow pulse animation
@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.4;
    filter: blur(8px);
  }
  50% {
    opacity: 0.7;
    filter: blur(12px);
  }
}

// Shimmer sweep (runs once)
@keyframes shimmer-once {
  0% {
    background-position: 200% 0;
    opacity: 1;
  }
  100% {
    background-position: -200% 0;
    opacity: 0;
  }
}

// Reduced motion: instant reveal, no animations
.reduced-motion {
  .text-content {
    transition: none !important;
    clip-path: inset(0 0% 0 0) !important;
    opacity: 1 !important;
    animation: none !important;
  }

  .text-glow {
    transition: none !important;
    opacity: 0.5 !important;
    animation: none !important;
  }

  .shimmer-sweep {
    display: none !important;
  }
}

// Dark/light mode adjustments (nested inside .autonomous-text)
.autonomous-text {
  .body--light & {
    --gradient-1: #4f46e5;  // Darker indigo
    --gradient-2: #059669;  // Darker teal
    --gradient-3: #7c3aed;  // Darker purple

    .text-glow {
      &.is-glowing {
        opacity: 0.4;
      }
    }
  }
}
</style>
