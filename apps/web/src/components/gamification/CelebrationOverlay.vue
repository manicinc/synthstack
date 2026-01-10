/**
 * @file CelebrationOverlay.vue
 * @description Main overlay component that processes the celebration queue.
 * Automatically displays points, level ups, and achievement celebrations.
 */
<template>
  <div class="celebration-overlay">
    <!-- Points Animation -->
    <PointsAwardAnimation
      v-if="currentCelebration?.type === 'points'"
      :show="showCelebration"
      :points="currentCelebration.data.points || 0"
      :breakdown="currentCelebration.data.breakdown"
      @hide="dismissCurrent"
    />

    <!-- Level Up Animation -->
    <Transition name="level-up">
      <div
        v-if="currentCelebration?.type === 'level_up' && showCelebration"
        class="level-up-overlay"
      >
        <div class="level-up-content">
          <div class="level-up-text">
            Level Up!
          </div>
          <div class="level-up-badge">
            <q-icon name="military_tech" />
            <span class="level-number">{{ currentCelebration.data.newLevel }}</span>
          </div>
          <div class="level-up-subtext">
            Keep up the great work!
          </div>
        </div>
        <canvas
          ref="levelUpConfetti"
          class="level-confetti"
        />
      </div>
    </Transition>

    <!-- Achievement Unlock Modal -->
    <AchievementUnlockModal
      v-model="showAchievementModal"
      :achievement="currentCelebration?.data?.achievement"
      @update:model-value="handleAchievementModalClose"
    />

    <!-- Streak Celebration -->
    <Transition name="streak-pop">
      <div
        v-if="currentCelebration?.type === 'streak' && showCelebration"
        class="streak-celebration"
      >
        <div class="streak-content">
          <q-icon
            name="local_fire_department"
            class="streak-fire-icon"
          />
          <div class="streak-number">
            {{ currentCelebration.data.streak }}
          </div>
          <div class="streak-text">
            Day Streak!
          </div>
        </div>
      </div>
    </Transition>

    <!-- Sprint Complete -->
    <Transition name="sprint-complete">
      <div
        v-if="currentCelebration?.type === 'sprint_complete' && showCelebration"
        class="sprint-complete-overlay"
      >
        <div class="sprint-complete-content">
          <q-icon
            name="flag"
            class="sprint-icon"
          />
          <div class="sprint-title">
            Sprint Complete!
          </div>
          <div class="sprint-name">
            {{ currentCelebration.data.sprintName }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * @component CelebrationOverlay
 * @description Processes the gamification celebration queue and displays animations.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGamificationStore } from '@/stores/gamification'
import PointsAwardAnimation from './PointsAwardAnimation.vue'
import AchievementUnlockModal from './AchievementUnlockModal.vue'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

const gamificationStore = useGamificationStore()

const showCelebration = ref(false)
const showAchievementModal = ref(false)
const levelUpConfetti = ref<HTMLCanvasElement | null>(null)

/** Current celebration from queue */
const currentCelebration = computed(() => gamificationStore.nextCelebration)

/** Handle celebration queue changes */
watch(
  () => currentCelebration.value,
  async (celebration) => {
    if (!celebration) {
      showCelebration.value = false
      return
    }

    // Handle different celebration types
    if (celebration.type === 'achievement') {
      // Show achievement modal (which handles its own dismiss)
      showAchievementModal.value = true
    } else {
      // Show inline celebration
      showCelebration.value = true

      // Trigger confetti for level up
      if (celebration.type === 'level_up') {
        await triggerLevelUpConfetti()
      }

      // Auto-dismiss after duration (except achievements)
      const durations: Record<string, number> = {
        points: 3000,
        level_up: 4000,
        streak: 3000,
        sprint_complete: 4000
      }

      const duration = durations[celebration.type] || 3000

      setTimeout(() => {
        dismissCurrent()
      }, duration)
    }
  },
  { immediate: true }
)

/** Dismiss current celebration and move to next */
function dismissCurrent() {
  showCelebration.value = false
  gamificationStore.dismissCelebration()
}

/** Handle achievement modal close */
function handleAchievementModalClose(value: boolean) {
  if (!value) {
    showAchievementModal.value = false
    gamificationStore.dismissCelebration()
  }
}

/** Trigger confetti for level up celebration */
async function triggerLevelUpConfetti() {
  const canvas = levelUpConfetti.value
  if (!canvas) return

  try {
    const confetti = (await import('canvas-confetti')).default
    const myConfetti = confetti.create(canvas, { resize: true })

    // Big burst
    myConfetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#4caf50', '#2196f3', '#9c27b0', '#ff5722']
    })

    // Side bursts
    setTimeout(() => {
      myConfetti({
        particleCount: 75,
        angle: 60,
        spread: 60,
        origin: { x: 0 }
      })
    }, 300)

    setTimeout(() => {
      myConfetti({
        particleCount: 75,
        angle: 120,
        spread: 60,
        origin: { x: 1 }
      })
    }, 500)
  } catch (e) {
    devLog('canvas-confetti not available')
  }
}
</script>

<style lang="scss" scoped>
.celebration-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

// Level Up Overlay
.level-up-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: auto;
}

.level-up-content {
  text-align: center;
  color: white;
  z-index: 1;
}

.level-up-text {
  font-size: 1.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 1rem;
  animation: pulseText 1s ease-in-out infinite;
}

.level-up-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  margin: 0 auto 1rem;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border-radius: 50%;
  animation: badgePop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);

  .q-icon {
    font-size: 2.5rem;
  }

  .level-number {
    font-size: 2rem;
    font-weight: 700;
  }
}

.level-up-subtext {
  font-size: 1rem;
  opacity: 0.8;
  animation: fadeInUp 0.5s ease-out 0.5s backwards;
}

.level-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

// Streak Celebration
.streak-celebration {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.streak-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 3rem;
  background: linear-gradient(135deg, #ff5722 0%, #ff9800 100%);
  border-radius: 1rem;
  color: white;
  box-shadow: 0 10px 40px rgba(255, 87, 34, 0.4);
}

.streak-fire-icon {
  font-size: 3rem;
  animation: fireFlicker 0.4s ease-in-out infinite alternate;
}

.streak-number {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.streak-text {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

// Sprint Complete
.sprint-complete-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sprint-complete-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 3rem;
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 1rem;
  color: white;
  box-shadow: 0 10px 40px rgba(76, 175, 80, 0.4);
}

.sprint-icon {
  font-size: 3rem;
  animation: flagWave 1s ease-in-out infinite;
}

.sprint-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.sprint-name {
  font-size: 1rem;
  opacity: 0.9;
}

// Animations
@keyframes pulseText {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes badgePop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fireFlicker {
  from {
    transform: scale(1) rotate(-5deg);
  }
  to {
    transform: scale(1.1) rotate(5deg);
  }
}

@keyframes flagWave {
  0%, 100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}

// Transition classes
.level-up-enter-active {
  animation: overlayIn 0.5s ease-out;
}

.level-up-leave-active {
  animation: overlayOut 0.3s ease-in forwards;
}

.streak-pop-enter-active,
.sprint-complete-enter-active {
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.streak-pop-leave-active,
.sprint-complete-leave-active {
  animation: popOut 0.3s ease-in forwards;
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes overlayOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes popIn {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes popOut {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
}
</style>
