<template>
  <div class="text-block">
    <h2
      v-if="block.data?.heading"
      class="block-heading"
    >
      {{ block.data.heading }}
    </h2>
    <div
      v-if="block.data?.content"
      class="block-content"
      v-html="block.data.content"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      heading?: string;
      content?: string;
    };
  };
}>();
</script>

<style scoped lang="scss">
.text-block {
  .block-heading {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 16px;
    color: $grey-9;
  }

  .block-content {
    font-size: 16px;
    line-height: 1.8;
    color: $grey-8;

    :deep(p) {
      margin-bottom: 16px;
    }

    :deep(ul), :deep(ol) {
      margin-bottom: 16px;
      padding-left: 24px;
    }

    :deep(strong) {
      font-weight: 600;
    }

    :deep(a) {
      color: $primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
