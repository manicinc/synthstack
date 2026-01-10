<template>
  <q-page class="integrations-page">
    <div class="page-header">
      <div class="header-content">
        <h1>Integrations</h1>
        <p>Connect your favorite tools and services to automate workflows</p>
      </div>
    </div>

    <!-- Success/Error Banners -->
    <q-banner
      v-if="successMessage"
      class="bg-positive text-white q-mb-md"
      rounded
    >
      <template #avatar>
        <q-icon name="check_circle" />
      </template>
      {{ successMessage }}
      <template #action>
        <q-btn
          flat
          label="Dismiss"
          @click="successMessage = ''"
        />
      </template>
    </q-banner>

    <q-banner
      v-if="errorMessage"
      class="bg-negative text-white q-mb-md"
      rounded
    >
      <template #avatar>
        <q-icon name="error" />
      </template>
      {{ errorMessage }}
      <template #action>
        <q-btn
          flat
          label="Dismiss"
          @click="errorMessage = ''"
        />
      </template>
    </q-banner>

    <!-- Connected Integrations -->
    <div class="section">
      <div class="section-header">
        <h3>Connected</h3>
        <q-badge
          v-if="connectedCredentials.length > 0"
          color="positive"
        >
          {{ connectedCredentials.length }}
        </q-badge>
      </div>

      <div
        v-if="loading"
        class="loading-state"
      >
        <q-spinner-dots
          color="primary"
          size="40px"
        />
      </div>

      <div
        v-else-if="connectedCredentials.length === 0"
        class="empty-state"
      >
        <q-icon
          name="link_off"
          size="48px"
          color="grey-5"
        />
        <p>No integrations connected yet</p>
        <p class="text-caption">
          Connect an integration below to get started
        </p>
      </div>

      <div
        v-else
        class="credentials-grid"
      >
        <q-card 
          v-for="cred in connectedCredentials" 
          :key="cred.id" 
          class="credential-card"
          :class="{ 'has-error': cred.error_message }"
        >
          <q-card-section>
            <div class="credential-header">
              <q-avatar
                :style="{ background: cred.color }"
                size="40px"
              >
                <q-icon
                  :name="cred.icon"
                  color="white"
                />
              </q-avatar>
              <div class="credential-info">
                <h4>{{ cred.integration_name }}</h4>
                <p>{{ cred.credential_name }}</p>
              </div>
              <q-badge :color="cred.is_active ? 'positive' : 'grey'">
                {{ cred.is_active ? 'Active' : 'Inactive' }}
              </q-badge>
            </div>

            <div
              v-if="cred.error_message"
              class="error-message q-mt-sm"
            >
              <q-icon
                name="warning"
                color="negative"
                size="16px"
              />
              <span>{{ cred.error_message }}</span>
            </div>

            <div class="credential-meta q-mt-sm">
              <span v-if="cred.last_used_at">
                <q-icon
                  name="schedule"
                  size="14px"
                />
                Last used {{ formatRelativeTime(cred.last_used_at) }}
              </span>
              <span v-if="cred.scopes?.length">
                <q-icon
                  name="security"
                  size="14px"
                />
                {{ cred.scopes.length }} scope{{ cred.scopes.length > 1 ? 's' : '' }}
              </span>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions>
            <q-btn 
              flat 
              dense 
              icon="refresh" 
              label="Test" 
              :loading="testing === cred.id"
              @click="testCredential(cred)"
            />
            <q-btn 
              v-if="cred.refresh_token"
              flat 
              dense 
              icon="sync" 
              label="Refresh" 
              :loading="refreshing === cred.id"
              @click="refreshCredential(cred)"
            />
            <q-space />
            <q-btn 
              flat 
              dense 
              icon="delete" 
              color="negative" 
              @click="deleteCredential(cred)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Available Integrations -->
    <div class="section">
      <div class="section-header">
        <h3>Available Integrations</h3>
        <q-input 
          v-model="searchQuery" 
          placeholder="Search integrations..." 
          dense 
          outlined 
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <div class="integrations-grid">
        <q-card 
          v-for="integration in filteredIntegrations" 
          :key="integration.id" 
          class="integration-card"
          :class="{ 'is-connected': isConnected(integration.id) }"
        >
          <q-card-section>
            <div class="integration-header">
              <q-avatar
                :style="{ background: integration.color }"
                size="48px"
              >
                <q-icon
                  :name="integration.icon"
                  color="white"
                  size="24px"
                />
              </q-avatar>
              <q-badge
                v-if="isConnected(integration.id)"
                color="positive"
                floating
              >
                <q-icon
                  name="check"
                  size="12px"
                />
              </q-badge>
            </div>
            <h4>{{ integration.name }}</h4>
            <p>{{ integration.description }}</p>
            <div class="auth-badge">
              <q-chip 
                :icon="integration.auth_type === 'oauth2' ? 'lock' : 'vpn_key'" 
                size="sm"
                dense
              >
                {{ integration.auth_type === 'oauth2' ? 'OAuth' : 'API Key' }}
              </q-chip>
            </div>
          </q-card-section>

          <q-card-actions>
            <q-btn 
              v-if="!isConnected(integration.id)"
              color="primary" 
              :label="integration.auth_type === 'oauth2' ? 'Connect' : 'Add Key'"
              :icon="integration.auth_type === 'oauth2' ? 'link' : 'add'"
              :loading="connecting === integration.id"
              @click="connectIntegration(integration)"
            />
            <q-btn 
              v-else
              flat 
              color="primary" 
              label="Manage"
              icon="settings"
              @click="manageIntegration(integration)"
            />
            <q-btn 
              flat 
              icon="open_in_new" 
              :href="integration.documentation_url" 
              target="_blank"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- API Key Dialog -->
    <q-dialog
      v-model="showApiKeyDialog"
      persistent
    >
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            <q-avatar
              :style="{ background: selectedIntegration?.color }"
              size="32px"
              class="q-mr-sm"
            >
              <q-icon
                :name="selectedIntegration?.icon"
                color="white"
              />
            </q-avatar>
            Add {{ selectedIntegration?.name }} API Key
          </div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveApiKey">
            <q-input 
              v-model="apiKeyForm.credential_name" 
              label="Connection Name"
              placeholder="e.g., Production API Key"
              outlined 
              class="q-mb-md"
              :rules="[val => !!val || 'Name is required']"
            />
            
            <q-input 
              v-model="apiKeyForm.api_key" 
              label="API Key"
              :type="showApiKey ? 'text' : 'password'"
              outlined 
              class="q-mb-md"
              :rules="[val => !!val || 'API Key is required']"
            >
              <template #append>
                <q-icon 
                  :name="showApiKey ? 'visibility_off' : 'visibility'" 
                  class="cursor-pointer"
                  @click="showApiKey = !showApiKey"
                />
              </template>
            </q-input>

            <q-input 
              v-if="selectedIntegration?.id === 'twilio'"
              v-model="apiKeyForm.api_secret" 
              label="API Secret / Auth Token"
              :type="showApiSecret ? 'text' : 'password'"
              outlined 
              class="q-mb-md"
            >
              <template #append>
                <q-icon 
                  :name="showApiSecret ? 'visibility_off' : 'visibility'" 
                  class="cursor-pointer"
                  @click="showApiSecret = !showApiSecret"
                />
              </template>
            </q-input>

            <div class="text-caption text-grey q-mb-md">
              <q-icon
                name="info"
                size="14px"
              />
              Your credentials are encrypted and stored securely.
              <a
                :href="selectedIntegration?.documentation_url"
                target="_blank"
              >
                Learn how to get your API key →
              </a>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn 
            color="primary" 
            label="Save" 
            :loading="saving"
            @click="saveApiKey"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- OAuth Scopes Dialog -->
    <q-dialog
      v-model="showScopesDialog"
      persistent
    >
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">
            <q-avatar
              :style="{ background: selectedIntegration?.color }"
              size="32px"
              class="q-mr-sm"
            >
              <q-icon
                :name="selectedIntegration?.icon"
                color="white"
              />
            </q-avatar>
            Connect {{ selectedIntegration?.name }}
          </div>
        </q-card-section>

        <q-card-section>
          <p class="text-body2 q-mb-md">
            You'll be redirected to {{ selectedIntegration?.name }} to authorize access.
            Select the permissions you want to grant:
          </p>

          <q-list
            bordered
            separator
            class="rounded-borders"
          >
            <q-item 
              v-for="scope in availableScopes" 
              :key="scope.value"
              tag="label"
              clickable
            >
              <q-item-section avatar>
                <q-checkbox
                  v-model="selectedScopes"
                  :val="scope.value"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.label }}</q-item-label>
                <q-item-label caption>
                  {{ scope.description }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn 
            color="primary" 
            label="Authorize" 
            icon="launch"
            :loading="connecting === selectedIntegration?.id"
            @click="startOAuth"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from 'src/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

const $q = useQuasar()
const route = useRoute()

// State
const loading = ref(true)
const integrationTypes = ref<any[]>([])
const credentials = ref<any[]>([])
const searchQuery = ref('')

const showApiKeyDialog = ref(false)
const showScopesDialog = ref(false)
const selectedIntegration = ref<any>(null)
const selectedScopes = ref<string[]>([])

const connecting = ref<string | null>(null)
const testing = ref<string | null>(null)
const refreshing = ref<string | null>(null)
const saving = ref(false)

const showApiKey = ref(false)
const showApiSecret = ref(false)

const successMessage = ref('')
const errorMessage = ref('')

const apiKeyForm = ref({
  credential_name: '',
  api_key: '',
  api_secret: ''
})

// Computed
const connectedCredentials = computed(() => credentials.value)

const filteredIntegrations = computed(() => {
  if (!searchQuery.value) return integrationTypes.value
  const query = searchQuery.value.toLowerCase()
  return integrationTypes.value.filter(i => 
    i.name.toLowerCase().includes(query) || 
    i.description.toLowerCase().includes(query)
  )
})

const availableScopes = computed(() => {
  if (!selectedIntegration.value) return []
  
  // Scope descriptions for common integrations
  const scopeDescriptions: Record<string, Record<string, { label: string; description: string }>> = {
    slack: {
      'chat:write': { label: 'Send Messages', description: 'Post messages to channels and DMs' },
      'channels:read': { label: 'Read Channels', description: 'View channel information' },
      'files:write': { label: 'Upload Files', description: 'Upload files to Slack' }
    },
    google: {
      'https://www.googleapis.com/auth/gmail.send': { label: 'Send Email', description: 'Send emails on your behalf' },
      'https://www.googleapis.com/auth/spreadsheets': { label: 'Google Sheets', description: 'Read and write spreadsheets' },
      'https://www.googleapis.com/auth/drive.file': { label: 'Google Drive', description: 'Access files you create or open' }
    },
    notion: {
      'read_content': { label: 'Read Content', description: 'Read pages and databases' },
      'update_content': { label: 'Update Content', description: 'Edit pages and databases' }
    },
    github: {
      'repo': { label: 'Repository Access', description: 'Full control of repositories' },
      'workflow': { label: 'Workflows', description: 'Update GitHub Actions workflows' }
    },
    jira: {
      'read:jira-work': { label: 'Read Issues', description: 'View Jira issues and projects' },
      'write:jira-work': { label: 'Write Issues', description: 'Create and update issues' }
    },
    discord: {
      'bot': { label: 'Bot Access', description: 'Add bot to servers' },
      'applications.commands': { label: 'Slash Commands', description: 'Create slash commands' }
    }
  }

  const integration = selectedIntegration.value
  const scopes = integration.default_scopes || []
  const descriptions = scopeDescriptions[integration.id] || {}

  return scopes.map((scope: string) => ({
    value: scope,
    label: descriptions[scope]?.label || scope,
    description: descriptions[scope]?.description || ''
  }))
})

// Methods
function isConnected(integrationId: string): boolean {
  return credentials.value.some(c => c.integration_type === integrationId && c.is_active)
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

async function connectIntegration(integration: any) {
  selectedIntegration.value = integration

  if (integration.auth_type === 'oauth2') {
    selectedScopes.value = [...(integration.default_scopes || [])]
    showScopesDialog.value = true
  } else {
    apiKeyForm.value = {
      credential_name: `${integration.name} API Key`,
      api_key: '',
      api_secret: ''
    }
    showApiKeyDialog.value = true
  }
}

async function startOAuth() {
  if (!selectedIntegration.value) return

  connecting.value = selectedIntegration.value.id

  try {
    const response = await api.post('/api/v1/integrations/oauth/authorize', {
      integration_type: selectedIntegration.value.id,
      scopes: selectedScopes.value
    })

    if (response.data.data?.authorization_url) {
      // Redirect to OAuth provider
      window.location.href = response.data.data.authorization_url
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error?.message || 'Failed to start OAuth flow'
    })
  } finally {
    connecting.value = null
    showScopesDialog.value = false
  }
}

async function saveApiKey() {
  if (!selectedIntegration.value || !apiKeyForm.value.api_key) return

  saving.value = true

  try {
    await api.post('/api/v1/integrations/credentials/api-key', {
      integration_type: selectedIntegration.value.id,
      credential_name: apiKeyForm.value.credential_name,
      api_key: apiKeyForm.value.api_key,
      api_secret: apiKeyForm.value.api_secret || undefined
    })

    $q.notify({ type: 'positive', message: 'API key saved successfully' })
    showApiKeyDialog.value = false
    await loadCredentials()
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error?.message || 'Failed to save API key'
    })
  } finally {
    saving.value = false
  }
}

