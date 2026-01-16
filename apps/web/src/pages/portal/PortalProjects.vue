<template>
  <q-page class="portal-projects q-pa-md">
    <q-pull-to-refresh @refresh="handleRefresh">
      <!-- Page Header -->
      <div class="row items-center q-mb-lg">
        <div class="col">
          <h1 class="text-h4 text-weight-bold q-mb-none">
            Projects
          </h1>
          <p class="text-grey-7 q-mb-none">
            View and track your active projects
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <SkeletonLoader
        v-if="loading"
        type="grid"
        :count="6"
      />

      <!-- Empty State -->
      <EmptyState
        v-else-if="projects.length === 0"
        icon="folder_open"
        title="No projects yet"
        description="You don't have any projects assigned to you yet"
      />

      <!-- Projects Grid -->
      <div
        v-else
        class="row q-col-gutter-md"
      >
        <div
          v-for="project in projects"
          :key="project.id"
          class="col-12 col-sm-6 col-lg-4"
        >
          <q-card
            class="project-card cursor-pointer"
            @click="$router.push({ name: 'portal-project', params: { id: project.id } })"
          >
            <q-card-section>
              <div class="row items-start no-wrap">
                <q-icon
                  name="folder"
                  size="32px"
                  color="primary"
                  class="q-mr-md"
                />
                <div class="col">
                  <div class="text-h6 text-weight-medium ellipsis">
                    {{ project.name }}
                  </div>
                  <q-badge
                    :color="getStatusColor(project.status)"
                    :label="formatStatus(project.status)"
                  />
                </div>
              </div>
            </q-card-section>

            <q-card-section
              v-if="project.description"
              class="q-pt-none"
            >
              <div class="text-body2 text-grey-7 ellipsis-2-lines">
                {{ project.description }}
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section class="row items-center q-gutter-md">
              <!-- Progress -->
              <div class="col">
                <div class="text-caption text-grey-7 q-mb-xs">
                  Progress
                </div>
                <q-linear-progress
                  :value="getProjectProgress(project) / 100"
                  color="primary"
                  track-color="grey-3"
                  rounded
                  size="8px"
                />
                <div class="text-caption text-right q-mt-xs">
                  {{ project.completedTaskCount || 0 }} / {{ project.taskCount || 0 }} tasks
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section class="row items-center text-caption text-grey-7">
              <q-icon
                name="person"
                size="16px"
                class="q-mr-xs"
              />
              <span>{{ formatRole(project.role) }}</span>
              <q-space />
              <q-icon
                name="update"
                size="16px"
                class="q-mr-xs"
              />
              <span>{{ formatDate(project.updatedAt) }}</span>
            </q-card-section>

            <!-- Permissions indicators -->
            <q-card-section class="row q-gutter-xs q-pt-none">
              <q-chip
                v-if="project.canViewTasks"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
                icon="task"
              >
                Tasks
              </q-chip>
              <q-chip
                v-if="project.canViewFiles"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
                icon="folder"
              >
                Files
              </q-chip>
              <q-chip
                v-if="project.canViewInvoices"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
                icon="receipt"
              >
                Invoices
              </q-chip>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePortal, type PortalProject } from '@/composables/usePortal'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useHaptics } from '@/composables/useHaptics'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const $q = useQuasar()
const portal = usePortal()
const { success } = useHaptics()

const loading = ref(true)
const projects = ref<PortalProject[]>([])

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'positive',
    completed: 'info',
    archived: 'grey',
    on_hold: 'warning'
  }
  return colors[status] || 'grey'
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatRole(role: string): string {
  const roles: Record<string, string> = {
    owner: 'Project Owner',
    approver: 'Approver',
    viewer: 'Viewer'
  }
  return roles[role] || role
}

function getProjectProgress(project: PortalProject): number {
  if (!project.taskCount || project.taskCount === 0) return 0
  return Math.round((project.completedTaskCount / project.taskCount) * 100)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

async function loadProjects() {
  loading.value = true
  try {
    projects.value = await portal.fetchProjects()
    success() // Haptic feedback
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.message || 'Failed to load projects' })
  } finally {
    loading.value = false
  }
}

// Pull-to-refresh handler
const { handleRefresh } = usePullToRefresh(loadProjects)

onMounted(() => {
  loadProjects()
})
</script>

<style lang="scss" scoped>
.portal-projects {
  max-width: 1400px;
  margin: 0 auto;
}

.project-card {
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
