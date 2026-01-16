/**
 * @file TodoItem.vue
 * @description Reusable todo item component with checkbox, priority badge, and actions.
 * Supports inline editing and status toggling.
 */
<template>
  <q-item class="todo-item">
    <!-- Checkbox -->
    <q-item-section avatar>
      <q-checkbox
        :model-value="todo.status === 'completed'"
        color="primary"
        @update:model-value="$emit('toggle', todo)"
      />
    </q-item-section>

    <!-- Content -->
    <q-item-section>
      <q-item-label
        :class="{ 'text-strike text-grey-6': todo.status === 'completed' }"
      >
        {{ todo.title }}
      </q-item-label>
      <q-item-label
        v-if="todo.description"
        caption
      >
        {{ todo.description }}
      </q-item-label>
      <q-item-label
        v-if="todo.dueDate"
        caption
        :class="dueDateClass"
      >
        <q-icon
          name="event"
          size="xs"
          class="q-mr-xs"
        />
        Due: {{ formattedDueDate }}
      </q-item-label>
    </q-item-section>

    <!-- Actions -->
    <q-item-section side>
      <div class="row items-center q-gutter-xs">
        <q-badge
          :color="priorityColor"
          :label="todo.priority"
          class="text-capitalize"
        />
        <q-btn
          flat
          round
          dense
          icon="edit"
          @click="$emit('edit', todo)"
        />
        <q-btn
          flat
          round
          dense
          icon="delete"
          color="negative"
          @click="$emit('delete', todo)"
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
/**
 * @component TodoItem
 * @description Individual todo item with status toggle, priority indicator, and action buttons.
 * @emits toggle - When checkbox is toggled
 * @emits edit - When edit button is clicked
 * @emits delete - When delete button is clicked
 */
import { computed } from 'vue'
import type { Todo, TodoPriority } from '@/services/api'

interface Props {
  /** The todo item to display */
  todo: Todo
}

const props = defineProps<Props>()

defineEmits<{
  /** Emitted when the checkbox is toggled */
  toggle: [todo: Todo]
  /** Emitted when the edit button is clicked */
  edit: [todo: Todo]
  /** Emitted when the delete button is clicked */
  delete: [todo: Todo]
}>()

/**
 * Computed color for priority badge
 */
const priorityColor = computed(() => {
  const colors: Record<TodoPriority, string> = {
    urgent: 'negative',
    high: 'warning',
    medium: 'info',
    low: 'grey'
  }
  return colors[props.todo.priority] || 'grey'
})

/**
 * Formatted due date string
 */
const formattedDueDate = computed(() => {
  if (!props.todo.dueDate) return ''
  return new Date(props.todo.dueDate).toLocaleDateString()
})

/**
 * CSS class for due date based on urgency
 */
const dueDateClass = computed(() => {
  if (!props.todo.dueDate || props.todo.status === 'completed') return ''

  const now = new Date()
  const due = new Date(props.todo.dueDate)
  const daysDiff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff < 0) return 'text-negative'
  if (daysDiff <= 2) return 'text-warning'
  return ''
})
</script>

<style lang="scss" scoped>
.todo-item {
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}
</style>
