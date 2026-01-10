<template>
  <q-page class="integrations-page q-pa-md">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 q-mb-xs">
          Integrations
        </h1>
        <p class="text-body2 text-grey-7">
          Connect external services to enhance your SynthStack experience.
          Your credentials are encrypted and securely stored.
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="row justify-center q-py-xl"
    >
      <q-spinner-dots
        size="50px"
        color="primary"
      />
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Integrations Grid -->
      <div class="row q-col-gutter-md">
        <!-- GitHub Integration Card -->
        <div class="col-12 col-md-6">
          <q-card
            class="integration-card"
            flat
            bordered
          >
            <q-card-section>
              <div class="row items-center q-mb-md">
                <q-avatar
                  size="48px"
                  class="bg-grey-9 text-white"
                >
                  <q-icon
                    name="mdi-github"
                    size="28px"
                  />
                </q-avatar>
                <div class="q-ml-md col">
                  <div class="text-h6">
                    GitHub
                  </div>
                  <div class="text-caption text-grey-6">
                    Repository access, issue sync, and code integration
                  </div>
                </div>
                <q-chip
                  :color="githubConnected ? 'green' : 'grey-4'"
                  :text-color="githubConnected ? 'white' : 'grey-7'"
                  size="sm"
                >
                  {{ githubConnected ? 'Connected' : 'Not Connected' }}
                </q-chip>
              </div>

              <!-- Connected State -->
              <div
                v-if="githubConnected && githubIntegration"
                class="q-mb-md"
              >
                <div class="row items-center q-pa-sm rounded-borders bg-grey-2 q-mb-sm">
                  <q-avatar size="32px">
                    <img :src="githubIntegration.avatarUrl || 'https://github.com/ghost.png'">
                  </q-avatar>
                  <div class="q-ml-sm">
                    <div class="text-body2 text-weight-medium">
                      {{ githubIntegration.username }}
                    </div>
                    <div class="text-caption text-grey-6">
                      <code>{{ githubIntegration.patHint }}</code>
                    </div>
                  </div>
                </div>

                <div
                  v-if="githubIntegration.syncedRepos?.length"
                  class="q-mb-sm"
                >
                  <div class="text-caption text-grey-7 q-mb-xs">
                    Synced Repositories
                  </div>
                  <div class="row q-gutter-xs">
                    <q-chip
                      v-for="repo in githubIntegration.syncedRepos.slice(0, 5)"
                      :key="repo"
                      size="sm"
                      dense
                      color="grey-3"
                    >
                      {{ repo }}
                    </q-chip>
                    <q-chip
                      v-if="githubIntegration.syncedRepos.length > 5"
                      size="sm"
                      dense
                      color="primary"
                      text-color="white"
                    >
                      +{{ githubIntegration.syncedRepos.length - 5 }} more
                    </q-chip>
                  </div>
                </div>

                <div
                  v-if="githubIntegration.lastSyncAt"
                  class="text-caption text-grey-6"
                >
                  Last synced: {{ formatDate(githubIntegration.lastSyncAt) }}
                </div>
              </div>

              <!-- Not Connected State -->
              <div
                v-else
                class="q-pa-md bg-grey-1 rounded-borders q-mb-md text-center"
              >
                <q-icon
                  name="mdi-github"
                  size="48px"
                  color="grey-5"
                  class="q-mb-sm"
                />
                <div class="text-body2 text-grey-7">
                  Connect your GitHub account to enable repository sync,
                  issue tracking, and AI-powered code assistance.
                </div>
              </div>

              <!-- Actions -->
              <div class="row q-gutter-sm">
                <!-- Demo mode: Show sign up prompt -->
                <template v-if="isDemoMode || !isAuthenticated">
                  <q-btn
                    color="primary"
                    unelevated
                    icon="person_add"
                    label="Sign Up to Connect"
                    @click="goToSignUp"
                  />
                  <div class="text-caption text-grey-6 q-mt-sm full-width">
                    Create an account to save your GitHub integration securely.
                  </div>
                </template>
                <!-- Authenticated: Show connect/manage buttons -->
                <template v-else>
                  <q-btn
                    v-if="!githubConnected"
                    color="grey-9"
                    unelevated
                    icon="mdi-github"
                    label="Connect GitHub"
                    @click="showGitHubWizard = true"
                  />
                  <q-btn
                    v-else
                    outline
                    color="grey-7"
                    icon="settings"
                    label="Manage"
                    @click="showGitHubWizard = true"
                  />
                  <q-btn
                    v-if="githubConnected"
                    flat
                    color="red"
                    label="Disconnect"
                    @click="confirmDisconnect('github')"
                  />
                </template>
              </div>

              <!-- Docs Link -->
              <div class="q-mt-md">
                <a
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
                  target="_blank"
                  class="text-caption text-primary"
                >
                  How to create a GitHub Personal Access Token
                  <q-icon
                    name="open_in_new"
                    size="12px"
                  />
                </a>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Future: GitLab Integration Card (Coming Soon) -->
        <div class="col-12 col-md-6">
          <q-card
            class="integration-card integration-card--disabled"
            flat
            bordered
          >
            <q-card-section>
              <div class="row items-center q-mb-md">
                <q-avatar
                  size="48px"
                  class="bg-orange-8 text-white"
                >
                  <q-icon
                    name="mdi-gitlab"
                    size="28px"
                  />
                </q-avatar>
                <div class="q-ml-md col">
                  <div class="text-h6">
                    GitLab
                  </div>
                  <div class="text-caption text-grey-6">
                    Repository and CI/CD integration
                  </div>
                </div>
                <q-chip
                  color="grey-3"
                  text-color="grey-7"
                  size="sm"
                >
                  Coming Soon
                </q-chip>
              </div>

              <div class="q-pa-md bg-grey-1 rounded-borders text-center">
                <q-icon
                  name="mdi-gitlab"
                  size="48px"
                  color="grey-4"
                  class="q-mb-sm"
                />
                <div class="text-body2 text-grey-5">
                  GitLab integration is coming soon. Stay tuned!
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Future: Bitbucket Integration Card (Coming Soon) -->
        <div class="col-12 col-md-6">
          <q-card
            class="integration-card integration-card--disabled"
            flat
            bordered
          >
            <q-card-section>
              <div class="row items-center q-mb-md">
                <q-avatar
                  size="48px"
                  class="bg-blue-8 text-white"
                >
                  <q-icon
                    name="mdi-bitbucket"
                    size="28px"
                  />
                </q-avatar>
                <div class="q-ml-md col">
                  <div class="text-h6">
                    Bitbucket
                  </div>
                  <div class="text-caption text-grey-6">
                    Repository and pipeline integration
                  </div>
                </div>
                <q-chip
                  color="grey-3"
                  text-color="grey-7"
                  size="sm"
                >
                  Coming Soon
                </q-chip>
              </div>

              <div class="q-pa-md bg-grey-1 rounded-borders text-center">
                <q-icon
                  name="mdi-bitbucket"
                  size="48px"
                  color="grey-4"
                  class="q-mb-sm"
                />
                <div class="text-body2 text-grey-5">
                  Bitbucket integration is coming soon. Stay tuned!
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Info Banner -->
      <q-banner
        class="bg-blue-1 text-blue-9 q-mt-lg"
        rounded
      >
        <template #avatar>
          <q-icon
            name="info"
            color="blue-8"
          />
        </template>
        <div class="text-body2">
          <strong>Global vs Project-Level Integrations:</strong>
          Integrations configured here are your global defaults. You can override these
          settings per-project in each project's Settings tab.
        </div>
      </q-banner>
    </div>

    <!-- GitHub Connect Wizard -->
    <GitHubConnectWizard
      v-model="showGitHubWizard"
      mode="global"
      :existing-integration="githubIntegration"
      @connected="onGitHubConnected"
    />

    <!-- Disconnect Confirmation Dialog -->
    <q-dialog v-model="showDisconnectDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            Disconnect Integration?
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Are you sure you want to disconnect this integration?
          Projects using your global {{ disconnectProvider }} settings will need to configure
          their own credentials.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            flat
            color="red"
            label="Disconnect"
            :loading="disconnecting"
            @click="disconnectIntegration"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar, date } from 'quasar';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useDemoStore } from '@/stores/demo';
