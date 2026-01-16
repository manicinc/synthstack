<script setup lang="ts">
/**
 * AnimatedLogo Component
 * Windows XP alien retro-futuristic inspired logo animation
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useLogoAnimation, type AnimationIntensity } from '@/composables/useLogoAnimation';

interface Props {
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
  intensity?: AnimationIntensity;
  reducedMotion?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 32,
  autoPlay: true,
  loop: true,
  intensity: 'medium',
  reducedMotion: false,
});

const emit = defineEmits<{
  (e: 'phase-change', phase: string): void;
  (e: 'animation-complete'): void;
}>();

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Check system preference for reduced motion
const prefersReducedMotion = ref(false);

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

// Determine if we should use reduced motion
const useReducedMotion = computed(() => {
  return props.reducedMotion || prefersReducedMotion.value;
});

// Initialize animation composable
const { phase, isPlaying, play, pause, restart, drawStatic } = useLogoAnimation(canvasRef, {
  size: props.size,
  autoPlay: props.autoPlay && !useReducedMotion.value,
  loop: props.loop,
  intensity: props.intensity,
});

// Watch phase changes
watch(phase, (newPhase) => {
  emit('phase-change', newPhase);

  if (newPhase === 'idle' && !props.loop) {
    emit('animation-complete');
  }
});

// Expose methods for parent control
defineExpose({
  play,
  pause,
  restart,
  isPlaying,
  phase,
});
</script>

<template>
  <div
    class="animated-logo"
    :class="{
      'animated-logo--playing': isPlaying,
      'animated-logo--reduced': useReducedMotion,
    }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
    }"
  >
    <!-- Canvas for animation -->
    <canvas
      v-if="!useReducedMotion"
      ref="canvasRef"
      class="animated-logo__canvas"
    />

    <!-- Static fallback for reduced motion -->
    <svg
      v-else
      class="animated-logo__static"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="32"
        height="32"
        rx="6"
        fill="#0D0D0D"
      />
      <defs>
        <linearGradient
          id="ss-grad1"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#818CF8"
          />
          <stop
            offset="100%"
            stop-color="#6366F1"
          />
        </linearGradient>
        <linearGradient
          id="ss-grad2"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#34D399"
          />
          <stop
            offset="100%"
            stop-color="#10B981"
          />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="5"
        width="20"
        height="4"
        rx="1"
        fill="url(#ss-grad1)"
      />
      <rect
        x="6"
        y="5"
        width="4"
        height="10"
        rx="1"
        fill="url(#ss-grad1)"
      />
      <rect
        x="6"
        y="14"
        width="20"
        height="4"
        rx="1"
        fill="#F5F3EF"
      />
      <rect
        x="22"
        y="14"
        width="4"
        height="10"
        rx="1"
        fill="url(#ss-grad2)"
      />
      <rect
        x="6"
        y="23"
        width="20"
        height="4"
        rx="1"
        fill="url(#ss-grad2)"
      />
    </svg>

    <!-- Optional glow effect overlay -->
    <div
      v-if="!useReducedMotion && isPlaying"
      class="animated-logo__glow"
    />
  </div>
</template>

<style lang="scss" scoped>
.animated-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &__canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  &__static {
    display: block;
    width: 100%;
    height: 100%;

    // Subtle pulse animation for static version
    animation: logo-pulse 4s ease-in-out infinite;
  }

  &__glow {
    position: absolute;
    inset: -2px;
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;

    // Subtle glow gradient
    background: radial-gradient(
      circle at center,
      rgba(129, 140, 248, 0.15) 0%,
      transparent 70%
    );
  }

  &--playing &__glow {
    opacity: 1;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  // Hover effect
  &:hover &__glow {
    opacity: 1;
  }
}

// Keyframes
@keyframes logo-pulse {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0 transparent);
  }
  50% {
    filter: brightness(1.05) drop-shadow(0 0 8px rgba(129, 140, 248, 0.3));
  }
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.02);
  }
}
</style>
