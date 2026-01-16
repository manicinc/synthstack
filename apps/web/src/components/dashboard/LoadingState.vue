<template>
  <div class="loading-state" :class="size" role="status" :aria-label="ariaLabel">
    <q-spinner
      :color="spinnerColor"
      :size="spinnerSize"
    />
    
    <p v-if="message" class="loading-message">{{ message }}</p>
    
    <p v-if="submessage" class="loading-submessage">{{ submessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Loading message */
  message?: string
  /** Secondary message */
  submessage?: string
  /** Spinner color */
  spinnerColor?: string
  /** Component size */
  size?: 'sm' | 'md' | 'lg'
  /** Accessibility label */
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  submessage: '',
  spinnerColor: 'primary',
  size: 'md',
  ariaLabel: 'Loading content',
})

const spinnerSize = computed(() => {
  switch (props.size) {
    case 'sm': return '24px'
    case 'lg': return '48px'
    default: return '36px'
  }
})
</script>

<style lang="scss" scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  gap: 12px;
  
  &.sm {
    padding: 16px;
    gap: 8px;
    
    .loading-message {
      font-size: 0.8125rem;
    }
    
    .loading-submessage {
      font-size: 0.6875rem;
    }
  }
  
  &.lg {
    padding: 48px 32px;
    gap: 16px;
    
    .loading-message {
      font-size: 1rem;
    }
  }
}

.loading-message {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.loading-submessage {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
</style>


