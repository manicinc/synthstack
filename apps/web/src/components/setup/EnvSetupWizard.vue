<template>
  <div class="env-setup-wizard">
    <div class="wizard-header">
      <div>
        <div class="text-h5 text-weight-bold">
          Environment Setup Wizard
        </div>
        <div class="text-body2 text-grey-7">
          Fill in your keys once, then export ready-to-copy <code>.env</code> files from the repo templates.
        </div>
      </div>
      <div class="row items-center q-gutter-sm">
        <q-btn
          flat
          icon="restart_alt"
          label="Reset"
          @click="reset"
        />
      </div>
    </div>

    <q-separator class="q-mb-md" />

    <q-stepper
      v-model="step"
      animated
      flat
      header-nav
    >
      <q-step
        :name="1"
        title="Mode"
        icon="rocket_launch"
        :done="step > 1"
      >
        <q-banner
          rounded
          class="bg-blue-1 text-blue-10"
        >
          <template #avatar>
            <q-icon
              name="info"
              color="blue-8"
            />
          </template>
          <div class="text-body2">
            This wizard is for <strong>self-hosted / deployed</strong> SynthStack. If you’re using a hosted plan,
            you typically don’t manage server <code>.env</code> files.
          </div>
        </q-banner>

        <div class="q-mt-md">
          <q-option-group
            v-model="edition"
            type="radio"
            :options="[
              { label: 'PRO (Copilot + RAG + Agents + Referrals)', value: 'pro' },
              { label: 'LITE / Community (Basic Copilot only)', value: 'community' }
            ]"
          />
        </div>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-space />
          <q-btn
            color="primary"
            label="Continue"
            @click="step = 2"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="2"
        title="Core"
        icon="settings"
        :done="step > 2"
      >
        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          Database (Docker / self-hosted)
        </div>
        <div class="grid-3">
          <q-input
            v-model="values.DB_DATABASE"
            label="DB name (DB_DATABASE)"
            outlined
            :placeholder="projectConfig.infrastructure.databaseName"
          />
          <q-input
            v-model="values.DB_USER"
            label="DB user (DB_USER)"
            outlined
            :placeholder="projectConfig.infrastructure.databaseName"
          />
          <q-input
            v-model="values.DB_PASSWORD"
            label="DB password (DB_PASSWORD)"
            outlined
            type="password"
            placeholder="(set a strong password)"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          Directus (CMS)
        </div>
        <div class="grid-2">
          <q-input
            v-model="values.DIRECTUS_KEY"
            label="DIRECTUS_KEY"
            outlined
            type="password"
            placeholder="(generate 32-byte hex)"
          />
          <q-input
            v-model="values.DIRECTUS_SECRET"
            label="DIRECTUS_SECRET"
            outlined
            type="password"
            placeholder="(generate 32-byte hex)"
          />
        </div>

        <div class="grid-3 q-mt-md">
          <q-input
            v-model="values.DIRECTUS_ADMIN_EMAIL"
            label="Admin email (DIRECTUS_ADMIN_EMAIL)"
            outlined
            :placeholder="projectConfig.contact.support"
          />
          <q-input
            v-model="values.DIRECTUS_ADMIN_PASSWORD"
            label="Admin password (DIRECTUS_ADMIN_PASSWORD)"
            outlined
            type="password"
            placeholder="(set a strong password)"
          />
          <q-input
            v-model="values.DIRECTUS_ADMIN_TOKEN"
            label="Admin token (DIRECTUS_ADMIN_TOKEN)"
            outlined
            type="password"
            placeholder="(used by API gateway)"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.DIRECTUS_PUBLIC_URL"
            label="Public URL (DIRECTUS_PUBLIC_URL)"
            outlined
            placeholder="https://admin.yourapp.com"
          />
          <q-input
            v-model="values.DIRECTUS_TOKEN"
            label="API token (DIRECTUS_TOKEN)"
            outlined
            type="password"
            placeholder="(Directus API token)"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          Encryption
        </div>
        <q-input
          v-model="values.ENCRYPTION_KEY"
          label="ENCRYPTION_KEY"
          outlined
          type="password"
          placeholder="(64-char hex; crypto.randomBytes(32))"
        />

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 1"
          />
          <q-space />
          <q-btn
            color="primary"
            label="Continue"
            @click="step = 3"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="3"
        title="URLs"
        icon="link"
        :done="step > 3"
      >
        <div class="grid-2">
          <q-input
            v-model="values.VITE_APP_NAME"
            label="App name (VITE_APP_NAME)"
            outlined
            :placeholder="projectConfig.app.name"
          />
          <q-input
            v-model="values.VITE_APP_URL"
            label="Frontend URL (VITE_APP_URL)"
            outlined
            placeholder="https://yourapp.com"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.VITE_API_URL"
            label="API URL (VITE_API_URL)"
            outlined
            placeholder="https://api.yourapp.com"
          />
          <q-input
            v-model="values.VITE_DIRECTUS_URL"
            label="Directus URL (VITE_DIRECTUS_URL)"
            outlined
            placeholder="https://admin.yourapp.com"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.FRONTEND_URL"
            label="Frontend URL (FRONTEND_URL)"
            outlined
            placeholder="https://yourapp.com"
          />
          <q-input
            v-model="values.APP_URL"
            label="App URL (APP_URL)"
            outlined
            placeholder="https://yourapp.com"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.DIRECTUS_URL"
            label="Directus URL (DIRECTUS_URL)"
            outlined
            placeholder="https://admin.yourapp.com"
          />
          <q-input
            v-model="values.ML_SERVICE_URL"
            label="ML service URL (ML_SERVICE_URL)"
            outlined
            placeholder="http://localhost:8001"
          />
        </div>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 2"
          />
          <q-space />
          <q-btn
            color="primary"
            label="Continue"
            @click="step = 4"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="4"
        title="Auth"
        icon="shield"
        :done="step > 4"
      >
        <q-banner
          dense
          rounded
          class="bg-grey-2 text-grey-9"
        >
          <template #avatar>
            <q-icon name="lock" />
          </template>
          <div class="text-body2">
            Supabase is the default auth provider.
          </div>
        </q-banner>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.VITE_SUPABASE_URL"
            label="Supabase URL (VITE_SUPABASE_URL)"
            outlined
            placeholder="https://your-project.supabase.co"
          />
          <q-input
            v-model="values.VITE_SUPABASE_ANON_KEY"
            label="Supabase anon key (VITE_SUPABASE_ANON_KEY)"
            outlined
            type="password"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.SUPABASE_URL"
            label="Supabase URL (SUPABASE_URL)"
            outlined
            placeholder="https://your-project.supabase.co"
          />
          <q-input
            v-model="values.SUPABASE_SERVICE_ROLE_KEY"
            label="Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)"
            outlined
            type="password"
          />
        </div>

        <div class="q-mt-md">
          <q-input
            v-model="values.SUPABASE_ANON_KEY"
            label="Supabase anon key (SUPABASE_ANON_KEY)"
            outlined
            type="password"
          />
        </div>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 3"
          />
          <q-space />
          <q-btn
            color="primary"
            label="Continue"
            @click="step = 5"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="5"
        title="Stripe"
        icon="credit_card"
        :done="step > 5"
      >
        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.STRIPE_PUBLISHABLE_KEY"
            label="Publishable key (STRIPE_PUBLISHABLE_KEY)"
            outlined
            placeholder="<stripe_publishable_key>"
          />
          <q-input
            v-model="values.STRIPE_SECRET_KEY"
            label="Secret key (STRIPE_SECRET_KEY)"
            outlined
            type="password"
            placeholder="<stripe_secret_key>"
          />
        </div>

        <div class="q-mt-md">
          <q-input
            v-model="values.STRIPE_WEBHOOK_SECRET"
            label="Webhook secret (STRIPE_WEBHOOK_SECRET)"
            outlined
            type="password"
            placeholder="<stripe_webhook_secret>"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.STRIPE_PRICE_MAKER"
            label="Maker price (monthly)"
            outlined
            placeholder="price_..."
          />
          <q-input
            v-model="values.STRIPE_PRICE_PRO"
            label="Pro price (monthly)"
            outlined
            placeholder="price_..."
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.VITE_STRIPE_PUBLISHABLE_KEY"
            label="Frontend publishable (VITE_STRIPE_PUBLISHABLE_KEY)"
            outlined
            placeholder="<stripe_publishable_key>"
          />
          <q-input
            v-model="values.STRIPE_PRICE_LIFETIME"
            label="Lifetime price (STRIPE_PRICE_LIFETIME)"
            outlined
            placeholder="price_..."
          />
        </div>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 4"
          />
          <q-space />
          <q-btn
            color="primary"
            label="Continue"
            @click="step = 6"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="6"
        title="Integrations"
        icon="extension"
        :done="step > 6"
      >
        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          Email (Resend)
        </div>

        <div class="grid-2">
          <q-input
            v-model="values.RESEND_API_KEY"
            label="Resend API key (RESEND_API_KEY)"
            outlined
            type="password"
            placeholder="re_..."
          />
          <q-input
            v-model="values.RESEND_FROM_EMAIL"
            label="From email (RESEND_FROM_EMAIL)"
            outlined
            :placeholder="projectConfig.contact.noreply || ''"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="values.RESEND_FROM_NAME"
            label="From name (RESEND_FROM_NAME)"
            outlined
            :placeholder="projectConfig.app.name"
          />
          <q-input
            v-model="values.CONTACT_EMAIL"
            label="Contact email (CONTACT_EMAIL)"
            outlined
            :placeholder="projectConfig.contact.support"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          AI Providers
        </div>

        <div class="grid-2">
          <q-input
            v-model="values.OPENAI_API_KEY"
            label="OpenAI API key (OPENAI_API_KEY)"
            outlined
            type="password"
            placeholder="sk-..."
          />
          <q-input
            v-model="values.ANTHROPIC_API_KEY"
            label="Anthropic API key (ANTHROPIC_API_KEY)"
            outlined
            type="password"
            placeholder="sk-ant-..."
          />
        </div>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 5"
          />
          <q-space />
          <q-btn
            color="primary"
            label="Export"
            @click="step = 7"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="7"
        title="Export"
        icon="download"
      >
        <q-card bordered class="export-card">
          <q-card-section class="row items-start justify-between q-gutter-sm">
            <div>
              <div class="text-subtitle1 text-weight-bold">
                Generated environment files
              </div>
              <div class="text-caption text-grey-7">
                These are rendered from the repo’s <code>.env.*.example</code> templates with your values applied.
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-btn
                outline
                color="primary"
                icon="content_copy"
                label="Copy Current"
                @click="copyCurrent"
              />
              <q-btn
                color="primary"
                icon="download"
                label="Download Current"
                @click="downloadCurrent"
              />
            </div>
          </q-card-section>

          <q-separator />

          <q-tabs
            v-model="activeEnv"
            dense
            class="text-grey-8"
            active-color="primary"
            indicator-color="primary"
            align="left"
          >
            <q-tab name="root" label="root .env" />
            <q-tab name="web" label="apps/web .env" />
            <q-tab name="api" label="api-gateway .env" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="activeEnv" animated>
            <q-tab-panel name="root">
              <div class="text-caption text-grey-7 q-mb-sm">
                Save as <code>synthstack-community/.env</code>.
              </div>
              <q-input
                v-model="rendered.root"
                type="textarea"
                readonly
                outlined
                autogrow
              />
            </q-tab-panel>

            <q-tab-panel name="web">
              <div class="text-caption text-grey-7 q-mb-sm">
                Save as <code>synthstack-community/apps/web/.env</code>.
              </div>
              <q-input
                v-model="rendered.web"
                type="textarea"
                readonly
                outlined
                autogrow
              />
            </q-tab-panel>

            <q-tab-panel name="api">
              <div class="text-caption text-grey-7 q-mb-sm">
                Save as <code>synthstack-community/packages/api-gateway/.env</code>.
              </div>
              <q-input
                v-model="rendered.api"
                type="textarea"
                readonly
                outlined
                autogrow
              />
            </q-tab-panel>
          </q-tab-panels>
        </q-card>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 6"
          />
          <q-space />
          <q-btn
            flat
            color="primary"
            label="Done"
            icon-right="check"
            @click="$emit('done')"
          />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import projectConfig from '@/config/project-config'

