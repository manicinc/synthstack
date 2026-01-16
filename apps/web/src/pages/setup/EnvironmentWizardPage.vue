<template>
  <q-page class="environment-wizard-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="text-h4 text-weight-bold q-mb-xs">
            Environment Setup Wizard
          </h1>
          <p class="text-body1 text-grey-7 q-mb-none">
            Generate <code>.env</code> files for self-hosting using the repo templates.
          </p>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            flat
            color="primary"
            icon="palette"
            label="Branding Wizard"
            to="/setup/branding"
          />
          <q-btn
            flat
            color="primary"
            icon="arrow_back"
            label="Back to Docs"
            to="/docs"
          />
        </div>
      </div>

      <q-card bordered class="wizard-card">
        <q-card-section>
          <EnvSetupWizard />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import EnvSetupWizard from '@/components/setup/EnvSetupWizard.vue'
</script>

<style scoped lang="scss">
.environment-wizard-page {
  padding: 24px;
}

.page-container {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 780px) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.wizard-card {
  border-radius: 16px;
}
</style>

