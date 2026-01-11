<template>
  <private-view title="SynthStack Dashboard">
    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="auto_awesome" />
      </v-button>
    </template>

    <template #headline>
      <v-breadcrumb :items="[{ name: 'SynthStack', to: '/synthstack-dashboard' }]" />
    </template>

    <template #actions>
      <v-button secondary @click="refresh">
        <v-icon name="refresh" left />
        Refresh
      </v-button>
    </template>

    <div class="synthstack-dashboard">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate />
        <p>Loading dashboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <v-icon name="error" large />
        <p>{{ error }}</p>
        <v-button @click="refresh">Retry</v-button>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Welcome Banner -->
        <div class="welcome-banner">
          <v-icon name="celebration" />
          <span>
            Welcome to SynthStack Community Edition!
            A complete open-source SaaS boilerplate.
          </span>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon users">
              <v-icon name="people" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.users }}</span>
              <span class="stat-label">Total Users</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon content">
              <v-icon name="article" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.content }}</span>
              <span class="stat-label">Content Items</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon api">
              <v-icon name="api" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.apiCalls }}</span>
              <span class="stat-label">API Calls Today</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon success">
              <v-icon name="check_circle" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.uptime }}%</span>
              <span class="stat-label">Uptime</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section">
          <h3 class="section-title">Quick Actions</h3>
          <div class="actions-grid">
            <v-button
              class="action-card"
              @click="navigateTo('/content')"
            >
              <v-icon name="edit_note" />
              <span>Manage Content</span>
            </v-button>

            <v-button
              class="action-card"
              @click="navigateTo('/users')"
            >
              <v-icon name="group" />
              <span>Manage Users</span>
            </v-button>

            <v-button
              class="action-card"
              @click="navigateTo('/settings/data-model')"
            >
              <v-icon name="schema" />
              <span>Data Model</span>
            </v-button>

            <v-button
              class="action-card"
              @click="navigateTo('/settings')"
            >
              <v-icon name="settings" />
              <span>Settings</span>
            </v-button>
          </div>
        </div>

        <!-- System Health -->
        <div class="section">
          <h3 class="section-title">System Health</h3>
          <div class="health-grid">
            <div class="health-item">
              <span class="health-label">API Gateway</span>
              <v-chip :class="health.apiGateway" x-small>
                {{ health.apiGateway }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">Database</span>
              <v-chip :class="health.database" x-small>
                {{ health.database }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">Redis</span>
              <v-chip :class="health.redis" x-small>
                {{ health.redis }}
              </v-chip>
            </div>
            <div class="health-item">
              <span class="health-label">Directus</span>
              <v-chip :class="health.directus" x-small>
                {{ health.directus }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Documentation Links -->
        <div class="section">
          <h3 class="section-title">Resources</h3>
          <div class="resources-grid">
            <a href="https://github.com/synthstack/synthstack-community" target="_blank" class="resource-card">
              <v-icon name="code" />
              <span>GitHub Repository</span>
            </a>
            <a href="https://synthstack.app/docs" target="_blank" class="resource-card">
              <v-icon name="menu_book" />
              <span>Documentation</span>
            </a>
            <a href="https://discord.gg/synthstack" target="_blank" class="resource-card">
              <v-icon name="forum" />
              <span>Community Discord</span>
            </a>
          </div>
        </div>
      </template>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();

// State
const loading = ref(true);
const error = ref<string | null>(null);

const stats = ref({
  users: 0,
  content: 0,
  apiCalls: 0,
  uptime: 99.9
});

const health = ref({
  apiGateway: 'healthy',
  database: 'healthy',
  redis: 'healthy',
  directus: 'healthy'
});

// Methods
function navigateTo(path: string) {
  window.location.href = path;
}

async function fetchDashboardData() {
  try {
    // Fetch basic stats
    const [usersRes, contentRes] = await Promise.all([
      api.get('/users', { params: { aggregate: { count: '*' } } }).catch(() => null),
      api.get('/items', { params: { aggregate: { count: '*' } } }).catch(() => null)
    ]);

    stats.value = {
      users: usersRes?.data?.data?.[0]?.count ?? 0,
      content: contentRes?.data?.data?.[0]?.count ?? 0,
      apiCalls: Math.floor(Math.random() * 1000) + 100, // Placeholder
      uptime: 99.9
    };

    // Health checks
    try {
      await api.get('/server/health');
      health.value.directus = 'healthy';
    } catch {
      health.value.directus = 'unhealthy';
    }
  } catch (err) {
    console.error('[SynthStack] Failed to fetch dashboard data:', err);
    // Use default values
    stats.value = {
      users: 0,
      content: 0,
      apiCalls: 0,
      uptime: 99.9
    };
  }
}

async function refresh() {
  loading.value = true;
  error.value = null;

  try {
    await fetchDashboardData();
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.synthstack-dashboard {
  padding: var(--content-padding);
  max-width: 1400px;
}

.welcome-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--success-10) 0%, var(--primary-10) 100%);
  border-radius: var(--border-radius);
  margin-bottom: 24px;
  border: 1px solid var(--primary-25);
  color: var(--foreground-normal);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.stat-icon.users {
  background: var(--primary-10);
  color: var(--primary);
}

.stat-icon.content {
  background: var(--success-10);
  color: var(--success);
}

.stat-icon.api {
  background: var(--warning-10);
  color: var(--warning);
}

.stat-icon.success {
  background: var(--success-10);
  color: var(--success);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--foreground-normal);
}

.stat-label {
  font-size: 13px;
  color: var(--foreground-subdued);
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground-normal);
  margin-bottom: 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: var(--background-normal);
  border: 1px solid var(--border-subdued);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  border-color: var(--primary);
  background: var(--primary-10);
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.health-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-subdued);
}

.health-label {
  font-weight: 500;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.resource-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--background-normal);
  border: 1px solid var(--border-subdued);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--foreground-normal);
  transition: all 0.2s;
}

.resource-card:hover {
  border-color: var(--primary);
  background: var(--primary-10);
}

.v-chip.healthy {
  --v-chip-background-color: var(--success-10);
  --v-chip-color: var(--success);
}

.v-chip.degraded {
  --v-chip-background-color: var(--warning-10);
  --v-chip-color: var(--warning);
}

.v-chip.unhealthy {
  --v-chip-background-color: var(--danger-10);
  --v-chip-color: var(--danger);
}
</style>
