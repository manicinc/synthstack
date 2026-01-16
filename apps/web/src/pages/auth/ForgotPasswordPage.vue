<template>
  <q-page class="forgot-password-page">
    <div class="form-container">
      <div class="form-header">
        <q-icon
          name="lock_reset"
          size="48px"
          color="primary"
        />
        <h1>Forgot Password</h1>
        <p>Enter your email and we'll send you a reset link</p>
      </div>

      <q-form
        class="forgot-form"
        @submit="onSubmit"
      >
        <q-input
          v-model="email"
          type="email"
          label="Email Address"
          outlined
          :rules="[
            val => !!val || 'Email is required',
            val => /.+@.+\..+/.test(val) || 'Enter a valid email'
          ]"
        >
          <template #prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-btn
          type="submit"
          label="Send Reset Link"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
        />
      </q-form>

      <div class="form-footer">
        <router-link to="/auth/login">
          Back to Login
        </router-link>
      </div>

      <q-dialog v-model="showSuccess">
        <q-card>
          <q-card-section class="text-center">
            <q-icon
              name="mark_email_read"
              size="64px"
              color="positive"
            />
            <h3>Check Your Email</h3>
            <p>We've sent a password reset link to {{ email }}</p>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              v-close-popup
              label="Back to Login"
              color="primary"
              to="/auth/login"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const email = ref('')
const loading = ref(false)
const showSuccess = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    // TODO: Implement password reset with Supabase
    await new Promise(resolve => setTimeout(resolve, 1500))
    showSuccess.value = true
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to send reset email'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.forgot-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 1.75rem;
    margin: 16px 0 8px;
  }
  
  p {
    color: var(--text-secondary);
  }
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-footer {
  text-align: center;
  margin-top: 24px;
}
</style>




