<template>
  <!-- Fixed Header - MUST be outside q-layout for position:fixed to work -->
  <SiteHeader />

  <q-layout
    view="hHh Lpr fFf"
    class="app-layout"
    :class="{ 'has-demo-bar': demoStore.isDemo && demoStore.showBanner, 'has-electron-titlebar': isElectronMac }"
  >
    <!-- Electron Title Bar (macOS only - draggable area for traffic lights) -->
    <ElectronTitleBar />

    <!-- Demo Status Bar (at very top for demo users) -->
    <DemoStatusBar />

    <RateLimitBanner />

    <!-- Mobile Sidebar Toggle Button (only on mobile app routes) -->
    <q-btn
      v-if="showAppSidebar && !$q.screen.gt.md"
      fab
      icon="menu"
      color="primary"
      class="mobile-sidebar-toggle"
      aria-label="Open sidebar menu"
      @click="appSidebarOpen = true"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
      >
        Open Menu
      </q-tooltip>
    </q-btn>

    <!-- App Sidebar (Dashboard routes) -->
    <q-drawer
      v-if="showAppSidebar"
      v-model="appSidebarOpen"
      show-if-above
      :mini="appSidebarMini"
      :mini-width="72"
      :width="260"
      :overlay="false"
      class="app-sidebar"
      data-testid="app-sidebar"
    >
      <div class="sidebar-header row items-center q-pa-md">
        <q-btn
          flat
          dense
          round
          :icon="appSidebarMini ? 'chevron_right' : 'chevron_left'"
          aria-label="Toggle sidebar"
          @click="toggleAppSidebarMini"
        >
          <q-tooltip>{{ appSidebarMini ? 'Expand sidebar' : 'Collapse sidebar' }}</q-tooltip>
        </q-btn>
        <div
          v-if="!appSidebarMini"
          class="text-subtitle1 text-weight-bold q-ml-sm"
        >
          Dashboard
        </div>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="add"
          :to="{ name: 'create-project' }"
          aria-label="Create project"
        >
          <q-tooltip>New Project</q-tooltip>
        </q-btn>
      </div>

      <q-separator />

      <q-scroll-area class="sidebar-scroll">
        <div
          v-if="!appSidebarMini"
          class="text-caption text-grey-6 text-uppercase q-px-md q-pt-md"
        >
          Main
        </div>
        <q-list padding>
          <q-item
            v-if="FEATURES.COPILOT"
            clickable
            :active="route.name === 'app'"
            :to="{ name: 'app' }"
          >
            <q-item-section avatar>
              <q-icon name="smart_toy" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Copilot Hub
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Copilot Hub
            </q-tooltip>
          </q-item>

          <!-- Community Edition: standalone chat (no agents/RAG) -->
          <q-item
            v-if="!FEATURES.COPILOT"
            clickable
            :active="route.name === 'chat'"
            :to="{ name: 'chat' }"
          >
            <q-item-section avatar>
              <q-icon name="chat" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              AI Chat
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              AI Chat
            </q-tooltip>
          </q-item>

          <q-item
            clickable
            :active="route.name === 'generate'"
            :to="{ name: 'generate' }"
          >
            <q-item-section avatar>
              <q-icon name="auto_awesome" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Generate
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Generate
            </q-tooltip>
          </q-item>

          <q-item
            clickable
            :active="route.name === 'image-generation'"
            :to="{ name: 'image-generation' }"
          >
            <q-item-section avatar>
              <q-icon name="image" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Images
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Images
            </q-tooltip>
          </q-item>

          <q-item
            clickable
            :active="isProjectsRoute"
            :to="{ name: 'projects' }"
          >
            <q-item-section avatar>
              <q-icon name="folder" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Projects
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Projects
            </q-tooltip>
          </q-item>
        </q-list>

        <q-separator class="q-my-sm" />

        <div
          v-if="!appSidebarMini"
          class="text-caption text-grey-6 text-uppercase q-px-md q-pt-sm"
        >
          Account
        </div>
        <q-list padding>
          <q-item
            clickable
            :active="route.name === 'subscription'"
            :to="{ name: 'subscription' }"
          >
            <q-item-section avatar>
              <q-icon name="credit_card" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Subscription
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Subscription
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            :active="route.name === 'api-keys'"
            :to="{ name: 'api-keys' }"
          >
            <q-item-section avatar>
              <q-icon name="key" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              API Keys
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              API Keys
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            :active="route.name === 'integrations'"
            :to="{ name: 'integrations' }"
          >
            <q-item-section avatar>
              <q-icon name="extension" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Integrations
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Integrations
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            :active="route.name === 'account'"
            :to="{ name: 'account' }"
          >
            <q-item-section avatar>
              <q-icon name="manage_accounts" />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              Account
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              Account
            </q-tooltip>
          </q-item>
        </q-list>

        <q-separator class="q-my-sm" />

        <div
          v-if="!appSidebarMini"
          class="row items-center q-px-md q-pt-sm q-pb-xs"
        >
          <div class="text-caption text-grey-6 text-uppercase">
            Recent Projects
          </div>
        </div>

        <div
          v-if="projectsStore.loading.projects"
          class="row justify-center q-pa-md"
        >
          <q-spinner-dots
            size="32px"
            color="primary"
          />
        </div>

        <q-list
          v-else
          data-testid="sidebar-projects"
        >
          <q-item
            v-for="project in projectsStore.activeProjects.slice(0, 8)"
            :key="project.id"
            clickable
            :active="selectedProjectId === project.id"
            @click="handleProjectClick(project)"
          >
            <q-item-section avatar>
              <q-icon
                name="folder"
                :color="selectedProjectId === project.id ? 'primary' : 'grey'"
              />
            </q-item-section>
            <q-item-section v-if="!appSidebarMini">
              <q-item-label>{{ project.name }}</q-item-label>
              <q-item-label caption>
                {{ project.todoCount || 0 }} todos
              </q-item-label>
            </q-item-section>
            <q-item-section
              v-if="!appSidebarMini"
              side
            >
              <q-circular-progress
                :value="getProjectProgress(project)"
                size="22px"
                :thickness="0.3"
                color="primary"
                track-color="grey-3"
              />
            </q-item-section>
            <q-tooltip
              v-if="appSidebarMini"
              anchor="center right"
              self="center left"
            >
              {{ project.name }}
            </q-tooltip>
          </q-item>
        </q-list>
      </q-scroll-area>

      <q-separator />

      <div class="q-pa-sm">
        <q-btn
          v-if="!appSidebarMini"
          outline
          no-caps
          icon="list"
          label="All Projects"
          class="full-width"
          :to="{ name: 'projects' }"
        />
        <q-btn
          v-else
          outline
          round
          dense
          icon="list"
          aria-label="All Projects"
          class="full-width"
          :to="{ name: 'projects' }"
        >
          <q-tooltip
            anchor="center right"
            self="center left"
          >
            All Projects
          </q-tooltip>
        </q-btn>

        <q-btn
          v-if="authStore.isAuthenticated && projectsStore.hasLocalProjects && !appSidebarMini"
          outline
          no-caps
          icon="cloud_upload"
          :label="`Upload Local (${projectsStore.localProjectsCount})`"
          class="full-width q-mt-sm"
          :loading="uploadingLocalProjects"
          @click="uploadLocalProjects"
        />
        <q-btn
          v-else-if="authStore.isAuthenticated && projectsStore.hasLocalProjects && appSidebarMini"
          outline
          round
          dense
          icon="cloud_upload"
          aria-label="Upload local projects"
          class="q-mt-sm"
          :loading="uploadingLocalProjects"
          @click="uploadLocalProjects"
        >
          <q-tooltip
            anchor="center right"
            self="center left"
          >
            Upload Local ({{ projectsStore.localProjectsCount }})
          </q-tooltip>
        </q-btn>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <SiteFooter />

    <!-- Cookie Consent -->
    <CookieConsent />

    <!-- COMMUNITY: Copilot widgets removed (PRO feature) -->

    <!-- Scroll to Top -->
    <ScrollToTop />

    <!-- Gamification Celebration Overlay -->
    <CelebrationOverlay />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { FEATURES } from '@/config/features'
