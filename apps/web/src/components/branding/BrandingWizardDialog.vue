<template>
  <q-dialog
    v-model="model"
    maximized
    transition-show="jump-up"
    transition-hide="jump-down"
  >
    <q-card class="wizard-dialog">
      <q-card-section class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <q-icon name="palette" color="primary" />
          <div class="text-subtitle1 text-weight-bold">
            Branding Wizard
          </div>
        </div>
        <q-btn
          flat
          round
          icon="close"
          aria-label="Close"
          @click="model = false"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="wizard-body">
        <BrandingWizard @done="model = false" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BrandingWizard from './BrandingWizard.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<style scoped lang="scss">
.wizard-dialog {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.wizard-body {
  padding: 20px;
  overflow: auto;
}
</style>