import rootEnvTemplate from '../../../../../.env.example?raw'
import rootEnvLiteTemplate from '../../../../../.env.lite.example?raw'
import rootEnvProTemplate from '../../../../../.env.pro.example?raw'
import webEnvTemplate from '../../../.env.example?raw'
import webEnvLiteTemplate from '../../../.env.lite.example?raw'
import webEnvProTemplate from '../../../.env.pro.example?raw'
import apiEnvTemplate from '../../../../../packages/api-gateway/.env.example?raw'

defineEmits<{
  (e: 'done'): void
}>()

const $q = useQuasar()
const step = ref(1)
const activeEnv = ref<'root' | 'web' | 'api'>('root')
const edition = ref<'pro' | 'community'>('community')

const values = reactive<Record<string, string>>({
  // Database
  DB_DATABASE: projectConfig.infrastructure.databaseName,
  DB_USER: projectConfig.infrastructure.databaseName,
  DB_PASSWORD: '',

  // Directus
  DIRECTUS_KEY: '',
  DIRECTUS_SECRET: '',
  DIRECTUS_ADMIN_EMAIL: projectConfig.contact.support,
  DIRECTUS_ADMIN_PASSWORD: '',
  DIRECTUS_ADMIN_TOKEN: '',
  DIRECTUS_PUBLIC_URL: 'http://localhost:8099',
  DIRECTUS_URL: 'http://localhost:8099',
  DIRECTUS_TOKEN: '',

  // Encryption
  ENCRYPTION_KEY: '',

  // URLs
  VITE_APP_NAME: projectConfig.app.name,
  VITE_APP_URL: 'http://localhost:3050',
  FRONTEND_URL: 'http://localhost:3050',
  APP_URL: 'http://localhost:3050',
  VITE_API_URL: 'http://localhost:3003',
  VITE_DIRECTUS_URL: 'http://localhost:8099',
  ML_SERVICE_URL: 'http://localhost:8001',

  // Supabase
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',

  // Stripe (optional)
  STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  STRIPE_PRICE_MAKER: '',
  STRIPE_PRICE_PRO: '',
  STRIPE_PRICE_LIFETIME: '',
  VITE_STRIPE_PUBLISHABLE_KEY: '',

  // Email
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: projectConfig.contact.noreply || '',
  RESEND_FROM_NAME: projectConfig.app.name,
  CONTACT_EMAIL: projectConfig.contact.support,

  // AI
  OPENAI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
})