import GitHubConnectWizard from '@/components/integrations/GitHubConnectWizard.vue';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

interface GitHubIntegration {
  id: string;
  username: string;
  avatarUrl: string | null;
  patHint: string;
  syncedRepos: string[];
  lastSyncAt: string | null;
  isValid: boolean;
}

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const demoStore = useDemoStore();

const loading = ref(true);
const githubIntegration = ref<GitHubIntegration | null>(null);
const showGitHubWizard = ref(false);
const showDisconnectDialog = ref(false);
const disconnectProvider = ref<string>('');
const disconnecting = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isDemoMode = computed(() => demoStore.isDemo);

const githubConnected = computed(() => {
  return githubIntegration.value !== null && githubIntegration.value.isValid;
});

const goToSignUp = () => {
  router.push({ name: 'register' });
};

const formatDate = (dateStr: string) => {
  return date.formatDate(dateStr, 'MMM D, YYYY h:mm A');
};

const loadIntegrations = async () => {
  // Skip API call for demo/unauthenticated users
  if (isDemoMode.value || !isAuthenticated.value) {
    loading.value = false;
    githubIntegration.value = null;
    return;
  }

  try {
    loading.value = true;
    const response = await api.get('/api/v1/integrations/github');
    githubIntegration.value = response.data.integration || null;
  } catch (error: any) {
    // 404 or empty response means no integration configured yet - this is expected
    // Also handle network errors gracefully for new users
    const status = error.response?.status;
    if (status && status !== 404 && status !== 401) {
      logError('Failed to load integrations:', error);
      $q.notify({
        type: 'negative',
        message: 'Failed to load integrations',
      });
    }
    githubIntegration.value = null;
  } finally {
    loading.value = false;
  }
};