async function testCredential(credential: any) {
  testing.value = credential.id

  try {
    const response = await api.post(`/api/v1/integrations/credentials/${credential.id}/test`)
    
    if (response.data.data?.success) {
      $q.notify({ type: 'positive', message: response.data.data.message })
      credential.error_message = null
    } else {
      $q.notify({ type: 'negative', message: response.data.data?.message || 'Test failed' })
      credential.error_message = response.data.data?.message
    }
  } catch (error: any) {
    const message = error.response?.data?.error?.message || 'Test failed'
    $q.notify({ type: 'negative', message })
    credential.error_message = message
  } finally {
    testing.value = null
  }
}

async function refreshCredential(credential: any) {
  refreshing.value = credential.id

  try {
    await api.post(`/api/v1/integrations/credentials/${credential.id}/refresh`)
    $q.notify({ type: 'positive', message: 'Token refreshed successfully' })
    credential.error_message = null
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error?.message || 'Failed to refresh token'
    })
  } finally {
    refreshing.value = null
  }
}

async function deleteCredential(credential: any) {
  $q.dialog({
    title: 'Remove Integration',
    message: `Are you sure you want to remove "${credential.credential_name}"? Workflows using this integration will stop working.`,
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(async () => {
    try {
      await api.delete(`/api/v1/integrations/credentials/${credential.id}`)
      credentials.value = credentials.value.filter(c => c.id !== credential.id)
      $q.notify({ type: 'positive', message: 'Integration removed' })
    } catch (error: any) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.error?.message || 'Failed to remove integration'
      })
    }
  })
}

