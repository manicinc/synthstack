/**
 * @file SprintCard.vue
 * @description Sprint overview card with progress, goal, and time remaining.
 */
<template>
  <q-card
    class="sprint-card"
    :class="statusClass"
  >
    <!-- Status badge -->
    <q-badge
      :label="sprint.status"
      :color="statusColor"
      class="sprint-status-badge"
    />

    <q-card-section class="sprint-header">
      <div class="sprint-name">
        {{ sprint.name }}
      </div>
      <div class="sprint-duration">
        <q-icon
          name="date_range"
          size="xs"
        />
        {{ formatDateRange(sprint.startDate, sprint.endDate) }}
      </div>
    </q-card-section>

    <!-- Goal -->
    <q-card-section
      v-if="sprint.goal"
      class="sprint-goal"
    >
      <div class="goal-label">
        Goal
      </div>
      <div class="goal-text">
        {{ sprint.goal }}
      </div>
    </q-card-section>

    <!-- Progress -->
    <q-card-section class="sprint-progress">
      <div class="progress-header">
        <span class="progress-label">Progress</span>
        <span class="progress-value">
          {{ sprint.pointsCompleted || 0 }} / {{ sprint.pointGoal || 0 }} pts
        </span>
      </div>

      <q-linear-progress
        :value="progressValue"
        :color="progressColor"
        track-color="grey-3"
        rounded
        size="12px"
        class="progress-bar"
      />

      <div class="progress-stats">
        <div class="stat">
          <span class="stat-value">{{ completedTasks }}</span>
          <span class="stat-label">tasks done</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ velocity }}</span>
          <span class="stat-label">pts/day</span>
        </div>
        <div
          v-if="daysRemaining !== null"
          class="stat"
        >
          <span
            class="stat-value"
            :class="{ 'text-negative': daysRemaining <= 2 }"
          >
            {{ daysRemaining }}
          </span>
          <span class="stat-label">days left</span>
        </div>
      </div>
    </q-card-section>

    <!-- Actions -->
    <q-card-actions
      v-if="showActions"
      class="sprint-actions"
    >
      <q-btn
        v-if="sprint.status === 'planning'"
        label="Start Sprint"
        color="primary"
        unelevated
        @click="$emit('start', sprint)"
      />
      <q-btn
        v-if="sprint.status === 'active'"
        label="Complete"
        color="positive"
        outline
        @click="$emit('complete', sprint)"
      />
      <q-btn
        flat
        icon="more_vert"
        @click="$emit('menu', sprint)"
      >
        <q-menu>
          <q-list dense>
            <q-item
              v-close-popup
              clickable
              @click="$emit('edit', sprint)"
            >
              <q-item-section avatar>
                <q-icon name="edit" />
              </q-item-section>
              <q-item-section>Edit</q-item-section>
            </q-item>
            <q-item
              v-close-popup
              clickable
              @click="$emit('retrospective', sprint)"
            >
              <q-item-section avatar>
                <q-icon name="reviews" />
              </q-item-section>
              <q-item-section>Retrospective</q-item-section>
            </q-item>
            <q-separator />
            <q-item
              v-close-popup
              clickable
              class="text-negative"
              @click="$emit('delete', sprint)"
            >
              <q-item-section avatar>
                <q-icon name="delete" />
              </q-item-section>
              <q-item-section>Delete</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
/**
 * @component SprintCard
 * @description Displays sprint details with progress tracking.
 */
import { computed } from 'vue'
import type { Sprint } from '@/services/api'

interface Props {
  /** Sprint data */
  sprint: Sprint
  /** Number of completed tasks in sprint */
  completedTasks?: number
  /** Whether to show action buttons */
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  completedTasks: 0,
  showActions: true
})

defineEmits<{
  start: [sprint: Sprint]
  complete: [sprint: Sprint]
  edit: [sprint: Sprint]
  delete: [sprint: Sprint]
  menu: [sprint: Sprint]
  retrospective: [sprint: Sprint]
}>()

/** Status class for styling */
const statusClass = computed(() => `status-${props.sprint.status}`)

/** Color based on status */
const statusColor = computed(() => {
  const colors: Record<string, string> = {
    planning: 'grey',
    active: 'primary',
    completed: 'positive',
    cancelled: 'negative'
  }
  return colors[props.sprint.status] || 'grey'
})

/** Progress as decimal for q-linear-progress */
const progressValue = computed(() => {
  const goal = props.sprint.pointGoal || 0
  const completed = props.sprint.pointsCompleted || 0
  if (goal <= 0) return 0
  return Math.min(1, completed / goal)
})

/** Progress bar color based on percentage */
const progressColor = computed(() => {
  const pct = progressValue.value * 100
  if (pct >= 100) return 'positive'
  if (pct >= 75) return 'primary'
  if (pct >= 50) return 'info'
  if (pct >= 25) return 'warning'
  return 'grey'
})

/** Days remaining in sprint */
const daysRemaining = computed(() => {
  if (!props.sprint.endDate || props.sprint.status !== 'active') return null
  const end = new Date(props.sprint.endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

/** Calculate velocity (points per day) */
const velocity = computed(() => {
  if (!props.sprint.startDate) return 0
  const start = new Date(props.sprint.startDate)
  const now = new Date()
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const completed = props.sprint.pointsCompleted || 0
  return Math.round((completed / daysPassed) * 10) / 10
})

/** Format date range */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return `${startDate.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
  }

  return `${startDate.toLocaleDateString(undefined, opts)} - ${endDate.toLocaleDateString(undefined, opts)}`
}
</script>

<style lang="scss" scoped>
.sprint-card {
  position: relative;
  border-radius: 0.75rem;
  overflow: visible;

  &.status-active {
    border-left: 4px solid var(--q-primary);
  }

  &.status-completed {
    border-left: 4px solid var(--q-positive);
    opacity: 0.85;
  }

  &.status-cancelled {
    border-left: 4px solid var(--q-negative);
    opacity: 0.6;
  }
}

.sprint-status-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  text-transform: capitalize;
}

.sprint-header {
  padding-bottom: 0.5rem;
}

.sprint-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  padding-right: 70px; // Space for badge
}

.sprint-duration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--q-grey-7);
}

.sprint-goal {
  padding-top: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--q-grey-3);
}

.goal-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--q-grey-6);
  margin-bottom: 0.125rem;
}

.goal-text {
  font-size: 0.875rem;
  color: var(--q-grey-8);
  line-height: 1.4;
}

.sprint-progress {
  padding-top: 0.75rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-size: 0.75rem;
  font-weight: 600;
}

.progress-value {
  font-size: 0.75rem;
  color: var(--q-grey-7);
}

.progress-bar {
  margin-bottom: 0.75rem;
}

.progress-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.625rem;
  color: var(--q-grey-6);
  text-transform: uppercase;
}

.sprint-actions {
  border-top: 1px solid var(--q-grey-3);
  justify-content: space-between;
}

// Dark mode
.body--dark {
  .sprint-goal {
    border-bottom-color: var(--q-grey-8);
  }

  .sprint-actions {
    border-top-color: var(--q-grey-8);
  }

  .sprint-duration,
  .goal-label,
  .progress-value,
  .stat-label {
    color: var(--q-grey-5);
  }

  .goal-text {
    color: var(--q-grey-4);
  }
}
</style>
