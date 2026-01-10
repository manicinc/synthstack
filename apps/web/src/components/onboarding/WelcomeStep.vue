<template>
  <div class="welcome-step q-pa-lg text-center">
    <div class="gradient-text text-h2 text-weight-bold q-mb-md">
      Welcome to SynthStack! 🚀
    </div>
    <div class="text-h5 q-mb-lg text-grey-7">
      Your Agency in a Box
    </div>

    <q-card
      class="feature-card q-mt-xl q-mx-auto"
      style="max-width: 700px"
    >
      <q-card-section>
        <div class="text-h6 q-mb-md">
          Build 10x Faster with:
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-icon
              name="check_circle"
              color="positive"
              size="24px"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">Cross-Platform Support</span>
            <div class="text-caption text-grey-7 q-ml-lg">
              Web, iOS, Android, Desktop, PWA
            </div>
          </div>
          <div class="col-12 col-md-6">
            <q-icon
              name="check_circle"
              color="positive"
              size="24px"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">AI Copilot</span>
            <div class="text-caption text-grey-7 q-ml-lg">
              RAG-powered assistant (⌘K)
            </div>
          </div>
          <div class="col-12 col-md-6">
            <q-icon
              name="check_circle"
              color="positive"
              size="24px"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">Directus CMS</span>
            <div class="text-caption text-grey-7 q-ml-lg">
              Models your Postgres DB exactly
            </div>
          </div>
          <div class="col-12 col-md-6">
            <q-icon
              name="check_circle"
              color="positive"
              size="24px"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">Complete Toolkit</span>
            <div class="text-caption text-grey-7 q-ml-lg">
              Auth, Billing, Email, Analytics
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="q-mt-xl text-body1 text-grey-7">
      Let's get you set up in just a few steps.
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(
    90deg,
    #6366f1 0%,
    #00d4aa 25%,
    #2d9cdb 50%,
    #6c63ff 75%,
    #6366f1 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 4s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.feature-card {
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}
</style>
