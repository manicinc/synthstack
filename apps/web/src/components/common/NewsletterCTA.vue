<template>
  <section
    class="newsletter-cta"
    :class="variant"
  >
    <div class="newsletter-content">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <div
        v-if="!subscribed"
        class="newsletter-form"
      >
        <q-input
          v-model="email"
          outlined
          dense
          placeholder="Enter your email"
          type="email"
          class="newsletter-input"
          :disable="loading"
        />
        <q-btn
          color="primary"
          :label="loading ? 'Subscribing...' : 'Subscribe'"
          :loading="loading"
          @click="handleSubscribe"
        />
      </div>
      <div
        v-else
        class="success-message"
      >
        <q-icon
          name="check_circle"
          size="24px"
          color="positive"
        />
        <span>Thanks for subscribing!</span>
      </div>
      <p class="newsletter-note">
        {{ note }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useNewsletter } from '@/composables/useNewsletter';

interface Props {
  title?: string;
  description?: string;
  note?: string;
  variant?: 'default' | 'compact' | 'inline';
  source?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Stay Updated',
  description: 'Get the latest tips and updates in your inbox.',
  note: 'No spam, unsubscribe anytime.',
  variant: 'default',
  source: 'cta',
});

const email = ref('');
const { loading, subscribed, subscribe } = useNewsletter();

async function handleSubscribe() {
  if (!email.value) return;
  await subscribe(email.value, undefined, props.source);
  if (subscribed.value) {
    email.value = '';
  }
}
</script>

<style lang="scss" scoped>
.newsletter-cta {
  padding: 60px 24px;
  background: var(--color-bg-secondary);
  border-radius: 24px;
  text-align: center;

  &.compact {
    padding: 40px 24px;
  }

  &.inline {
    background: transparent;
    padding: 24px 0;
  }
}

.newsletter-content {
  max-width: 600px;
  margin: 0 auto;

  h2 {
    font-size: 2rem;
    margin: 0 0 16px;
  }

  p {
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

.newsletter-form {
  display: flex;
  gap: 12px;
  max-width: 500px;
  margin: 0 auto 16px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
}

.newsletter-input {
  flex: 1;
}

.success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--color-positive-bg);
  border-radius: 12px;
  margin: 0 auto 16px;
  max-width: 400px;
  color: var(--color-positive);
  font-weight: 600;
}

.newsletter-note {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0;
}
</style>
