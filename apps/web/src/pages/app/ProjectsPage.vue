/**
 * @file ProjectsPage.vue
 * @description Projects list page for managing all user projects.
 * Displays projects in a grid layout with filtering, sorting, and quick actions.
 * Integrates with AI Copilot for project suggestions.
 */
<template>
  <q-page class="projects-page q-pa-md">
    <!-- Header Section -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 q-mb-none">
          Projects
        </h1>
        <p class="text-grey-7 q-mb-none">
          Manage your projects, todos, and milestones
        </p>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="add"
          label="New Project"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-4">
        <q-input
          v-model="searchQuery"
          outlined
          dense
          placeholder="Search projects..."
          clearable
          data-testid="projects-search"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          outlined
          dense
          emit-value
          map-options
          label="Status"
        />
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="sortBy"
          :options="sortOptions"
          outlined
          dense
          emit-value
          map-options
          label="Sort by"
        />
      </div>
      <div class="col-auto">
        <q-btn-toggle
          v-model="viewMode"
          toggle-color="primary"
          data-testid="view-toggle"
          :options="[
            { value: 'grid', icon: 'grid_view', 'aria-label': 'Grid view' },
            { value: 'list', icon: 'view_list', 'aria-label': 'List view' }
          ]"
          flat
        />
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="projectsStore.loading.projects"
      class="row justify-center q-pa-xl"
    >
      <q-spinner-dots
        size="50px"
        color="primary"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredProjects.length === 0"
      class="text-center q-pa-xl"
    >
      <q-icon
        name="folder_open"
        size="64px"
        color="grey-5"
      />
      <h5 class="q-mt-md text-grey-7">
        {{ searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet' }}
      </h5>
      <p class="text-grey-6">
        {{ searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Create your first project to get started' }}
      </p>
      <q-btn
        v-if="!searchQuery && statusFilter === 'all'"
        color="primary"
        icon="add"
        label="Create First Project"
        class="q-mt-md"
        @click="router.push('/app/projects/new')"
      />
    </div>

    <!-- Projects Grid -->
    <div
      v-else-if="viewMode === 'grid'"
      class="row q-col-gutter-md"
    >
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="col-12 col-sm-6 col-md-4 col-lg-3"
      >
        <q-card
          class="project-card cursor-pointer"
          @click="goToProject(project.id)"
        >
          <q-card-section>
            <div class="row items-center no-wrap q-mb-sm">
              <q-badge
                :color="getStatusColor(project.status)"
                :label="project.status"
                class="text-capitalize"
              />
              <q-badge
                v-if="project.isSystem"
                color="deep-purple"
                text-color="white"
                outline
                class="q-ml-xs"
              >
                <q-icon
                  name="verified"
                  size="10px"
                  class="q-mr-xs"
                />
                Example
              </q-badge>
              <q-space />
              <q-btn
                flat
                round
                dense
                icon="more_vert"
                @click.stop="openProjectMenu($event, project)"
              />
            </div>
            <div class="text-h6 ellipsis">
              {{ project.name }}
            </div>
            <p class="text-grey-7 text-body2 ellipsis-2-lines q-mb-sm">
              {{ project.description || 'No description' }}
            </p>
            <!-- Project Tags -->
            <div
              v-if="project.tags && project.tags.length > 0"
              class="q-gutter-xs"
            >
              <q-badge
                v-for="tag in project.tags.slice(0, 3)"
                :key="tag.name"
                :color="tag.color"
                text-color="white"
                outline
                class="text-caption"
              >
                {{ tag.name }}
              </q-badge>
              <q-badge
                v-if="project.tags.length > 3"
                color="grey"
                text-color="white"
                outline
                class="text-caption"
              >
                +{{ project.tags.length - 3 }}
              </q-badge>
            </div>
          </q-card-section>

          <q-separator />

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

          <!-- Progress Bar -->
          <q-linear-progress
            :value="getProjectProgress(project)"
            color="primary"
            class="project-progress"
          />
        </q-card>
      </div>
    </div>

    <!-- Projects List View -->
    <q-list
      v-else
      separator
    >
      <q-item
        v-for="project in filteredProjects"
        :key="project.id"
        clickable
        @click="goToProject(project.id)"
      >
        <q-item-section avatar>
          <q-avatar
            :color="getStatusColor(project.status)"
            text-color="white"
          >
            <q-icon name="folder" />
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ project.name }}</q-item-label>
          <q-item-label caption>
            {{ project.description || 'No description' }}
          </q-item-label>
          <!-- Project Tags in List View -->
          <div
            v-if="project.tags && project.tags.length > 0"
            class="q-mt-xs q-gutter-xs"
          >
            <q-badge
              v-for="tag in project.tags"
              :key="tag.name"
              :color="tag.color"
              text-color="white"
              outline
              class="text-caption"
            >
              {{ tag.name }}
            </q-badge>
          </div>
        </q-item-section>

        <q-item-section side>
          <div class="row items-center q-gutter-sm">
            <q-badge
              outline
              :color="getStatusColor(project.status)"
              class="text-capitalize"
            >
              {{ project.status }}
            </q-badge>
            <q-badge
              v-if="project.isSystem"
              color="deep-purple"
              text-color="white"
              outline
            >
              <q-icon
                name="verified"
                size="10px"
                class="q-mr-xs"
              />
              Example
            </q-badge>
            <span class="text-caption text-grey-6">
              {{ project.completedTodoCount || 0 }}/{{ project.todoCount || 0 }} todos
            </span>
            <q-btn
              flat
              round
              dense
              icon="more_vert"
              @click.stop="openProjectMenu($event, project)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Project Context Menu -->
    <q-menu
      v-model="showContextMenu"
      :target="contextMenuTarget"
      anchor="bottom right"
      self="top right"
    >
      <q-list style="min-width: 150px">
        <q-item
          v-close-popup
          clickable
          @click="editProject(selectedProject!)"
        >
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Edit</q-item-section>
        </q-item>
        <q-item
          v-close-popup
          clickable
          @click="duplicateProject(selectedProject!)"
        >
          <q-item-section avatar>
            <q-icon name="content_copy" />
          </q-item-section>
          <q-item-section>Duplicate</q-item-section>
        </q-item>
        <q-separator />
        <q-item
          v-close-popup
          clickable
          @click="archiveProject(selectedProject!)"
        >
          <q-item-section avatar>
            <q-icon name="archive" />
          </q-item-section>
          <q-item-section>Archive</q-item-section>
        </q-item>
        <!-- Hide delete option for system projects -->
        <q-item
          v-if="!selectedProject?.isSystem"
          v-close-popup
          clickable
          @click="deleteProject(selectedProject!)"
        >
          <q-item-section avatar>
            <q-icon
              name="delete"
              color="negative"
            />
          </q-item-section>
          <q-item-section class="text-negative">
            Delete
          </q-item-section>
        </q-item>
        <q-item
          v-else
          disable
          class="text-grey-5"
        >
          <q-item-section avatar>
            <q-icon name="lock" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Protected</q-item-label>
            <q-item-label caption>
              System project
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Create/Edit Project Dialog -->
    <q-dialog
      v-model="showCreateDialog"
      persistent
    >
      <q-card style="width: min(400px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ editingProject ? 'Edit Project' : 'Create Project' }}
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>
	
        <q-card-section>
          <q-input
            ref="projectNameInput"
            v-model="projectForm.name"
            label="Project Name"
            outlined
            :rules="[val => !!val || 'Name is required']"
            class="q-mb-md"
          />
          <q-input
            v-model="projectForm.description"
            label="Description"
            outlined
            type="textarea"
            rows="3"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            :label="editingProject ? 'Save' : 'Create'"
            :loading="saving"
            @click="saveProject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <q-avatar
            icon="warning"
            color="negative"
            text-color="white"
          />
          <span class="q-ml-sm text-h6">Delete Project</span>
        </q-card-section>

        <q-card-section>
          Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>?
          This will also delete all todos, milestones, and marketing plans.
          This action cannot be undone.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="confirmDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
/**
 * @component ProjectsPage
 * @description Main projects list page with grid/list views, filtering, and CRUD operations.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { QInput } from 'quasar'
import { useProjectsStore } from '@/stores/projects'
import type { Project, ProjectStatus, ProjectTag } from '@/services/api'

const router = useRouter()
const $q = useQuasar()
const projectsStore = useProjectsStore()

/** Search query for filtering projects */
const searchQuery = ref('')

/** Status filter value */
const statusFilter = ref<ProjectStatus | 'all'>('all')

/** Sort field selection */
const sortBy = ref('updated')

/** View mode toggle */
const viewMode = ref<'grid' | 'list'>('grid')

/** Create/edit dialog visibility */
const showCreateDialog = ref(false)

/** Delete confirmation dialog visibility */
const showDeleteDialog = ref(false)

/** Context menu visibility */
const showContextMenu = ref(false)

/** Context menu target element */
const contextMenuTarget = ref<HTMLElement | undefined>(undefined)

/** Currently selected project for context menu */
const selectedProject = ref<Project | null>(null)

/** Project being edited (null for create) */
const editingProject = ref<Project | null>(null)

/** Project to delete */
const projectToDelete = ref<Project | null>(null)

/** Saving state */
const saving = ref(false)

/** Deleting state */
const deleting = ref(false)

/** Project form data */
const projectForm = ref({
  name: '',
  description: ''
})

const projectNameInput = ref<QInput | null>(null)

function openCreateDialog(): void {
  resetForm()
  showCreateDialog.value = true
}

/** Status filter options */
const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' }
]

/** Sort options */
const sortOptions = [
  { label: 'Recently Updated', value: 'updated' },
  { label: 'Recently Created', value: 'created' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Progress', value: 'progress' }
]

/**
 * Filtered and sorted projects based on current filters
 */
const filteredProjects = computed(() => {
  let result = [...projectsStore.projects]

  // Apply search filter (includes tag names)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.tags?.some(tag => tag.name.toLowerCase().includes(query))
    )
  }

  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(p => p.status === statusFilter.value)
  }

  // Apply sorting
  switch (sortBy.value) {
    case 'updated':
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      break
    case 'created':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'progress':
      result.sort((a, b) => getProjectProgress(b) - getProjectProgress(a))
      break
  }

  return result
})

