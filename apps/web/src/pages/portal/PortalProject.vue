<template>
  <q-page class="portal-project q-pa-md">
    <q-pull-to-refresh @refresh="handleRefresh">
      <!-- Loading State -->
      <SkeletonLoader
        v-if="loading"
        type="list"
        :count="5"
      />

      <template v-else-if="project">
        <!-- Breadcrumb -->
        <q-breadcrumbs class="q-mb-md">
          <q-breadcrumbs-el
            icon="home"
            :to="{ name: 'portal-dashboard' }"
          />
          <q-breadcrumbs-el
            label="Projects"
            :to="{ name: 'portal-projects' }"
          />
          <q-breadcrumbs-el :label="project.name" />
        </q-breadcrumbs>

        <!-- Page Header -->
        <div class="row items-start q-mb-lg">
          <div class="col">
            <div class="row items-center q-gutter-sm q-mb-sm">
              <h1 class="text-h4 text-weight-bold q-mb-none">
                {{ project.name }}
              </h1>
              <q-badge
                :color="getStatusColor(project.status)"
                :label="formatStatus(project.status)"
              />
            </div>
            <p
              v-if="project.description"
              class="text-grey-7 q-mb-none"
            >
              {{ project.description }}
            </p>
          </div>
          <q-btn
            outline
            color="primary"
            icon="chat"
            label="Message"
            @click="showMessageDialog = true"
          />
        </div>

        <!-- Tabs -->
        <q-tabs
          v-model="activeTab"
          class="text-grey-7"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab
            name="overview"
            label="Overview"
            icon="dashboard"
          />
          <q-tab
            v-if="project.permissions.canViewTasks"
            name="tasks"
            label="Tasks"
            icon="task"
          />
          <q-tab
            v-if="project.permissions.canViewFiles"
            name="files"
            label="Files"
            icon="folder"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels
          v-model="activeTab"
          animated
          class="bg-transparent"
        >
          <!-- Overview Tab -->
          <q-tab-panel
            name="overview"
            class="q-pa-none q-pt-md"
          >
            <div class="row q-col-gutter-md">
              <!-- Progress Card -->
              <div class="col-12 col-md-4">
                <q-card>
                  <q-card-section>
                    <div class="text-h6 q-mb-md">
                      Progress
                    </div>
                    <q-circular-progress
                      :value="projectProgress"
                      size="120px"
                      :thickness="0.15"
                      color="primary"
                      track-color="grey-3"
                      show-value
                      class="q-mb-md"
                    >
                      <span class="text-h5">{{ projectProgress }}%</span>
                    </q-circular-progress>
                    <div class="text-center text-grey-7">
                      {{ project.completedTaskCount || 0 }} of {{ project.taskCount || 0 }} tasks completed
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Milestones -->
              <div class="col-12 col-md-8">
                <q-card>
                  <q-card-section>
                    <div class="text-h6">
                      Milestones
                    </div>
                  </q-card-section>
                  <q-separator />
                  <q-list
                    v-if="project.milestones && project.milestones.length > 0"
                    separator
                  >
                    <q-item
                      v-for="milestone in project.milestones"
                      :key="milestone.id"
                    >
                      <q-item-section avatar>
                        <q-icon
                          :name="milestone.status === 'completed' ? 'check_circle' : 'radio_button_unchecked'"
                          :color="getMilestoneColor(milestone.status)"
                        />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ milestone.title }}</q-item-label>
                        <q-item-label caption>
                          {{ milestone.description }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-item-label
                          v-if="milestone.targetDate"
                          caption
                        >
                          {{ formatDate(milestone.targetDate) }}
                        </q-item-label>
                        <q-badge
                          :color="getMilestoneColor(milestone.status)"
                          :label="milestone.status"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <EmptyState
                    v-else
                    icon="flag"
                    icon-size="32px"
                    title="No milestones"
                    description="Milestones will appear here once they are defined"
                  />
                </q-card>
              </div>

              <!-- Team -->
              <div class="col-12">
                <q-card>
                  <q-card-section>
                    <div class="text-h6">
                      Team
                    </div>
                  </q-card-section>
                  <q-separator />
                  <q-card-section class="row q-gutter-md">
                    <div
                      v-for="member in project.team"
                      :key="member.userId"
                      class="team-member text-center"
                    >
                      <q-avatar
                        size="48px"
                        color="primary"
                        text-color="white"
                      >
                        <img
                          v-if="member.avatarUrl"
                          :src="member.avatarUrl"
                        >
                        <span v-else>{{ getInitials(member.displayName) }}</span>
                      </q-avatar>
                      <div class="text-body2 q-mt-sm">
                        {{ member.displayName }}
                      </div>
                      <div class="text-caption text-grey-7">
                        {{ member.role }}
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-tab-panel>

          <!-- Tasks Tab -->
          <q-tab-panel
            name="tasks"
            class="q-pa-none q-pt-md"
          >
            <q-card>
              <q-card-section class="row items-center">
                <div class="text-h6">
                  Tasks
                </div>
                <q-space />
                <q-btn-toggle
                  v-model="taskFilter"
                  flat
                  toggle-color="primary"
                  :options="[
                    { label: 'All', value: 'all' },
                    { label: 'Open', value: 'open' },
                    { label: 'Completed', value: 'completed' }
                  ]"
                />
              </q-card-section>

              <q-separator />

              <SkeletonLoader
                v-if="loadingTasks"
                type="list"
                :count="3"
              />

              <q-list
                v-else-if="filteredTasks.length > 0"
                separator
              >
                <q-item
                  v-for="task in filteredTasks"
                  :key="task.id"
                >
                  <q-item-section avatar>
                    <q-icon
                      :name="task.status === 'completed' ? 'check_circle' : 'radio_button_unchecked'"
                      :color="getTaskStatusColor(task.status)"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label :class="{ 'text-strike text-grey-6': task.status === 'completed' }">
                      {{ task.title }}
                    </q-item-label>
                    <q-item-label
                      v-if="task.description"
                      caption
                      class="ellipsis"
                    >
                      {{ task.description }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="column items-end q-gutter-xs">
                      <q-badge
                        :color="getPriorityColor(task.priority)"
                        :label="task.priority"
                      />
                      <span
                        v-if="task.dueDate"
                        class="text-caption"
                        :class="isOverdue(task.dueDate) ? 'text-negative' : 'text-grey-7'"
                      >
                        Due {{ formatDate(task.dueDate) }}
                      </span>
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>

              <EmptyState
                v-else
                icon="task_alt"
                title="No tasks found"
                description="Tasks will appear here when they are created"
              />
            </q-card>
          </q-tab-panel>

          <!-- Files Tab -->
          <q-tab-panel
            name="files"
            class="q-pa-none q-pt-md"
          >
            <q-card>
              <q-card-section>
                <div class="text-h6">
                  Files
                </div>
              </q-card-section>

              <q-separator />

              <SkeletonLoader
                v-if="loadingFiles"
                type="list"
                :count="3"
              />

              <q-list
                v-else-if="files.length > 0"
                separator
              >
                <q-item
                  v-for="file in files"
                  :key="file.id"
                >
                  <q-item-section avatar>
                    <q-icon
                      :name="getFileIcon(file.type)"
                      color="grey-7"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ file.title || file.filenameDownload }}</q-item-label>
                    <q-item-label caption>
                      {{ formatFileSize(file.filesize) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      icon="download"
                      color="primary"
                      @click="downloadFile(file)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>

              <EmptyState
                v-else
                icon="folder_open"
                title="No files available"
                description="Project files will appear here when they are uploaded"
              />
            </q-card>
          </q-tab-panel>
        </q-tab-panels>
      </template>

      <!-- Message Dialog - Responsive -->
      <component
        :is="dialogComponent"
        v-model="showMessageDialog"
        v-bind="dialogProps"
      >
        <q-card>
          <q-card-section>
            <div class="text-h6">
              Message about {{ project?.name }}
            </div>
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="messageText"
              type="textarea"
              outlined
              rows="4"
              placeholder="Type your message..."
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
              label="Send"
              :loading="sendingMessage"
              @click="sendProjectMessage"
            />
          </q-card-actions>
        </q-card>
      </component>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { usePortal, type PortalTask, type PortalFile, type Milestone, type TeamMember } from '@/composables/usePortal'
import { useResponsiveDialog } from '@/composables/useResponsiveDialog'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useHaptics } from '@/composables/useHaptics'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface ProjectDetail {
  id: string
  name: string
  description?: string
  status: string
  billing?: string
  permissions: { role: string; canViewTasks: boolean; canViewFiles: boolean; canViewInvoices: boolean }
  milestones: Milestone[]
  team: TeamMember[]
  taskCount: number
  completedTaskCount: number
}

const route = useRoute()
const $q = useQuasar()
const portal = usePortal()
const { dialogComponent, dialogProps } = useResponsiveDialog()
const { success, medium } = useHaptics()

const loading = ref(true)
const project = ref<ProjectDetail | null>(null)
const activeTab = ref('overview')
const taskFilter = ref('all')

const loadingTasks = ref(false)
const tasks = ref<PortalTask[]>([])

const loadingFiles = ref(false)
const files = ref<PortalFile[]>([])

const showMessageDialog = ref(false)
const messageText = ref('')
const sendingMessage = ref(false)

const projectId = computed(() => route.params.id as string)

const projectProgress = computed(() => {
  if (!project.value?.taskCount) return 0
  return Math.round((project.value.completedTaskCount / project.value.taskCount) * 100)
})

const filteredTasks = computed(() => {
  if (taskFilter.value === 'all') return tasks.value
  if (taskFilter.value === 'open') return tasks.value.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  return tasks.value.filter(t => t.status === 'completed')
})

function getStatusColor(status: string): string {
  const colors: Record<string, string> = { active: 'positive', completed: 'info', archived: 'grey', on_hold: 'warning' }
  return colors[status] || 'grey'
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getMilestoneColor(status: string): string {
  const colors: Record<string, string> = { upcoming: 'grey', in_progress: 'primary', completed: 'positive', missed: 'negative' }
  return colors[status] || 'grey'
}

function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = { pending: 'grey', in_progress: 'primary', completed: 'positive', blocked: 'negative' }
  return colors[status] || 'grey'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = { low: 'grey', medium: 'info', high: 'warning', urgent: 'negative' }
  return colors[priority] || 'grey'
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function isOverdue(date: string): boolean {
  return new Date(date) < new Date()
}

function getFileIcon(type: string): string {
  if (type?.includes('image')) return 'image'
  if (type?.includes('pdf')) return 'picture_as_pdf'
  if (type?.includes('word') || type?.includes('document')) return 'description'
  if (type?.includes('spreadsheet') || type?.includes('excel')) return 'table_chart'
  return 'insert_drive_file'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadFile(file: PortalFile) {
  // TODO: Implement file download
  $q.notify({ type: 'info', message: 'Download feature coming soon' })
}

async function loadProject() {
  loading.value = true
  try {
    project.value = await portal.fetchProject(projectId.value) as unknown as ProjectDetail
    success() // Haptic feedback
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.message || 'Failed to load project' })
  } finally {
    loading.value = false
  }
}

// Pull-to-refresh handler
const { handleRefresh } = usePullToRefresh(loadProject)

async function loadTasks() {
  if (!project.value?.permissions.canViewTasks) return
  loadingTasks.value = true
  try {
    tasks.value = await portal.fetchTasks(projectId.value)
  } catch {
    // Silent fail
  } finally {
    loadingTasks.value = false
  }
}

async function loadFiles() {
  if (!project.value?.permissions.canViewFiles) return
  loadingFiles.value = true
  try {
    files.value = await portal.fetchFiles(projectId.value)
  } catch {
    // Silent fail
  } finally {
    loadingFiles.value = false
  }
}

async function sendProjectMessage() {
  if (!messageText.value.trim()) return
  sendingMessage.value = true
  try {
    await portal.createConversation({
      title: `Question about ${project.value?.name}`,
      collection: 'projects',
      item: projectId.value,
      message: messageText.value
    })
    success() // Haptic feedback
    $q.notify({ type: 'positive', message: 'Message sent!' })
    showMessageDialog.value = false
    messageText.value = ''
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    sendingMessage.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'tasks' && tasks.value.length === 0) loadTasks()
  if (tab === 'files' && files.value.length === 0) loadFiles()
})

onMounted(() => {
  loadProject()
})
</script>

<style lang="scss" scoped>
.portal-project {
  max-width: 1200px;
  margin: 0 auto;
}

.team-member {
  min-width: 80px;
}
</style>