function manageIntegration(integration: any) {
  // Filter to show only credentials for this integration
  const creds = credentials.value.filter(c => c.integration_type === integration.id)
  
  $q.dialog({
    title: `${integration.name} Connections`,
    message: creds.map(c => `• ${c.credential_name}`).join('\n'),
    ok: true
  })
}

async function loadIntegrationTypes() {
  try {
    const response = await api.get('/api/v1/integrations/types')
    integrationTypes.value = response.data.data?.types || []
  } catch (error) {
    logError('Failed to load integration types:', error)
  }
}

async function loadCredentials() {
  try {
    const response = await api.get('/api/v1/integrations/credentials')
    credentials.value = response.data.data?.credentials || []
  } catch (error) {
    logError('Failed to load credentials:', error)
  }
}

onMounted(async () => {
  // Check for OAuth callback params
  const success = route.query.success as string
  const error = route.query.error as string

  if (success) {
    successMessage.value = `Successfully connected ${success}!`
  } else if (error) {
    errorMessage.value = decodeURIComponent(error)
  }

  await Promise.all([
    loadIntegrationTypes(),
    loadCredentials()
  ])
  
  loading.value = false
})
</script>

<style lang="scss" scoped>
.integrations-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
  
  h1 {
    margin: 0 0 4px 0;
    font-size: 28px;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    color: var(--q-grey-6);
  }
}

