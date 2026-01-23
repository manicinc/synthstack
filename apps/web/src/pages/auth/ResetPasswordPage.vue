<template>
  <q-page class="reset-password-page">
    <div class="form-container">
      <div class="form-header">
        <q-icon
          name="password"
          size="48px"
          color="primary"
        />
        <h1>Reset Password</h1>
        <p>Enter your new password</p>
      </div>

      <q-form
        class="reset-form"
        @submit="onSubmit"
      >
        <q-input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          label="New Password"
          outlined
          :rules="[
            val => !!val || 'Password is required',
            val => val.length >= 8 || 'Password must be at least 8 characters'
          ]"
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

        <q-input
          v-model="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          label="Confirm Password"
          outlined
          :rules="[
            val => !!val || 'Please confirm your password',
            val => val === password || 'Passwords do not match'
          ]"
        >
          <template #prepend>
            <q-icon name="lock_outline" />
          </template>
        </q-input>

        <q-btn
          type="submit"
          label="Reset Password"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
        />
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)

const resetToken = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

async function onSubmit() {
  loading.value = true
  try {
    // Local/directus providers require a reset token; Supabase uses its recovery session.
    if (authStore.activeProvider !== 'supabase' && !resetToken.value) {
      throw new Error('Missing reset token. Please use the link from your email.')
    }

    await authStore.updatePasswordWithToken(resetToken.value, password.value)
    $q.notify({
      type: 'positive',
      message: 'Password reset successfully!'
    })
    router.push('/auth/login')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : (authStore.error || 'Failed to reset password')
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.reset-password-page {
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

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>



