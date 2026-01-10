/**
 * @file StreakIndicator.vue
 * @description Fire icon with animated streak counter.
 */
<template>
  <div
    class="streak-indicator"
    :class="[sizeClass, { 'streak-active': streak > 0 }]"
  >
    <div
      class="streak-fire"
      :class="{ 'on-fire': streak >= 3 }"
    >
      <q-icon
        :name="fireIcon"
        :class="fireClass"
      />
    </div>

    <div class="streak-info">
      <span class="streak-count">{{ streak }}</span>
      <span
        v-if="showLabel"
        class="streak-label"
      >day{{ streak !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Milestone badge -->
    <q-badge
      v-if="showMilestone && milestoneReached"
      :label="milestoneLabel"
      color="orange"
      class="streak-milestone"
    />

    <!-- Tooltip -->
    <q-tooltip
      v-if="showTooltip"
      anchor="top middle"
      self="bottom middle"
    >
      <div class="streak-tooltip">
        <div class="tooltip-title">
          <q-icon name="local_fire_department" /> Streak: {{ streak }} day{{ streak !== 1 ? 's' : '' }}
        </div>
        <div
          v-if="bestStreak"
          class="tooltip-best"
        >
          Best: {{ bestStreak }} days
        </div>
        <div class="tooltip-bonus">
          Bonus: +{{ streakBonus }}% points
        </div>
      </div>
    </q-tooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * @component StreakIndicator
 * @description Displays current streak with fire animation for active streaks.
 */
import { computed } from 'vue'

interface Props {
  /** Current streak in days */
  streak: number
  /** Best streak achieved */
  bestStreak?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show "days" label */
  showLabel?: boolean
  /** Whether to show tooltip */
  showTooltip?: boolean
  /** Whether to show milestone badge */
  showMilestone?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showLabel: true,
  showTooltip: true,
  showMilestone: true
})

const sizeClass = computed(() => `size-${props.size}`)

/** Fire icon based on streak level */
const fireIcon = computed(() => {
  if (props.streak >= 30) return 'whatshot'
  if (props.streak >= 7) return 'local_fire_department'
  if (props.streak > 0) return 'local_fire_department'
  return 'local_fire_department'
})

/** Fire icon class based on streak level */
const fireClass = computed(() => {
  if (props.streak >= 30) return 'fire-legendary'
  if (props.streak >= 14) return 'fire-epic'
  if (props.streak >= 7) return 'fire-rare'
  if (props.streak >= 3) return 'fire-active'
  if (props.streak > 0) return 'fire-warm'
  return 'fire-cold'
})

/** Calculate streak bonus percentage */
const streakBonus = computed(() => {
  return Math.min(20, props.streak * 2)
})

/** Milestone thresholds */
const milestones = [3, 7, 14, 30, 60, 100]

/** Check if a milestone was just reached */
const milestoneReached = computed(() => {
  return milestones.includes(props.streak)
})

/** Label for reached milestone */
const milestoneLabel = computed(() => {
  if (props.streak >= 100) return '100!'
  if (props.streak >= 60) return '60!'
  if (props.streak >= 30) return '30!'
  if (props.streak >= 14) return '2wk'
  if (props.streak >= 7) return '1wk'
  if (props.streak >= 3) return '3d'
  return ''
})
</script>

<style lang="scss" scoped>
.streak-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;

  &.size-sm {
    .streak-fire {
      font-size: 1rem;
    }
    .streak-count {
      font-size: 0.875rem;
    }
    .streak-label {
      font-size: 0.625rem;
    }
  }

  &.size-md {
    .streak-fire {
      font-size: 1.5rem;
    }
    .streak-count {
      font-size: 1.125rem;
    }
    .streak-label {
      font-size: 0.75rem;
    }
  }

  &.size-lg {
    .streak-fire {
      font-size: 2rem;
    }
    .streak-count {
      font-size: 1.5rem;
    }
    .streak-label {
      font-size: 0.875rem;
    }
  }

  &.streak-active {
    .streak-info {
      color: #ff6f00;
    }
  }
}

.streak-fire {
  display: flex;
  align-items: center;

  &.on-fire {
    animation: fireFlicker 0.5s ease-in-out infinite alternate;
  }
}

.fire-cold {
  color: var(--q-grey-5);
}

.fire-warm {
  color: #ff9800;
}

.fire-active {
  color: #ff5722;
  filter: drop-shadow(0 0 4px rgba(255, 87, 34, 0.5));
}

.fire-rare {
  color: #f44336;
  filter: drop-shadow(0 0 6px rgba(244, 67, 54, 0.6));
}

.fire-epic {
  color: #e91e63;
  filter: drop-shadow(0 0 8px rgba(233, 30, 99, 0.6));
  animation: fireGlow 1s ease-in-out infinite alternate;
}

.fire-legendary {
  background: linear-gradient(135deg, #ffd700, #ff6f00, #ff4500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.7));
  animation: fireGlow 0.8s ease-in-out infinite alternate;
}

.streak-info {
  display: flex;
  align-items: baseline;
  gap: 0.125rem;
  color: var(--q-grey-7);
  transition: color 0.3s;
}

.streak-count {
  font-weight: 700;
  line-height: 1;
}

.streak-label {
  opacity: 0.8;
}

.streak-milestone {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 0.625rem;
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.streak-tooltip {
  text-align: center;
  padding: 0.25rem;

  .tooltip-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    justify-content: center;
  }

  .tooltip-best {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .tooltip-bonus {
    color: #4caf50;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
}

@keyframes fireFlicker {
  0% {
    transform: scale(1) rotate(-2deg);
  }
  100% {
    transform: scale(1.05) rotate(2deg);
  }
}

@keyframes fireGlow {
  0% {
    filter: drop-shadow(0 0 8px rgba(255, 87, 34, 0.6)) brightness(1);
  }
  100% {
    filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.8)) brightness(1.1);
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// Dark mode
.body--dark {
  .streak-info {
    color: var(--q-grey-5);
  }

  .fire-cold {
    color: var(--q-grey-7);
  }
}
</style>
