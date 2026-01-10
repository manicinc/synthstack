<template>
  <BYOKTooltips>
    <q-page class="api-keys-page q-pa-md">
      <div class="row items-center q-mb-lg">
        <div class="col">
          <div class="row items-center q-mb-xs">
            <h1 class="text-h4 q-ma-none">
              API Keys
            </h1>
            <!-- Tooltip 1: Page Header Info -->
            <q-icon
              name="info"
              size="20px"
              color="grey-6"
              class="q-ml-sm cursor-pointer"
            >
              <q-tooltip
                class="bg-grey-9 text-body2"
                :offset="[0, 8]"
                max-width="300px"
              >
                <div class="q-pa-sm">
                  <div class="text-weight-bold q-mb-xs">
                    {{ byokTooltips.security.title }}
                  </div>
                  <div>{{ byokTooltips.security.description }}</div>
                </div>
              </q-tooltip>
            </q-icon>
          </div>
          <p class="text-body2 text-grey-7">
            Bring your own API keys to use with SynthStack AI features.
            Your keys are encrypted and never shared.
          </p>
        </div>
      </div>

      <!-- Premium Gate -->
      <q-banner
        v-if="!isPremium"
        class="bg-amber-1 text-amber-10 q-mb-lg"
        rounded
      >
        <template #avatar>
          <q-icon
            name="lock"
            color="amber-8"
          />
        </template>
        <div class="text-body1 q-mb-sm">
          Premium Feature
        </div>
        <div class="text-body2">
          BYOK (Bring Your Own Keys) is available for Premium and Lifetime subscribers.
          Upgrade to use your own API keys for unlimited AI usage.
        </div>
        <template #action>
          <q-btn
            flat
            color="amber-10"
            label="Upgrade"
            to="/pricing"
          />
        </template>
      </q-banner>

      <!-- BYOK Mode Banner -->
      <q-banner
        v-if="isPremium && settings"
        class="q-mb-lg"
        :class="getBannerClass()"
        rounded
      >
        <template #avatar>
          <q-icon
            :name="getBannerIcon()"
            :color="getBannerIconColor()"
          />
        </template>
        <div class="row items-center q-mb-xs">
          <div class="text-body1">
            {{ getBannerTitle() }}
          </div>
          <!-- Tooltip 2: Routing Mode Info -->
          <q-icon
            name="info_outline"
            size="18px"
            class="q-ml-sm cursor-pointer"
          >
            <q-tooltip
              class="bg-grey-9 text-body2"
              :offset="[0, 8]"
              max-width="300px"
            >
              <div class="q-pa-sm">
                <div class="text-weight-bold q-mb-xs">
                  {{ byokTooltips.routingMode.title }}
                </div>
                <div>{{ byokTooltips.routingMode.description }}</div>
              </div>
            </q-tooltip>
          </q-icon>
        </div>
        <div class="text-body2">
          {{ settings.keySource.reason }}
        </div>
        <div
          v-if="settings.flags.byokOnlyMode"
          class="text-body2 q-mt-sm"
        >
          <strong>BYOK-Only Mode:</strong> You must configure your own API keys to use AI features.
        </div>
        <div
          v-else-if="!settings.hasCredits && !settings.hasByokKeys"
          class="text-body2 q-mt-sm"
        >
          Configure your API keys below or <router-link to="/pricing">purchase credits</router-link>.
        </div>
      </q-banner>

      <!-- Rate Limit Bypass Banner -->
      <q-banner
        v-if="isPremium && settings && settings.hasByokKeys"
        class="bg-positive-1 text-positive-10 q-mb-lg"
        rounded
        dense
      >
        <template #avatar>
          <q-icon
            name="speed"
            color="positive-8"
          />
        </template>
        <div class="row items-center">
          <div class="text-body2">
            <strong>{{ byokTooltips.rateLimits.title }}:</strong> {{ byokTooltips.rateLimits.description }}
          </div>
          <!-- Tooltip 3: Rate Limits Info -->
          <q-icon
            name="info_outline"
            size="18px"
            color="positive-8"
            class="q-ml-sm cursor-pointer"
          >
            <q-tooltip
              class="bg-grey-9 text-body2"
              :offset="[0, 8]"
              max-width="300px"
            >
              <div class="q-pa-sm">
                <div class="text-weight-bold q-mb-xs">
                  {{ byokTooltips.fallback.title }}
                </div>
                <div>{{ byokTooltips.fallback.description }}</div>
              </div>
            </q-tooltip>
          </q-icon>
        </div>
      </q-banner>

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
      <div v-else-if="isPremium">
        <!-- Providers List -->
        <div class="row q-col-gutter-md">
          <div
            v-for="provider in providers"
            :key="provider.id"
            class="col-12 col-md-6"
          >
            <q-card
              class="provider-card"
              flat
              bordered
            >
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-avatar
                    size="48px"
                    :class="getProviderClass(provider.id)"
                  >
                    <q-icon
                      :name="getProviderIcon(provider.id)"
                      size="24px"
                    />
                  </q-avatar>
                  <div class="q-ml-md flex-grow-1">
                    <div class="text-h6">
                      {{ provider.name }}
                    </div>
                    <div class="text-caption text-grey-6">
                      {{ provider.description }}
                    </div>
                  </div>
                  <!-- Tooltip 4: Provider Info -->
                  <q-icon
                    name="info_outline"
                    size="18px"
                    color="grey-6"
                    class="cursor-pointer"
                  >
                    <q-tooltip
                      class="bg-grey-9 text-body2"
                      :offset="[0, 8]"
                      max-width="300px"
                    >
                      <div class="q-pa-sm">
                        <div class="text-weight-bold q-mb-xs">
                          {{ byokTooltips.provider.title }}
                        </div>
                        <div>{{ byokTooltips.provider.description }}</div>
                      </div>
                    </q-tooltip>
                  </q-icon>
                </div>

                <!-- Existing Key Display -->
                <div
                  v-if="getKeyForProvider(provider.id)"
                  class="key-display q-pa-sm rounded-borders bg-grey-2 q-mb-md"
                >
                  <div class="row items-center">
                    <q-icon
                      name="vpn_key"
                      class="q-mr-sm text-grey-7"
                    />
                    <code class="text-grey-8">{{ getKeyForProvider(provider.id)?.keyHint }}</code>
                    <q-space />
                    <div class="row items-center no-wrap">
                      <q-chip
                        :color="getKeyForProvider(provider.id)?.isValid ? 'green' : 'red'"
                        text-color="white"
                        size="sm"
                        dense
                      >
                        {{ getKeyForProvider(provider.id)?.isValid ? 'Valid' : 'Invalid' }}
                      </q-chip>
                      <!-- Tooltip 5: Validation Info -->
                      <q-icon
                        name="info_outline"
                        size="16px"
                        color="grey-6"
                        class="q-ml-xs cursor-pointer"
                      >
                        <q-tooltip
                          class="bg-grey-9 text-body2"
                          :offset="[0, 8]"
                          max-width="300px"
                        >
                          <div class="q-pa-sm">
                            <div class="text-weight-bold q-mb-xs">
                              {{ byokTooltips.validation.title }}
                            </div>
                            <div>{{ byokTooltips.validation.description }}</div>
                          </div>
                        </q-tooltip>
                      </q-icon>
                    </div>
                  </div>
                  <div
                    v-if="getKeyForProvider(provider.id)?.lastError"
                    class="text-caption text-red-6 q-mt-xs"
                  >
                    {{ getKeyForProvider(provider.id)?.lastError }}
                  </div>
                </div>

                <!-- Key Input -->
                <q-input
                  v-model="keyInputs[provider.id]"
                  :label="getKeyForProvider(provider.id) ? 'Replace API Key' : 'API Key'"
                  :placeholder="provider.keyFormatHint"
                  type="password"
                  outlined
                  dense
                  class="q-mb-sm"
                >
                  <template #append>
                    <q-icon
                      :name="showKey[provider.id] ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showKey[provider.id] = !showKey[provider.id]"
                    />
                  </template>
                </q-input>

                <!-- Actions -->
                <div class="row q-gutter-sm">
                  <q-btn
                    :loading="saving[provider.id]"
                    :disable="!keyInputs[provider.id]"
                    color="primary"
                    label="Save Key"
                    unelevated
                    @click="saveKey(provider.id)"
                  />
                  <q-btn
                    v-if="getKeyForProvider(provider.id)"
                    :loading="testing[provider.id]"
                    outline
                    color="grey-7"
                    label="Test"
                    @click="testKey(provider.id)"
                  />
                  <q-btn
                    v-if="getKeyForProvider(provider.id)"
                    :loading="deleting[provider.id]"
                    flat
                    color="red"
                    label="Remove"
                    @click="confirmDelete(provider.id)"
                  />
                </div>

                <!-- Docs Link -->
                <div class="q-mt-md">
                  <a
                    :href="provider.docsUrl"
                    target="_blank"
                    class="text-caption text-primary"
                  >
                    How to get your {{ provider.name }} API key
                    <q-icon
                      name="open_in_new"
                      size="12px"
                    />
                  </a>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Usage Stats -->
        <q-card
          v-if="usageStats"
          class="q-mt-lg"
          flat
          bordered
        >
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-h6">
                Usage (Last 30 Days)
              </div>
              <!-- Tooltip 6: Usage Stats Info -->
              <q-icon
                name="info_outline"
                size="18px"
                color="grey-6"
                class="q-ml-sm cursor-pointer"
              >
                <q-tooltip
                  class="bg-grey-9 text-body2"
                  :offset="[0, 8]"
                  max-width="300px"
                >
                  <div class="q-pa-sm">
                    <div class="text-weight-bold q-mb-xs">
                      {{ byokTooltips.usageStats.title }}
                    </div>
                    <div>{{ byokTooltips.usageStats.description }}</div>
                  </div>
                </q-tooltip>
              </q-icon>
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-4">
                <div class="text-h4">
                  {{ usageStats.totalRequests.toLocaleString() }}
                </div>
                <div class="text-caption text-grey-6">
                  Total Requests
                </div>
              </div>
              <div class="col-4">
                <div class="text-h4">
                  {{ formatTokens(usageStats.totalTokens) }}
                </div>
                <div class="text-caption text-grey-6">
                  Total Tokens
                </div>
              </div>
              <div class="col-4">
                <div class="text-h4">
                  ${{ (usageStats.estimatedCostCents / 100).toFixed(2) }}
                </div>
                <div class="text-caption text-grey-6">
                  Estimated Cost
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Delete Confirmation Dialog -->
      <q-dialog v-model="showDeleteDialog">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">
              Remove API Key?
            </div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            Are you sure you want to remove this API key? You'll need to add a new one to continue using BYOK features.
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
              label="Remove"
              @click="deleteKey"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-page>
  </byoktooltips>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';