import { useAuthStore } from '@/stores/auth'
import { useDemoStore } from '@/stores/demo'
import { useProjectsStore } from '@/stores/projects'
import CookieConsent from '@/components/gdpr/CookieConsent.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
// COMMUNITY: CopilotWidget and ExpandableAIWidget removed (PRO feature)
import DemoStatusBar from '@/components/demo/DemoStatusBar.vue'
import RateLimitBanner from '@/components/system/RateLimitBanner.vue'
import ScrollToTop from '@/components/ui/ScrollToTop.vue'
import CelebrationOverlay from '@/components/gamification/CelebrationOverlay.vue'
import ElectronTitleBar from '@/components/layout/ElectronTitleBar.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const demoStore = useDemoStore()
const projectsStore = useProjectsStore()

const showAppSidebar = computed(() => {
  // Handle locale-prefixed routes like /en/app, /es/app/projects, etc.
  return /^\/[a-z]{2}\/app/.test(route.path) || route.path.startsWith('/app')
})

// Check if running in Electron on macOS (for title bar)
const isElectronMac = computed(() => {
  if (typeof window === 'undefined') return false
  const electron = (window as unknown as { electron?: { platform?: { isMac?: boolean } } }).electron
  return !!electron && (electron.platform?.isMac || navigator.platform.toLowerCase().includes('mac'))
})
const isProjectsRoute = computed(() => route.path.startsWith('/app/projects'))
const selectedProjectId = computed(() => {
  if (typeof route.params.id === 'string') return route.params.id
  return projectsStore.currentProject?.id ?? null
})

