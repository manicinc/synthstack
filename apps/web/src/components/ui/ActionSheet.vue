<template>
  <q-bottom-sheet
    v-model="isOpen"
    v-bind="$attrs"
  >
    <q-list>
      <q-item
        v-for="action in actions"
        :key="action.label"
        v-ripple
        clickable
        :disable="action.disabled"
        @click="handleAction(action)"
      >
        <q-item-section
          v-if="action.icon"
          avatar
        >
          <q-icon
            :name="action.icon"
            :color="action.color"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ action.label }}</q-item-label>
          <q-item-label
            v-if="action.caption"
            caption
          >
            {{ action.caption }}
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-separator />

      <q-item
        v-ripple
        clickable
        @click="isOpen = false"
      >
        <q-item-section class="text-center text-grey-7">
          Cancel
        </q-item-section>
      </q-item>
    </q-list>
  </q-bottom-sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

export interface Action {
  label: string
  icon?: string
  color?: string
  caption?: string
  disabled?: boolean
  handler: () => void | Promise<void>
}

interface Props {
  modelValue: boolean
  actions: Action[]
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const handleAction = async (action: Action) => {
  if (action.disabled) return;

  try {
    await action.handler();
  } catch (error) {
    logError('Action handler error:', error);
  } finally {
    isOpen.value = false;
  }
};
</script>

<style scoped lang="scss">
// Additional styling if needed
</style>