import { useBYOKTooltips } from '@/composables/useBYOKTooltips';
import BYOKTooltips from '@/components/byok/BYOKTooltips.vue';

interface Provider {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  keyFormatHint: string;
}

interface ApiKey {
  id: string;
  provider: string;
  keyHint: string;
  isActive: boolean;
  isValid: boolean;
  lastError: string | null;
  totalRequests: number;
  totalTokens: number;
  lastUsedAt: string | null;
}

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  estimatedCostCents: number;
  byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
}

interface ByokSettings {
  enabled: boolean;
  flags: {
    byokEnabled: boolean;
    byokUsesInternalCredits: boolean;
    byokOnlyMode: boolean;
  };
  hasCredits: boolean;
  hasByokKeys: boolean;
  byokProviders: string[];
  keySource: {
    source: 'internal' | 'byok' | 'error';
    reason: string;
  };
}

const $q = useQuasar();
const authStore = useAuthStore();
const byokTooltips = useBYOKTooltips();

const loading = ref(true);
const providers = ref<Provider[]>([]);
const userKeys = ref<ApiKey[]>([]);
const usageStats = ref<UsageStats | null>(null);
const settings = ref<ByokSettings | null>(null);

const keyInputs = reactive<Record<string, string>>({});
const showKey = reactive<Record<string, boolean>>({});
const saving = reactive<Record<string, boolean>>({});
const testing = reactive<Record<string, boolean>>({});
const deleting = reactive<Record<string, boolean>>({});