watch(edition, (next) => {
  const isPro = next === 'pro'

  // Backend flags (api-gateway + server-side feature gating)
  values.ENABLE_COPILOT = 'true'
  values.ENABLE_COPILOT_RAG = isPro ? 'true' : 'false'
  values.ENABLE_AI_AGENTS = isPro ? 'true' : 'false'
  values.ENABLE_REFERRALS = isPro ? 'true' : 'false'

  // Frontend flags (apps/web)
  values.VITE_ENABLE_COPILOT = 'true'
  values.VITE_ENABLE_COPILOT_RAG = isPro ? 'true' : 'false'
  values.VITE_ENABLE_AI_AGENTS = isPro ? 'true' : 'false'
  values.VITE_ENABLE_REFERRALS = isPro ? 'true' : 'false'
}, { immediate: true })

const activeTemplates = computed(() => {
  const isPro = edition.value === 'pro'

  return {
    root: isPro ? rootEnvProTemplate : rootEnvLiteTemplate,
    web: isPro ? webEnvProTemplate : webEnvLiteTemplate,
    api: apiEnvTemplate,
  }
})

function envQuote(value: string): string {
  if (value === '') return ''
  const needsQuotes = /[\s#"'\\]/.test(value) || value.startsWith(' ') || value.endsWith(' ') || value.includes('\n')
  if (!needsQuotes) return value
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
  return `"${escaped}"`
}

function applyEnvTemplate(template: string, overrides: Record<string, string>): string {
  let out = template
  for (const [key, raw] of Object.entries(overrides)) {
    if (raw === undefined) continue
    const value = envQuote(String(raw))
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`^${escapedKey}=.*$`, 'm')
    if (re.test(out)) {
      out = out.replace(re, `${key}=${value}`)
    }
  }
  return out.trimEnd() + '\n'
}

