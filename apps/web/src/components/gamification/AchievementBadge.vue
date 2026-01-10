/**
 * @file AchievementBadge.vue
 * @description Individual achievement badge with icon, progress, and unlock state.
 */
<template>
  <div
    class="achievement-badge"
    :class="[rarityClass, { 'is-locked': !achievement.isUnlocked }]"
  >
    <div class="badge-icon">
      <q-icon :name="achievement.icon || 'emoji_events'" />
      <div
        v-if="!achievement.isUnlocked"
        class="lock-overlay"
      >
        <q-icon name="lock" />
      </div>
    </div>

    <div class="badge-content">
      <div class="badge-name">
        {{ achievement.name }}
      </div>
      <div class="badge-description">
        {{ achievement.description }}
      </div>

      <!-- Progress bar for locked achievements -->
      <div
        v-if="!achievement.isUnlocked && hasProgress"
        class="badge-progress"
      >
        <q-linear-progress
          :value="progressValue"
          :color="rarityColor"
          track-color="grey-3"
          rounded
          size="6px"
        />
        <span class="progress-text">{{ achievement.progress }}%</span>
      </div>

      <!-- Unlock date for unlocked achievements -->
      <div
        v-if="achievement.isUnlocked && achievement.unlockedAt"
        class="badge-unlocked"
      >
        <q-icon
          name="check_circle"
          size="xs"
        />
        {{ formatDate(achievement.unlockedAt) }}
      </div>
    </div>

    <!-- Rarity indicator -->
    <q-badge
      :label="achievement.rarity"
      :color="rarityColor"
      class="badge-rarity"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @component AchievementBadge
 * @description Displays a single achievement with its status and progress.
 */
import { computed } from 'vue'
import type { Achievement } from '@/services/api'

interface Props {
  /** Achievement data */
  achievement: Achievement
}

const props = defineProps<Props>()

/** CSS class based on rarity */
const rarityClass = computed(() => `rarity-${props.achievement.rarity}`)

/** Color based on rarity */
const rarityColor = computed(() => {
  const colors: Record<string, string> = {
    common: 'grey',
    uncommon: 'green',
    rare: 'blue',
    epic: 'purple',
    legendary: 'orange'
  }
  return colors[props.achievement.rarity] || 'grey'
})

/** Whether achievement has progress tracking */
const hasProgress = computed(() => {
  return props.achievement.progress !== undefined && props.achievement.progress !== null
})

/** Progress as decimal for q-linear-progress */
const progressValue = computed(() => {
  return (props.achievement.progress || 0) / 100
})

/** Format unlock date */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style lang="scss" scoped>
.achievement-badge {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: white;
  border: 2px solid transparent;
  position: relative;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.is-locked {
    opacity: 0.7;

    .badge-icon {
      filter: grayscale(0.8);
    }
  }

  // Rarity borders
  &.rarity-common {
    border-color: var(--q-grey-4);
  }

  &.rarity-uncommon {
    border-color: #66bb6a;
  }

  &.rarity-rare {
    border-color: #42a5f5;
  }

  &.rarity-epic {
    border-color: #ab47bc;
    background: linear-gradient(135deg, rgba(171, 71, 188, 0.05) 0%, transparent 100%);
  }

  &.rarity-legendary {
    border-color: #ffd700;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.15);

    .badge-icon {
      animation: legendaryShine 3s ease-in-out infinite;
    }
  }
}

.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  position: relative;
  flex-shrink: 0;

  .rarity-common & {
    background: linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%);
    color: #616161;
  }

  .rarity-uncommon & {
    background: linear-gradient(135deg, #c8e6c9 0%, #81c784 100%);
    color: #2e7d32;
  }

  .rarity-rare & {
    background: linear-gradient(135deg, #bbdefb 0%, #64b5f6 100%);
    color: #1565c0;
  }

  .rarity-epic & {
    background: linear-gradient(135deg, #e1bee7 0%, #ba68c8 100%);
    color: #7b1fa2;
  }

  .rarity-legendary & {
    background: linear-gradient(135deg, #fff59d 0%, #ffd54f 100%);
    color: #ff6f00;
  }
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  color: white;
  font-size: 1rem;
}

.badge-content {
  flex: 1;
  min-width: 0;
}

.badge-name {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.badge-description {
  font-size: 0.75rem;
  color: var(--q-grey-7);
  line-height: 1.4;
}

.badge-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;

  .q-linear-progress {
    flex: 1;
  }

  .progress-text {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--q-grey-6);
    min-width: 32px;
    text-align: right;
  }
}

.badge-unlocked {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.375rem;
  font-size: 0.625rem;
  color: #4caf50;
}

.badge-rarity {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.625rem;
  text-transform: capitalize;
}

@keyframes legendaryShine {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

// Dark mode
.body--dark {
  .achievement-badge {
    background: var(--q-dark);

    &.rarity-epic {
      background: linear-gradient(135deg, rgba(171, 71, 188, 0.15) 0%, var(--q-dark) 100%);
    }

    &.rarity-legendary {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, var(--q-dark) 100%);
    }
  }

  .badge-description {
    color: var(--q-grey-5);
  }

  .badge-progress .progress-text {
    color: var(--q-grey-5);
  }
}
</style>
