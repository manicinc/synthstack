<template>
  <div class="subscription-step q-pa-lg">
    <div class="text-h4 text-weight-bold q-mb-md text-center">
      Choose Your Plan
    </div>
    <div class="text-body1 text-grey-7 q-mb-xl text-center">
      Start for free, upgrade anytime
    </div>

    <div class="row q-col-gutter-md justify-center">
      <div
        v-for="plan in plans"
        :key="plan.name"
        class="col-12 col-md-4"
      >
        <q-card :class="{ 'highlighted-plan': plan.featured }">
          <q-card-section class="text-center">
            <div class="text-h6 text-weight-bold">
              {{ plan.name }}
            </div>
            <div class="text-h4 text-weight-bold q-my-md">
              {{ plan.price }}
              <span
                v-if="plan.price !== 'Free'"
                class="text-caption text-grey-7"
              >
                /month
              </span>
            </div>
            <q-separator class="q-my-md" />
            <div class="text-left">
              <div
                v-for="feature in plan.features"
                :key="feature"
                class="q-mb-sm"
              >
                <q-icon
                  name="check_circle"
                  color="positive"
                  size="18px"
                  class="q-mr-sm"
                />
                <span>{{ feature }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="text-center q-mt-lg text-caption text-grey-7">
      You can upgrade or downgrade your plan anytime from settings
    </div>
  </div>
</template>

<script setup lang="ts">
const plans = [
  {
    name: 'Free',
    price: 'Free',
    featured: false,
    features: [
      '5 credits per month',
      'Basic features',
      'Community support',
      'Web platform only'
    ]
  },
  {
    name: 'Maker',
    price: '$19',
    featured: true,
    features: [
      '30 credits per month',
      'All platforms',
      'Priority support',
      'Advanced features',
      'API access'
    ]
  },
  {
    name: 'Pro',
    price: '$49',
    featured: false,
    features: [
      'Unlimited credits',
      'All platforms',
      'Dedicated support',
      'Team collaboration',
      'White-label options'
    ]
  }
];
</script>

<style scoped>
.highlighted-plan {
  border: 2px solid #6366f1;
  transform: scale(1.05);
}
</style>
