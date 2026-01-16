/**
 * @file ProjectForm.vue
 * @description Reusable form component for creating and editing projects.
 * Includes validation and supports both create and edit modes.
 */
<template>
  <q-form
    class="project-form"
    @submit.prevent="handleSubmit"
  >
    <q-input
      v-model="form.name"
      label="Project Name"
      outlined
      :rules="nameRules"
      lazy-rules
      class="q-mb-md"
    />

    <q-input
      v-model="form.description"
      label="Description"
      outlined
      type="textarea"
      rows="3"
      hint="Optional - describe what this project is about"
      class="q-mb-md"
    />

    <q-select
      v-if="showStatus"
      v-model="form.status"
      :options="statusOptions"
      label="Status"
      outlined
      emit-value
      map-options
      class="q-mb-md"
    />

    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn
        v-if="showCancel"
        flat
        label="Cancel"
        @click="$emit('cancel')"
      />
      <q-btn
        type="submit"
        color="primary"
        :label="submitLabel"
        :loading="loading"
      />
    </div>
  </q-form>
</template>

<script setup lang="ts">
/**
 * @component ProjectForm
 * @description Form for creating or editing projects with validation.
 * @emits submit - When form is submitted with valid data
 * @emits cancel - When cancel button is clicked
 */
import { ref, watch, computed } from 'vue'
import type { Project, ProjectStatus } from '@/services/api'

interface Props {
  /** Initial project data for editing */
  project?: Partial<Project> | null
  /** Loading state for submit button */
  loading?: boolean
  /** Whether to show status field */
  showStatus?: boolean
  /** Whether to show cancel button */
  showCancel?: boolean
  /** Custom submit button label */
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  project: null,
  loading: false,
  showStatus: false,
  showCancel: true,
  submitLabel: 'Save'
})

const emit = defineEmits<{
  /** Emitted when form is submitted */
  submit: [data: { name: string; description?: string; status?: ProjectStatus }]
  /** Emitted when cancel is clicked */
  cancel: []
}>()

/** Form data */
const form = ref({
  name: '',
  description: '',
  status: 'active' as ProjectStatus
})

/** Status options for select */
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' }
]

/** Validation rules for name field */
const nameRules = [
  (val: string) => !!val || 'Project name is required',
  (val: string) => val.length >= 2 || 'Name must be at least 2 characters',
  (val: string) => val.length <= 255 || 'Name must be less than 255 characters'
]

/**
 * Handle form submission
 */
function handleSubmit(): void {
  if (!form.value.name.trim()) return

  emit('submit', {
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
    status: props.showStatus ? form.value.status : undefined
  })
}

/**
 * Reset form to initial state
 */
function resetForm(): void {
  form.value = {
    name: props.project?.name || '',
    description: props.project?.description || '',
    status: props.project?.status || 'active'
  }
}

// Watch for project prop changes
watch(
  () => props.project,
  () => resetForm(),
  { immediate: true }
)

// Expose reset method
defineExpose({ resetForm })
</script>

<style lang="scss" scoped>
.project-form {
  max-width: 500px;
}
</style>
