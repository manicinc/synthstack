<template>
  <div class="timeline-block">
    <h2
      v-if="block.data?.heading"
      class="block-heading"
    >
      {{ block.data.heading }}
    </h2>
    <p
      v-if="block.data?.description"
      class="block-description"
    >
      {{ block.data.description }}
    </p>

    <q-timeline
      v-if="block.data?.milestones"
      color="primary"
    >
      <q-timeline-entry
        v-for="(milestone, index) in block.data.milestones"
        :key="index"
        :title="milestone.title"
        :subtitle="milestone.date || milestone.duration"
      >
        <div
          v-if="milestone.description"
          class="milestone-description"
        >
          {{ milestone.description }}
        </div>

        <q-list
          v-if="milestone.deliverables"
          dense
          class="q-mt-sm"
        >
          <q-item
            v-for="(deliverable, dIndex) in milestone.deliverables"
            :key="dIndex"
            dense
          >
            <q-item-section avatar>
              <q-icon
                name="check_circle"
                color="positive"
                size="sm"
              />
            </q-item-section>
            <q-item-section>{{ deliverable }}</q-item-section>
          </q-item>
        </q-list>
      </q-timeline-entry>
    </q-timeline>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      heading?: string;
      description?: string;
      milestones?: Array<{
        title: string;
        date?: string;
        duration?: string;
        description?: string;
        deliverables?: string[];
      }>;
    };
  };
}>();
</script>

<style scoped lang="scss">
.timeline-block {
  .block-heading {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
    color: $grey-9;
  }

  .block-description {
    font-size: 16px;
    color: $grey-7;
    margin-bottom: 24px;
  }

  .milestone-description {
    font-size: 14px;
    color: $grey-8;
    line-height: 1.6;
  }

  :deep(.q-timeline__subtitle) {
    font-weight: 500;
    color: $primary;
  }
}
</style>
