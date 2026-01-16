<template>
  <span
    class="animated-box-wrapper"
    :style="wrapperStyle"
  >
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 100 100"
      class="animated-box"
      :class="{ 'is-visible': isVisible, 'is-animating': isAnimating, 'is-closed': isClosed }"
      :style="{ '--delay': `${delay}ms` }"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <!-- Premium gradients -->
        <linearGradient
          id="box-front"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#6366f1"
          />
          <stop
            offset="100%"
            stop-color="#4f46e5"
          />
        </linearGradient>

        <linearGradient
          id="box-side"
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#4338ca"
          />
          <stop
            offset="100%"
            stop-color="#3730a3"
          />
        </linearGradient>

        <linearGradient
          id="box-top"
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#818cf8"
          />
          <stop
            offset="100%"
            stop-color="#a5b4fc"
          />
        </linearGradient>

        <linearGradient
          id="box-inner"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#1e1b4b"
          />
          <stop
            offset="100%"
            stop-color="#312e81"
          />
        </linearGradient>

        <linearGradient
          id="flap-outer"
          x1="0%"
          y1="100%"
          x2="0%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#818cf8"
          />
          <stop
            offset="100%"
            stop-color="#c7d2fe"
          />
        </linearGradient>

        <linearGradient
          id="flap-inner"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#4338ca"
          />
          <stop
            offset="100%"
            stop-color="#312e81"
          />
        </linearGradient>

        <linearGradient
          id="seal-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#00d4aa"
          />
          <stop
            offset="50%"
            stop-color="#10b981"
          />
          <stop
            offset="100%"
            stop-color="#00d4aa"
          />
        </linearGradient>

        <!-- Shadows and glows -->
        <filter
          id="box-shadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="2"
            dy="4"
            stdDeviation="3"
            flood-color="#1e1b4b"
            flood-opacity="0.5"
          />
        </filter>

        <filter
          id="glow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur
            stdDeviation="2"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        class="box-group"
        filter="url(#box-shadow)"
      >
        <!-- Box interior (visible when open) -->
        <g class="box-interior">
          <path
            class="interior-back"
            d="M20,42 L50,28 L80,42 L80,78 L50,92 L20,78 Z"
            fill="url(#box-inner)"
          />
          <!-- Interior side walls -->
          <path
            class="interior-left"
            d="M20,42 L50,56 L50,92 L20,78 Z"
            fill="#252073"
            opacity="0.7"
          />
          <path
            class="interior-right"
            d="M50,56 L80,42 L80,78 L50,92 Z"
            fill="#1e1b4b"
            opacity="0.8"
          />
          <!-- Interior bottom -->
          <path
            class="interior-bottom"
            d="M20,78 L50,92 L80,78 L50,64 Z"
            fill="#312e81"
            opacity="0.6"
          />
        </g>

        <!-- Main box body -->
        <g class="box-body">
          <!-- Left face -->
          <path
            class="face-left"
            d="M12,38 L12,82 L50,98 L50,54 Z"
            fill="url(#box-side)"
          />
          <!-- Right face -->
          <path
            class="face-right"
            d="M50,54 L50,98 L88,82 L88,38 Z"
            fill="url(#box-front)"
          />
          <!-- Top edge/rim -->
          <path
            class="face-rim"
            d="M12,38 L50,22 L88,38 L50,54 Z"
            fill="url(#box-top)"
          />

          <!-- Edge highlights -->
          <g
            class="edges"
            stroke-linecap="round"
          >
            <line
              x1="12"
              y1="38"
              x2="12"
              y2="82"
              stroke="rgba(255,255,255,0.4)"
              stroke-width="1"
            />
            <line
              x1="50"
              y1="54"
              x2="50"
              y2="98"
              stroke="rgba(255,255,255,0.15)"
              stroke-width="0.5"
            />
            <line
              x1="88"
              y1="38"
              x2="88"
              y2="82"
              stroke="rgba(255,255,255,0.25)"
              stroke-width="0.7"
            />
            <line
              x1="12"
              y1="82"
              x2="50"
              y2="98"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="0.8"
            />
            <line
              x1="50"
              y1="98"
              x2="88"
              y2="82"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="0.6"
            />
            <line
              x1="12"
              y1="38"
              x2="50"
              y2="22"
              stroke="rgba(255,255,255,0.35)"
              stroke-width="0.7"
            />
            <line
              x1="50"
              y1="22"
              x2="88"
              y2="38"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="0.6"
            />
          </g>
        </g>

        <!-- Flaps group - these animate closed -->
        <g class="flaps">
          <!-- Back flap (folds forward/down into box first) -->
          <g class="flap flap-back">
            <path
              class="flap-outer-face"
              d="M20,42 L50,28 L80,42 L50,56 Z"
              fill="url(#flap-outer)"
            />
            <path
              class="flap-inner-face"
              d="M20,42 L50,28 L80,42 L50,56 Z"
              fill="url(#flap-inner)"
              opacity="0"
            />
            <!-- Flap fold line -->
            <line
              x1="32"
              y1="40"
              x2="68"
              y2="40"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="0.5"
              stroke-dasharray="3,2"
            />
          </g>

          <!-- Left flap (folds inward) -->
          <g class="flap flap-left">
            <path
              class="flap-outer-face"
              d="M12,38 L50,22 L50,56 L12,72 Z"
              fill="url(#flap-outer)"
            />
            <path
              class="flap-inner-face"
              d="M12,38 L50,22 L50,56 L12,72 Z"
              fill="url(#flap-inner)"
              opacity="0"
            />
          </g>

          <!-- Right flap (folds inward) -->
          <g class="flap flap-right">
            <path
              class="flap-outer-face"
              d="M50,22 L88,38 L88,72 L50,56 Z"
              fill="url(#flap-outer)"
            />
            <path
              class="flap-inner-face"
              d="M50,22 L88,38 L88,72 L50,56 Z"
              fill="url(#flap-inner)"
              opacity="0"
            />
          </g>

          <!-- Front/top flap (folds down last to seal) -->
          <g class="flap flap-front">
            <path
              class="flap-main"
              d="M12,38 L50,22 L88,38 L50,54 Z"
              fill="url(#box-top)"
            />
            <!-- Decorative fold crease -->
            <line
              x1="28"
              y1="34"
              x2="72"
              y2="34"
              stroke="rgba(255,255,255,0.25)"
              stroke-width="0.5"
            />
            <!-- Corner details -->
            <circle
              cx="50"
              cy="38"
              r="1.5"
              fill="rgba(255,255,255,0.3)"
            />
          </g>
        </g>

        <!-- Seal/tape (appears after box is closed) -->
        <g class="seal-group">
          <!-- Horizontal tape -->
          <rect
            class="seal-h"
            x="35"
            y="26"
            width="30"
            height="5"
            rx="1"
            fill="url(#seal-gradient)"
          />
          <!-- Vertical tape -->
          <rect
            class="seal-v"
            x="47"
            y="31"
            width="6"
            height="18"
            rx="1"
            fill="url(#seal-gradient)"
          />
          <!-- Tape shine -->
          <rect
            class="seal-shine"
            x="36"
            y="27"
            width="28"
            height="1.5"
            rx="0.5"
            fill="rgba(255,255,255,0.4)"
          />
        </g>

        <!-- Highlight/shine effects -->
        <g class="highlights">
          <path
            class="shine-right"
            d="M54,24 L84,36 L84,42 L54,30 Z"
            fill="rgba(255,255,255,0.12)"
          />
          <path
            class="shine-top"
            d="M18,40 L50,26 L56,29 L24,43 Z"
            fill="rgba(255,255,255,0.08)"
          />
        </g>
      </g>
    </svg>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Props {
  size?: number
  delay?: number
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 64,
  delay: 0,
  animated: true
})

