<template>
  <q-page class="ai-settings-page">
    <div class="page-header">
      <div class="header-content">
        <h1>AI Settings</h1>
        <p>Configure AI model preferences and behavior</p>
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

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <q-spinner-dots
        color="primary"
        size="40px"
      />
      <p>Loading settings...</p>
    </div>

    <!-- Settings Form -->
    <div
      v-else
      data-testid="ai-settings-form"
      class="settings-form"
    >
      <!-- Model Selection -->
      <div class="section">
        <div class="section-header">
          <h3>
            <q-icon name="smart_toy" class="q-mr-sm" />
            Model Selection
          </h3>
        </div>

        <q-card class="settings-card">
          <q-card-section>
            <div class="setting-row">
              <div class="setting-label" data-testid="temperature-label">
                <h4>Model Tier</h4>
                <p>Choose your preferred AI model tier</p>
              </div>
              <div data-testid="model-select" class="model-selector">
                <q-btn-toggle
                  v-model="formData.globalModelTier"
                  toggle-color="primary"
                  :options="modelTierOptions"
                  spread
                />
              </div>
            </div>

            <div class="tier-descriptions q-mt-md">
              <div
                v-for="tier in modelTierOptions"
                :key="tier.value"
                class="tier-description"
                :class="{ active: formData.globalModelTier === tier.value }"
                data-testid="model-option"
              >
                <q-badge
                  :color="getTierColor(tier.value)"
                  class="q-mr-sm"
                  data-testid="tier-badge"
                >
                  {{ tier.label }}
                </q-badge>
                <span class="text-caption">{{ tier.description }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Inference Settings -->
      <div class="section">
        <div class="section-header">
          <h3>
            <q-icon name="tune" class="q-mr-sm" />
            Inference Settings
          </h3>
        </div>

        <q-card class="settings-card">
          <q-card-section>
            <!-- Temperature -->
            <div class="setting-row">
              <div class="setting-label" data-testid="temperature-label">
                <h4>Temperature</h4>
                <p>Controls randomness in responses (0 = focused, 1 = creative)</p>
              </div>
              <div class="setting-control" data-testid="temperature-slider">
                <q-slider
                  v-model="formData.defaultTemperature"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  label
                  :label-value="formData.defaultTemperature?.toFixed(2)"
                  color="primary"
                />
                <div class="slider-labels">
                  <span>Focused (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- Max Context Tokens -->
            <div class="setting-row">
              <div class="setting-label">
                <h4>Max Context Tokens</h4>
                <p>Maximum tokens for conversation context</p>
              </div>
              <div class="setting-control" data-testid="context-tokens-input">
                <q-input
                  v-model.number="formData.maxContextTokens"
                  type="number"
                  outlined
                  dense
                  :min="1000"
                  :max="128000"
                  suffix="tokens"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Context & RAG Settings -->
      <div class="section">
        <div class="section-header">
          <h3>
            <q-icon name="psychology" class="q-mr-sm" />
            Context & RAG
          </h3>
        </div>

        <q-card class="settings-card">
          <q-card-section>
            <!-- Include Project Context -->
            <div class="setting-row toggle-row">
              <div class="setting-label">
                <h4>Include Project Context</h4>
                <p>Include relevant project documents in AI conversations</p>
              </div>
              <q-toggle
                v-model="formData.includeProjectContext"
                color="primary"
                data-testid="include-context-toggle"
              />
            </div>

            <q-separator class="q-my-md" />

            <!-- Stream Responses -->
            <div class="setting-row toggle-row">
              <div class="setting-label">
                <h4>Stream Responses</h4>
                <p>Show AI responses as they are generated</p>
              </div>
              <q-toggle
                v-model="formData.streamResponses"
                color="primary"
                data-testid="stream-toggle"
              />
            </div>

            <q-separator class="q-my-md" />

            <!-- Show Reasoning -->
            <div class="setting-row toggle-row">
              <div class="setting-label">
                <h4>Show Reasoning</h4>
                <p>Display the AI's thought process (when available)</p>
              </div>
              <q-toggle
                v-model="formData.showReasoning"
                color="primary"
                data-testid="reasoning-toggle"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Agent Overrides (Future) -->
      <div class="section" data-testid="agent-overrides">
        <div class="section-header">
          <h3>
            <q-icon name="settings_suggest" class="q-mr-sm" />
            Agent Overrides
          </h3>
          <q-btn
            flat
            dense
            icon="add"
            label="Add Override"
            color="primary"
            data-testid="add-override-button"
            @click="showAddOverrideDialog = true"
          />
        </div>

        <q-card class="settings-card">
          <q-card-section>
            <div
              v-if="Object.keys(formData.agentModelOverrides || {}).length === 0"
              class="empty-state"
            >
              <q-icon
                name="tune"
                size="32px"
                color="grey-5"
              />
              <p class="text-caption">No agent-specific overrides configured</p>
              <p class="text-caption text-grey-6">
                Configure different models for specific AI agents
              </p>
            </div>
            <div v-else class="overrides-list">
              <div
                v-for="(model, agent) in formData.agentModelOverrides"
                :key="agent"
                class="override-item"
              >
                <span class="agent-name">{{ agent }}</span>
                <span class="model-name">{{ model }}</span>
                <q-btn
                  flat
                  dense
                  icon="delete"
                  color="negative"
                  size="sm"
                  @click="removeOverride(agent as string)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <q-btn
          outline
          label="Reset to Defaults"
          icon="refresh"
          data-testid="reset-defaults"
          @click="resetToDefaults"
        />
        <q-btn
          color="primary"
          label="Save Changes"
          icon="save"
          :loading="saving"
          data-testid="save-settings"
          @click="saveSettings"
        />
      </div>
    </div>

    <!-- Add Override Dialog -->
    <q-dialog v-model="showAddOverrideDialog">
      <q-card class="override-dialog" data-testid="override-form">
        <q-card-section>
          <div class="text-h6">Add Agent Override</div>
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="newOverride.agent"
            :options="availableAgents"
            label="Agent"
            outlined
            emit-value
            map-options
          />
          <q-select
            v-model="newOverride.model"
            :options="availableModels"
            label="Model"
            outlined
            class="q-mt-md"
            emit-value
            map-options
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            v-close-popup
          />
          <q-btn
            color="primary"
            label="Add"
            :disable="!newOverride.agent || !newOverride.model"
            @click="addOverride"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { users, type AISettings } from 'src/services/api'

const $q = useQuasar()

// State
const loading = ref(true)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showAddOverrideDialog = ref(false)

// Form data
const formData = reactive<Partial<AISettings>>({
  globalModel: null,
  globalModelTier: 'standard',
  agentModelOverrides: {},
  defaultTemperature: 0.7,
  maxContextTokens: 8000,
  includeProjectContext: true,
  streamResponses: true,
  showReasoning: false
})

// New override form
const newOverride = reactive({
  agent: '',
  model: ''
})

// Model tier options
const modelTierOptions = [
  {
    label: 'Cheap',
    value: 'cheap' as const,
    description: 'Fast & cost-effective for simple tasks'
  },
  {
    label: 'Standard',
    value: 'standard' as const,
    description: 'Balanced performance for most use cases'
  },
  {
    label: 'Premium',
    value: 'premium' as const,
    description: 'Best quality for complex tasks'
  }
]

// Available agents for overrides
const availableAgents = [
  { label: 'Chat Copilot', value: 'copilot' },
  { label: 'Document Analysis', value: 'document' },
  { label: 'Code Assistant', value: 'code' },
  { label: 'Strategy Planner', value: 'strategy' }
]

// Available models for overrides
const availableModels = [
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
]

// Get tier color
function getTierColor(tier: string): string {
  switch (tier) {
    case 'cheap':
      return 'green'
    case 'standard':
      return 'primary'
    case 'premium':
      return 'purple'
    default:
      return 'grey'
  }
}

// Load settings
async function loadSettings() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await users.getAISettings()
    if (response.data) {
      Object.assign(formData, response.data)
    }
  } catch (error: unknown) {
    const err = error as Error
    errorMessage.value = err.message || 'Failed to load settings'
    $q.notify({
      type: 'negative',
      message: errorMessage.value
    })
  } finally {
    loading.value = false
  }
}

