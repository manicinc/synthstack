<template>
  <div class="login-page">
    <h1>Welcome Back</h1>
    <p class="subtitle">
      Sign in to your account
    </p>

    <q-form
      class="login-form"
      @submit.prevent="handleLogin"
    >
      <q-input
        v-model="email"
        label="Email"
        type="email"
        outlined
        dense
        :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Valid email required']"
      >
        <template #prepend>
          <q-icon name="email" />
        </template>
      </q-input>

      <q-input
        v-model="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        outlined
        dense
        :rules="[val => !!val || 'Password is required']"
      >
        <template #prepend>
          <q-icon name="lock" />
        </template>
        <template #append>
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>

      <div class="form-actions">
        <router-link
          to="/auth/forgot-password"
          class="forgot-link"
        >
          Forgot password?
        </router-link>
      </div>

      <q-btn
        type="submit"
        label="Sign In"
        color="primary"
        unelevated
        class="full-width"
        :loading="loading"
      />
    </q-form>

    <div class="divider">
      <span>or continue with</span>
    </div>

    <div class="social-buttons">
      <q-btn
        outline
        class="social-btn"
        :loading="googleLoading"
        @click="handleGoogleLogin"
      >
        <q-icon
          name="mdi-google"
          class="q-mr-sm"
        />
        Google
      </q-btn>
      <q-btn
        outline
        class="social-btn"
        :loading="githubLoading"
        @click="handleGitHubLogin"
      >
        <q-icon
          name="mdi-github"
          class="q-mr-sm"
        />
        GitHub
      </q-btn>
    </div>

    <q-btn
      flat
      label="Continue as Guest"
      color="primary"
      class="full-width guest-btn"
      icon="person_outline"
      @click="handleGuestMode"
    >
      <q-tooltip>Projects are saved locally in your browser and can be uploaded after you create an account.</q-tooltip>
    </q-btn>
    <p class="guest-hint">
      Projects are saved locally in your browser and can be uploaded after you create an account.
    </p>

    <p class="signup-prompt">
      Don't have an account?
      <router-link to="/auth/register">
        Sign up
      </router-link>
    </p>

    <!-- Error display -->
    <q-banner
      v-if="error"
      class="error-banner q-mt-md"
      dense
      rounded
    >
      <template #avatar>
        <q-icon
          name="error"
          color="negative"
        />
      </template>
      {{ error }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const googleLoading = ref(false);
const githubLoading = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';

  try {
    await authStore.signIn(email.value, password.value);
    const redirect = route.query.redirect as string || '/app';
    router.push(redirect);
  } catch (err: any) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  googleLoading.value = true;
  error.value = '';

  try {
    await authStore.signInWithProvider('google');
  } catch (err: any) {
    error.value = err.message || 'Google login failed';
  } finally {
    googleLoading.value = false;
  }
}

async function handleGitHubLogin() {
  githubLoading.value = true;
  error.value = '';

  try {
    await authStore.signInWithProvider('github');
  } catch (err: any) {
    error.value = err.message || 'GitHub login failed';
  } finally {
    githubLoading.value = false;
  }
}

function handleGuestMode() {
  error.value = '';

  try {
    authStore.continueAsGuest();
    const redirect = route.query.redirect as string || '/app';
    router.push(redirect);
  } catch (err: any) {
    error.value = err.message || 'Guest mode failed';
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  h1 {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
    text-align: center;
  }

  .subtitle {
    text-align: center;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-8);
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  font-size: var(--text-sm);
  color: var(--color-secondary);
}

.divider {
  display: flex;
  align-items: center;
  margin: var(--space-6) 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-bg-elevated);
  }

  span {
    padding: 0 var(--space-4);
  }
}

.social-buttons {
  display: flex;
  gap: var(--space-3);

  .social-btn {
    flex: 1;
  }
}

.guest-btn {
  margin-top: var(--space-4);
  border: 1px dashed var(--color-border);
  opacity: 0.9;

  &:hover {
    opacity: 1;
    background: rgba(99, 102, 241, 0.05);
  }
}

.guest-hint {
  margin-top: var(--space-3);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.signup-prompt {
  text-align: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);

  a {
    color: var(--color-primary);
    font-weight: 600;
  }
}

.error-banner {
  background: var(--color-error-bg);
  color: var(--color-error);
}
</style>
