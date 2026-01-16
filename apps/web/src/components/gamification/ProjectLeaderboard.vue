/**
 * @file ProjectLeaderboard.vue
 * @description Team leaderboard showing top contributors by points.
 */
<template>
  <q-card class="project-leaderboard">
    <q-card-section class="leaderboard-header">
      <div class="header-title">
        <q-icon
          name="leaderboard"
          class="title-icon"
        />
        <span>Leaderboard</span>
      </div>

      <q-btn-toggle
        v-model="period"
        toggle-color="primary"
        :options="periodOptions"
        dense
        unelevated
        class="period-toggle"
      />
    </q-card-section>

    <q-card-section class="leaderboard-content">
      <!-- Loading state -->
      <div
        v-if="loading"
        class="loading-state"
      >
        <q-skeleton
          v-for="i in 5"
          :key="i"
          type="rect"
          height="48px"
          class="q-mb-sm"
        />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="entries.length === 0"
        class="empty-state"
      >
        <q-icon
          name="emoji_events"
          size="48px"
          color="grey-4"
        />
        <div class="empty-text">
          No activity yet
        </div>
        <div class="empty-subtext">
          Complete tasks to appear on the leaderboard
        </div>
      </div>

      <!-- Leaderboard entries -->
      <div
        v-else
        class="leaderboard-list"
      >
        <div
          v-for="(entry, index) in entries"
          :key="entry.userId"
          class="leaderboard-entry"
          :class="[getRankClass(index), { 'is-current-user': entry.isCurrentUser }]"
        >
          <!-- Rank -->
          <div class="entry-rank">
            <q-icon
              v-if="index < 3"
              :name="getRankIcon(index)"
              :class="getRankClass(index)"
            />
            <span v-else>{{ index + 1 }}</span>
          </div>

          <!-- User info -->
          <q-avatar
            size="32px"
            class="entry-avatar"
          >
            <img
              v-if="entry.avatarUrl"
              :src="entry.avatarUrl"
              :alt="entry.displayName"
            >
            <q-icon
              v-else
              name="person"
            />
          </q-avatar>

          <div class="entry-info">
            <div class="entry-name">
              {{ entry.displayName }}
              <q-badge
                v-if="entry.isCurrentUser"
                label="You"
                color="primary"
                class="you-badge"
              />
            </div>
            <div class="entry-meta">
              Level {{ entry.level }} · {{ entry.tasksCompleted }} tasks
            </div>
          </div>

          <!-- Points -->
          <div class="entry-points">
            <span class="points-value">{{ formatPoints(entry.points ?? 0) }}</span>
            <span class="points-label">pts</span>
          </div>
        </div>
      </div>
    </q-card-section>

    <!-- Current user position if not in top -->
    <q-card-section
      v-if="currentUserEntry && !currentUserInTop"
      class="current-user-section"
    >
      <div class="section-divider">
        <span>Your Position</span>
      </div>
      <div class="leaderboard-entry is-current-user">
        <div class="entry-rank">
          {{ currentUserEntry.rank }}
        </div>
        <q-avatar
          size="32px"
          class="entry-avatar"
        >
          <img
            v-if="currentUserEntry.avatarUrl"
            :src="currentUserEntry.avatarUrl"
          >
          <q-icon
            v-else
            name="person"
          />
        </q-avatar>
        <div class="entry-info">
          <div class="entry-name">
            {{ currentUserEntry.displayName }}
          </div>
          <div class="entry-meta">
            Level {{ currentUserEntry.level }} · {{ currentUserEntry.tasksCompleted }} tasks
          </div>
        </div>
        <div class="entry-points">
          <span class="points-value">{{ formatPoints(currentUserEntry.points ?? 0) }}</span>
          <span class="points-label">pts</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
/**
 * @component ProjectLeaderboard
 * @description Displays team leaderboard with period filtering.
 */
import { ref, computed, watch } from 'vue'
import type { LeaderboardEntry } from '@/services/api'

interface Props {
  /** Leaderboard entries */
  entries: LeaderboardEntry[]
  /** Loading state */
  loading?: boolean
  /** Current user's entry (if not in top) */
  currentUserEntry?: LeaderboardEntry & { rank: number }
  /** Maximum entries to show */
  maxEntries?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  maxEntries: 10
})