/**
 * Get color for project status badge
 * @param status - Project status
 * @returns Quasar color name
 */
function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'active': return 'primary'
    case 'completed': return 'positive'
    case 'archived': return 'grey'
    default: return 'grey'
  }
}

/**
 * Calculate project progress (0-1)
 * @param project - Project to calculate progress for
 * @returns Progress value between 0 and 1
 */
function getProjectProgress(project: Project): number {
  if (!project.todoCount || project.todoCount === 0) return 0
  return (project.completedTodoCount || 0) / project.todoCount
}

/**
 * Navigate to project detail page
 * @param projectId - Project ID to navigate to
 */
function goToProject(projectId: string): void {
  router.push({ name: 'project-detail', params: { id: projectId } })
}

/**
 * Open context menu for a project
 * @param event - Click event
 * @param project - Project to show menu for
 */
function openProjectMenu(event: Event, project: Project): void {
  selectedProject.value = project
  contextMenuTarget.value = (event.target as HTMLElement) || undefined
  showContextMenu.value = true
}

/**
 * Open edit dialog for a project
 * @param project - Project to edit
 */
function editProject(project: Project): void {
  editingProject.value = project
  projectForm.value = {
    name: project.name,
    description: project.description || ''
  }
  showCreateDialog.value = true
}

