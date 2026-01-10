<template>
  <div class="completion-step q-pa-lg text-center">
    <div class="text-h3 text-weight-bold q-mb-md">
      🎉 You're All Set!
    </div>
    <div class="text-h6 text-grey-7 q-mb-xl">
      Your SynthStack workspace is ready to go
    </div>

    <q-card
      class="q-mx-auto q-mt-xl"
      style="max-width: 600px"
    >
      <q-card-section>
        <div class="text-h6 q-mb-md">
          What you've configured:
        </div>

        <div
          v-if="userData.displayName"
          class="q-mb-sm"
        >
          <q-icon
            name="person"
            color="primary"
            class="q-mr-sm"
          />
          <span class="text-weight-medium">Display Name:</span> {{ userData.displayName }}
        </div>

        <div
          v-if="userData.units"
          class="q-mb-sm"
        >
          <q-icon
            name="straighten"
            color="primary"
            class="q-mr-sm"
          />
          <span class="text-weight-medium">Units:</span> {{ userData.units }}
        </div>

        <div
          v-if="userData.theme"
          class="q-mb-sm"
        >
          <q-icon
            name="palette"
            color="primary"
            class="q-mr-sm"
          />
          <span class="text-weight-medium">Theme:</span> {{ userData.theme }}
        </div>

        <div
          v-if="userData.contentTypes && userData.contentTypes.length > 0"
          class="q-mb-sm"
        >
          <q-icon
            name="article"
            color="primary"
            class="q-mr-sm"
          />
          <span class="text-weight-medium">Content Types:</span> {{ userData.contentTypes.length }} selected
        </div>

        <div
          v-if="userData.aiFeatures && userData.aiFeatures.length > 0"
          class="q-mb-sm"
        >
          <q-icon
            name="auto_awesome"
            color="primary"
            class="q-mr-sm"
          />
          <span class="text-weight-medium">AI Features:</span> {{ userData.aiFeatures.length }} enabled
        </div>

        <q-separator class="q-my-lg" />

        <div class="bg-green-1 q-pa-md rounded-borders">
          <div class="text-weight-bold q-mb-sm text-positive">
            ✓ Quick Tip
          </div>
          <div class="text-caption">
            Press <kbd class="kbd">⌘K</kbd> anytime to open the AI Copilot and get help!
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="q-mt-xl text-body1">
      Ready to start building your next project?
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useOnboarding } from 'src/composables/useOnboarding';

const { userData } = useOnboarding();
</script>

<style scoped>
.kbd {
  padding: 2px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  font-family: monospace;
  font-size: 0.9em;
}
</style>
