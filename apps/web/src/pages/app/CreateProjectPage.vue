<template>
  <q-page class="create-project-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <q-btn
          flat
          dense
          icon="arrow_back"
          label="Back to Projects"
          class="q-mb-md"
          @click="router.push('/app/projects')"
        />
        <h1 class="text-h4 q-mb-sm">
          Create New Project
        </h1>
        <p class="text-grey-7">
          Set up your project with team members, permissions, and settings
        </p>
      </div>

      <!-- Stepper -->
      <q-stepper
        ref="stepper"
        v-model="step"
        color="primary"
        animated
        header-nav
        class="project-stepper"
      >
        <!-- Step 1: Basic Info -->
        <q-step
          :name="1"
          title="Basic Information"
          icon="info"
          :done="step > 1"
        >
          <div class="step-content">
            <q-input
              v-model="project.name"
              label="Project Name *"
              outlined
              dense
              :rules="[val => !!val || 'Project name is required']"
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="folder" />
              </template>
            </q-input>

            <q-input
              v-model="project.description"
              label="Description"
              outlined
              dense
              type="textarea"
              rows="3"
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="description" />
              </template>
            </q-input>

            <q-select
              v-model="project.visibility"
              :options="visibilityOptions"
              label="Visibility"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="visibility" />
              </template>
            </q-select>

            <q-select
              v-model="project.status"
              :options="statusOptions"
              label="Initial Status"
              outlined
              dense
              emit-value
              map-options
            >
              <template #prepend>
                <q-icon name="flag" />
              </template>
            </q-select>
          </div>
        </q-step>

        <!-- Step 2: Team Members -->
        <q-step
          :name="2"
          title="Team Members"
          icon="group"
          :done="step > 2"
        >
          <div class="step-content">
            <!-- Guest User Warning -->
            <q-banner
              v-if="isGuestUser"
              class="bg-orange-2 text-grey-9 q-mb-md"
              rounded
            >
              <template #avatar>
                <q-icon
                  name="lock"
                  color="warning"
                />
              </template>
              <div class="text-body2">
                <strong>Team invitations are not available for guest users.</strong>
                <div class="text-caption q-mt-xs">
                  Please sign up for a free account to invite team members and collaborate on projects.
                </div>
              </div>
              <template #action>
                <q-btn
                  flat
                  dense
                  label="Sign Up Free"
                  color="warning"
                  @click="router.push('/register')"
                />
              </template>
            </q-banner>

            <!-- Plan Limit Info (for authenticated users) -->
            <q-banner
              v-else
              class="bg-blue-1 q-mb-md"
              rounded
            >
              <template #avatar>
                <q-icon
                  name="info"
                  color="primary"
                />
              </template>
              <div class="text-body2">
                <strong>{{ planName }} Plan:</strong> {{ teamMemberLimit === -1 ? 'Unlimited' : teamMemberLimit }} team members
                <span v-if="teamMemberLimit !== -1">
                  ({{ teamMembers.length }}/{{ teamMemberLimit }} used)
                </span>
              </div>
              <template
                v-if="teamMemberLimit !== -1 && teamMembers.length >= teamMemberLimit"
                #action
              >
                <q-btn
                  flat
                  dense
                  label="Upgrade Plan"
                  color="primary"
                  @click="router.push('/pricing')"
                />
              </template>
            </q-banner>

            <!-- Add Team Member -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col">
                <q-input
                  v-model="newMemberEmail"
                  label="Email Address"
                  outlined
                  dense
                  type="email"
                  :disable="isGuestUser || (teamMemberLimit !== -1 && teamMembers.length >= teamMemberLimit)"
                  :hint="isGuestUser ? 'Sign up to invite team members' : undefined"
                >
                  <template #prepend>
                    <q-icon name="email" />
                  </template>
                </q-input>
              </div>
              <div class="col-auto">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Invite"
                  :loading="checkingUser"
                  :disable="isGuestUser || !newMemberEmail || (teamMemberLimit !== -1 && teamMembers.length >= teamMemberLimit)"
                  @click="addTeamMember"
                >
                  <q-tooltip v-if="isGuestUser">
                    Sign up for a free account to invite team members
                  </q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Team Members List -->
            <q-list
              bordered
              separator
              class="rounded-borders"
            >
              <q-item
                v-for="(member, index) in teamMembers"
                :key="index"
              >
                <q-item-section avatar>
                  <q-avatar
                    color="primary"
                    text-color="white"
                  >
                    {{ member.email.charAt(0).toUpperCase() }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ member.email }}</q-item-label>
                  <q-item-label caption>
                    {{ member.role }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-select
                      v-model="member.role"
                      :options="roleOptions"
                      outlined
                      dense
                      emit-value
                      map-options
                      style="min-width: 120px"
                    />
                    <q-btn
                      flat
                      dense
                      round
                      icon="delete"
                      color="negative"
                      :disable="index === 0"
                      @click="removeTeamMember(index)"
                    >
                      <q-tooltip v-if="index === 0">
                        Cannot remove yourself
                      </q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-step>

        <!-- Step 3: Permissions (RBAC) -->
        <q-step
          :name="3"
          title="Permissions"
          icon="admin_panel_settings"
          :done="step > 3"
        >
          <div class="step-content">
            <p class="text-body2 text-grey-7 q-mb-md">
              Configure role-based access control (RBAC) for your project
            </p>

            <!-- Owner Permissions -->
            <q-expansion-item
              icon="workspace_premium"
              label="Owner"
              caption="Full control over the project"
              default-opened
              class="q-mb-sm"
            >
              <q-card>
                <q-card-section>
                  <div class="permission-grid">
                    <q-checkbox
                      v-model="permissions.owner.manageProject"
                      label="Manage Project Settings"
                      disable
                    />
                    <q-checkbox
                      v-model="permissions.owner.manageTodos"
                      label="Manage Todos"
                      disable
                    />
                    <q-checkbox
                      v-model="permissions.owner.manageTeam"
                      label="Manage Team Members"
                      disable
                    />
                    <q-checkbox
                      v-model="permissions.owner.manageRoles"
                      label="Manage Roles & Permissions"
                      disable
                    />
                    <q-checkbox
                      v-model="permissions.owner.deleteProject"
                      label="Delete Project"
                      disable
                    />
                    <q-checkbox
                      v-model="permissions.owner.viewAnalytics"
                      label="View Analytics"
                      disable
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Admin Permissions -->
            <q-expansion-item
              icon="shield"
              label="Admin"
              caption="Manage project and team members"
              class="q-mb-sm"
            >
              <q-card>
                <q-card-section>
                  <div class="permission-grid">
                    <q-checkbox
                      v-model="permissions.admin.manageProject"
                      label="Manage Project Settings"
                    />
                    <q-checkbox
                      v-model="permissions.admin.manageTodos"
                      label="Manage Todos"
                    />
                    <q-checkbox
                      v-model="permissions.admin.manageTeam"
                      label="Manage Team Members"
                    />
                    <q-checkbox
                      v-model="permissions.admin.manageRoles"
                      label="Manage Roles & Permissions"
                    />
                    <q-checkbox
                      v-model="permissions.admin.deleteProject"
                      label="Delete Project"
                    />
                    <q-checkbox
                      v-model="permissions.admin.viewAnalytics"
                      label="View Analytics"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Member Permissions -->
            <q-expansion-item
              icon="person"
              label="Member"
              caption="Standard team member access"
              class="q-mb-sm"
            >
              <q-card>
                <q-card-section>
                  <div class="permission-grid">
                    <q-checkbox
                      v-model="permissions.member.manageProject"
                      label="Manage Project Settings"
                    />
                    <q-checkbox
                      v-model="permissions.member.manageTodos"
                      label="Manage Todos"
                    />
                    <q-checkbox
                      v-model="permissions.member.manageTeam"
                      label="Manage Team Members"
                    />
                    <q-checkbox
                      v-model="permissions.member.manageRoles"
                      label="Manage Roles & Permissions"
                    />
                    <q-checkbox
                      v-model="permissions.member.deleteProject"
                      label="Delete Project"
                    />
                    <q-checkbox
                      v-model="permissions.member.viewAnalytics"
                      label="View Analytics"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- Viewer Permissions -->
            <q-expansion-item
              icon="visibility"
              label="Viewer"
              caption="Read-only access"
            >
              <q-card>
                <q-card-section>
                  <div class="permission-grid">
                    <q-checkbox
                      v-model="permissions.viewer.manageProject"
                      label="Manage Project Settings"
                    />
                    <q-checkbox
                      v-model="permissions.viewer.manageTodos"
                      label="Manage Todos"
                    />
                    <q-checkbox
                      v-model="permissions.viewer.manageTeam"
                      label="Manage Team Members"
                    />
                    <q-checkbox
                      v-model="permissions.viewer.manageRoles"
                      label="Manage Roles & Permissions"
                    />
                    <q-checkbox
                      v-model="permissions.viewer.deleteProject"
                      label="Delete Project"
                    />
                    <q-checkbox
                      v-model="permissions.viewer.viewAnalytics"
                      label="View Analytics"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </q-step>

        <!-- Step 4: Review & Create -->
        <q-step
          :name="4"
          title="Review & Create"
          icon="check_circle"
        >
          <div class="step-content">
            <q-card
              flat
              bordered
              class="q-mb-md"
            >
              <q-card-section>
                <div class="text-h6 q-mb-md">
                  Project Details
                </div>
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-md-6">
                    <div class="text-caption text-grey-7">
                      Name
                    </div>
                    <div class="text-body1">
                      {{ project.name }}
                    </div>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="text-caption text-grey-7">
                      Visibility
                    </div>
                    <div class="text-body1">
                      {{ project.visibility }}
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="text-caption text-grey-7">
                      Description
                    </div>
                    <div class="text-body1">
                      {{ project.description || 'No description' }}
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-card
              flat
              bordered
              class="q-mb-md"
            >
              <q-card-section>
                <div class="text-h6 q-mb-md">
                  Team Members ({{ teamMembers.length }})
                </div>
                <q-list separator>
                  <q-item
                    v-for="member in teamMembers"
                    :key="member.email"
                  >
                    <q-item-section avatar>
                      <q-avatar
                        color="primary"
                        text-color="white"
                      >
                        {{ member.email.charAt(0).toUpperCase() }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ member.email }}</q-item-label>
                      <q-item-label caption>
                        {{ member.role }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <q-card
              flat
              bordered
            >
              <q-card-section>
                <div class="text-h6 q-mb-md">
                  Permissions Summary
                </div>
                <div class="text-body2">
                  Custom RBAC permissions configured for {{ Object.keys(permissions).length }} roles
                </div>
              </q-card-section>
            </q-card>
          </div>
        </q-step>

        <!-- Navigation -->
        <template #navigation>
          <q-stepper-navigation>
            <div class="row justify-between">
              <q-btn
                v-if="step > 1"
                flat
                color="primary"
                label="Back"
                @click="stepper?.previous()"
              />
              <q-space />
              <q-btn
                v-if="step < 4"
                color="primary"
                label="Continue"
                :disable="!canProceed"
                @click="stepper?.next()"
              />
              <q-btn
                v-else
                color="primary"
                label="Create Project"
                icon-right="check"
                :loading="creating"
                @click="createProject"
              />
            </div>
          </q-stepper-navigation>
        </template>
      </q-stepper>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar, QStepper } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { analyticsEvents } from '@/boot/analytics'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

