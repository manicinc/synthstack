/**
 * @file GamificationStats.vue
 * @description Overview panel showing user's gamification stats.
 */
<template>
  <q-card class="gamification-stats">
    <q-card-section class="stats-header">
      <div class="header-title">
        Your Progress
      </div>
      <q-btn
        flat
        dense
        round
        icon="refresh"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </q-card-section>

    <q-card-section class="stats-content">
      <!-- Level & XP -->
      <div class="stats-row">
        <LevelProgressBar
          :level="stats?.level || 1"
          :xp-current="stats?.xpCurrent || 0"
          :xp-for-next-level="stats?.xpForNextLevel || 100"
          :show-next-level="true"
        />
      </div>

      <!-- Quick stats -->
      <div class="quick-stats">
        <div class="stat-card">
          <q-icon
            name="stars"
            class="stat-icon points"
          />
          <div class="stat-info">
            <div class="stat-value">
              {{ formatNumber(stats?.totalPoints || 0) }}
            </div>
            <div class="stat-label">
              Total Points
            </div>
          </div>
        </div>

        <div class="stat-card">
          <StreakIndicator
            :streak="stats?.currentStreak || 0"
            :best-streak="stats?.bestStreak"
            size="md"
            :show-label="false"
            :show-tooltip="false"
          />
          <div class="stat-info">
            <div class="stat-value">
              {{ stats?.currentStreak || 0 }}
            </div>
            <div class="stat-label">
              Day Streak
            </div>
          </div>
        </div>

        <div class="stat-card">
          <q-icon
            name="task_alt"
            class="stat-icon tasks"
          />
          <div class="stat-info">
            <div class="stat-value">
              {{ stats?.tasksCompletedThisWeek || 0 }}
            </div>
            <div class="stat-label">
              This Week
            </div>
          </div>
        </div>

        <div class="stat-card">
          <q-icon
            name="emoji_events"
            class="stat-icon achievements"
          />
          <div class="stat-info">
            <div class="stat-value">
              {{ stats?.achievementsUnlocked || 0 }}
            </div>
            <div class="stat-label">
              Achievements
            </div>
          </div>
        </div>
      </div>

      <!-- Personal bests -->
      <div
        v-if="showPersonalBests"
        class="personal-bests"
      >
        <div class="bests-title">
          Personal Bests
        </div>
        <div class="bests-grid">
          <div class="best-item">
            <q-icon
              name="local_fire_department"
              class="best-icon"
            />
            <div class="best-value">
              {{ stats?.bestStreak || 0 }}
            </div>
            <div class="best-label">
              Best Streak
            </div>
          </div>
          <div class="best-item">
            <q-icon
              name="speed"
              class="best-icon"
            />
            <div class="best-value">
              {{ stats?.bestDayPoints || 0 }}
            </div>
            <div class="best-label">
              Best Day
            </div>
          </div>
          <div class="best-item">
            <q-icon
              name="trending_up"
              class="best-icon"
            />
            <div class="best-value">
              {{ stats?.bestWeekPoints || 0 }}
            </div>
            <div class="best-label">
              Best Week
            </div>
          </div>
        </div>
      </div>
    </q-card-section>

    <!-- View more link -->
    <q-card-actions
      v-if="showViewMore"
      class="stats-actions"
    >
      <q-btn
        flat
        label="View Achievements"
        icon-right="arrow_forward"
        color="primary"
        @click="$emit('viewAchievements')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
/**
 * @component GamificationStats
 * @description Displays user's gamification overview in a card.
 */
import type { GamificationStats as GamificationStatsType } from '@/services/api'
import LevelProgressBar from './LevelProgressBar.vue'
import StreakIndicator from './StreakIndicator.vue'

interface Props {
  /** User's gamification stats */
  stats?: GamificationStatsType | null
  /** Loading state */
  loading?: boolean
  /** Whether to show personal bests section */
  showPersonalBests?: boolean
  /** Whether to show view more link */
  showViewMore?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showPersonalBests: true,
  showViewMore: true
})

defineEmits<{
  refresh: []
  viewAchievements: []
}>()

/** Format large numbers with k suffix */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toLocaleString()
}
</script>

<style lang="scss" scoped>
.gamification-stats {
  border-radius: 0.75rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
}

.header-title {
  font-weight: 600;
  font-size: 1rem;
}

.stats-content {
  padding-top: 0;
}

.stats-row {
  margin-bottom: 1.25rem;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--q-grey-1);
  border-radius: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: var(--q-grey-2);
    transform: translateY(-2px);
  }
}

.stat-icon {
  font-size: 1.5rem;

  &.points {
    color: #ffd700;
  }

  &.tasks {
    color: #4caf50;
  }

  &.achievements {
    color: #ab47bc;
  }
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-weight: 700;
  font-size: 1.125rem;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.625rem;
  color: var(--q-grey-6);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.personal-bests {
  padding-top: 1rem;
  border-top: 1px solid var(--q-grey-3);
}

.bests-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--q-grey-7);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bests-grid {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.best-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.best-icon {
  font-size: 1.25rem;
  color: var(--q-grey-5);
}

.best-value {
  font-weight: 700;
  font-size: 1rem;
}

.best-label {
  font-size: 0.625rem;
  color: var(--q-grey-6);
}

.stats-actions {
  border-top: 1px solid var(--q-grey-3);
}

// Dark mode
.body--dark {
  .stat-card {
    background: var(--q-grey-9);

    &:hover {
      background: var(--q-grey-8);
    }
  }

  .stat-label,
  .best-label,
  .bests-title {
    color: var(--q-grey-5);
  }

  .best-icon {
    color: var(--q-grey-6);
  }

  .personal-bests,
  .stats-actions {
    border-top-color: var(--q-grey-8);
  }
}
</style>
