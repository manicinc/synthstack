<template>
  <div class="date-range-picker">
    <q-input
      :model-value="displayValue"
      :label="label"
      :outlined="outlined"
      :filled="filled"
      :standout="standout"
      :dense="dense"
      :disable="disable"
      readonly
      @click="showPicker = true"
    >
      <template #prepend>
        <q-icon name="event" />
      </template>

      <template
        v-if="modelValue.start || modelValue.end"
        #append
      >
        <q-icon
          name="close"
          class="cursor-pointer"
          @click.stop="clearDates"
        />
      </template>

      <q-menu
        v-model="showPicker"
        :offset="[0, 8]"
      >
        <q-card style="min-width: 320px">
          <q-card-section class="q-pa-sm">
            <!-- Preset Ranges -->
            <div
              v-if="showPresets"
              class="q-mb-md"
            >
              <div class="text-caption text-grey-7 q-mb-sm">
                Quick Select
              </div>
              <div class="row q-gutter-xs">
                <q-btn
                  v-for="preset in presets"
                  :key="preset.label"
                  dense
                  outline
                  size="sm"
                  :label="preset.label"
                  @click="applyPreset(preset)"
                />
              </div>
            </div>

            <!-- Date Selection Mode -->
            <q-tabs
              v-model="selectionMode"
              dense
              class="q-mb-sm"
              align="justify"
            >
              <q-tab
                name="range"
                label="Range"
              />
              <q-tab
                name="single"
                label="Single Date"
              />
            </q-tabs>

            <!-- Date Pickers -->
            <div class="row q-col-gutter-sm">
              <div :class="selectionMode === 'range' ? 'col-6' : 'col-12'">
                <div class="text-caption text-grey-7 q-mb-xs">
                  {{ selectionMode === 'range' ? 'Start Date' : 'Date' }}
                </div>
                <q-date
                  v-model="startDate"
                  :mask="mask"
                  :options="startDateOptions"
                  minimal
                  flat
                />
              </div>

              <div
                v-if="selectionMode === 'range'"
                class="col-6"
              >
                <div class="text-caption text-grey-7 q-mb-xs">
                  End Date
                </div>
                <q-date
                  v-model="endDate"
                  :mask="mask"
                  :options="endDateOptions"
                  minimal
                  flat
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <q-btn
              flat
              label="Cancel"
              @click="cancel"
            />
            <q-btn
              flat
              label="Clear"
              @click="clearDates"
            />
            <q-btn
              unelevated
              color="primary"
              label="Apply"
              @click="applyDates"
            />
          </q-card-actions>
        </q-card>
      </q-menu>
    </q-input>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { date } from 'quasar';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

interface Props {
  modelValue: DateRange;
  label?: string;
  outlined?: boolean;
  filled?: boolean;
  standout?: boolean;
  dense?: boolean;
  disable?: boolean;
  mask?: string;
  showPresets?: boolean;
  minDate?: string;
  maxDate?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Select date range',
  outlined: true,
  filled: false,
  standout: false,
  dense: false,
  disable: false,
  mask: 'YYYY-MM-DD',
  showPresets: true
});

const emit = defineEmits<{
  'update:modelValue': [value: DateRange];
}>();

const showPicker = ref(false);
const selectionMode = ref<'range' | 'single'>('range');
const startDate = ref<string | null>(props.modelValue.start);
const endDate = ref<string | null>(props.modelValue.end);

const displayValue = computed(() => {
  if (!startDate.value && !endDate.value) {
    return '';
  }

  if (selectionMode.value === 'single' || !endDate.value) {
    return formatDate(startDate.value);
  }

  return `${formatDate(startDate.value)} - ${formatDate(endDate.value)}`;
});

const presets = computed<DatePreset[]>(() => [
  {
    label: 'Today',
    getValue: () => {
      const today = date.formatDate(Date.now(), props.mask);
      return { start: today, end: today };
    }
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = date.formatDate(
        date.subtractFromDate(Date.now(), { days: 1 }),
        props.mask
      );
      return { start: yesterday, end: yesterday };
    }
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      start: date.formatDate(
        date.subtractFromDate(Date.now(), { days: 6 }),
        props.mask
      ),
      end: date.formatDate(Date.now(), props.mask)
    })
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      start: date.formatDate(
        date.subtractFromDate(Date.now(), { days: 29 }),
        props.mask
      ),
      end: date.formatDate(Date.now(), props.mask)
    })
  },
  {
    label: 'This month',
    getValue: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        start: date.formatDate(firstDay, props.mask),
        end: date.formatDate(lastDay, props.mask)
      };
    }
  },
  {
    label: 'Last month',
    getValue: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

      return {
        start: date.formatDate(firstDay, props.mask),
        end: date.formatDate(lastDay, props.mask)
      };
    }
  }
]);

const startDateOptions = (dateStr: string) => {
  if (props.minDate && dateStr < props.minDate) {
    return false;
  }
  if (props.maxDate && dateStr > props.maxDate) {
    return false;
  }
  if (endDate.value && dateStr > endDate.value) {
    return false;
  }
  return true;
};

const endDateOptions = (dateStr: string) => {
  if (props.minDate && dateStr < props.minDate) {
    return false;
  }
  if (props.maxDate && dateStr > props.maxDate) {
    return false;
  }
  if (startDate.value && dateStr < startDate.value) {
    return false;
  }
  return true;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  return date.formatDate(dateStr, 'MMM D, YYYY');
};

const applyPreset = (preset: DatePreset) => {
  const range = preset.getValue();
  startDate.value = range.start;
  endDate.value = range.end;
  applyDates();
};

const applyDates = () => {
  const value: DateRange = {
    start: startDate.value,
    end: selectionMode.value === 'single' ? startDate.value : endDate.value
  };

  emit('update:modelValue', value);
  showPicker.value = false;
};

const clearDates = () => {
  startDate.value = null;
  endDate.value = null;
  emit('update:modelValue', { start: null, end: null });
  showPicker.value = false;
};

const cancel = () => {
  startDate.value = props.modelValue.start;
  endDate.value = props.modelValue.end;
  showPicker.value = false;
};
</script>

<style scoped lang="scss">
.date-range-picker {
  // Component-specific styles
}
</style>