const emit = defineEmits<{
  periodChange: [period: 'week' | 'month' | 'sprint' | 'all']
}>()

const period = ref<'week' | 'month' | 'sprint' | 'all'>('sprint')

const periodOptions = [
  { label: 'Sprint', value: 'sprint' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All', value: 'all' }
]

watch(period, (newPeriod) => {
  emit('periodChange', newPeriod)
})

/** Check if current user is in the displayed top entries */
const currentUserInTop = computed(() => {
  return props.entries.some(e => e.isCurrentUser)
})

/** Get CSS class for rank */
function getRankClass(index: number): string {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

/** Get icon for top 3 ranks */
function getRankIcon(index: number): string {
  if (index === 0) return 'emoji_events'
  if (index === 1) return 'military_tech'
  if (index === 2) return 'workspace_premium'
  return 'tag'
}

/** Format large point numbers */
function formatPoints(points: number): string {
  if (points >= 10000) {
    return (points / 1000).toFixed(1) + 'k'
  }
  return points.toLocaleString()
}
</script>

<style lang="scss" scoped>
.project-leaderboard {
  border-radius: 0.75rem;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;

  .title-icon {
    color: var(--q-primary);
  }
}

.period-toggle {
  :deep(.q-btn) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
}

.leaderboard-content {
  padding-top: 0;
}

.loading-state,
.empty-state {
  padding: 1rem 0;
}

.empty-state {
  text-align: center;

  .empty-text {
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .empty-subtext {
    font-size: 0.75rem;
    color: var(--q-grey-6);
  }
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: var(--q-grey-1);
  transition: all 0.2s;

  &:hover {
    background: var(--q-grey-2);
  }

  &.is-current-user {
    background: rgba(var(--q-primary-rgb), 0.1);
    border: 1px solid rgba(var(--q-primary-rgb), 0.3);
  }

  &.rank-gold {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%);
  }

  &.rank-silver {
    background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%);
  }

  &.rank-bronze {
    background: linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(205, 127, 50, 0.05) 100%);
  }
}

.entry-rank {
  width: 28px;
  text-align: center;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--q-grey-6);

  &.rank-gold {
    color: #ffd700;
    font-size: 1.25rem;
  }

  &.rank-silver {
    color: #c0c0c0;
    font-size: 1.125rem;
  }

  &.rank-bronze {
    color: #cd7f32;
    font-size: 1rem;
  }
}

.entry-avatar {
  background: var(--q-grey-3);
  color: var(--q-grey-6);
}

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-name {
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.you-badge {
  font-size: 0.625rem;
}

.entry-meta {
  font-size: 0.75rem;
  color: var(--q-grey-6);
}

.entry-points {
  text-align: right;
}

.points-value {
  font-weight: 700;
  font-size: 1rem;
  color: var(--q-primary);
}

.points-label {
  font-size: 0.625rem;
  color: var(--q-grey-6);
  margin-left: 0.125rem;
}

.current-user-section {
  border-top: 1px solid var(--q-grey-3);
  padding-top: 0.75rem;
}

.section-divider {
  text-align: center;
  font-size: 0.75rem;
  color: var(--q-grey-6);
  margin-bottom: 0.75rem;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background: var(--q-grey-3);
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }

  span {
    background: white;
    padding: 0 0.5rem;
    position: relative;
  }
}

// Dark mode
.body--dark {
  .leaderboard-entry {
    background: var(--q-grey-9);

    &:hover {
      background: var(--q-grey-8);
    }

    &.is-current-user {
      background: rgba(var(--q-primary-rgb), 0.15);
    }
  }

  .entry-avatar {
    background: var(--q-grey-8);
    color: var(--q-grey-5);
  }

  .entry-meta,
  .empty-subtext,
  .points-label {
    color: var(--q-grey-5);
  }

  .entry-rank {
    color: var(--q-grey-5);
  }

  .current-user-section {
    border-top-color: var(--q-grey-8);
  }

  .section-divider {
    &::before,
    &::after {
      background: var(--q-grey-8);
    }

    span {
      background: var(--q-dark);
    }
  }
}
</style>