const isVisible = ref(false)    // Makes the box visible (opacity: 1) in open state
const isAnimating = ref(false)  // Triggers the folding animation
const isClosed = ref(false)     // After animation completes, enables idle float
const hasStartedAnimation = ref(false)

const wrapperStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))

function startAnimation() {
  if (hasStartedAnimation.value) return
  hasStartedAnimation.value = true

  // Step 1: Make box visible in OPEN state (after initial delay)
  setTimeout(() => {
    isVisible.value = true
  }, props.delay)

  // Step 2: Start the folding animation (200ms after becoming visible)
  setTimeout(() => {
    isAnimating.value = true
  }, props.delay + 200)

  // Step 3: Mark as fully closed after animation completes
  setTimeout(() => {
    isClosed.value = true
  }, props.delay + 1400)
}

// Watch for animated prop to become true (it starts false and becomes true after heroRevealed)
watch(() => props.animated, (newVal) => {
  if (newVal) {
    startAnimation()
  }
}, { immediate: true })

onMounted(() => {
  if (props.animated) {
    startAnimation()
  } else {
    // If not animated, just show closed state immediately
    isVisible.value = true
    isAnimating.value = true
    isClosed.value = true
  }
})
</script>

<style scoped lang="scss">
.animated-box-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  position: relative;
}

