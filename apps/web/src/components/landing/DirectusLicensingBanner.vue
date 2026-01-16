<template>
  <section class="licensing-notice-section q-py-lg bg-grey-2">
    <div class="container">
      <q-banner
        class="licensing-banner bg-white"
        rounded
      >
        <template #avatar>
          <q-avatar
            size="48px"
            color="primary"
            text-color="white"
          >
            <q-icon
              name="gavel"
              size="28px"
            />
          </q-avatar>
        </template>

        <div class="row q-col-gutter-md">
          <div class="col-12">
            <div class="text-h5 text-weight-bold q-mb-md">
              Directus Self-Hosted Licensing
            </div>

            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-6">
                <q-card
                  flat
                  class="license-info-card bg-green-1"
                >
                  <q-card-section>
                    <div class="row items-center q-mb-sm">
                      <q-icon
                        name="check_circle"
                        color="positive"
                        size="24px"
                        class="q-mr-sm"
                      />
                      <div class="text-h6 text-positive text-weight-bold">
                        Free for Most Users
                      </div>
                    </div>
                    <p class="text-body2 q-mb-none">
                      Organizations with <strong>less than $5M USD</strong> in annual revenue, budget, or funding
                      can use <strong>Directus {{ directusVersion }}</strong> in production
                      <strong>completely free</strong> under the
                      <a
                        href="https://directus.io/bsl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary"
                      >
                        BSL 1.1 license
                      </a>.
                    </p>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card
                  flat
                  class="license-info-card bg-orange-1"
                >
                  <q-card-section>
                    <div class="row items-center q-mb-sm">
                      <q-icon
                        name="business_center"
                        color="warning"
                        size="24px"
                        class="q-mr-sm"
                      />
                      <div class="text-h6 text-warning text-weight-bold">
                        Enterprise License
                      </div>
                    </div>
                    <p class="text-body2 q-mb-none">
                      Organizations <strong>above $5M USD</strong> in total finances must
                      <a
                        href="https://directus.io/pricing/self-hosted"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary"
                      >
                        purchase a commercial license
                      </a>
                      (starting at <strong>$15,000/year</strong>).
                    </p>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <q-card
              flat
              class="migration-support-card bg-blue-1"
            >
              <q-card-section class="row items-center">
                <q-icon
                  name="support_agent"
                  color="primary"
                  size="32px"
                  class="q-mr-md"
                />
                <div class="col">
                  <div class="text-subtitle1 text-weight-bold text-primary q-mb-xs">
                    Enterprise Migration Support
                  </div>
                  <p class="text-body2 q-mb-none">
                    We offer <strong>custom migration assistance</strong> to help you transition to our proprietary CMS
                    with <strong>zero data loss</strong> and <strong>full feature parity</strong>. Our backend is database-agnostic,
                    making the switch seamless for enterprise users.
                  </p>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 text-center q-mt-md">
            <q-btn
              unelevated
              color="primary"
              label="Read Full License Documentation"
              icon-right="open_in_new"
              href="https://directus.io/bsl-faq"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              no-caps
              class="license-cta-btn"
            />
          </div>
        </div>
      </q-banner>
    </div>
  </section>
</template>

<script setup lang="ts">
// Directus version from services/directus/Dockerfile
const directusVersion = '11.3.5'
</script>

<style lang="scss" scoped>
.licensing-notice-section {
  border-top: 1px solid var(--q-color-grey-4);
  border-bottom: 1px solid var(--q-color-grey-4);
  background: linear-gradient(to bottom, #f8f9fa, #ffffff);
}

.licensing-banner {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--q-color-grey-4);
  overflow: visible;
}

.license-info-card {
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  }

  p {
    line-height: 1.6;
    color: var(--q-color-grey-9);

    a {
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;

      &:hover {
        text-decoration: underline;
      }
    }

    strong {
      font-weight: 700;
    }
  }
}

.migration-support-card {
  border: 2px solid var(--q-color-primary);
  border-radius: 12px;

  p {
    line-height: 1.6;
    color: var(--q-color-grey-9);

    strong {
      font-weight: 700;
      color: var(--q-color-primary);
    }
  }
}

.license-cta-btn {
  min-width: 280px;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
    transform: translateY(-2px);
  }
}

// Dark mode support
.body--dark {
  .licensing-notice-section {
    background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .licensing-banner {
    background: #1e1e1e !important;
    border-color: rgba(255, 255, 255, 0.12);
  }

  .license-info-card {
    background: #2a2a2a !important;
    border-color: rgba(255, 255, 255, 0.15);

    &.bg-green-1 {
      background: rgba(76, 175, 80, 0.15) !important;
      border-color: rgba(76, 175, 80, 0.4);

      .text-positive {
        color: #81c784 !important;
      }
    }

    &.bg-orange-1 {
      background: rgba(255, 152, 0, 0.15) !important;
      border-color: rgba(255, 152, 0, 0.4);

      .text-warning {
        color: #ffb74d !important;
      }
    }

    p {
      color: #e0e0e0;

      a {
        color: #64b5f6;

        &:hover {
          color: #90caf9;
        }
      }

      strong {
        color: #ffffff;
      }
    }
  }

  .migration-support-card {
    background: rgba(33, 150, 243, 0.15) !important;
    border-color: #42a5f5;

    .text-primary {
      color: #64b5f6 !important;
    }

    p {
      color: #e0e0e0;

      strong {
        color: #90caf9;
      }
    }
  }
}
</style>
