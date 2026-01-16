<template>
  <div class="testimonial-block">
    <h2
      v-if="block.data?.heading"
      class="block-heading"
    >
      {{ block.data.heading }}
    </h2>

    <div
      v-if="block.data?.testimonials"
      class="testimonials-container"
    >
      <q-card
        v-for="(testimonial, index) in block.data.testimonials"
        :key="index"
        flat
        bordered
        class="testimonial-card"
      >
        <q-card-section>
          <q-icon
            name="format_quote"
            size="32px"
            color="primary"
            class="quote-icon"
          />

          <div class="testimonial-content">
            "{{ testimonial.quote }}"
          </div>

          <div class="testimonial-author">
            <q-avatar
              size="48px"
              :color="testimonial.avatar_url ? undefined : 'grey-5'"
              :text-color="testimonial.avatar_url ? undefined : 'white'"
            >
              <img
                v-if="testimonial.avatar_url"
                :src="testimonial.avatar_url"
                :alt="testimonial.name"
              >
              <div v-else>
                {{ getInitials(testimonial.name) }}
              </div>
            </q-avatar>

            <div class="author-info">
              <div class="author-name">
                {{ testimonial.name }}
              </div>
              <div class="author-title">
                {{ testimonial.title }}
                <span v-if="testimonial.company">at {{ testimonial.company }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="testimonial.rating"
            class="testimonial-rating q-mt-md"
          >
            <q-rating
              :model-value="testimonial.rating"
              readonly
              size="sm"
              color="warning"
              icon="star"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      heading?: string;
      testimonials?: Array<{
        quote: string;
        name: string;
        title: string;
        company?: string;
        avatar_url?: string;
        rating?: number;
      }>;
    };
  };
}>();

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
</script>

<style scoped lang="scss">
.testimonial-block {
  .block-heading {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 24px;
    color: $grey-9;
    text-align: center;
  }

  .testimonials-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
  }

  .testimonial-card {
    background: $grey-1;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
  }

  .quote-icon {
    opacity: 0.3;
  }

  .testimonial-content {
    font-size: 16px;
    line-height: 1.7;
    color: $grey-9;
    margin: 16px 0 24px 0;
    font-style: italic;
  }

  .testimonial-author {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .author-info {
    flex: 1;
  }

  .author-name {
    font-size: 16px;
    font-weight: 600;
    color: $grey-9;
  }

  .author-title {
    font-size: 14px;
    color: $grey-7;
  }

  .testimonial-rating {
    display: flex;
    justify-content: center;
  }
}
</style>
