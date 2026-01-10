<script setup lang="ts">
/**
 * WelcomeCard - User greeting with quick actions
 * Adapted from tailwind-admin ProfileWelcome.vue
 */
import { computed } from 'vue'

interface User {
  id: string
  name?: string
  username?: string
  email: string
  avatarUrl?: string
}

interface QuickAction {
  label: string
  icon: string
  to: string
  color?: string
}

interface Props {
  user: User | null
  quickActions?: QuickAction[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  quickActions: () => [
    { label: 'New Workflow', icon: 'add', to: '/app/workflows', color: 'primary' },
    { label: 'View Projects', icon: 'folder', to: '/app/projects' },
    { label: 'AI Copilot', icon: 'smart_toy', to: '/app' },
  ],
})

const getGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => {
  return props.user?.name || props.user?.username || ''
})

const firstName = computed(() => {
  if (!displayName.value) return ''
  return displayName.value.split(' ')[0]
})

const userInitials = computed(() => {
  if (!displayName.value) return '?'
  const parts = displayName.value.split(' ')
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
})
</script>

<template>
  <div class="welcome-card">
    <!-- Loading state -->
    <template v-if="loading">
      <div class="welcome-content">
        <div
          class="dashboard-skeleton"
          style="width: 56px; height: 56px; border-radius: 50%"
        />
        <div>
          <div
            class="dashboard-skeleton q-mb-sm"
            style="width: 200px; height: 24px"
          />
          <div
            class="dashboard-skeleton"
            style="width: 150px; height: 16px"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="welcome-content">
        <!-- Avatar -->
        <q-avatar
          size="56px"
          class="welcome-avatar"
        >
          <img
            v-if="user?.avatarUrl"
            :src="user.avatarUrl"
            :alt="displayName"
          >
          <span
            v-else
            class="avatar-initials"
          >{{ userInitials }}</span>
        </q-avatar>
        
        <!-- Text content -->
        <div class="welcome-text">
          <h2>{{ getGreeting }}, {{ firstName || 'there' }}! 👋</h2>
          <p>Here's what's happening with your workflows today.</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <q-btn
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          :icon="action.icon"
          :label="action.label"
          :color="action.color || 'white'"
          :text-color="action.color ? 'white' : 'dark'"
          :outline="!action.color"
          unelevated
          no-caps
          class="action-btn"
        />
      </div>
    </template>

    <!-- Decorative illustration (hidden on mobile) -->
    <div class="welcome-illustration">
      <svg
        width="145"
        height="95"
        viewBox="0 0 145 95"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.3">
          <!-- Abstract workflow visualization -->
          <circle
            cx="30"
            cy="47"
            r="15"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
          <circle
            cx="75"
            cy="30"
            r="12"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
          <circle
            cx="75"
            cy="65"
            r="10"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
          <circle
            cx="115"
            cy="47"
            r="15"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
          <path
            d="M45 47 L63 34"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M45 47 L65 60"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M87 33 L100 43"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M85 62 L100 52"
            stroke="currentColor"
            stroke-width="2"
          />
          <!-- AI sparkle -->
          <path
            d="M115 32 L115 27 L120 32 L115 37 L110 32 Z"
            fill="currentColor"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.welcome-card {
  background: linear-gradient(135deg, var(--accent-primary-subtle) 0%, var(--accent-secondary-subtle) 100%);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.welcome-content {
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1;
}

.welcome-avatar {
  border: 3px solid var(--surface-1);
  box-shadow: var(--shadow-md);
  background: var(--accent-primary);
  color: white;
  font-weight: 600;
  
  .avatar-initials {
    font-size: 1.25rem;
  }
}

.welcome-text {
  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px;
  }
  
  p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }
}

.quick-actions {
  display: flex;
  gap: 12px;
  z-index: 1;
  
  @media (max-width: 900px) {
    display: none;
  }
  
  .action-btn {
    min-width: 120px;
  }
}

.welcome-illustration {
  position: absolute;
  right: 240px;
  bottom: 0;
  top: 0;
  display: flex;
  align-items: center;
  color: var(--text-primary);
  opacity: 0.2;
  
  @media (max-width: 1100px) {
    display: none;
  }
}
</style>


