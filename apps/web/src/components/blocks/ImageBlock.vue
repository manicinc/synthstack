<template>
  <div class="image-block">
    <figure>
      <img
        v-if="block.data?.image_url"
        :src="block.data.image_url"
        :alt="block.data.alt_text || 'Proposal image'"
        :class="['block-image', `align-${block.data.alignment || 'center'}`]"
      >
      <figcaption
        v-if="block.data?.caption"
        class="image-caption"
      >
        {{ block.data.caption }}
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      image_url?: string;
      alt_text?: string;
      caption?: string;
      alignment?: 'left' | 'center' | 'right' | 'full';
    };
  };
}>();
</script>

<style scoped lang="scss">
.image-block {
  figure {
    margin: 0;
  }

  .block-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &.align-left {
      display: block;
      margin-right: auto;
      max-width: 50%;
    }

    &.align-center {
      display: block;
      margin: 0 auto;
      max-width: 80%;
    }

    &.align-right {
      display: block;
      margin-left: auto;
      max-width: 50%;
    }

    &.align-full {
      width: 100%;
      max-width: 100%;
    }
  }

  .image-caption {
    text-align: center;
    font-size: 14px;
    color: $grey-7;
    margin-top: 12px;
    font-style: italic;
  }
}
</style>
