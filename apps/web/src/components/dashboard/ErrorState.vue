<template>
  <div
    class="error-state"
    :class="size"
  >
    <div class="error-icon">
      <q-icon
        name="error_outline"
        :size="iconSize"
      />
    </div>
    
    <h4 class="error-title">
      {{ title }}
    </h4>
    
    <p
      v-if="message"
      class="error-message"
    >
      {{ message }}
    </p>
    
    <p
      v-if="errorDetails && showDetails"
      class="error-details"
    >
      {{ errorDetails }}
    </p>
    
    <div class="error-actions">
      <q-btn
        v-if="retryable"
        color="primary"
        icon="refresh"
        label="Try Again"
        :loading="retrying"
        @click="$emit('retry')"
      />
      
      <q-btn
        v-if="errorDetails && !showDetails"
        flat
        dense
        color="grey"
        label="Show Details"
        @click="showDetails = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  /** Error title */
  title?: string
  /** Error description */
  message?: string
  /** Technical error details */
  errorDetails?: string
  /** Whether retry is available */
  retryable?: boolean
  /** Whether currently retrying */
  retrying?: boolean
  /** Component size */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  message: 'We couldn\'t load this data. Please try again.',
  errorDetails: '',
  retryable: true,
  retrying: false,
  size: 'md',
})

defineEmits<{
  (e: 'retry'): void
}>()

const showDetails = ref(false)

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return '28px'
    case 'lg': return '56px'
    default: return '40px'
  }
})
</script>

<style lang="scss" scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  
  &.sm {
    padding: 16px;
    
    .error-title {
      font-size: 0.875rem;
    }
    
    .error-message {
      font-size: 0.75rem;
    }
  }
  
  &.lg {
    padding: 48px 32px;
    
    .error-title {
      font-size: 1.25rem;
    }
  }
}

.error-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--error) 12%, transparent);
  color: var(--error);
  
  .sm & {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
  }
  
  .lg & {
    width: 96px;
    height: 96px;
    margin-bottom: 24px;
  }
}

.error-title {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.error-message {
  margin: 0 0 16px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  max-width: 300px;
  line-height: 1.5;
}

.error-details {
  margin: 8px 0 16px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>