const showDeleteDialog = ref(false);
const deleteProviderId = ref<string | null>(null);

const isPremium = computed(() => {
  const tier = authStore.user?.subscription_tier;
  return tier === 'premium' || tier === 'lifetime';
});

const getKeyForProvider = (providerId: string) => {
  return userKeys.value.find((k) => k.provider === providerId);
};

const getProviderIcon = (providerId: string) => {
  const icons: Record<string, string> = {
    openai: 'auto_awesome',
    anthropic: 'psychology',
  };
  return icons[providerId] || 'key';
};

const getProviderClass = (providerId: string) => {
  const classes: Record<string, string> = {
    openai: 'bg-green-2 text-green-8',
    anthropic: 'bg-orange-2 text-orange-8',
  };
  return classes[providerId] || 'bg-grey-2 text-grey-8';
};

const formatTokens = (tokens: number) => {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
};

const getBannerClass = () => {
  if (!settings.value) return 'bg-grey-2';
  const { source } = settings.value.keySource;
  if (source === 'byok') return 'bg-blue-1 text-blue-10';
  if (source === 'internal') return 'bg-green-1 text-green-10';
  if (source === 'error') return 'bg-red-1 text-red-10';
  return 'bg-grey-2';
};

const getBannerIcon = () => {
  if (!settings.value) return 'info';
  const { source } = settings.value.keySource;
  if (source === 'byok') return 'vpn_key';
  if (source === 'internal') return 'account_balance_wallet';
  if (source === 'error') return 'warning';
  return 'info';
};

