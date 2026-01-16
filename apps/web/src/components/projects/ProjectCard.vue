/**
 * @file ProjectCard.vue
 * @description Reusable project card component for displaying project summary in lists.
 * Shows project name, description, status, progress, and quick action menu.
 */
<template>
  <q-card
    class="project-card cursor-pointer"
    @click="$emit('click', project)"
  >
    <q-card-section>
      <!-- Header with status and menu -->
      <div class="row items-center no-wrap q-mb-sm">
        <q-badge
          :color="statusColor"
          :label="project.status"
          class="text-capitalize"
        />
        <q-space />
        <q-btn
          flat
          round
          dense
          icon="more_vert"
          @click.stop="$emit('menu', $event)"
        />
      </div>

      <!-- Project name and description -->
      <div class="text-h6 ellipsis">
        {{ project.name }}
      </div>
      <p class="text-grey-7 text-body2 ellipsis-2-lines q-mb-sm">
        {{ project.description || 'No description' }}
      </p>
    </q-card-section>

    <q-separator />

    <!-- Stats footer -->
    <q-card-section class="q-pa-sm">
      <div class="row items-center text-caption text-grey-6">
        <div class="col">
          <q-icon
            name="check_circle"
            class="q-mr-xs"
          />
          {{ project.completedTodoCount || 0 }}/{{ project.todoCount || 0 }} todos
        </div>
        <div class="col-auto">
          <q-icon
            name="flag"
            class="q-mr-xs"
          />
          {{ project.milestoneCount || 0 }} milestones
        </div>
      </div>
    </q-card-section>

    <!-- Progress bar -->
    <q-linear-progress
      :value="progress"
      :color="progressColor"
      class="project-progress"
    />
  </q-card>
</template>

<script setup lang="ts">
/**
 * @component ProjectCard
 * @description Card component for displaying project information in a grid or list layout.
 * @emits click - When the card is clicked
 * @emits menu - When the menu button is clicked
 */
import { computed } from 'vue'
import type { Project, ProjectStatus } from '@/services/api'

interface Props {
  /** The project to display */
  project: Project
}

const props = defineProps<Props>()

defineEmits<{
  /** Emitted when the card body is clicked */
  click: [project: Project]
  /** Emitted when the menu button is clicked */
  menu: [event: Event]
}>()

/**
 * Computed color for the status badge
 */
const statusColor = computed(() => {
  const colors: Record<ProjectStatus, string> = {
    active: 'primary',
    completed: 'positive',
    archived: 'grey'
  }
  return colors[props.project.status] || 'grey'
})

/**
 * Computed progress value (0-1)
 */
const progress = computed(() => {
  const total = props.project.todoCount || 0
  const completed = props.project.completedTodoCount || 0
  return total > 0 ? completed / total : 0
})

/**
 * Computed progress bar color based on completion
 */
const progressColor = computed(() => {
  if (progress.value >= 1) return 'positive'
  if (progress.value >= 0.5) return 'primary'
  return 'warning'
})
</script>

<style lang="scss" scoped>
.project-card {
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.project-progress {
  height: 3px;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}
</style>