const rendered = computed(() => {
  const normalized: Record<string, string> = {
    ...values,
    DIRECTUS_PUBLIC_URL: values.DIRECTUS_PUBLIC_URL || values.VITE_DIRECTUS_URL,
    DIRECTUS_URL: values.DIRECTUS_URL || values.VITE_DIRECTUS_URL,
    DIRECTUS_TOKEN: values.DIRECTUS_TOKEN || values.DIRECTUS_ADMIN_TOKEN,
    FRONTEND_URL: values.FRONTEND_URL || values.VITE_APP_URL,
    APP_URL: values.APP_URL || values.VITE_APP_URL,
    VITE_STRIPE_PUBLISHABLE_KEY: values.VITE_STRIPE_PUBLISHABLE_KEY || values.STRIPE_PUBLISHABLE_KEY,
  }

  const rootTemplateToUse = activeTemplates.value.root || rootEnvTemplate
  const root = applyEnvTemplate(rootTemplateToUse, normalized)

  const webTemplateToUse = activeTemplates.value.web || webEnvTemplate
  const web = applyEnvTemplate(webTemplateToUse, normalized)

  const api = applyEnvTemplate(apiEnvTemplate, normalized)

  return { root, web, api }
})

function reset() {
  step.value = 1
  edition.value = 'community'
  activeEnv.value = 'root'
  Object.assign(values, {
    DB_DATABASE: projectConfig.infrastructure.databaseName,
    DB_USER: projectConfig.infrastructure.databaseName,
    DB_PASSWORD: '',
    DIRECTUS_KEY: '',
    DIRECTUS_SECRET: '',
    DIRECTUS_ADMIN_EMAIL: projectConfig.contact.support,
    DIRECTUS_ADMIN_PASSWORD: '',
    DIRECTUS_ADMIN_TOKEN: '',
    DIRECTUS_PUBLIC_URL: 'http://localhost:8099',
    DIRECTUS_URL: 'http://localhost:8099',
    DIRECTUS_TOKEN: '',
    ENCRYPTION_KEY: '',
    VITE_APP_NAME: projectConfig.app.name,
    VITE_APP_URL: 'http://localhost:3050',
    FRONTEND_URL: 'http://localhost:3050',
    APP_URL: 'http://localhost:3050',
    VITE_API_URL: 'http://localhost:3003',
    VITE_DIRECTUS_URL: 'http://localhost:8099',
    ML_SERVICE_URL: 'http://localhost:8001',
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    STRIPE_PUBLISHABLE_KEY: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PRICE_MAKER: '',
    STRIPE_PRICE_PRO: '',
    STRIPE_PRICE_LIFETIME: '',
    VITE_STRIPE_PUBLISHABLE_KEY: '',
    RESEND_API_KEY: '',
    RESEND_FROM_EMAIL: projectConfig.contact.noreply || '',
    RESEND_FROM_NAME: projectConfig.app.name,
    CONTACT_EMAIL: projectConfig.contact.support,
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
  })
  $q.notify({ type: 'info', message: 'Reset wizard', position: 'top', timeout: 2000 })
}

function currentEnvText(): { filename: string; contents: string } {
  if (activeEnv.value === 'root') return { filename: 'synthstack-community.env', contents: rendered.value.root }
  if (activeEnv.value === 'web') return { filename: 'synthstack-community-web.env', contents: rendered.value.web }
  return { filename: 'synthstack-community-api.env', contents: rendered.value.api }
}

async function copyCurrent() {
  try {
    const { contents } = currentEnvText()
    await navigator.clipboard.writeText(contents)
    $q.notify({ type: 'positive', message: 'Copied to clipboard', position: 'top', timeout: 2000 })
  } catch {
    $q.notify({ type: 'negative', message: 'Copy failed (clipboard blocked)', position: 'top' })
  }
}

function downloadCurrent() {
  const { filename, contents } = currentEnvText()
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: `Downloaded ${filename}`, position: 'top', timeout: 2000 })
}
</script>

<style scoped lang="scss">
.env-setup-wizard {
  max-width: 1080px;
  margin: 0 auto;
}

.wizard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.export-card {
  border-radius: 16px;
}

.export-card :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
</style>
