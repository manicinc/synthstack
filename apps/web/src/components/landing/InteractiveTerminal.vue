<script setup lang="ts">
/**
 * InteractiveTerminal Component
 *
 * CLI-style branding wizard for SynthStack Community Edition.
 * Users interact with the terminal to configure their brand and export a config.json.
 *
 * Flow:
 * 1. Boot animation sequence
 * 2. Welcome message
 * 3. Step-by-step prompts (app name, domain, colors, etc.)
 * 4. Live JSON preview
 * 5. Download/Copy + docs link
 */
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const themeStore = useThemeStore()

// Terminal state
type TerminalPhase = 'boot' | 'welcome' | 'prompts' | 'complete'
const phase = ref<TerminalPhase>('boot')
const bootLines = ref<string[]>([])
const currentStep = ref(0)
const userInput = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const terminalRef = ref<HTMLElement | null>(null)
const showPreview = ref(false)
const isTyping = ref(false)

// History of completed prompts
const history = ref<Array<{ prompt: string; value: string }>>([])

// Config data - FULL config.json structure for true dogfooding
// User inputs populate derived fields throughout the config
const config = reactive({
  app: {
    name: 'MyApp',
    tagline: 'Your AI Co-Founders',
    description: 'AI-native, cross-platform SaaS boilerplate built with Vue Quasar.',
    fullDescription: 'Meet your AI co-founders: 6 specialized agents with deep system integration, automatic RAG, proactive suggestions, and actionable capabilities.',
    domain: 'myapp.com',
    version: '1.0.0'
  },
  branding: {
    logo: {
      light: '/logo/synthstack-logo.svg',
      dark: '/logo/synthstack-logo-dark.svg',
      mark: '/logo/synthstack-mark.svg',
      markDark: '/logo/synthstack-mark-dark.svg'
    },
    favicon: {
      default: '/favicon.svg',
      dark: '/favicon-dark.svg',
      apple: '/icons/icon-192x192.png'
    },
    colors: {
      primary: '#6366F1',
      accent: '#00D4AA',
      theme: '#6366F1',
      background: '#0D0D0D'
    },
    og: {
      image: '/og-image.svg',
      type: 'website'
    }
  },
  company: {
    name: 'My Company',
    legalName: 'My Company LLC',
    founded: '2024',
    location: {
      address: '123 Main Street, Suite 100',
      city: 'Your City',
      state: 'ST',
      zip: '00000',
      country: 'USA'
    },
    phone: '(000) 000-0000',
    parentCompany: null
  },
  contact: {
    support: 'support@myapp.com',
    sales: 'sales@myapp.com',
    general: 'hello@myapp.com',
    noreply: 'noreply@myapp.com',
    phone: '(000) 000-0000'
  },
  social: {
    github: 'https://github.com/myorg/myapp',
    twitter: null,
    discord: null,
    linkedin: null,
    youtube: null
  },
  links: {
    docs: '/docs',
    changelog: '/changelog',
    roadmap: '/roadmap',
    status: null
  },
  legal: {
    privacy: '/privacy',
    terms: '/terms',
    cookies: '/cookies',
    security: '/security',
    gdpr: '/gdpr'
  },
  demo: {
    enabled: false,
    email: 'demo@myapp.com',
    password: 'ChangeMe123!'
  },
  infrastructure: {
    containerPrefix: 'myapp',
    networkName: 'myapp-network',
    databaseName: 'myapp',
    subdomains: {
      api: 'api',
      admin: 'admin',
      traefik: 'traefik'
    },
    ports: {
      web: 3050,
      api: 3003,
      directus: 8099,
      postgres: 5499,
      redis: 6399,
      qdrant: 6333,
      mlService: 8001
    }
  },
  github: {
    orgName: 'myorg',
    proRepoName: 'myapp',
    communityRepoName: 'myapp',
    teamSlug: null
  },
  features: {
    copilot: false,
    referrals: false,
    analytics: true,
    i18n: true
  }
})

// Derive related fields from user input
function updateDerivedFields() {
  const name = config.app.name
  const domain = config.app.domain
  const org = config.github.orgName
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Domain-based derivations
  config.contact.sales = `sales@${domain}`
  config.contact.general = `hello@${domain}`
  config.contact.noreply = `noreply@${domain}`
  config.demo.email = `demo@${domain}`

  // GitHub derivations
  config.social.github = `https://github.com/${org}/${slug}`
  config.github.proRepoName = slug
  config.github.communityRepoName = slug

  // Infrastructure derivations
  config.infrastructure.containerPrefix = slug
  config.infrastructure.networkName = `${slug}-network`
  config.infrastructure.databaseName = slug

  // Company derivations
  config.company.name = name
  config.company.legalName = `${name} LLC`

  // Theme color sync
  config.branding.colors.theme = config.branding.colors.primary
}

