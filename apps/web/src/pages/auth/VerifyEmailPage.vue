<template>
  <div class="verify-email-page">
    <h1>Verify Email</h1>
    <p class="subtitle">
      {{ loading ? 'Confirming your email address…' : 'Email verification' }}
    </p>

    <div v-if="loading" class="row justify-center q-mt-lg">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <q-banner v-else-if="error" class="error-banner q-mt-md" dense rounded>
      <template #avatar>
        <q-icon name="error" color="negative" />
      </template>
      {{ error }}
    </q-banner>

    <q-banner v-else class="success-banner q-mt-md" dense rounded>
      <template #avatar>
        <q-icon name="check_circle" color="positive" />
      </template>
      Your email has been verified.
    </q-banner>

    <div v-if="!loading" class="actions q-mt-lg">
      <q-btn
        color="primary"
        unelevated
        class="full-width"
        :to="continueTo"
        label="Continue"
      />
      <q-btn
        flat
        class="full-width q-mt-sm"
        :to="loginTo"
        label="Go to Login"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)

const continueTo = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.trim()) return redirect
  return authStore.isAuthenticated ? '/app' : '/auth/login'
})

const loginTo = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.trim()) {
    return `/auth/login?redirect=${encodeURIComponent(redirect)}`
  }
  return '/auth/login'
})

onMounted(async () => {
  loading.value = true
  error.value = null

  const token = route.query.token
  if (typeof token !== 'string' || !token.trim()) {
    error.value = 'Missing verification token.'
    loading.value = false
    return
  }

  try {
    await authService.verifyEmail(token.trim())
    if (authStore.isAuthenticated) {
      await authStore.fetchUser()
    }
  } catch (err: any) {
    error.value = err?.message || 'Email verification failed.'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.verify-email-page {
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

.actions {
  display: flex;
  flex-direction: column;
}
</style>

