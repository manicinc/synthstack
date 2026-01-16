<template>
  <q-page class="portal-dashboard q-pa-md">
    <q-pull-to-refresh @refresh="handleRefresh">
      <!-- Page Header -->
      <div class="row items-center q-mb-lg">
        <div class="col">
          <h1 class="text-h4 text-weight-bold q-mb-none">
            Welcome back{{ userName ? `, ${userName}` : '' }}
          </h1>
          <p class="text-grey-7 q-mb-none">
            Here's an overview of your projects and activity
          </p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="row items-center no-wrap">
              <q-icon
                name="folder"
                size="40px"
                color="primary"
                class="q-mr-md"
              />
              <div>
                <div class="text-h5 text-weight-bold">
                  {{ stats.projects }}
                </div>
                <div class="text-caption text-grey-7">
                  Active Projects
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="row items-center no-wrap">
              <q-icon
                name="task_alt"
                size="40px"
                color="positive"
                class="q-mr-md"
              />
              <div>
                <div class="text-h5 text-weight-bold">
                  {{ stats.openTasks }}
                </div>
                <div class="text-caption text-grey-7">
                  Open Tasks
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="row items-center no-wrap">
              <q-icon
                name="receipt_long"
                size="40px"
                color="warning"
                class="q-mr-md"
              />
              <div>
                <div class="text-h5 text-weight-bold">
                  {{ stats.pendingInvoices }}
                </div>
                <div class="text-caption text-grey-7">
                  Pending Invoices
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <q-card class="stat-card">
            <q-card-section class="row items-center no-wrap">
              <q-icon
                name="chat"
                size="40px"
                color="info"
                class="q-mr-md"
              />
              <div>
                <div class="text-h5 text-weight-bold">
                  {{ stats.unreadMessages }}
                </div>
                <div class="text-caption text-grey-7">
                  Unread Messages
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Projects List -->
        <div class="col-12 col-md-8">
          <q-card>
            <q-card-section class="row items-center">
              <div class="text-h6">
                Your Projects
              </div>
              <q-space />
              <q-btn
                flat
                color="primary"
                label="View All"
                :to="{ name: 'portal-projects' }"
              />
            </q-card-section>

            <q-separator />

            <SkeletonLoader
              v-if="loadingProjects"
              type="list"
              :count="3"
            />

            <q-list
              v-else-if="projects.length > 0"
              separator
            >
              <q-item
                v-for="project in projects.slice(0, 5)"
                :key="project.id"
                clickable
                :to="{ name: 'portal-project', params: { id: project.id } }"
              >
                <q-item-section avatar>
                  <q-icon
                    name="folder"
                    color="primary"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ project.name }}</q-item-label>
                  <q-item-label caption>
                    {{ project.description || 'No description' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row items-center q-gutter-sm">
                    <q-badge
                      :color="getStatusColor(project.status)"
                      :label="project.status"
                    />
                    <q-circular-progress
                      :value="getProjectProgress(project)"
                      size="28px"
                      :thickness="0.25"
                      color="primary"
                      track-color="grey-3"
                      show-value
                      class="text-caption"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>

            <EmptyState
              v-else
              icon="folder_open"
              title="No projects yet"
              description="Your projects will appear here once they are created"
            />
          </q-card>
        </div>

        <!-- Recent Activity & Quick Actions -->
        <div class="col-12 col-md-4">
          <!-- Outstanding Amount -->
          <q-card
            v-if="stats.pendingAmount > 0"
            class="q-mb-md bg-warning-subtle"
          >
            <q-card-section>
              <div class="text-subtitle2 text-weight-medium">
                Outstanding Balance
              </div>
              <div class="text-h4 text-weight-bold text-warning">
                {{ formatCurrency(stats.pendingAmount) }}
              </div>
              <q-btn
                flat
                color="warning"
                label="View Invoices"
                class="q-mt-sm"
                :to="{ name: 'portal-invoices' }"
              />
            </q-card-section>
          </q-card>

          <!-- Quick Actions -->
          <q-card class="q-mb-md">
            <q-card-section>
              <div class="text-h6 q-mb-md">
                Quick Actions
              </div>
              <div class="column q-gutter-sm">
                <q-btn
                  outline
                  color="primary"
                  icon="chat"
                  label="New Message"
                  align="left"
                  @click="showNewMessageDialog = true"
                />
                <q-btn
                  outline
                  color="primary"
                  icon="help"
                  label="Get Help"
                  align="left"
                  :to="{ name: 'portal-help' }"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Recent Activity -->
          <q-card>
            <q-card-section>
              <div class="text-h6">
                Recent Activity
              </div>
            </q-card-section>
            <q-separator />
            <q-list
              v-if="recentActivity.length > 0"
              separator
            >
              <q-item
                v-for="(activity, index) in recentActivity"
                :key="index"
              >
                <q-item-section avatar>
                  <q-icon
                    :name="getActivityIcon(activity.type)"
                    color="grey-6"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ activity.title }}</q-item-label>
                  <q-item-label caption>
                    {{ formatDate(activity.timestamp) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-card-section
              v-else
              class="text-center text-grey-6"
            >
              No recent activity
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- New Message Dialog - Responsive -->
      <component
        :is="dialogComponent"
        v-model="showNewMessageDialog"
        v-bind="dialogProps"
      >
        <q-card>
          <q-card-section>
            <div class="text-h6">
              Start a Conversation
            </div>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="newMessage.title"
              label="Subject"
              outlined
              class="q-mb-md"
            />
            <q-input
              v-model="newMessage.text"
              label="Message"
              type="textarea"
              outlined
              rows="4"
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
              @click="sendNewMessage"
            />
          </q-card-actions>
        </q-card>
      </component>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { usePortal, type PortalProject, type PortalStats } from '@/composables/usePortal'
import { useResponsiveDialog } from '@/composables/useResponsiveDialog'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useHaptics } from '@/composables/useHaptics'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const portal = usePortal()
const { dialogComponent, dialogProps } = useResponsiveDialog()
const { success, medium } = useHaptics()

const loadingProjects = ref(true)
const projects = ref<PortalProject[]>([])
const stats = ref<PortalStats>({
  projects: 0,
  openTasks: 0,
  pendingInvoices: 0,
  pendingAmount: 0,
  unreadMessages: 0
})
const recentActivity = ref<Array<{ type: string; title: string; timestamp: string }>>([])

const showNewMessageDialog = ref(false)
const sendingMessage = ref(false)
const newMessage = ref({ title: '', text: '' })

const userName = computed(() => {
  const name = authStore.user?.username || authStore.authUser?.displayName
  return name?.split(' ')[0] || ''
})

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'positive',
    completed: 'info',
    archived: 'grey',
    on_hold: 'warning'
  }
  return colors[status] || 'grey'
}