const onGitHubConnected = (integration: GitHubIntegration) => {
  githubIntegration.value = integration;
  showGitHubWizard.value = false;
  $q.notify({
    type: 'positive',
    message: 'GitHub connected successfully!',
  });
};

const confirmDisconnect = (provider: string) => {
  disconnectProvider.value = provider;
  showDisconnectDialog.value = true;
};

const disconnectIntegration = async () => {
  disconnecting.value = true;
  try {
    await api.delete(`/api/v1/integrations/${disconnectProvider.value}`);

    if (disconnectProvider.value === 'github') {
      githubIntegration.value = null;
    }

    showDisconnectDialog.value = false;
    $q.notify({
      type: 'positive',
      message: `${disconnectProvider.value.charAt(0).toUpperCase() + disconnectProvider.value.slice(1)} disconnected`,
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to disconnect integration',
    });
  } finally {
    disconnecting.value = false;
  }
};

onMounted(() => {
  loadIntegrations();
});
</script>

<style lang="scss">
.integrations-page {
  max-width: 900px;
  margin: 0 auto;

  .integration-card {
    transition: box-shadow 0.2s;
    height: 100%;
    background: var(--surface-1);
    border-color: var(--border-default) !important;

    &:hover {
      box-shadow: var(--shadow-md);
    }

    &--disabled {
      opacity: 0.7;
      pointer-events: none;
    }
  }
}

// Dark mode - override Quasar's hardcoded bg colors
.body--dark .integrations-page {
  .integration-card {
    .bg-grey-1,
    .bg-grey-2 {
      background: var(--surface-2) !important;
    }

    .bg-grey-3,
    .bg-grey-4 {
      background: var(--surface-active) !important;
    }

    .text-grey-5,
    .text-grey-6,
    .text-grey-7 {
      color: var(--text-secondary) !important;
    }

    .rounded-borders {
      border: 1px solid var(--border-default);
    }
  }

  .bg-blue-1 {
    background: rgba(33, 150, 243, 0.15) !important;
  }

  .text-blue-9 {
    color: var(--accent-primary) !important;
  }
}
</style>
