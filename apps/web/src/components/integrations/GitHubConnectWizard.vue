<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card
      class="wizard-card"
      style="min-width: 500px; max-width: 600px"
    >
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <q-avatar
          size="40px"
          class="bg-grey-9 text-white q-mr-md"
        >
          <q-icon
            name="mdi-github"
            size="24px"
          />
        </q-avatar>
        <div class="text-h6">
          {{ existingIntegration ? 'Manage GitHub Integration' : 'Connect GitHub' }}
        </div>
        <q-space />
        <q-btn
          v-close-popup
          icon="close"
          flat
          round
          dense
        />
      </q-card-section>

      <!-- Stepper -->
      <q-card-section>
        <q-stepper
          ref="stepper"
          v-model="step"
          color="primary"
          animated
          flat
          class="wizard-stepper"
        >
          <!-- Step 1: Enter PAT -->
          <q-step
            :name="1"
            title="Personal Access Token"
            icon="vpn_key"
            :done="step > 1"
          >
            <div class="q-mb-md">
              <p class="text-body2 text-grey-7">
                Enter your GitHub Personal Access Token (PAT) to connect your account.
                Your token is encrypted and never shared.
              </p>
            </div>

            <q-input
              v-model="pat"
              label="Personal Access Token"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              :type="showPat ? 'text' : 'password'"
              outlined
              class="q-mb-md"
              :error="!!patError"
              :error-message="patError"
            >
              <template #append>
                <q-icon
                  :name="showPat ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPat = !showPat"
                />
              </template>
            </q-input>

            <q-banner
              class="bg-amber-1 text-amber-10 q-mb-md"
              rounded
              dense
            >
              <template #avatar>
                <q-icon
                  name="info"
                  color="amber-8"
                  size="sm"
                />
              </template>
              <div class="text-caption">
                <strong>Required Scopes:</strong>
                <code class="q-mx-xs">repo</code>,
                <code class="q-mx-xs">read:org</code>,
                <code class="q-mx-xs">read:user</code>
              </div>
            </q-banner>

            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=SynthStack%20Integration"
              target="_blank"
              class="text-primary text-body2"
            >
              <q-icon
                name="open_in_new"
                size="16px"
                class="q-mr-xs"
              />
              Create a new token with required scopes
            </a>
          </q-step>

          <!-- Step 2: Validation -->
          <q-step
            :name="2"
            title="Validate"
            icon="verified"
            :done="step > 2"
          >
            <div
              v-if="validating"
              class="text-center q-py-lg"
            >
              <q-spinner-dots
                size="50px"
                color="primary"
              />
              <div class="text-body2 text-grey-7 q-mt-md">
                Validating your token...
              </div>
            </div>

            <div
              v-else-if="validationError"
              class="text-center q-py-lg"
            >
              <q-icon
                name="error"
                size="64px"
                color="red-5"
              />
              <div class="text-h6 text-red-7 q-mt-md">
                Validation Failed
              </div>
              <div class="text-body2 text-grey-7 q-mt-sm">
                {{ validationError }}
              </div>
              <q-btn
                color="primary"
                label="Try Again"
                class="q-mt-md"
                @click="step = 1"
              />
            </div>

            <div
              v-else-if="githubUser"
              class="text-center q-py-md"
            >
              <q-icon
                name="check_circle"
                size="64px"
                color="green-5"
              />
              <div class="text-h6 text-green-7 q-mt-md">
                Token Valid!
              </div>

              <q-card
                flat
                bordered
                class="q-mt-lg q-pa-md"
              >
                <div class="row items-center justify-center">
                  <q-avatar size="64px">
                    <img :src="githubUser.avatar_url">
                  </q-avatar>
                  <div class="q-ml-md text-left">
                    <div class="text-h6">
                      {{ githubUser.name || githubUser.login }}
                    </div>
                    <div class="text-body2 text-grey-7">
                      @{{ githubUser.login }}
                    </div>
                    <div
                      v-if="githubUser.company"
                      class="text-caption text-grey-6"
                    >
                      {{ githubUser.company }}
                    </div>
                  </div>
                </div>
              </q-card>

              <div
                v-if="patScopes.length"
                class="q-mt-md"
              >
                <div class="text-caption text-grey-7 q-mb-xs">
                  Token Scopes
                </div>
                <div class="row justify-center q-gutter-xs">
                  <q-chip
                    v-for="scope in patScopes"
                    :key="scope"
                    size="sm"
                    dense
                    color="green-2"
                    text-color="green-9"
                  >
                    {{ scope }}
                  </q-chip>
                </div>
              </div>
            </div>
          </q-step>

          <!-- Step 3: Select Repositories (Optional) -->
          <q-step
            :name="3"
            title="Repositories"
            icon="folder"
            :done="step > 3"
          >
            <div class="q-mb-md">
              <p class="text-body2 text-grey-7">
                Select which repositories to sync (optional). You can change this later.
              </p>
            </div>

            <div
              v-if="loadingRepos"
              class="text-center q-py-lg"
            >
              <q-spinner-dots
                size="40px"
                color="primary"
              />
              <div class="text-body2 text-grey-7 q-mt-md">
                Loading repositories...
              </div>
            </div>

            <div v-else>
              <div class="row q-mb-md">
                <q-btn
                  flat
                  dense
                  color="primary"
                  label="Select All"
                  class="q-mr-sm"
                  @click="selectAllRepos"
                />
                <q-btn
                  flat
                  dense
                  color="grey-7"
                  label="Deselect All"
                  @click="deselectAllRepos"
                />
                <q-space />
                <q-input
                  v-model="repoFilter"
                  dense
                  outlined
                  placeholder="Filter repos..."
                  style="width: 200px"
                >
                  <template #prepend>
                    <q-icon
                      name="search"
                      size="sm"
                    />
                  </template>
                </q-input>
              </div>

              <q-scroll-area style="height: 250px">
                <q-list dense>
                  <q-item
                    v-for="repo in filteredRepos"
                    :key="repo.full_name"
                    tag="label"
                    clickable
                  >
                    <q-item-section side>
                      <q-checkbox
                        v-model="selectedRepos"
                        :val="repo.full_name"
                        dense
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ repo.name }}</q-item-label>
                      <q-item-label caption>
                        {{ repo.full_name }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-icon
                        :name="repo.private ? 'lock' : 'public'"
                        :color="repo.private ? 'grey-6' : 'grey-5'"
                        size="sm"
                      />
                    </q-item-section>
                  </q-item>

                  <q-item v-if="filteredRepos.length === 0">
                    <q-item-section class="text-grey-6 text-center">
                      No repositories found
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>

              <div class="text-caption text-grey-6 q-mt-sm">
                {{ selectedRepos.length }} of {{ repos.length }} repositories selected
              </div>
            </div>
          </q-step>

          <!-- Step 4: Confirmation -->
          <q-step
            :name="4"
            title="Confirm"
            icon="check"
          >
            <div class="text-center q-py-md">
              <q-icon
                name="mdi-github"
                size="64px"
                color="grey-9"
              />
              <div class="text-h6 q-mt-md">
                Ready to Connect
              </div>

              <q-card
                flat
                bordered
                class="q-mt-lg text-left"
              >
                <q-list dense>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon
                        name="person"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>
                        Account
                      </q-item-label>
                      <q-item-label>{{ githubUser?.login }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon
                        name="folder"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>
                        Repositories
                      </q-item-label>
                      <q-item-label>
                        {{ selectedRepos.length === 0 ? 'All accessible' : `${selectedRepos.length} selected` }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon
                        name="lock"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption>
                        Scope
                      </q-item-label>
                      <q-item-label>{{ mode === 'global' ? 'Global (all projects)' : 'This project only' }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card>

              <div class="text-caption text-grey-6 q-mt-md">
                Your token will be encrypted with AES-256 encryption.
              </div>
            </div>
          </q-step>

          <!-- Navigation -->
          <template #navigation>
            <q-stepper-navigation class="row">
              <q-btn
                v-if="step > 1 && step !== 2"
                flat
                color="grey-7"
                label="Back"
                @click="stepper?.previous()"
              />
              <q-space />
              <q-btn
                v-if="step === 1"
                color="primary"
                label="Validate Token"
                :disable="!pat || pat.length < 10"
                @click="validatePat"
              />
              <q-btn
                v-else-if="step === 2 && !validating && !validationError"
                color="primary"
                label="Continue"
                @click="loadRepos"
              />
              <q-btn
                v-else-if="step === 3"
                color="primary"
                label="Continue"
                @click="stepper?.next()"
              />
              <q-btn
                v-else-if="step === 4"
                color="primary"
                label="Connect GitHub"
                :loading="saving"
                @click="saveIntegration"
              />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar, QStepper } from 'quasar';
import { api } from '@/services/api';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  company: string | null;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
}

interface ExistingIntegration {
  id: string;
  username: string;
  avatarUrl: string | null;
  patHint: string;
  syncedRepos: string[];
  lastSyncAt: string | null;
  isValid: boolean;
}

const props = defineProps<{
  modelValue: boolean;
  mode: 'global' | 'project';
  projectId?: string;
  existingIntegration?: ExistingIntegration | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'connected', integration: ExistingIntegration): void;
}>();

const $q = useQuasar();

const step = ref(1);
const stepper = ref<InstanceType<typeof QStepper> | null>(null);

// Step 1 - PAT input
const pat = ref('');
const showPat = ref(false);
const patError = ref('');

// Step 2 - Validation
const validating = ref(false);
const validationError = ref('');
const githubUser = ref<GitHubUser | null>(null);
const patScopes = ref<string[]>([]);

// Step 3 - Repositories
const loadingRepos = ref(false);
const repos = ref<GitHubRepo[]>([]);
const selectedRepos = ref<string[]>([]);
const repoFilter = ref('');

// Step 4 - Saving
const saving = ref(false);

const filteredRepos = computed(() => {
  if (!repoFilter.value) return repos.value;
  const filter = repoFilter.value.toLowerCase();
  return repos.value.filter((r) =>
    r.full_name.toLowerCase().includes(filter) ||
    r.name.toLowerCase().includes(filter)
  );
});

// Reset wizard when opened/closed
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetWizard();
    // If editing existing, skip to step 3
    if (props.existingIntegration) {
      githubUser.value = {
        login: props.existingIntegration.username,
        name: null,
        avatar_url: props.existingIntegration.avatarUrl || '',
        company: null,
      };
      selectedRepos.value = [...props.existingIntegration.syncedRepos];
      step.value = 3;
      loadRepos();
    }
  }
});