// Wizard steps
const steps = [
  {
    key: 'app.name',
    prompt: 'What\'s your app name?',
    placeholder: 'MyApp',
    hint: 'The display name for your application'
  },
  {
    key: 'app.domain',
    prompt: 'What\'s your domain?',
    placeholder: 'myapp.com',
    hint: 'Your production domain (without https://)'
  },
  {
    key: 'branding.colors.primary',
    prompt: 'Primary brand color (hex)?',
    placeholder: '#6366F1',
    hint: 'Main brand color, e.g. #6366F1'
  },
  {
    key: 'branding.colors.accent',
    prompt: 'Accent color (hex)?',
    placeholder: '#00D4AA',
    hint: 'Secondary accent color'
  },
  {
    key: 'contact.support',
    prompt: 'Support email?',
    placeholder: 'support@myapp.com',
    hint: 'Customer support email address'
  },
  {
    key: 'github.orgName',
    prompt: 'GitHub org/username?',
    placeholder: 'myorg',
    hint: 'For repository links'
  }
]

// Boot sequence messages
const bootSequence = [
  '> Initializing SynthStack CLI v1.0.0...',
  '> Loading configuration modules...',
  '> Connecting to branding engine...',
  '> Ready.'
]

// Current step info
const currentStepInfo = computed(() => steps[currentStep.value] || null)

// Generate JSON for preview
const configJson = computed(() => JSON.stringify(config, null, 2))

// Set nested value in config object
function setNestedValue(obj: any, path: string, value: string) {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
}

// Get nested value from config object
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    current = current[key]
  }
  return current
}

// Run boot sequence
async function runBootSequence() {
  phase.value = 'boot'
  bootLines.value = []

  for (const line of bootSequence) {
    await sleep(400)
    bootLines.value.push(line)
    scrollToBottom()
  }

  await sleep(600)
  phase.value = 'welcome'

  await sleep(1200)
  phase.value = 'prompts'
  await nextTick()
  focusInput()
}

// Handle user input submission
function handleSubmit() {
  if (phase.value !== 'prompts' || !currentStepInfo.value) return

  const step = currentStepInfo.value
  const value = userInput.value.trim() || step.placeholder

  // Store in history
  history.value.push({
    prompt: step.prompt,
    value: value
  })

  // Update config
  setNestedValue(config, step.key, value)

  // Clear input and advance
  userInput.value = ''
  currentStep.value++

  // Check if complete
  if (currentStep.value >= steps.length) {
    // Derive all related fields from user input
    updateDerivedFields()
    phase.value = 'complete'
    showPreview.value = true
  }

  scrollToBottom()
  nextTick(() => focusInput())
}

// Handle key press
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  }
}

// Reset wizard
function resetWizard() {
  phase.value = 'boot'
  currentStep.value = 0
  userInput.value = ''
  history.value = []
  showPreview.value = false

  // Reset config to defaults (core user-editable fields)
  config.app.name = 'MyApp'
  config.app.domain = 'myapp.com'
  config.branding.colors.primary = '#6366F1'
  config.branding.colors.accent = '#00D4AA'
  config.contact.support = 'support@myapp.com'
  config.github.orgName = 'myorg'

  // Reset derived fields
  config.contact.sales = 'sales@myapp.com'
  config.contact.general = 'hello@myapp.com'
  config.contact.noreply = 'noreply@myapp.com'
  config.demo.email = 'demo@myapp.com'
  config.social.github = 'https://github.com/myorg/myapp'
  config.github.proRepoName = 'myapp'
  config.github.communityRepoName = 'myapp'
  config.infrastructure.containerPrefix = 'myapp'
  config.infrastructure.networkName = 'myapp-network'
  config.infrastructure.databaseName = 'myapp'
  config.company.name = 'My Company'
  config.company.legalName = 'My Company LLC'
  config.branding.colors.theme = '#6366F1'

  runBootSequence()
}

