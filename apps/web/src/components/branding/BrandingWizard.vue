<template>
  <div class="branding-wizard">
    <div class="wizard-header">
      <div>
        <div class="text-h5 text-weight-bold">
          Branding Wizard
        </div>
        <div class="text-body2 text-grey-7">
          Generate a full `config.json` for your SynthStack fork in a couple minutes.
        </div>
      </div>
      <div class="wizard-actions">
        <q-btn
          flat
          icon="restart_alt"
          label="Reset"
          @click="resetToDefaults"
        />
      </div>
    </div>

    <q-separator class="q-mb-md" />

    <q-stepper
      v-model="step"
      animated
      flat
      header-nav
      class="wizard-stepper"
    >
      <q-step
        :name="1"
        title="Identity"
        icon="badge"
        :done="step > 1"
      >
        <div class="grid-2">
          <q-input
            v-model="form.app.name"
            label="App / product name"
            outlined
            placeholder="AcmeStack"
          />
          <q-input
            v-model="form.app.domain"
            label="Primary domain"
            outlined
            placeholder="acmestack.com"
          />
        </div>

        <q-input
          v-model="form.app.tagline"
          label="Tagline"
          outlined
          placeholder="Your AI Co-Founders"
          class="q-mt-md"
        />

        <q-input
          v-model="form.app.description"
          type="textarea"
          label="Short description"
          outlined
          rows="3"
          class="q-mt-md"
        />

        <q-input
          v-model="form.app.fullDescription"
          type="textarea"
          label="Long description"
          outlined
          rows="4"
          class="q-mt-md"
        />

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.company.name"
            label="Company name"
            outlined
            placeholder="Acme Inc."
          />
          <q-input
            v-model="form.company.legalName"
            label="Legal name (optional)"
            outlined
            placeholder="Acme Incorporated"
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
        title="Brand"
        icon="palette"
        :done="step > 2"
      >
        <div class="grid-2">
          <div class="color-field">
            <q-input
              v-model="form.branding.colors.primary"
              label="Primary color (hex)"
              outlined
              placeholder="#6366F1"
              :rules="hexColorRules"
              lazy-rules
            />
            <div class="swatch" :style="{ background: form.branding.colors.primary }" />
          </div>

          <div class="color-field">
            <q-input
              v-model="form.branding.colors.accent"
              label="Accent color (hex)"
              outlined
              placeholder="#00D4AA"
              :rules="hexColorRules"
              lazy-rules
            />
            <div class="swatch" :style="{ background: form.branding.colors.accent }" />
          </div>
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.branding.colors.theme"
            label="Theme color (browser UI)"
            outlined
            placeholder="#6366F1"
            :rules="hexColorRules"
            lazy-rules
          />
          <q-input
            v-model="form.branding.colors.background"
            label="Background color"
            outlined
            placeholder="#0D0D0D"
            :rules="hexColorRules"
            lazy-rules
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.branding.logo.light"
            label="Logo (light)"
            outlined
          />
          <q-input
            v-model="form.branding.logo.dark"
            label="Logo (dark)"
            outlined
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.branding.logo.mark"
            label="Mark (light)"
            outlined
          />
          <q-input
            v-model="form.branding.logo.markDark"
            label="Mark (dark)"
            outlined
          />
        </div>

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
        title="Contact & Links"
        icon="support_agent"
        :done="step > 3"
      >
        <div class="grid-3">
          <q-input
            v-model="form.contact.support"
            label="Support email"
            outlined
            placeholder="support@acme.com"
            :rules="emailRules"
            lazy-rules
          />
          <q-input
            v-model="form.contact.sales"
            label="Sales email"
            outlined
            placeholder="sales@acme.com"
            :rules="emailRules"
            lazy-rules
          />
          <q-input
            v-model="form.contact.general"
            label="General email"
            outlined
            placeholder="hello@acme.com"
            :rules="emailRules"
            lazy-rules
          />
        </div>

        <div class="grid-3 q-mt-md">
          <q-input
            v-model="form.social.github"
            label="GitHub URL"
            outlined
            placeholder="https://github.com/acme/acmestack"
            :rules="urlRules"
            lazy-rules
          />
          <q-input
            v-model="form.social.discord"
            label="Discord invite URL"
            outlined
            placeholder="https://discord.gg/..."
            :rules="urlRules"
            lazy-rules
          />
          <q-input
            v-model="form.social.twitter"
            label="X / Twitter URL"
            outlined
            placeholder="https://x.com/acme"
            :rules="urlRules"
            lazy-rules
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.links.docs"
            label="Docs path"
            outlined
            placeholder="/docs"
          />
          <q-input
            v-model="form.links.roadmap"
            label="Roadmap path"
            outlined
            placeholder="/roadmap"
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
        title="GitHub"
        icon="fab fa-github"
        :done="step > 4"
      >
        <div class="grid-2">
          <q-input
            v-model="form.github.orgName"
            label="GitHub org / owner"
            outlined
            placeholder="acme"
          />
          <q-input
            v-model="form.github.teamSlug"
            label="Team slug (optional)"
            outlined
            placeholder="acmestack-pro"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-input
            v-model="form.github.proRepoName"
            label="Pro repo name"
            outlined
            placeholder="acmestack-pro"
          />
          <q-input
            v-model="form.github.communityRepoName"
            label="Community repo name"
            outlined
            placeholder="acmestack"
          />
        </div>

        <div class="text-caption text-grey-7 q-mt-md">
          Pro repo URL: {{ proRepoUrl }}
          <br>
          Community repo URL: {{ communityRepoUrl }}
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
        title="Advanced"
        icon="tune"
      >
        <div class="grid-2">
          <q-toggle
            v-model="form.features.copilot"
            label="Enable Copilot UI"
          />
          <q-toggle
            v-model="form.features.referrals"
            label="Enable referrals"
          />
        </div>

        <div class="grid-2 q-mt-md">
          <q-toggle
            v-model="form.features.analytics"
            label="Enable analytics"
          />
          <q-toggle
            v-model="form.features.i18n"
            label="Enable i18n"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="text-subtitle2 text-weight-bold q-mb-sm">
          Docker / self-hosting defaults
        </div>

        <div class="grid-3">
          <q-input
            v-model="form.infrastructure.containerPrefix"
            label="Container prefix"
            outlined
          />
          <q-input
            v-model="form.infrastructure.networkName"
            label="Network name"
            outlined
          />
          <q-input
            v-model="form.infrastructure.databaseName"
            label="Database name"
            outlined
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
            label="Review & Export"
            @click="step = 6"
          />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="6"
        title="Export"
        icon="download"
      >
        <q-card bordered class="export-card">
          <q-card-section class="row items-start justify-between q-gutter-sm">
            <div>
              <div class="text-subtitle1 text-weight-bold">
                Generated `config.json`
              </div>
              <div class="text-caption text-grey-7">
                Replace the repo root `config.json`, then restart dev/build.
              </div>
            </div>

            <div class="row q-gutter-sm">
              <q-btn
                outline
                color="primary"
                icon="content_copy"
                label="Copy"
                @click="copyJson"
              />
              <q-btn
                color="primary"
                icon="download"
                label="Download"
                @click="downloadJson"
              />
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-input
              v-model="jsonPreview"
              type="textarea"
              readonly
              outlined
              autogrow
              class="json-output"
            />
          </q-card-section>
        </q-card>

        <q-banner
          dense
          rounded
          class="bg-blue-1 text-blue-10 q-mt-md"
        >
          <template #avatar>
            <q-icon
              name="tune"
              color="blue-8"
            />
          </template>
          <div class="text-body2">
            <strong>Next:</strong> Generate your self-hosting <code>.env</code> files.
          </div>
          <template #action>
            <q-btn
              flat
              dense
              color="blue-10"
              label="Env Setup"
              to="/setup/env"
            />
          </template>
        </q-banner>

        <q-stepper-navigation class="row items-center q-mt-md">
          <q-btn
            flat
            label="Back"
            @click="step = 5"
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
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import projectConfig, { type ProjectConfig } from '@/config/project-config'

