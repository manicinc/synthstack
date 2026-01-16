<template>
  <div class="empty-state" :class="size">
    <div class="empty-icon">
      <q-icon :name="icon" :size="iconSize" />
    </div>
    
    <h4 class="empty-title">{{ title }}</h4>
    
    <p v-if="description" class="empty-description">{{ description }}</p>
    
    <div v-if="$slots.default || actionLabel" class="empty-actions">
      <slot>
        <q-btn
          v-if="actionLabel"
          :color="actionColor"
          :icon="actionIcon"
          :label="actionLabel"
          :to="actionTo"
          @click="$emit('action')"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Empty state title */
  title?: string
  /** Empty state description */
  description?: string
  /** Icon name */
  icon?: string
  /** Action button label */
  actionLabel?: string
  /** Action button icon */
  actionIcon?: string
  /** Action button color */
  actionColor?: string
  /** Action button route */
  actionTo?: string
  /** Component size */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'No data available',
  description: '',
  icon: 'inbox',
  actionLabel: '',
  actionIcon: '',
  actionColor: 'primary',
  actionTo: '',
  size: 'md',
})

defineEmits<{
  (e: 'action'): void
}>()

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return '28px'
    case 'lg': return '56px'
    default: return '40px'
  }
})
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  
  &.sm {
    padding: 16px;
    
    .empty-title {
      font-size: 0.875rem;
    }
    
    .empty-description {
      font-size: 0.75rem;
    }
  }
  
  &.lg {
    padding: 48px 32px;
    
    .empty-title {
      font-size: 1.25rem;
    }
  }
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: var(--surface-2);
  color: var(--text-tertiary);
  
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

.empty-title {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-description {
  margin: 0 0 20px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  max-width: 280px;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