// Download config.json
function downloadConfig() {
  const blob = new Blob([configJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'config.json'
  a.click()
  URL.revokeObjectURL(url)

  $q.notify({
    type: 'positive',
    message: 'config.json downloaded!',
    timeout: 2000
  })
}

// Copy config to clipboard
async function copyConfig() {
  try {
    await navigator.clipboard.writeText(configJson.value)
    $q.notify({
      type: 'positive',
      message: 'Config copied to clipboard!',
      timeout: 2000
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to copy',
      timeout: 2000
    })
  }
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function focusInput() {
  inputRef.value?.focus({ preventScroll: true })
}

function scrollToBottom() {
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  })
}

// Lifecycle
onMounted(() => {
  runBootSequence()
})

// Keep terminal scrolled to bottom
watch([bootLines, history, currentStep], () => {
  scrollToBottom()
})
</script>

<template>
  <div
    class="interactive-terminal"
    :class="{ 'light-mode': !themeStore.isDark }"
    @click="focusInput"
  >
    <!-- Terminal Window Chrome -->
    <div class="terminal-header">
      <div class="window-controls">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>
      <span class="terminal-title">synthstack config wizard</span>
      <button
        v-if="phase === 'complete'"
        class="reset-btn"
        @click="resetWizard"
        title="Start over"
      >
        <q-icon name="refresh" size="14px" />
      </button>
    </div>

    <!-- Terminal Content - Click anywhere to focus input -->
    <div ref="terminalRef" class="terminal-body" @click="focusInput">
      <!-- Boot Sequence -->
      <div v-if="phase === 'boot' || bootLines.length > 0" class="boot-section">
        <div
          v-for="(line, i) in bootLines"
          :key="i"
          class="boot-line"
          :class="{ 'ready': line.includes('Ready') }"
        >
          {{ line }}
        </div>
      </div>

      <!-- Welcome Message -->
      <Transition name="fade">
        <div v-if="phase !== 'boot'" class="welcome-section">
          <div class="welcome-banner">
            <span class="checkmark">✓</span>
            Welcome to SynthStack Community Edition!
          </div>
          <div class="welcome-subtitle">
            Let's configure your brand. Press Enter for defaults.
          </div>
        </div>
      </Transition>

      <!-- Completed Prompts History -->
      <div v-if="history.length > 0" class="history-section">
        <div
          v-for="(item, i) in history"
          :key="i"
          class="history-item"
        >
          <span class="prompt-symbol">?</span>
          <span class="prompt-text">{{ item.prompt }}</span>
          <span class="prompt-value">{{ item.value }}</span>
        </div>
      </div>

      <!-- Current Prompt -->
      <div v-if="phase === 'prompts' && currentStepInfo" class="prompt-section">
        <div class="prompt-row">
          <span class="prompt-symbol active">?</span>
          <span class="prompt-text">{{ currentStepInfo.prompt }}</span>
        </div>
        <div class="input-row">
          <span class="input-prefix">›</span>
          <input
            ref="inputRef"
            v-model="userInput"
            type="text"
            class="terminal-input"
            :placeholder="currentStepInfo.placeholder"
            spellcheck="false"
            autocomplete="off"
            @keydown="handleKeyDown"
          />
        </div>
        <div class="hint-text">(default: {{ currentStepInfo.placeholder }})</div>
      </div>

      <!-- Completion State -->
      <Transition name="fade">
        <div v-if="phase === 'complete'" class="complete-section">
          <div class="complete-banner">
            <q-icon name="check_circle" size="24px" color="positive" />
            <span>Configuration complete!</span>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button class="action-btn primary" @click="downloadConfig">
              <q-icon name="download" size="18px" />
              Download config.json
            </button>
            <button class="action-btn secondary" @click="copyConfig">
              <q-icon name="content_copy" size="18px" />
              Copy
            </button>
          </div>

          <!-- Links to guides and full wizard -->
          <div class="help-links">
            <router-link
              to="/app/setup/branding"
              class="docs-link wizard-link"
            >
              <q-icon name="tune" size="16px" />
              Open Full Wizard →
            </router-link>
            <a
              href="https://github.com/manicinc/synthstack#readme"
              target="_blank"
              rel="noopener noreferrer"
              class="docs-link"
            >
              <q-icon name="article" size="16px" />
              Setup Guide (README)
            </a>
          </div>

          <!-- JSON Preview Toggle -->
          <button
            class="preview-toggle"
            @click="showPreview = !showPreview"
          >
            <q-icon :name="showPreview ? 'expand_less' : 'expand_more'" size="16px" />
            {{ showPreview ? 'Hide' : 'Show' }} config.json preview
          </button>

          <!-- JSON Preview -->
          <Transition name="slide">
            <div v-if="showPreview" class="json-preview">
              <pre>{{ configJson }}</pre>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>

    <!-- Progress Indicator -->
    <div v-if="phase === 'prompts'" class="progress-bar">
      <div
        class="progress-fill"
        :style="{ width: `${(currentStep / steps.length) * 100}%` }"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.interactive-terminal {
  width: 100%;
  max-width: 520px;
  min-height: 380px; // CLS Prevention - reserve space during boot animation
  border-radius: 12px;
  overflow: hidden;
  background: #0a0a0f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1);
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  font-size: 13px;

  &.light-mode {
    background: #fafafa;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(99, 102, 241, 0.05);

    .terminal-header {
      background: #f5f5f5;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .terminal-title {
      color: #666;
    }

    .terminal-body {
      color: #1a1a2e;
    }

    .boot-line {
      color: #666;

      &.ready {
        color: #10b981;
      }
    }

    .welcome-banner {
      background: rgba(16, 185, 129, 0.1);
      color: #047857;
    }

    .welcome-subtitle {
      color: #666;
    }

    .prompt-text {
      color: #1a1a2e;
    }

    .prompt-value {
      color: #6366f1;
    }

    .terminal-input {
      color: #1a1a2e;
      caret-color: #6366f1;

      &::placeholder {
        color: #999;
      }
    }

    .hint-text {
      color: #888;
    }

    .json-preview {
      background: #f0f0f0;
      border-color: rgba(0, 0, 0, 0.1);

      pre {
        color: #1a1a2e;
      }
    }

    .docs-link {
      color: #6366f1;
      background: rgba(99, 102, 241, 0.08);

      &:hover {
        background: rgba(99, 102, 241, 0.15);
      }
    }

    .progress-bar {
      background: #e5e5e5;
    }
  }
}

.terminal-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #151520;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.window-controls {
  display: flex;
  gap: 6px;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;

    &.red { background: #ff5f56; }
    &.yellow { background: #ffbd2e; }
    &.green { background: #27c93f; }
  }
}

.terminal-title {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #888;
  font-weight: 500;
}

.reset-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  padding: 4px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
}

.terminal-body {
  padding: 16px;
  min-height: 320px;
  max-height: 400px;
  overflow-y: auto;
  color: #e0e0e0;
  cursor: text;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
}

// Boot sequence
.boot-section {
  margin-bottom: 16px;
}

.boot-line {
  color: #6b7280;
  line-height: 1.6;
  animation: fadeIn 0.3s ease;

  &.ready {
    color: #10b981;
  }
}

// Welcome
.welcome-section {
  margin-bottom: 16px;
}

.welcome-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 6px;
  color: #34d399;
  font-weight: 600;
  margin-bottom: 8px;

  .checkmark {
    color: #10b981;
  }
}