defineEmits<{
  (e: 'done'): void
}>()

const $q = useQuasar()
const step = ref(1)

// Validation rules
const emailRules = [
  (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address'
]

const hexColorRules = [
  (v: string) => !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v) || 'Enter a valid hex color (e.g. #6366F1)'
]

const urlRules = [
  (v: string) => !v || /^https?:\/\/.+/.test(v) || 'Enter a valid URL starting with http:// or https://'
]

const form = ref<ProjectConfig>(cloneConfig(projectConfig))

const proRepoUrl = computed(() => `https://github.com/${form.value.github.orgName}/${form.value.github.proRepoName}`)
const communityRepoUrl = computed(() => `https://github.com/${form.value.github.orgName}/${form.value.github.communityRepoName}`)

const jsonPreview = computed(() => JSON.stringify(form.value, null, 2))

function cloneConfig<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T
}

function resetToDefaults() {
  form.value = cloneConfig(projectConfig)
  step.value = 1
  $q.notify({ type: 'info', message: 'Reset to defaults', position: 'top', timeout: 2000 })
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(jsonPreview.value)
    $q.notify({ type: 'positive', message: 'Copied config.json to clipboard', position: 'top', timeout: 2500 })
  } catch {
    $q.notify({ type: 'negative', message: 'Copy failed — your browser blocked clipboard access', position: 'top' })
  }
}

function downloadJson() {
  const blob = new Blob([jsonPreview.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'config.json'
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'Downloaded config.json', position: 'top', timeout: 2500 })
}
</script>

<style scoped lang="scss">
.branding-wizard {
  max-width: 980px;
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

.color-field {
  display: grid;
  grid-template-columns: 1fr 40px;
  gap: 10px;
  align-items: center;
}

.swatch {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.export-card {
  border-radius: 16px;
}

.json-output :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
</style>