.section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .search-input {
    width: 250px;
  }
}

.credentials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.credential-card {
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &.has-error {
    border-left: 3px solid var(--q-negative);
  }
  
  .credential-header {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .credential-info {
      flex: 1;
      
      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      p {
        margin: 0;
        font-size: 13px;
        color: var(--q-grey-6);
      }
    }
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(var(--q-negative-rgb), 0.1);
    border-radius: 4px;
    font-size: 12px;
    color: var(--q-negative);
  }
  
  .credential-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--q-grey-6);
    
    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.integration-card {
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &.is-connected {
    border: 2px solid var(--q-positive);
  }
  
  .integration-header {
    position: relative;
    width: fit-content;
    margin-bottom: 12px;
  }
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  p {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--q-grey-6);
    line-height: 1.4;
  }
  
  .auth-badge {
    margin-top: auto;
  }
}

.empty-state {
  text-align: center;
  padding: 48px;
  background: var(--q-grey-2);
  border-radius: 8px;
  
  p {
    margin: 12px 0 0;
    color: var(--q-grey-7);
    
    &.text-caption {
      color: var(--q-grey-5);
    }
  }
}

.loading-state {
  text-align: center;
  padding: 48px;
}

// Dark mode adjustments
.body--dark {
  .empty-state {
    background: var(--q-dark-page);
  }
  
  .credential-card.has-error {
    border-left-color: var(--q-negative);
  }
}
</style>