.welcome-subtitle {
  color: #6b7280;
  font-size: 12px;
}

// History
.history-section {
  margin-bottom: 16px;
}

.history-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  line-height: 1.5;
}

.prompt-symbol {
  color: #6366f1;
  font-weight: bold;

  &.active {
    color: #10b981;
    animation: pulse 1.5s infinite;
  }
}

.prompt-text {
  color: #e0e0e0;
}

.prompt-value {
  color: #00d4aa;
  font-weight: 500;
}

// Current prompt
.prompt-section {
  margin-bottom: 8px;
}

.prompt-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-prefix {
  color: #6366f1;
  font-weight: bold;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  caret-color: #6366f1;

  &::placeholder {
    color: #4b5563;
  }

  &:focus {
    outline: none;
  }
}

.hint-text {
  font-size: 11px;
  color: #4b5563;
  margin-top: 4px;
  margin-left: 20px;
}

// Complete state
.complete-section {
  margin-top: 16px;
}

.complete-banner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 8px;
  color: #34d399;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &.primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

.help-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.docs-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 6px;
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: rgba(99, 102, 241, 0.25);
    color: #c7d2fe;
  }

  &.wizard-link {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);

    &:hover {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
    }
  }
}

.preview-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #6b7280;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 0;
  transition: color 0.2s;

  &:hover {
    color: #9ca3af;
  }
}

.json-preview {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow-x: auto;

  pre {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
    color: #9ca3af;
    white-space: pre-wrap;
  }
}

// Progress bar
.progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.3s ease;
}

// Animations
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 300px;
}

// Responsive
@media (max-width: 600px) {
  .interactive-terminal {
    max-width: 100%;
    font-size: 12px;
  }

  .terminal-body {
    min-height: 280px;
    max-height: 350px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