// Save settings
async function saveSettings() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await users.updateAISettings(formData)
    successMessage.value = 'Settings saved successfully'
    $q.notify({
      type: 'positive',
      message: successMessage.value
    })
  } catch (error: unknown) {
    const err = error as Error
    errorMessage.value = err.message || 'Failed to save settings'
    $q.notify({
      type: 'negative',
      message: errorMessage.value
    })
  } finally {
    saving.value = false
  }
}

// Reset to defaults
function resetToDefaults() {
  $q.dialog({
    title: 'Reset to Defaults',
    message: 'Are you sure you want to reset all AI settings to their default values?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    formData.globalModel = null
    formData.globalModelTier = 'standard'
    formData.agentModelOverrides = {}
    formData.defaultTemperature = 0.7
    formData.maxContextTokens = 8000
    formData.includeProjectContext = true
    formData.streamResponses = true
    formData.showReasoning = false

    $q.notify({
      type: 'info',
      message: 'Settings reset to defaults. Click Save to apply.'
    })
  })
}

// Add override
function addOverride() {
  if (newOverride.agent && newOverride.model) {
    if (!formData.agentModelOverrides) {
      formData.agentModelOverrides = {}
    }
    formData.agentModelOverrides[newOverride.agent] = newOverride.model
    newOverride.agent = ''
    newOverride.model = ''
    showAddOverrideDialog.value = false
  }
}

