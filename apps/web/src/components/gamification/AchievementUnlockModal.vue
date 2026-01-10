/**
 * @file AchievementUnlockModal.vue
 * @description Celebration modal shown when an achievement is unlocked.
 * Features confetti, animations, and achievement details.
 */
<template>
  <q-dialog
    :model-value="modelValue"
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card
      class="achievement-unlock-modal"
      :class="rarityClass"
    >
      <!-- Confetti canvas -->
      <canvas
        ref="confettiCanvas"
        class="confetti-canvas"
      />

      <!-- Background glow -->
      <div
        class="background-glow"
        :class="rarityClass"
      />

      <!-- Header -->
      <q-card-section class="modal-header">
        <div class="unlock-text">
          Achievement Unlocked!
        </div>
      </q-card-section>

      <!-- Achievement content -->
      <q-card-section class="modal-content">
        <div
          class="achievement-icon"
          :class="rarityClass"
        >
          <q-icon :name="achievement?.icon || 'emoji_events'" />
        </div>

        <div class="achievement-name">
          {{ achievement?.name }}
        </div>
        <div class="achievement-description">
          {{ achievement?.description }}
        </div>

        <q-badge
          :label="achievement?.rarity"
          :color="rarityColor"
          class="rarity-badge"
        />
      </q-card-section>

      <!-- Points reward -->
      <q-card-section
        v-if="pointsReward"
        class="points-section"
      >
        <q-icon
          name="stars"
          class="points-icon"
        />
        <span class="points-value">+{{ pointsReward }}</span>
        <span class="points-label">bonus points</span>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions
        align="center"
        class="modal-actions"
      >
        <q-btn
          label="Awesome!"
          color="primary"
          unelevated
          class="dismiss-btn"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
/**
 * @component AchievementUnlockModal
 * @description Modal celebrating a newly unlocked achievement.
 */
import { computed, ref, watch, onMounted } from 'vue'
import type { Achievement } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

interface Props {
  /** Dialog visibility */
  modelValue: boolean
  /** Achievement that was unlocked */
  achievement?: Achievement
  /** Bonus points awarded with achievement */
  pointsReward?: number
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const confettiCanvas = ref<HTMLCanvasElement | null>(null)

/** Rarity class for styling */
const rarityClass = computed(() => `rarity-${props.achievement?.rarity || 'common'}`)

/** Color based on rarity */
const rarityColor = computed(() => {
  const colors: Record<string, string> = {
    common: 'grey',
    uncommon: 'green',
    rare: 'blue',
    epic: 'purple',
    legendary: 'orange'
  }
  return colors[props.achievement?.rarity || 'common'] || 'grey'
})

/** Trigger confetti when modal opens */
watch(() => props.modelValue, async (visible) => {
  if (visible && confettiCanvas.value) {
    await triggerConfetti()
  }
})

/** Simple confetti animation using canvas */
async function triggerConfetti() {
  const canvas = confettiCanvas.value
  if (!canvas) return

  // Try to use canvas-confetti if available
  try {
    const confetti = (await import('canvas-confetti')).default
    const myConfetti = confetti.create(canvas, { resize: true })

    // Burst from center
    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: getConfettiColors()
    })

    // Additional bursts for legendary
    if (props.achievement?.rarity === 'legendary') {
      setTimeout(() => {
        myConfetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ffd700', '#ffb300', '#ff8f00']
        })
      }, 250)

      setTimeout(() => {
        myConfetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ffd700', '#ffb300', '#ff8f00']
        })
      }, 400)
    }
  } catch {
    // Fallback: simple CSS animation particles
    devLog('canvas-confetti not available, using CSS fallback')
  }
}

/** Get confetti colors based on rarity */
function getConfettiColors(): string[] {
  const rarityColors: Record<string, string[]> = {
    common: ['#78909c', '#90a4ae', '#b0bec5'],
    uncommon: ['#66bb6a', '#81c784', '#a5d6a7'],
    rare: ['#42a5f5', '#64b5f6', '#90caf9'],
    epic: ['#ab47bc', '#ba68c8', '#ce93d8'],
    legendary: ['#ffd700', '#ffb300', '#ff8f00', '#ff6f00']
  }
  return rarityColors[props.achievement?.rarity || 'common'] || rarityColors.common
}
</script>