// Check if user is a guest
const isGuestUser = computed(() => {
  return authStore.user?.isGuest === true
})

// Step state
const step = ref(1)
const stepper = ref<InstanceType<typeof QStepper> | null>(null)
const creating = ref(false)

// Team member type
interface TeamMember {
  email: string
  role: string
  exists?: boolean
  name?: string | null
  pending?: boolean
}

// Project data
const project = ref({
  name: '',
  description: '',
  visibility: 'private',
  status: 'planning'
})

// Team members
const newMemberEmail = ref('')
const teamMembers = ref<TeamMember[]>([
  {
    email: authStore.user?.email || 'you@example.com',
    role: 'owner'
  }
])

// Plan limits (these would come from the user's subscription)
const planName = computed(() => {
  // TODO: Get from user's actual subscription
  return 'Free'
})

const teamMemberLimit = computed(() => {
  // TODO: Get from user's actual plan limits
  const limits: Record<string, number> = {
    'Free': 3,
    'Starter': 10,
    'Pro': 50,
    'Enterprise': -1 // unlimited
  }
  return limits[planName.value] || 3
})

// Permissions (RBAC)
const permissions = ref({
  owner: {
    manageProject: true,
    manageTodos: true,
    manageTeam: true,
    manageRoles: true,
    deleteProject: true,
    viewAnalytics: true
  },
  admin: {
    manageProject: true,
    manageTodos: true,
    manageTeam: true,
    manageRoles: false,
    deleteProject: false,
    viewAnalytics: true
  },
  member: {
    manageProject: false,
    manageTodos: true,
    manageTeam: false,
    manageRoles: false,
    deleteProject: false,
    viewAnalytics: false
  },
  viewer: {
    manageProject: false,
    manageTodos: false,
    manageTeam: false,
    manageRoles: false,
    deleteProject: false,
    viewAnalytics: false
  }
})