/**
 * Duplicate a project
 * @param project - Project to duplicate
 */
async function duplicateProject(project: Project): Promise<void> {
  try {
    await projectsStore.createProject({
      name: `${project.name} (Copy)`,
      description: project.description
    })
    $q.notify({
      type: 'positive',
      message: 'Project duplicated successfully'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to duplicate project'
    })
  }
}

/**
 * Archive a project
 * @param project - Project to archive
 */
async function archiveProject(project: Project): Promise<void> {
  try {
    await projectsStore.updateProject(project.id, { status: 'archived' })
    $q.notify({
      type: 'positive',
      message: 'Project archived'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to archive project'
    })
  }
}

/**
 * Show delete confirmation dialog
 * @param project - Project to delete
 */
function deleteProject(project: Project): void {
  projectToDelete.value = project
  showDeleteDialog.value = true
}

/**
 * Confirm and execute project deletion
 */
async function confirmDelete(): Promise<void> {
  if (!projectToDelete.value) return

  deleting.value = true
  try {
    await projectsStore.deleteProject(projectToDelete.value.id)
    showDeleteDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'Project deleted successfully'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to delete project'
    })
  } finally {
    deleting.value = false
    projectToDelete.value = null
  }
}

/**
 * Save project (create or update)
 */
async function saveProject(): Promise<void> {
  if (!projectForm.value.name.trim()) {
    projectNameInput.value?.validate()
    return
  }

  saving.value = true
  try {
    if (editingProject.value) {
      await projectsStore.updateProject(editingProject.value.id, projectForm.value)
      $q.notify({
        type: 'positive',
        message: 'Project updated successfully'
      })
    } else {
      const newProject = await projectsStore.createProject(projectForm.value)
      if (newProject) {
        router.push({ name: 'project-detail', params: { id: newProject.id } })
      }
      $q.notify({
        type: 'positive',
        message: 'Project created successfully'
      })
    }
    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: editingProject.value ? 'Failed to update project' : 'Failed to create project'
    })
  } finally {
    saving.value = false
  }
}

/**
 * Reset form to initial state
 */
function resetForm(): void {
  editingProject.value = null
  projectForm.value = {
    name: '',
    description: ''
  }
}

// Load projects on mount
onMounted(() => {
  projectsStore.fetchProjects()
})
</script>

<style lang="scss" scoped>
.projects-page {
  max-width: 1400px;
  margin: 0 auto;
}

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