<style lang="scss" scoped>
.achievement-unlock-modal {
  width: 100%;
  max-width: 360px;
  text-align: center;
  overflow: hidden;
  position: relative;
  border-radius: 1rem;

  // Rarity border accents
  &.rarity-common {
    border-top: 4px solid #78909c;
  }
  &.rarity-uncommon {
    border-top: 4px solid #66bb6a;
  }
  &.rarity-rare {
    border-top: 4px solid #42a5f5;
  }
  &.rarity-epic {
    border-top: 4px solid #ab47bc;
  }
  &.rarity-legendary {
    border-top: 4px solid #ffd700;
    animation: legendaryBorder 2s ease-in-out infinite;
  }
}

.confetti-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.background-glow {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 200%;
  height: 100%;
  opacity: 0.15;
  pointer-events: none;

  &.rarity-common {
    background: radial-gradient(circle, #78909c 0%, transparent 70%);
  }
  &.rarity-uncommon {
    background: radial-gradient(circle, #66bb6a 0%, transparent 70%);
  }
  &.rarity-rare {
    background: radial-gradient(circle, #42a5f5 0%, transparent 70%);
  }
  &.rarity-epic {
    background: radial-gradient(circle, #ab47bc 0%, transparent 70%);
  }
  &.rarity-legendary {
    background: radial-gradient(circle, #ffd700 0%, transparent 70%);
    animation: glowPulse 2s ease-in-out infinite;
  }
}

.modal-header {
  padding-top: 1.5rem;
}

.unlock-text {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--q-grey-7);
  animation: fadeInDown 0.5s ease-out;
}

.modal-content {
  padding: 1rem 1.5rem;
}

.achievement-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 2.5rem;
  animation: iconPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &.rarity-common {
    background: linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%);
    color: white;
  }
  &.rarity-uncommon {
    background: linear-gradient(135deg, #81c784 0%, #4caf50 100%);
    color: white;
  }
  &.rarity-rare {
    background: linear-gradient(135deg, #64b5f6 0%, #1e88e5 100%);
    color: white;
  }
  &.rarity-epic {
    background: linear-gradient(135deg, #ba68c8 0%, #7b1fa2 100%);
    color: white;
  }
  &.rarity-legendary {
    background: linear-gradient(135deg, #ffd54f 0%, #ff8f00 100%);
    color: white;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
    animation: iconPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275),
               legendaryShine 2s ease-in-out infinite;
  }
}

.achievement-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  animation: fadeInUp 0.5s ease-out 0.2s backwards;
}

.achievement-description {
  font-size: 0.875rem;
  color: var(--q-grey-7);
  line-height: 1.5;
  margin-bottom: 0.75rem;
  animation: fadeInUp 0.5s ease-out 0.3s backwards;
}

.rarity-badge {
  text-transform: capitalize;
  animation: fadeInUp 0.5s ease-out 0.4s backwards;
}

.points-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 0.5rem;
  margin: 0 1rem;
  animation: fadeInUp 0.5s ease-out 0.5s backwards;

  .points-icon {
    color: #ffd700;
    font-size: 1.25rem;
  }

  .points-value {
    font-weight: 700;
    font-size: 1.125rem;
    color: #ff8f00;
  }

  .points-label {
    font-size: 0.75rem;
    color: var(--q-grey-7);
  }
}

.modal-actions {
  padding: 1rem 1.5rem 1.5rem;
}

.dismiss-btn {
  min-width: 120px;
  animation: fadeInUp 0.5s ease-out 0.6s backwards;
}

// Animations
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes iconPop {
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

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.15;
  }
  50% {
    opacity: 0.25;
  }
}

@keyframes legendaryShine {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}

@keyframes legendaryBorder {
  0%, 100% {
    border-top-color: #ffd700;
  }
  50% {
    border-top-color: #ff8f00;
  }
}

// Dark mode
.body--dark {
  .unlock-text,
  .achievement-description,
  .points-label {
    color: var(--q-grey-5);
  }

  .points-section {
    background: rgba(255, 215, 0, 0.15);
  }
}
</style>