const resetWizard = () => {
  step.value = 1;
  pat.value = '';
  showPat.value = false;
  patError.value = '';
  validating.value = false;
  validationError.value = '';
  githubUser.value = null;
  patScopes.value = [];
  repos.value = [];
  selectedRepos.value = [];
  repoFilter.value = '';
  saving.value = false;
};

const validatePat = async () => {
  patError.value = '';

  // Basic format validation
  if (!pat.value.startsWith('ghp_') && !pat.value.startsWith('github_pat_')) {
    patError.value = 'Invalid token format. Should start with "ghp_" or "github_pat_"';
    return;
  }

  step.value = 2;
  validating.value = true;
  validationError.value = '';

  try {
    const endpoint = props.mode === 'global'
      ? '/api/v1/integrations/github/validate'
      : `/api/v1/projects/${props.projectId}/github/validate`;

    const response = await api.post(endpoint, { pat: pat.value });

    if (response.data.valid) {
      githubUser.value = response.data.user;
      patScopes.value = response.data.scopes || [];
      // Store repos from validate response to avoid extra API call
      if (response.data.repos) {
        repos.value = response.data.repos.map((r: any) => ({
          full_name: r.fullName,
          name: r.name,
          owner: r.owner,
          private: r.private,
          default_branch: r.defaultBranch,
        }));
      }
    } else {
      validationError.value = response.data.error || 'Token validation failed';
    }
  } catch (error: any) {
    validationError.value = error.response?.data?.error || 'Failed to validate token';
  } finally {
    validating.value = false;
  }
};

