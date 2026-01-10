<template>
  <div class="profile-step q-pa-lg">
    <div class="text-h4 text-weight-bold q-mb-md text-center">
      Set Up Your Profile
    </div>
    <div class="text-body1 text-grey-7 q-mb-xl text-center">
      Personalize your experience
    </div>

    <q-card
      class="q-mx-auto"
      style="max-width: 600px"
    >
      <q-card-section>
        <q-input
          v-model="displayName"
          label="Display Name"
          outlined
          hint="How should we address you?"
          @update:model-value="updateData"
        />

        <q-select
          v-model="units"
          :options="unitOptions"
          label="Preferred Units"
          outlined
          class="q-mt-md"
          @update:model-value="updateData"
        />

        <q-select
          v-model="theme"
          :options="themeOptions"
          label="Theme Preference"
          outlined
          class="q-mt-md"
          @update:model-value="updateData"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOnboarding } from 'src/composables/useOnboarding';

const { userData, updateUserData } = useOnboarding();

const displayName = ref(userData.value.displayName || '');
const units = ref(userData.value.units || 'metric');
const theme = ref(userData.value.theme || 'system');

const unitOptions = [
  { label: 'Metric (mm, g)', value: 'metric' },
  { label: 'Imperial (in, oz)', value: 'imperial' }
];

const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System Default', value: 'system' }
];

const updateData = () => {
  updateUserData({
    displayName: displayName.value,
    units: units.value as 'metric' | 'imperial',
    theme: theme.value as 'light' | 'dark' | 'system'
  });
};

onMounted(() => {
  displayName.value = userData.value.displayName || '';
  units.value = userData.value.units || 'metric';
  theme.value = userData.value.theme || 'system';
});
</script>