const appSidebarOpen = ref(true)
const appSidebarMini = ref(false)
const uploadingLocalProjects = ref(false)

const APP_SIDEBAR_MINI_KEY = 'synthstack_app_sidebar_mini'

function toggleAppSidebarMini(): void {
  appSidebarMini.value = !appSidebarMini.value
  try {
    localStorage.setItem(APP_SIDEBAR_MINI_KEY, appSidebarMini.value ? '1' : '0')
  } catch {
    // ignore storage errors
  }
}

async function uploadLocalProjects(): Promise<void> {
  uploadingLocalProjects.value = true
  try {
    await projectsStore.uploadLocalProjects()
    $q.notify({ type: 'positive', message: 'Uploaded local projects to cloud' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Failed to upload local projects' })
  } finally {
    uploadingLocalProjects.value = false
  }
}

watch(showAppSidebar, (enabled) => {
  // Sync drawer state when showAppSidebar changes
  // The q-drawer's "show-if-above" handles mobile/desktop visibility automatically
  appSidebarOpen.value = enabled
})

function getProjectProgress(project: any): number {
  if (!project.todoCount || project.todoCount === 0) return 0
  return Math.round(((project.completedTodoCount || 0) / project.todoCount) * 100)
}

async function handleProjectClick(project: any): Promise<void> {
  router.push({ name: 'project-detail', params: { id: project.id } })
}

onMounted(async () => {
  try {
    appSidebarMini.value = localStorage.getItem(APP_SIDEBAR_MINI_KEY) === '1'
  } catch {
    // ignore
  }

  // NOTE: We don't manually set appSidebarOpen here.
  // The q-drawer's "show-if-above" prop handles auto-hiding on mobile
  // and auto-showing on desktop. Setting it manually here causes race
  // conditions with Quasar's Screen plugin initialization in Playwright.
  // appSidebarOpen defaults to true, and show-if-above handles the rest.

  // Initialize demo mode if not authenticated
  if (!authStore.isAuthenticated) {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    await demoStore.initDemo(refCode || undefined)
  }
})

watchEffect(() => {
  if (!showAppSidebar.value) return
  if (projectsStore.loading.projects) return
  if (projectsStore.projects.length > 0) return
  void projectsStore.fetchProjects().catch(() => {})
})
</script>

<style lang="scss">
.app-layout {
  background: var(--bg-base);
}

.app-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  color: var(--text-primary);
  border-right: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
}

.app-sidebar .sidebar-header {
  border-bottom: 1px solid var(--border-default);
}

.app-sidebar .q-item {
  border-left: 3px solid transparent;
  border-radius: 10px;
  margin: 0 8px;
  color: var(--text-primary);
}

.app-sidebar .q-item:hover:not(.q-item--active) {
  background: var(--surface-active);
}

.app-sidebar .q-item.q-item--active {
  background: var(--accent-primary-subtle);
  border-left-color: var(--accent-primary);
}

// When demo bar is present, offset the site header below it
.has-demo-bar {
  .site-header {
    top: 44px !important; // Height of DemoStatusBar
  }

  // Keep content below the fixed SiteHeader (DemoStatusBar is sticky/in-flow)
  .q-page-container {
    padding-top: 64px !important;
  }
}

// Electron macOS title bar spacing
.has-electron-titlebar {
  padding-top: 38px;

  .site-header {
    top: 38px !important;
  }

  .app-sidebar {
    top: 38px !important;
    height: calc(100vh - 38px) !important;
  }

  // When both demo bar and electron title bar are present
  &.has-demo-bar {
    .site-header {
      top: 82px !important; // 38px + 44px
    }
  }
}

// Mobile sidebar toggle button - floating FAB
.mobile-sidebar-toggle {
  position: fixed;
  bottom: 80px;
  left: 16px;
  z-index: 999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

// NOTE: Scroll behavior and .site-header positioning handled by scroll-fix.scss
// Do not add duplicate html/body/q-layout rules here

// Additional mobile-specific fixes
@media (max-width: 900px) {
  .q-page-container {
    padding-top: 64px !important;
    padding-bottom: 0 !important;
  }
}
</style>