// Remove override
function removeOverride(agent: string) {
  if (formData.agentModelOverrides) {
    delete formData.agentModelOverrides[agent]
  }
}

// Load on mount
onMounted(() => {
  loadSettings()
})
</script>

<style lang="scss" scoped>
.ai-settings-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;

  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  p {
    color: var(--q-grey-7);
    margin: 0;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
  color: var(--q-grey-6);
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
  }
}

.settings-card {
  border-radius: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;

  &.toggle-row {
    align-items: center;
  }
}

.setting-label {
  flex: 1;

  h4 {
    font-size: 0.95rem;
    font-weight: 500;
    margin: 0 0 4px 0;
  }

  p {
    font-size: 0.85rem;
    color: var(--q-grey-6);
    margin: 0;
  }
}

.setting-control {
  flex: 1;
  max-width: 300px;
}

.model-selector {
  flex: 1;
  max-width: 400px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--q-grey-6);
  margin-top: 4px;
}

.tier-descriptions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tier-description {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--q-grey-2);
  opacity: 0.6;
  transition: opacity 0.2s, background 0.2s;

  &.active {
    opacity: 1;
    background: var(--q-primary-light, rgba(var(--q-primary-rgb), 0.1));
  }
}

.body--dark {
  .tier-description {
    background: var(--q-grey-9);

    &.active {
      background: rgba(var(--q-primary-rgb), 0.2);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  p {
    margin: 8px 0 0 0;
  }
}

.overrides-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.override-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--q-grey-2);
  border-radius: 8px;

  .agent-name {
    font-weight: 500;
    flex: 1;
  }

  .model-name {
    color: var(--q-grey-7);
    font-size: 0.9rem;
  }
}

.body--dark .override-item {
  background: var(--q-grey-9);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--q-grey-3);
}

.body--dark .action-buttons {
  border-top-color: var(--q-grey-8);
}

.override-dialog {
  min-width: 400px;
}

@media (max-width: 600px) {
  .ai-settings-page {
    padding: 16px;
  }

  .setting-row {
    flex-direction: column;
    gap: 12px;

    &.toggle-row {
      flex-direction: row;
    }
  }

  .setting-control,
  .model-selector {
    max-width: 100%;
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;

    .q-btn {
      width: 100%;
    }
  }
}
</style>
