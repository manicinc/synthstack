<template>
  <div class="register-page">
    <h1>{{ t('auth.register.title') }}</h1>
    <p class="subtitle">
      {{ t('auth.register.subtitle') }}
    </p>

    <q-form
      class="register-form"
      @submit.prevent="handleRegister"
    >
      <q-input
        v-model="displayName"
        :label="t('auth.register.name')"
        outlined
        dense
      >
        <template #prepend>
          <q-icon name="person" />
        </template>
      </q-input>

      <q-input
        v-model="email"
        :label="t('auth.register.email')"
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
        :label="t('auth.register.password')"
        :type="showPassword ? 'text' : 'password'"
        outlined
        dense
        :rules="[val => !!val || 'Password is required', val => val.length >= 8 || 'Min 8 characters']"
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

      <q-btn
        type="submit"
        :label="t('auth.register.submit')"
        color="primary"
        unelevated
        class="full-width"
        :loading="loading"
      />
    </q-form>

    <div class="divider">
      <span>{{ t('auth.social.or') }}</span>
    </div>

    <div class="social-buttons">
      <q-btn
        outline
        class="social-btn"
        @click="handleGoogleSignup"
      >
        <q-icon
          name="mdi-google"
          class="q-mr-sm"
        />
        {{ t('auth.social.google') }}
      </q-btn>
      <q-btn
        outline
        class="social-btn"
        @click="handleGitHubSignup"
      >
        <q-icon
          name="mdi-github"
          class="q-mr-sm"
        />
        {{ t('auth.social.github') }}
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

    <p class="login-prompt">
      {{ t('auth.register.hasAccount') }}
      <router-link to="/auth/login">
        {{ t('auth.register.signIn') }}
      </router-link>
    </p>

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

    <q-banner
      v-if="success"
      class="success-banner q-mt-md"
      dense
      rounded
    >
      <template #avatar>
        <q-icon
          name="check_circle"
          color="positive"
        />
      </template>
      Check your email to confirm your account.
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const displayName = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleRegister() {
  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const result = await authStore.signUp(email.value, password.value, displayName.value || undefined);
    if (result) {
      router.push('/app');
      return;
    }
    // Supabase email confirmation flow (session is null)
    success.value = true;
  } catch (err: any) {
    error.value = err?.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
}

async function handleGoogleSignup() {
  await authStore.signInWithProvider('google');
}

async function handleGitHubSignup() {
  await authStore.signInWithProvider('github');
}

function handleGuestMode() {
  error.value = '';
  success.value = false;

  try {
    authStore.continueAsGuest();
    router.push('/app');
  } catch (err: any) {
    error.value = err?.message || 'Guest mode failed';
  }
}
</script>

<style lang="scss" scoped>
.register-page {
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

.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.divider {
  display: flex;
  align-items: center;
  margin: var(--space-6) 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-bg-elevated);
  }

  span { padding: 0 var(--space-4); }
}

.social-buttons {
  display: flex;
  gap: var(--space-3);
  .social-btn { flex: 1; }
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

.login-prompt {
  text-align: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  a { color: var(--color-primary); font-weight: 600; }
}

.error-banner { background: var(--color-error-bg); color: var(--color-error); }
.success-banner { background: var(--color-success-bg); color: var(--color-success); }
</style>
