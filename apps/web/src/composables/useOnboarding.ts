/**
 * @file useOnboarding.ts
 * @description Composable for managing onboarding wizard state and logic
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

export interface OnboardingUserData {
  displayName?: string;
  units?: 'metric' | 'imperial';
  theme?: 'light' | 'dark' | 'system';
  contentTypes?: string[];
  aiFeatures?: string[];
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  skipped: boolean;
  userData: OnboardingUserData;
}

const STORAGE_KEY = 'synthstack-onboarding-state';
const COMPLETED_KEY = 'synthstack-onboarding-completed';

export function useOnboarding() {
  const router = useRouter();
  // COMMUNITY: 5 steps (WelcomeStep, ProfileStep, SubscriptionStep, ResourcesStep, CompletionStep)
  // PRO has 9 steps (includes WorkflowStep, CopilotStep, etc.)
  const totalSteps = 5;

  // Load state from localStorage
  const loadState = (): OnboardingState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        logError('Failed to parse onboarding state', e);
      }
    }
    return {
      currentStep: 0,
      totalSteps,
      completed: false,
      skipped: false,
      userData: {},
    };
  };

  const state = ref<OnboardingState>(loadState());

  // Computed properties
  const progress = computed(() => {
    return ((state.value.currentStep + 1) / state.value.totalSteps) * 100;
  });

  const isFirstStep = computed(() => state.value.currentStep === 0);
  const isLastStep = computed(() => state.value.currentStep === state.value.totalSteps - 1);

  // Methods
  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  };

  const nextStep = () => {
    if (!isLastStep.value) {
      state.value.currentStep++;
      saveState();
    }
  };

  const prevStep = () => {
    if (!isFirstStep.value) {
      state.value.currentStep--;
      saveState();
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < state.value.totalSteps) {
      state.value.currentStep = step;
      saveState();
    }
  };

  const updateUserData = (data: Partial<OnboardingUserData>) => {
    state.value.userData = { ...state.value.userData, ...data };
    saveState();
  };

  const completeOnboarding = async () => {
    state.value.completed = true;
    localStorage.setItem(COMPLETED_KEY, 'true');

    // Send onboarding data to backend API
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'https://api.synthstack.app';
      const response = await fetch(`${apiBase}/api/v1/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName: state.value.userData.displayName,
          units: state.value.userData.units,
          theme: state.value.userData.theme,
          contentTypes: state.value.userData.contentTypes || [],
          aiFeatures: state.value.userData.aiFeatures || [],
        }),
      });

      if (!response.ok) {
        logError('Failed to save onboarding preferences:', await response.text());
      }
    } catch (error) {
      logError('Error saving onboarding preferences:', error);
      // Continue even if API fails - user can still access the app
    }

    localStorage.removeItem(STORAGE_KEY); // Clear onboarding state after completion

    // Redirect to dashboard
    await router.push('/app');
  };

  const skipOnboarding = async () => {
    state.value.skipped = true;
    localStorage.setItem(COMPLETED_KEY, 'true');
    localStorage.removeItem(STORAGE_KEY);
    await router.push('/app');
  };

  const isCompleted = (): boolean => {
    return localStorage.getItem(COMPLETED_KEY) === 'true';
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
    state.value = {
      currentStep: 0,
      totalSteps,
      completed: false,
      skipped: false,
      userData: {},
    };
  };

  return {
    // State
    state,
    currentStep: computed(() => state.value.currentStep),
    totalSteps,
    userData: computed(() => state.value.userData),

    // Computed
    progress,
    isFirstStep,
    isLastStep,

    // Methods
    nextStep,
    prevStep,
    goToStep,
    updateUserData,
    completeOnboarding,
    skipOnboarding,
    isCompleted,
    resetOnboarding,
  };
}
