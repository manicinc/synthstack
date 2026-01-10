/**
 * @file MilestoneTimeline.vue
 * @description Timeline visualization component for project milestones.
 * Displays milestones chronologically with status indicators.
 */
<template>
  <div class="milestone-timeline">
    <q-timeline
      v-if="milestones.length > 0"
      :color="color"
    >
      <q-timeline-entry
        v-for="milestone in sortedMilestones"
        :key="milestone.id"
        :icon="getIcon(milestone.status)"
        :color="getColor(milestone.status)"
      >
        <template #title>
          <div class="row items-center">
            <span class="text-weight-medium">{{ milestone.title }}</span>
            <q-badge
              :color="getColor(milestone.status)"
              :label="formatStatus(milestone.status)"
              class="q-ml-sm text-capitalize"
            />
          </div>
        </template>

        <template #subtitle>
          <span
            v-if="milestone.targetDate"
            class="text-grey-6"
          >
            <q-icon
              name="event"
              size="xs"
              class="q-mr-xs"
            />
            {{ formatDate(milestone.targetDate) }}
            <span
              v-if="isOverdue(milestone)"
              class="text-negative q-ml-sm"
            >
              ({{ getDaysOverdue(milestone) }} days overdue)
            </span>
          </span>
        </template>

        <div
          v-if="milestone.description"
          class="text-grey-7 q-mt-xs"
        >
          {{ milestone.description }}
        </div>

        <div
          v-if="showActions"
          class="q-mt-sm"
        >
          <q-btn
            flat
            dense
            size="sm"
            icon="edit"
            label="Edit"
            @click="$emit('edit', milestone)"
          />
          <q-btn
            flat
            dense
            size="sm"
            icon="delete"
            label="Delete"
            color="negative"
            @click="$emit('delete', milestone)"
          />
        </div>
      </q-timeline-entry>
    </q-timeline>

    <!-- Empty state -->
    <div
      v-else
      class="text-center q-pa-lg text-grey-6"
    >
      <q-icon
        name="flag"
        size="48px"
      />
      <p class="q-mt-md">
        {{ emptyMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @component MilestoneTimeline
 * @description Visual timeline for displaying project milestones with status and dates.
 * @emits edit - When edit button is clicked on a milestone
 * @emits delete - When delete button is clicked on a milestone
 */
import { computed } from 'vue'
import type { Milestone, MilestoneStatus } from '@/services/api'

interface Props {
  /** Array of milestones to display */
  milestones: Milestone[]
  /** Base color for the timeline */
  color?: string
  /** Whether to show action buttons */
  showActions?: boolean
  /** Message to show when empty */
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  showActions: true,
  emptyMessage: 'No milestones yet'
})

defineEmits<{
  /** Emitted when edit is clicked */
  edit: [milestone: Milestone]
  /** Emitted when delete is clicked */
  delete: [milestone: Milestone]
}>()

/**
 * Milestones sorted by target date
 */
const sortedMilestones = computed(() => {
  return [...props.milestones].sort((a, b) => {
    if (!a.targetDate) return 1
    if (!b.targetDate) return -1
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  })
})

/**
 * Get icon for milestone status
 * @param status - Milestone status
 * @returns Icon name
 */
function getIcon(status: MilestoneStatus): string {
  const icons: Record<MilestoneStatus, string> = {
    completed: 'check_circle',
    in_progress: 'play_circle',
    missed: 'cancel',
    upcoming: 'schedule'
  }
  return icons[status] || 'flag'
}

/**
 * Get color for milestone status
 * @param status - Milestone status
 * @returns Quasar color name
 */
function getColor(status: MilestoneStatus): string {
  const colors: Record<MilestoneStatus, string> = {
    completed: 'positive',
    in_progress: 'primary',
    missed: 'negative',
    upcoming: 'grey'
  }
  return colors[status] || 'grey'
}

/**
 * Format status for display
 * @param status - Milestone status
 * @returns Formatted status string
 */
function formatStatus(status: MilestoneStatus): string {
  return status.replace('_', ' ')
}

/**
 * Format date for display
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'No date set'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Check if milestone is overdue
 * @param milestone - Milestone to check
 * @returns True if overdue and not completed
 */
function isOverdue(milestone: Milestone): boolean {
  if (!milestone.targetDate || milestone.status === 'completed') return false
  return new Date(milestone.targetDate) < new Date()
}

/**
 * Get number of days overdue
 * @param milestone - Milestone to check
 * @returns Number of days overdue
 */
function getDaysOverdue(milestone: Milestone): number {
  if (!milestone.targetDate) return 0
  const diff = new Date().getTime() - new Date(milestone.targetDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
</script>

<style lang="scss" scoped>
.milestone-timeline {
  max-width: 800px;
}
</style>
