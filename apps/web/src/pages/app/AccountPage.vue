<template>
  <q-page class="account-page q-pa-md">
    <div class="row items-center q-mb-lg">
      <div
        class="text-h4 text-primary"
        style="font-family: var(--font-mono, 'JetBrains Mono'), monospace"
      >
        Account
      </div>
      <q-space />
    </div>

    <div
      v-if="!user"
      class="row justify-center q-pa-xl"
    >
      <q-spinner-dots
        size="42px"
        color="primary"
      />
    </div>

    <div
      v-else
      class="row q-col-gutter-lg"
    >
      <div class="col-12 col-md-4">
        <!-- Profile -->
        <q-card
          flat
          bordered
          class="settings-card"
        >
          <q-card-section class="row items-center no-wrap">
            <q-avatar size="56px">
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                alt="Account avatar"
              >
              <div v-else class="text-weight-bold">
                {{ userInitials }}
              </div>
            </q-avatar>
            <div class="q-ml-md">
              <div class="text-subtitle1 text-weight-medium">
                {{ user.name || user.username }}
              </div>
              <div class="text-caption text-grey-6">
                {{ user.email }}
              </div>
            </div>
            <q-space />
            <q-btn
              flat
              dense
              icon="refresh"
              @click="refreshAccount"
            >
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="row items-center q-gutter-xs">
              <q-chip
                dense
                color="primary"
                text-color="white"
                icon="workspace_premium"
              >
                {{ planLabel }}
              </q-chip>
              <q-chip
                v-if="user.isGuest"
                dense
                color="grey-7"
                text-color="white"
                icon="person_outline"
              >
                Guest
              </q-chip>
              <q-chip
                v-else
                dense
                :color="user.emailVerified ? 'positive' : 'warning'"
                text-color="white"
                :icon="user.emailVerified ? 'verified' : 'mark_email_unread'"
              >
                {{ user.emailVerified ? 'Email verified' : 'Email not verified' }}
              </q-chip>
            </div>
          </q-card-section>
        </q-card>

        <!-- Usage -->
        <q-card
          flat
          bordered
          class="settings-card q-mt-md"
        >
          <q-card-section>
            <div class="text-subtitle2 text-grey-6 q-mb-sm">
              Credits
            </div>
            <div class="text-h5 text-primary">
              {{ user.credits }}
            </div>
            <div
              v-if="stats"
              class="q-mt-md"
            >
              <div class="row justify-between text-caption text-grey-6">
                <span>Generations this month</span>
                <span>{{ stats.generationsThisMonth }} / {{ stats.generationsLimit }}</span>
              </div>
              <q-linear-progress
                :value="stats.generationsLimit > 0 ? Math.min(1, stats.generationsThisMonth / stats.generationsLimit) : 0"
                color="primary"
                class="q-mt-sm"
              />
            </div>
          </q-card-section>
          <q-card-actions>
            <q-btn
              outline
              color="primary"
              label="Manage Subscription"
              class="full-width"
              to="/app/subscription"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card
          flat
          bordered
          class="settings-card"
        >
          <q-tabs
            v-model="tab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab
              name="profile"
              label="Profile"
            />
            <q-tab
              name="projects"
              label="Projects"
            />
            <q-tab
              name="appearance"
              label="Appearance"
            />
          </q-tabs>

          <q-separator />

          <q-tab-panels
            v-model="tab"
            animated
            class="bg-transparent"
          >
            <q-tab-panel name="profile">
              <div class="q-gutter-y-md">
                <q-input
                  v-model="profileForm.name"
                  outlined
                  label="Display name"
                />
                <q-input
                  v-model="profileForm.avatarUrl"
                  outlined
                  label="Avatar URL (optional)"
                />
                <q-input
                  :model-value="user.email"
                  outlined
                  label="Email"
                  readonly
                />
                <q-input
                  :model-value="createdAtLabel"
                  outlined
                  label="Joined"
                  readonly
                />

                <div class="row justify-end">
                  <q-btn
                    color="primary"
                    label="Save"
                    :loading="savingProfile"
                    :disable="user.isGuest"
                    @click="saveProfile"
                  />
                </div>

                <q-banner
                  v-if="user.isGuest"
                  class="bg-grey-2 text-grey-10"
                  rounded
                  dense
                >
                  <template #avatar>
                    <q-icon name="info" color="grey-8" />
                  </template>
                  <div class="text-body2">
                    Guest profiles are local-only. Create an account to save your profile.
                  </div>
                </q-banner>
              </div>
            </q-tab-panel>

            <q-tab-panel name="projects">
              <div class="row items-center q-mb-md">
                <div class="text-subtitle1 text-weight-medium">
                  Projects you have access to
                </div>
                <q-space />
                <q-btn
                  outline
                  color="primary"
                  label="Open Projects"
                  to="/app/projects"
                />
              </div>

              <div
                v-if="projectsStore.loading.projects"
                class="row justify-center q-pa-lg"
              >
                <q-spinner-dots
                  size="32px"
                  color="primary"
                />
              </div>

              <q-list
                v-else
                bordered
                separator
                class="rounded-borders"
              >
                <q-item
                  v-for="p in projectsStore.projects"
                  :key="p.id"
                  clickable
                  @click="openProject(p.id)"
                >
                  <q-item-section>
                    <q-item-label>{{ p.name }}</q-item-label>
                    <q-item-label caption>
                      {{ p.description || 'No description' }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <div class="row items-center q-gutter-xs">
                      <q-badge
                        outline
                        :color="statusColor(p.status)"
                        class="text-capitalize"
                      >
                        {{ p.status }}
                      </q-badge>
                      <q-badge
                        outline
                        :color="projectAccess(p).color"
                      >
                        {{ projectAccess(p).label }}
                      </q-badge>
                      <q-badge
                        v-if="p.isSystem"
                        outline
                        color="deep-purple"
                        text-color="white"
                      >
                        Example
                      </q-badge>
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>

            <q-tab-panel name="appearance">
              <div class="section-intro q-mb-lg">
                <div class="text-subtitle1 text-weight-medium">
                  Theme & Appearance
                </div>
                <div class="text-caption text-grey-6">
                  Customize how SynthStack looks.
                </div>
              </div>

              <ThemeSwitcher
                :show-preset-selector="true"
                :show-categories="true"
                :show-premium-upsell="true"
                @upgrade="goToUpgrade"
              />
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { analyticsEvents } from '@/boot/analytics'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import type { Project, ProjectStatus } from '@/services/api'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const tab = ref<'profile' | 'projects' | 'appearance'>('profile')
const savingProfile = ref(false)

const user = computed(() => authStore.user)
const stats = computed(() => authStore.stats)

const profileForm = reactive({
  name: '',
  avatarUrl: '',
})

watch(user, (u) => {
  profileForm.name = u?.name || u?.username || ''
  profileForm.avatarUrl = u?.avatarUrl || ''
}, { immediate: true })

const planLabel = computed(() => {
  const plan = user.value?.plan || 'free'
  if (plan === 'maker') return 'Maker'
  if (plan === 'pro') return 'Pro'
  return 'Free'
})

const createdAtLabel = computed(() => {
  const createdAt = user.value?.createdAt
  if (!createdAt) return ''
  try {
    return new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return createdAt
  }
})

const userInitials = computed(() => {
  const base = (user.value?.name || user.value?.username || user.value?.email || '').trim()
  if (!base) return '?'
  const parts = base.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts.length > 1 ? (parts[1]?.[0] || '') : (parts[0]?.[1] || '')
  return (first + second).toUpperCase()
})

function statusColor(status: ProjectStatus): string {
  switch (status) {
    case 'active': return 'primary'
    case 'completed': return 'positive'
    case 'archived': return 'grey'
    default: return 'grey'
  }
}

function projectAccess(project: Project): { label: string; color: string } {
  const currentUserId = user.value?.id
  const isPlatformAdmin = user.value?.isAdmin === true
  const isOwner = Boolean(currentUserId && project.ownerId && project.ownerId === currentUserId)
  const role = (project.memberRole || '').toLowerCase()

  const label = isOwner
    ? 'Owner'
    : isPlatformAdmin
      ? 'Admin'
      : role === 'admin'
        ? 'Admin'
        : role === 'member'
          ? 'Edit'
          : 'View'

  const color =
    label === 'Owner' ? 'positive'
      : label === 'Admin' ? 'primary'
        : label === 'Edit' ? 'info'
          : 'grey'

  return { label, color }
}

function openProject(projectId: string) {
  router.push({ name: 'project-detail', params: { id: projectId } })
}

async function refreshAccount() {
  try {
    await authStore.fetchUser()
    await projectsStore.fetchProjects(undefined, 1)
    $q.notify({ type: 'positive', message: 'Account refreshed' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to refresh' })
  }
}

async function saveProfile() {
  if (!user.value || user.value.isGuest) return
  savingProfile.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.name || undefined,
      avatarUrl: profileForm.avatarUrl || undefined,
    })
    $q.notify({ type: 'positive', message: 'Saved' })
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err?.message || 'Failed to save' })
  } finally {
    savingProfile.value = false
  }
}

function goToUpgrade() {
  analyticsEvents.selectPlan('upgrade', 0)
  router.push('/app/subscription')
}

onMounted(async () => {
  try {
    await projectsStore.fetchProjects(undefined, 1)
  } catch {
    // ignore
  }
})
</script>

<style lang="scss" scoped>
.account-page {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-card {
  background: var(--bg-elevated);
  border-color: var(--border-default);
}
</style>
