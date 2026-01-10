/**
 * @file LevelProgressBar.vue
 * @description XP progress bar with level badge and animated fill.
 */
<template>
  <div
    class="level-progress"
    :class="{ 'level-progress--compact': compact }"
  >
    <!-- Level Badge -->
    <div
      class="level-badge"
      :class="levelTierClass"
    >
      <q-icon
        name="military_tech"
        class="level-icon"
      />
      <span class="level-number">{{ level }}</span>
    </div>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div
        v-if="!compact"
        class="progress-info"
      >
        <span class="progress-label">Level {{ level }}</span>
        <span class="progress-xp">{{ xpCurrent }} / {{ xpForNextLevel }} XP</span>
      </div>

      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${progress}%` }"
          :class="levelTierClass"
        >
          <div class="progress-glow" />
        </div>
      </div>

      <div
        v-if="!compact"
        class="progress-percent"
      >
        {{ progress }}%
      </div>
    </div>

    <!-- Next Level Info -->
    <div
      v-if="showNextLevel && !compact"
      class="next-level"
    >
      <q-icon
        name="arrow_forward"
        size="xs"
      />
      <span>{{ xpRemaining }} XP to Level {{ level + 1 }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @component LevelProgressBar
 * @description Displays user level with XP progress toward next level.
 */
import { computed } from 'vue'

interface Props {
  /** Current level */
  level: number
  /** Current XP in this level */
  xpCurrent: number
  /** XP required for next level */
  xpForNextLevel: number
  /** Whether to show compact version */
  compact?: boolean
  /** Whether to show next level info */
  showNextLevel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showNextLevel: true
})

/** Progress percentage */
const progress = computed(() => {
  if (props.xpForNextLevel <= 0) return 100
  return Math.min(100, Math.round((props.xpCurrent / props.xpForNextLevel) * 100))
})

/** XP remaining for next level */
const xpRemaining = computed(() => {
  return Math.max(0, props.xpForNextLevel - props.xpCurrent)
})

/** Level tier class for styling */
const levelTierClass = computed(() => {
  if (props.level >= 50) return 'tier-legendary'
  if (props.level >= 30) return 'tier-epic'
  if (props.level >= 20) return 'tier-rare'
  if (props.level >= 10) return 'tier-uncommon'
  return 'tier-common'
})
</script>

<style lang="scss" scoped>
.level-progress {
  display: flex;
  align-items: center;
  gap: 1rem;

  &--compact {
    gap: 0.5rem;

    .level-badge {
      width: 32px;
      height: 32px;

      .level-icon {
        font-size: 0.875rem;
      }

      .level-number {
        font-size: 0.625rem;
      }
    }

    .progress-container {
      min-width: 80px;
    }

    .progress-bar {
      height: 6px;
    }
  }
}

.level-badge {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &.tier-common {
    background: linear-gradient(135deg, #78909c 0%, #546e7a 100%);
  }

  &.tier-uncommon {
    background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
  }

  &.tier-rare {
    background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  }

  &.tier-epic {
    background: linear-gradient(135deg, #ab47bc 0%, #7b1fa2 100%);
  }

  &.tier-legendary {
    background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
    animation: legendaryPulse 2s ease-in-out infinite;
  }

  .level-icon {
    font-size: 1rem;
    opacity: 0.9;
  }

  .level-number {
    font-size: 0.75rem;
    line-height: 1;
  }
}

.progress-container {
  flex: 1;
  min-width: 120px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.progress-label {
  font-weight: 600;
  color: var(--q-dark);
}

.progress-xp {
  color: var(--q-grey-7);
}

.progress-bar {
  height: 10px;
  background: var(--q-grey-3);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease-out;
  position: relative;
  overflow: hidden;

  &.tier-common {
    background: linear-gradient(90deg, #78909c 0%, #90a4ae 100%);
  }

  &.tier-uncommon {
    background: linear-gradient(90deg, #66bb6a 0%, #81c784 100%);
  }

  &.tier-rare {
    background: linear-gradient(90deg, #42a5f5 0%, #64b5f6 100%);
  }

  &.tier-epic {
    background: linear-gradient(90deg, #ab47bc 0%, #ba68c8 100%);
  }

  &.tier-legendary {
    background: linear-gradient(90deg, #ffd700 0%, #ffeb3b 100%);
  }

  .progress-glow {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shimmer 2s infinite;
  }
}

.progress-percent {
  text-align: right;
  font-size: 0.625rem;
  color: var(--q-grey-6);
  margin-top: 0.125rem;
}

.next-level {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--q-grey-7);
  white-space: nowrap;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes legendaryPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 30px rgba(255, 215, 0, 0.6);
  }
}

// Dark mode support
.body--dark {
  .progress-bar {
    background: var(--q-grey-9);
  }

  .progress-label {
    color: var(--q-grey-3);
  }

  .progress-xp,
  .progress-percent,
  .next-level {
    color: var(--q-grey-5);
  }
}
</style>
