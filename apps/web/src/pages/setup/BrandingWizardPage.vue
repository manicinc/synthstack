<template>
  <q-page class="branding-wizard-page">
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="text-h4 text-weight-bold q-mb-xs">
            Branding Wizard
          </h1>
          <p class="text-body1 text-grey-7 q-mb-none">
            Customize SynthStack in minutes. Export a complete <code>config.json</code>, then swap it into your repo.
          </p>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            flat
            color="primary"
            icon="tune"
            label="Env Setup"
            to="/setup/env"
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
          <BrandingWizard />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import BrandingWizard from '@/components/branding/BrandingWizard.vue'
</script>

<style scoped lang="scss">
.branding-wizard-page {
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

