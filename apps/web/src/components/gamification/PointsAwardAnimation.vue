/**
 * @file PointsAwardAnimation.vue
 * @description Floating points animation that appears when points are awarded.
 * Shows the total points with a breakdown tooltip.
 */
<template>
  <Transition name="points-float">
    <div
      v-if="show"
      class="points-animation"
      :class="sizeClass"
    >
      <div class="points-content">
        <q-icon
          name="stars"
          class="points-icon"
        />
        <span class="points-value">+{{ points }}</span>
        <span class="points-label">pts</span>
      </div>

      <!-- Breakdown tooltip -->
      <div
        v-if="breakdown"
        class="points-breakdown"
      >
        <div class="breakdown-item">
          <span>Base:</span>
          <span>{{ breakdown.base }}</span>
        </div>
        <div
          v-if="breakdown.earlyBonus > 0"
          class="breakdown-item bonus"
        >
          <span>Early:</span>
          <span>+{{ breakdown.earlyBonus }}</span>
        </div>
        <div
          v-if="breakdown.streakBonus > 0"
          class="breakdown-item bonus"
        >
          <span>Streak:</span>
          <span>+{{ breakdown.streakBonus }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * @component PointsAwardAnimation
 * @description Animated floating points display with breakdown details.
 */
import { computed, watch, onMounted } from 'vue'

interface PointsBreakdown {
  base: number
  earlyBonus: number
  streakBonus: number
}

interface Props {
  /** Whether to show the animation */
  show: boolean
  /** Total points awarded */
  points: number
  /** Points breakdown (base, bonuses) */
  breakdown?: PointsBreakdown
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Auto-hide duration in ms (0 to disable) */
  autoHide?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  autoHide: 3000
})

const emit = defineEmits<{
  /** Emitted when animation should hide */
  hide: []
}>()

const sizeClass = computed(() => `size-${props.size}`)

// Auto-hide after duration
watch(() => props.show, (showing) => {
  if (showing && props.autoHide > 0) {
    setTimeout(() => {
      emit('hide')
    }, props.autoHide)
  }
})

onMounted(() => {
  if (props.show && props.autoHide > 0) {
    setTimeout(() => {
      emit('hide')
    }, props.autoHide)
  }
})
</script>

<style lang="scss" scoped>
.points-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;

  &.size-sm {
    .points-content {
      font-size: 1.5rem;
      padding: 0.5rem 1rem;
    }
    .points-icon {
      font-size: 1.25rem;
    }
  }

  &.size-md {
    .points-content {
      font-size: 2.5rem;
      padding: 1rem 2rem;
    }
    .points-icon {
      font-size: 2rem;
    }
  }

  &.size-lg {
    .points-content {
      font-size: 4rem;
      padding: 1.5rem 3rem;
    }
    .points-icon {
      font-size: 3rem;
    }
  }
}

.points-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: white;
  border-radius: 2rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  box-shadow:
    0 4px 20px rgba(255, 215, 0, 0.4),
    0 0 40px rgba(255, 215, 0, 0.2);
}

.points-icon {
  animation: sparkle 0.6s ease-in-out infinite alternate;
}

.points-label {
  font-size: 0.6em;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.points-breakdown {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-width: 120px;
  font-size: 0.75rem;
  color: white;
  animation: fadeInUp 0.3s ease-out 0.5s forwards;
  opacity: 0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.125rem 0;

  &.bonus {
    color: #4caf50;
  }
}

// Animations
@keyframes sparkle {
  from {
    transform: rotate(-5deg) scale(1);
    filter: brightness(1);
  }
  to {
    transform: rotate(5deg) scale(1.1);
    filter: brightness(1.2);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

// Transition classes
.points-float-enter-active {
  animation: floatIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.points-float-leave-active {
  animation: floatOut 0.4s ease-in forwards;
}

@keyframes floatIn {
  0% {
    opacity: 0;
    transform: translate(-50%, 0%) scale(0.3);
  }
  50% {
    transform: translate(-50%, -60%) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes floatOut {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.8);
  }
}
</style>
