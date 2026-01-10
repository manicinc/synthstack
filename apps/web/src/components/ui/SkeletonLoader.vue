<template>
  <div class="skeleton-loader">
    <!-- Card skeleton -->
    <div
      v-if="type === 'card'"
      class="skeleton-card"
    >
      <q-card
        flat
        bordered
      >
        <q-skeleton height="200px" />
        <q-card-section>
          <q-skeleton
            type="text"
            width="60%"
          />
          <q-skeleton
            type="text"
            width="40%"
            class="q-mt-sm"
          />
          <q-skeleton
            type="text"
            width="50%"
            class="q-mt-sm"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- List skeleton -->
    <div v-else-if="type === 'list'">
      <q-list
        bordered
        separator
      >
        <q-item
          v-for="n in count"
          :key="n"
        >
          <q-item-section avatar>
            <q-skeleton
              type="circle"
              size="48px"
            />
          </q-item-section>
          <q-item-section>
            <q-skeleton type="text" />
            <q-skeleton
              type="text"
              width="60%"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Table skeleton -->
    <div v-else-if="type === 'table'">
      <q-skeleton
        v-for="n in count"
        :key="n"
        height="60px"
        class="q-mb-md"
      />
    </div>

    <!-- Grid skeleton -->
    <div
      v-else-if="type === 'grid'"
      class="row q-col-gutter-md"
    >
      <div
        v-for="n in count"
        :key="n"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card
          flat
          bordered
        >
          <q-skeleton height="200px" />
          <q-card-section>
            <q-skeleton type="text" />
            <q-skeleton
              type="text"
              width="70%"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Stats skeleton -->
    <div
      v-else-if="type === 'stats'"
      class="row q-col-gutter-md"
    >
      <div
        v-for="n in count"
        :key="n"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card
          flat
          bordered
        >
          <q-card-section>
            <q-skeleton
              type="circle"
              size="40px"
              class="q-mb-sm"
            />
            <q-skeleton
              type="text"
              width="50%"
            />
            <q-skeleton
              type="text"
              width="30%"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Custom slot for custom skeleton -->
    <slot v-else-if="type === 'custom'" />

    <!-- Default: Text skeleton -->
    <div v-else>
      <q-skeleton
        v-for="n in count"
        :key="n"
        type="text"
        class="q-mb-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'list' | 'table' | 'grid' | 'stats' | 'custom' | 'text'
  count?: number
}

withDefaults(defineProps<Props>(), {
  type: 'card',
  count: 3
})
</script>

<style scoped lang="scss">
.skeleton-loader {
  .skeleton-card {
    animation: pulse 1.5s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
