<template>
  <q-page class="onboarding-wizard">
    <div class="wizard-container">
      <!-- Progress Bar -->
      <div class="progress-bar-container">
        <q-linear-progress
          :value="progress / 100"
          color="primary"
          size="8px"
          class="q-mb-md"
        />
        <div class="text-caption text-grey-7 text-center q-mb-lg">
          Step {{ currentStep + 1 }} of {{ totalSteps }}
        </div>
      </div>

      <!-- Step Content -->
      <div class="step-content">
        <component :is="currentStepComponent" />
      </div>

      <!-- Navigation Buttons -->
      <div class="navigation-buttons row justify-between q-mt-xl q-px-lg">
        <q-btn
          v-if="!isFirstStep"
          flat
          label="Back"
          icon="arrow_back"
          color="grey-7"
          @click="prevStep"
        />
        <q-btn
          v-else
          flat
          label="Skip Setup"
          color="grey-7"
          @click="handleSkip"
        />

        <q-btn
          v-if="!isLastStep"
          unelevated
          label="Next"
          icon-right="arrow_forward"
          color="primary"
          @click="nextStep"
        />
        <q-btn
          v-else
          unelevated
          label="Get Started"
          icon-right="rocket_launch"
          color="primary"
          @click="handleComplete"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useOnboarding } from 'src/composables/useOnboarding';

// Import step components
import WelcomeStep from 'src/components/onboarding/WelcomeStep.vue';
import ProfileStep from 'src/components/onboarding/ProfileStep.vue';
// COMMUNITY: WorkflowStep and CopilotStep removed (PRO features)
import SubscriptionStep from 'src/components/onboarding/SubscriptionStep.vue';
import ResourcesStep from 'src/components/onboarding/ResourcesStep.vue';
import CompletionStep from 'src/components/onboarding/CompletionStep.vue';

const $q = useQuasar();
const {
  currentStep,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  nextStep,
  prevStep,
  completeOnboarding,
  skipOnboarding,
} = useOnboarding();

// COMMUNITY: WorkflowStep and CopilotStep removed (PRO features)
const steps = [
  WelcomeStep,
  ProfileStep,
  SubscriptionStep,
  ResourcesStep,
  CompletionStep,
];

const currentStepComponent = computed(() => steps[currentStep.value]);

const handleComplete = async () => {
  $q.notify({
    type: 'positive',
    message: 'Welcome to SynthStack!',
    caption: 'Your workspace is ready',
    icon: 'check_circle',
    position: 'top',
  });
  await completeOnboarding();
};

const handleSkip = () => {
  $q.dialog({
    title: 'Skip Onboarding?',
    message: 'You can always revisit the onboarding wizard later from settings.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    $q.notify({
      type: 'info',
      message: 'Onboarding skipped',
      position: 'top',
    });
    await skipOnboarding();
  });
};
</script>

<style scoped>
.onboarding-wizard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8edf3 100%);
  padding: 20px;
}

.dark .onboarding-wizard {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.wizard-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.progress-bar-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}

.dark .progress-bar-container {
  background: #1e1e2f;
}

.step-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .step-content {
  background: #1e1e2f;
}

.navigation-buttons {
  margin-top: 30px;
}

@media (max-width: 600px) {
  .wizard-container {
    padding: 20px 10px;
  }

  .step-content {
    min-height: 400px;
  }
}
</style>