// Options
const visibilityOptions = [
  { label: 'Private', value: 'private', description: 'Only team members can see this project' },
  { label: 'Internal', value: 'internal', description: 'Anyone in your organization can see this' },
  { label: 'Public', value: 'public', description: 'Anyone can view this project' }
]

const statusOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on-hold' },
  { label: 'Completed', value: 'completed' }
]

const roleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' }
]

// Computed
const canProceed = computed(() => {
  if (step.value === 1) {
    return !!project.value.name.trim()
  }
  return true
})

// Check if user is authenticated
const isAuthenticated = computed(() => !!authStore.user?.id)

// Redirect if not authenticated
if (!isAuthenticated.value) {
  $q.notify({
    type: 'warning',
    message: 'Please sign in to create projects',
    icon: 'login'
  })
  router.push('/auth/login?redirect=/app/projects/new')
}

// Methods
const checkingUser = ref(false)

async function addTeamMember() {
  if (!newMemberEmail.value) return

  // Check authentication
  if (!isAuthenticated.value) {
    $q.notify({
      type: 'warning',
      message: 'Please sign in to invite team members',
      icon: 'login'
    })
    return
  }

  if (teamMemberLimit.value !== -1 && teamMembers.value.length >= teamMemberLimit.value) {
    $q.notify({
      type: 'warning',
      message: `Team member limit reached (${teamMemberLimit.value}). Upgrade your plan for more members.`,
      actions: [
        { label: 'Upgrade', color: 'primary', handler: () => router.push('/pricing') }
      ]
    })
    return
  }

  const existsInTeam = teamMembers.value.find(m => m.email === newMemberEmail.value)
  if (existsInTeam) {
    $q.notify({
      type: 'warning',
      message: 'This email is already in the team'
    })
    return
  }

  // Check if user exists in the system
  checkingUser.value = true
  try {
    const response = await fetch(`/api/v1/profiles/check?email=${encodeURIComponent(newMemberEmail.value)}`)
    const data = await response.json()

    if (data.exists) {
      // User exists - add them to the team
      teamMembers.value.push({
        email: newMemberEmail.value,
        role: 'member',
        exists: true,
        name: data.name || null
      })
      newMemberEmail.value = ''
    } else {
      // User doesn't exist - show invite option
      $q.dialog({
        title: 'User Not Found',
        message: `No account exists for "${newMemberEmail.value}". Would you like to send an invite?`,
        cancel: true,
        persistent: true,
        ok: {
          label: 'Send Invite (Coming Soon)',
          color: 'primary',
          disable: true
        }
      }).onOk(() => {
        // TODO: Implement email invite when Resend/email service is set up
        $q.notify({
          type: 'info',
          message: 'Email invites coming soon! For now, ask them to sign up first.',
          icon: 'mail'
        })
      })
    }
  } catch (error) {
    // Fallback - add anyway but mark as pending
    teamMembers.value.push({
      email: newMemberEmail.value,
      role: 'member',
      exists: false,
      pending: true
    })
    newMemberEmail.value = ''
    $q.notify({
      type: 'info',
      message: 'User added. They will need to create an account to access the project.',
      icon: 'info'
    })
  } finally {
    checkingUser.value = false
  }
}