function getProjectProgress(project: PortalProject): number {
  if (!project.taskCount || project.taskCount === 0) return 0
  return Math.round((project.completedTaskCount / project.taskCount) * 100)
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    project_update: 'folder',
    task_completed: 'task_alt',
    message: 'chat',
    invoice: 'receipt'
  }
  return icons[type] || 'history'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(date))
}

async function loadDashboard() {
  try {
    const data = await portal.fetchDashboard()
    stats.value = data.stats
    recentActivity.value = data.recentActivity
    success() // Haptic feedback
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.message || 'Failed to load dashboard' })
  }
}

async function loadProjects() {
  loadingProjects.value = true
  try {
    projects.value = await portal.fetchProjects()
  } catch {
    // Silent fail - stats already shown
  } finally {
    loadingProjects.value = false
  }
}

// Pull-to-refresh handler
async function refreshAll() {
  await Promise.all([loadDashboard(), loadProjects()])
}

const { handleRefresh } = usePullToRefresh(refreshAll)

async function sendNewMessage() {
  if (!newMessage.value.title || !newMessage.value.text) {
    $q.notify({ type: 'warning', message: 'Please enter a subject and message' })
    return
  }

  sendingMessage.value = true
  try {
    await portal.createConversation({
      title: newMessage.value.title,
      message: newMessage.value.text
    })
    success() // Haptic feedback
    $q.notify({ type: 'positive', message: 'Message sent!' })
    showNewMessageDialog.value = false
    newMessage.value = { title: '', text: '' }
    stats.value.unreadMessages++
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e.message || 'Failed to send message' })
  } finally {
    sendingMessage.value = false
  }
}

onMounted(() => {
  loadDashboard()
  loadProjects()
})
</script>

<style lang="scss" scoped>
.portal-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.bg-warning-subtle {
  background: rgba(255, 193, 7, 0.1);
}
</style>
