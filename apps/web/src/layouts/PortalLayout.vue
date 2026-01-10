<template>
  <q-layout
    view="hHh Lpr fFf"
    class="portal-layout"
  >
    <!-- Portal Header -->
    <q-header
      class="portal-header"
      bordered
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <q-toolbar>
        <q-btn
          flat
          round
          dense
          icon="menu"
          aria-label="Menu"
          class="lt-md"
          @click="sidebarOpen = !sidebarOpen"
        />

        <q-toolbar-title class="row items-center">
          <img
            v-if="portalBranding.logo"
            :src="portalBranding.logo"
            :alt="portalBranding.name"
            class="portal-logo q-mr-sm"
          >
          <span class="text-weight-medium">{{ portalBranding.name || 'Client Portal' }}</span>
        </q-toolbar-title>

        <q-space />

        <!-- Notifications -->
        <q-btn
          flat
          round
          dense
          icon="notifications"
          aria-label="Notifications"
        >
          <q-badge
            v-if="unreadCount > 0"
            color="negative"
            floating
          >
            {{ unreadCount }}
          </q-badge>
          <q-tooltip>Notifications</q-tooltip>
        </q-btn>

        <!-- User Menu -->
        <q-btn
          flat
          round
          dense
          aria-label="Account"
        >
          <q-avatar
            size="32px"
            color="primary"
            text-color="white"
          >
            {{ userInitials }}
          </q-avatar>
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item-label header>
                {{ userName }}
              </q-item-label>
              <q-item
                v-close-popup
                clickable
                :to="{ name: 'portal-account' }"
              >
                <q-item-section avatar>
                  <q-icon name="person" />
                </q-item-section>
                <q-item-section>My Account</q-item-section>
              </q-item>
              <q-separator />
              <q-item
                v-close-popup
                clickable
                @click="logout"
              >
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Sign Out</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Sidebar -->
    <q-drawer
      v-model="sidebarOpen"
      show-if-above
      bordered
      :width="260"
      class="portal-sidebar"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <!-- Dashboard -->
          <q-item
            clickable
            :active="route.name === 'portal-dashboard'"
            :to="{ name: 'portal-dashboard' }"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>Dashboard</q-item-section>
          </q-item>

          <q-separator spaced />

          <!-- Projects Section -->
          <q-item-label header>
            Projects
          </q-item-label>
          <q-item
            clickable
            :active="route.name === 'portal-projects'"
            :to="{ name: 'portal-projects' }"
          >
            <q-item-section avatar>
              <q-icon name="folder" />
            </q-item-section>
            <q-item-section>All Projects</q-item-section>
          </q-item>

          <q-separator spaced />

          <!-- Billing Section -->
          <q-item-label header>
            Billing
          </q-item-label>
          <q-item
            clickable
            :active="route.name === 'portal-invoices'"
            :to="{ name: 'portal-invoices' }"
          >
            <q-item-section avatar>
              <q-icon name="receipt" />
            </q-item-section>
            <q-item-section>Invoices</q-item-section>
            <q-item-section
              v-if="pendingInvoices > 0"
              side
            >
              <q-badge
                color="warning"
                :label="pendingInvoices"
              />
            </q-item-section>
          </q-item>

          <q-separator spaced />

          <!-- Communication -->
          <q-item-label header>
            Communication
          </q-item-label>
          <q-item
            clickable
            :active="route.name === 'portal-messages'"
            :to="{ name: 'portal-messages' }"
          >
            <q-item-section avatar>
              <q-icon name="chat" />
            </q-item-section>
            <q-item-section>Messages</q-item-section>
            <q-item-section
              v-if="unreadCount > 0"
              side
            >
              <q-badge
                color="primary"
                :label="unreadCount"
              />
            </q-item-section>
          </q-item>

          <q-separator spaced />

          <!-- Support -->
          <q-item-label header>
            Support
          </q-item-label>
          <q-item
            clickable
            :active="route.name === 'portal-help'"
            :to="{ name: 'portal-help' }"
          >
            <q-item-section avatar>
              <q-icon name="help" />
            </q-item-section>
            <q-item-section>Help Center</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Main Content -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- Footer -->
    <q-footer
      class="portal-footer bg-transparent text-grey-7"
      :style="{ paddingBottom: bottomSafeArea + 'px' }"
    >
      <div class="row items-center justify-center q-pa-sm">
        <span class="text-caption">
          Powered by <a
            href="https://synthstack.io"
            target="_blank"
            class="text-primary"
          >SynthStack</a>
        </span>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePortal } from '@/composables/usePortal'
import { usePlatform } from '@/composables/usePlatform'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const portal = usePortal()
const { statusBarHeight, bottomSafeArea } = usePlatform()

const sidebarOpen = ref(true)
const unreadCount = ref(0)
const pendingInvoices = ref(0)

// Branding (can be customized per organization)
const portalBranding = ref({
  name: 'Client Portal',
  logo: null as string | null,
  primaryColor: '#1976d2'
})

const userName = computed(() => {
  return authStore.user?.username || authStore.authUser?.displayName || 'User'
})

const userInitials = computed(() => {
  const name = userName.value
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

async function logout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

async function loadDashboardStats() {
  try {
    const data = await portal.fetchDashboard()
    unreadCount.value = data.stats.unreadMessages
    pendingInvoices.value = data.stats.pendingInvoices
  } catch {
    // Silent fail for sidebar stats
  }
}

onMounted(() => {
  loadDashboardStats()
})
</script>

<style lang="scss">
.portal-layout {
  background: var(--bg-base);
}

.portal-header {
  background: var(--surface-1);
  color: var(--text-primary);
}

.portal-logo {
  height: 32px;
  width: auto;
}

.portal-sidebar {
  background: var(--surface-1);
  border-right: 1px solid var(--border-default);

  .q-item {
    border-radius: 8px;
    margin: 4px 8px;

    &.q-item--active {
      background: var(--accent-primary-subtle);
      color: var(--accent-primary);
    }
  }

  .q-item-label--header {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }
}

.portal-footer {
  border-top: 1px solid var(--border-default);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