.animated-box {
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

  // Step 1: Become visible (box appears in OPEN state)
  &.is-visible {
    opacity: 1;
    transform: scale(1);
  }

  // Step 3: Gentle float when fully closed
  &.is-closed {
    animation: gentle-float 4s ease-in-out infinite;
  }
}

// Box interior - visible when open, fades when closed
.box-interior {
  opacity: 1;
  transition: opacity 0.4s ease;
  transition-delay: 0.6s;

  .is-animating & {
    opacity: 0;
  }
}

// Flaps animation - start OPEN (rotated up), animate to CLOSED (flat)
.flap {
  transform-style: preserve-3d;
}

// Back flap - starts tilted back (open), folds forward (down) first
.flap-back {
  transform-origin: 50px 56px;
  transform: rotateX(-70deg) translateY(-8px);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.1s;

  .flap-outer-face {
    transition: opacity 0.3s ease;
  }

  .flap-inner-face {
    transition: opacity 0.3s ease;
  }

  .is-animating & {
    transform: rotateX(0deg) translateY(0);

    .flap-outer-face {
      opacity: 1;
    }
    .flap-inner-face {
      opacity: 0;
    }
  }
}

// Left flap - starts open (rotated outward), folds inward
.flap-left {
  transform-origin: 12px 55px;
  transform: rotateY(-75deg) rotateZ(-15deg);
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.25s;

  .is-animating & {
    transform: rotateY(0deg) rotateZ(0deg);
  }
}

// Right flap - starts open (rotated outward), folds inward
.flap-right {
  transform-origin: 88px 55px;
  transform: rotateY(75deg) rotateZ(15deg);
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.25s;

  .is-animating & {
    transform: rotateY(0deg) rotateZ(0deg);
  }
}

// Front flap - the lid, folds down last to seal the box
.flap-front {
  transform-origin: 50px 54px;
  transform: rotateX(85deg) translateY(-20px);
  opacity: 0.9;
  transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.3s ease;
  transition-delay: 0.5s;

  .is-animating & {
    transform: rotateX(0deg) translateY(0);
    opacity: 1;
  }
}

// Seal tape - appears after box closes
.seal-group {
  opacity: 0;
  transform: scale(0.7) translateY(-5px);
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0s;

  .is-animating & {
    opacity: 1;
    transform: scale(1) translateY(0);
    transition-delay: 0.9s;
  }

  .is-closed & {
    .seal-shine {
      animation: seal-shimmer 2s ease-in-out infinite;
    }
  }
}

// Highlights
.highlights {
  opacity: 0;
  transition: opacity 0.3s ease;
  transition-delay: 0.8s;

  .is-animating & {
    opacity: 1;
  }

  .is-closed & {
    .shine-right {
      animation: shimmer-pulse 3s ease-in-out infinite;
    }
  }
}

// Gentle floating when idle
@keyframes gentle-float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-3px) scale(1.02);
  }
}

// Seal shimmer
@keyframes seal-shimmer {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
}

// Subtle shine pulse
@keyframes shimmer-pulse {
  0%, 100% {
    opacity: 0.12;
  }
  50% {
    opacity: 0.2;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .animated-box {
    transition: opacity 0.2s ease !important;
    animation: none !important;

    &:not(.is-animating) {
      transform: scale(1) !important;
    }
  }

  .flap, .seal-group, .highlights, .box-interior {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .box-interior {
    opacity: 0 !important;
  }

  .flap-back, .flap-left, .flap-right, .flap-front {
    transform: none !important;
  }
}
</style>