const loadRepos = async () => {
  step.value = 3;

  // If repos already loaded from validate step, skip the API call
  if (repos.value.length > 0) {
    return;
  }

  loadingRepos.value = true;

  try {
    // For editing existing integration, fetch repos using stored PAT
    const endpoint = props.mode === 'global'
      ? '/api/v1/integrations/github/repos'
      : `/api/v1/projects/${props.projectId}/github/repos`;

    const response = await api.get(endpoint);

    repos.value = (response.data.repos || []).map((r: any) => ({
      full_name: r.fullName || r.full_name,
      name: r.name,
      owner: r.owner,
      private: r.private,
      default_branch: r.defaultBranch || r.default_branch,
    }));
  } catch (error: any) {
    logError('Failed to load repos:', error);
    // Continue anyway - repos are optional
    repos.value = [];
  } finally {
    loadingRepos.value = false;
  }
};

const selectAllRepos = () => {
  selectedRepos.value = repos.value.map((r) => r.full_name);
};

const deselectAllRepos = () => {
  selectedRepos.value = [];
};

const saveIntegration = async () => {
  saving.value = true;

  try {
    const endpoint = props.mode === 'global'
      ? '/api/v1/integrations/github'
      : `/api/v1/projects/${props.projectId}/github/link`;

    const payload: any = {
      selectedRepos: selectedRepos.value,
    };

    // Only include PAT if this is a new connection (not editing existing)
    if (!props.existingIntegration) {
      payload.pat = pat.value;
    }

    const response = await api.post(endpoint, payload);

    emit('connected', response.data.integration);
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to save integration',
    });
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.wizard-card {
  border-radius: 12px;
}

.wizard-stepper {
  background: transparent;
}

.wizard-stepper :deep(.q-stepper__header) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 12px;
  margin-bottom: 16px;
}
</style>