function removeTeamMember(index: number) {
  if (index === 0) return // Can't remove owner (yourself)
  teamMembers.value.splice(index, 1)
}

async function createProject() {
  creating.value = true

  // Track project creation
  analyticsEvents.createProject(project.value.visibility)

  try {
    // Create project (note: visibility, status, teamMembers, and permissions
    // are collected in the UI but will need backend support to persist)
    const newProject = await projectsStore.createProject({
      name: project.value.name,
      description: project.value.description
    })

    $q.notify({
      type: 'positive',
      message: 'Project created successfully!',
      icon: 'check_circle'
    })

    // Navigate to the new project
    router.push(`/app/projects/${newProject.id}`)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to create project',
      icon: 'error'
    })
  } finally {
    creating.value = false
  }
}
</script>

<style lang="scss" scoped>
.create-project-page {
  min-height: 100vh;
  background: var(--color-background, #f8f9fa);
}

.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

// Better disabled state visibility in light mode
:global(.body--light) {
  .q-field--disabled {
    opacity: 0.6;

    :deep(.q-field__control) {
      background-color: #f5f5f5 !important;
    }

    :deep(.q-field__label) {
      color: #9e9e9e !important;
    }
  }

  .q-btn[disabled] {
    opacity: 0.5;
    background-color: #e0e0e0 !important;
    color: #9e9e9e !important;
  }
}

.project-stepper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-content {
  padding: 24px;
  min-height: 400px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

// Light mode
body.body--light {
  .create-project-page {
    background: #f8f9fa;
  }

  .project-stepper {
    background: #ffffff;
  }
}

// Dark mode
body.body--dark {
  .create-project-page {
    background: #1a1a2e;
  }

  .project-stepper {
    background: #2d2d4a;
  }
}
</style>
