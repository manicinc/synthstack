<template>
  <q-page class="error-page">
    <div class="error-content">
      <div class="error-code">
        404
      </div>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      
      <div class="error-actions">
        <q-btn
          unelevated
          color="primary"
          label="Go Home"
          @click="$router.push('/')"
        />
        <q-btn
          outline
          label="Go Back"
          @click="$router.back()"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-8);
  background: var(--color-bg-primary);
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-code {
  font-family: var(--font-display);
  font-size: 8rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-primary);
  opacity: 0.3;
  margin-bottom: var(--space-4);
}

h1 {
  font-size: var(--text-3xl);
  margin-bottom: var(--space-4);
}

p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}
</style>