const getBannerIconColor = () => {
  if (!settings.value) return 'grey';
  const { source } = settings.value.keySource;
  if (source === 'byok') return 'blue-8';
  if (source === 'internal') return 'green-8';
  if (source === 'error') return 'red-8';
  return 'grey';
};

const getBannerTitle = () => {
  if (!settings.value) return 'Loading...';
  const { source } = settings.value.keySource;
  if (source === 'byok') return 'Using Your API Keys (BYOK)';
  if (source === 'internal') return 'Using Internal Credits';
  if (source === 'error') return 'Action Required';
  return 'Status Unknown';
};

const loadData = async () => {
  try {
    loading.value = true;
    const [providersRes, keysRes, usageRes, settingsRes] = await Promise.all([
      api.get('/api-keys/providers'),
      api.get('/api-keys'),
      api.get('/api-keys/usage'),
      api.get('/api-keys/settings'),
    ]);
    providers.value = providersRes.data.providers;
    userKeys.value = keysRes.data.keys;
    usageStats.value = usageRes.data;
    settings.value = settingsRes.data;
  } catch (error) {
    logError('Failed to load API keys data:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load API keys',
    });
  } finally {
    loading.value = false;
  }
};

const saveKey = async (providerId: string) => {
  const apiKey = keyInputs[providerId];
  if (!apiKey) return;

  saving[providerId] = true;
  try {
    const response = await api.post('/api-keys', { provider: providerId, apiKey });

    // Update local state
    const existingIndex = userKeys.value.findIndex((k) => k.provider === providerId);
    if (existingIndex >= 0) {
      userKeys.value[existingIndex] = response.data.key;
    } else {
      userKeys.value.push(response.data.key);
    }

    keyInputs[providerId] = '';

    $q.notify({
      type: response.data.key.isValid ? 'positive' : 'warning',
      message: response.data.key.isValid
        ? 'API key saved and validated!'
        : 'API key saved but validation failed: ' + response.data.key.lastError,
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to save API key',
    });
  } finally {
    saving[providerId] = false;
  }
};

const testKey = async (providerId: string) => {
  const key = getKeyForProvider(providerId);
  if (!key) return;

  testing[providerId] = true;
  try {
    const response = await api.post(`/api-keys/${key.id}/test`);

    // Update local state
    const existingIndex = userKeys.value.findIndex((k) => k.id === key.id);
    if (existingIndex >= 0) {
      userKeys.value[existingIndex].isValid = response.data.valid;
      userKeys.value[existingIndex].lastError = response.data.error || null;
    }

    $q.notify({
      type: response.data.valid ? 'positive' : 'warning',
      message: response.data.valid ? 'API key is valid!' : 'API key invalid: ' + response.data.error,
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to test API key',
    });
  } finally {
    testing[providerId] = false;
  }
};

const confirmDelete = (providerId: string) => {
  deleteProviderId.value = providerId;
  showDeleteDialog.value = true;
};

const deleteKey = async () => {
  if (!deleteProviderId.value) return;

  const key = getKeyForProvider(deleteProviderId.value);
  if (!key) return;

  deleting[deleteProviderId.value] = true;
  showDeleteDialog.value = false;

  try {
    await api.delete(`/api-keys/${key.id}`);
    userKeys.value = userKeys.value.filter((k) => k.id !== key.id);

    $q.notify({
      type: 'positive',
      message: 'API key removed',
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to remove API key',
    });
  } finally {
    if (deleteProviderId.value) {
      deleting[deleteProviderId.value] = false;
    }
    deleteProviderId.value = null;
  }
};

onMounted(() => {
  if (isPremium.value) {
    loadData();
  } else {
    loading.value = false;
  }
});
</script>

<style scoped>
.api-keys-page {
  max-width: 900px;
  margin: 0 auto;
}

.provider-card {
  transition: box-shadow 0.2s;
}

.provider-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.key-display {
  font-family: monospace;
}
</style>
