<template>
  <div class="empty-state text-center q-pa-xl">
    <q-icon
      :name="icon"
      :size="iconSize"
      :color="iconColor"
      class="q-mb-md empty-state-icon"
    />

    <div class="text-h6 q-mb-sm empty-state-title">
      {{ title }}
    </div>

    <div
      v-if="description"
      class="text-body2 text-grey-7 q-mb-md empty-state-description"
    >
      {{ description }}
    </div>

    <q-btn
      v-if="actionLabel"
      unelevated
      :color="actionColor"
      :label="actionLabel"
      :icon="actionIcon"
      class="q-mt-sm"
      @click="$emit('action')"
    />

    <!-- Custom content slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  iconSize?: string
  iconColor?: string
  title: string
  description?: string
  actionLabel?: string
  actionIcon?: string
  actionColor?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'inbox',
  iconSize: '64px',
  iconColor: 'grey-5',
  actionColor: 'primary'
})

defineEmits<{
  action: []
}>()
</script>

<style scoped lang="scss">
.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .empty-state-icon {
    opacity: 0.7;
  }

  .empty-state-title {
    max-width: 400px;
  }

  .empty-state-description {
    max-width: 500px;
    line-height: 1.6;
  }

  // Mobile optimization
  @media (max-width: 600px) {
    padding: 48px 24px;

    .empty-state-icon {
      font-size: 48px !important;
    }

    .empty-state-title {
      font-size: 18px;
    }

    .empty-state-description {
      font-size: 14px;
    }
  }
}
</style>
