<template>
  <q-page>
    <div
      v-if="loading"
      class="q-pa-lg"
    >
      <q-skeleton
        height="200px"
        class="q-mb-md"
      />
      <q-skeleton height="400px" />
    </div>

    <div
      v-else-if="!proposal"
      class="text-center q-pa-xl"
    >
      <q-icon
        name="description"
        size="64px"
        color="grey-5"
      />
      <p class="text-h6 text-grey-7 q-mt-md">
        Proposal not found
      </p>
    </div>

    <div
      v-else
      class="proposal-view"
    >
      <!-- Proposal Header -->
      <div class="proposal-header">
        <q-toolbar class="bg-white text-dark">
          <q-btn
            flat
            round
            icon="arrow_back"
            @click="$router.back()"
          />
          <q-toolbar-title>
            <div class="text-h5">
              {{ proposal.title }}
            </div>
            <div class="text-caption text-grey-7">
              {{ proposal.project?.name || 'No Project' }}
            </div>
          </q-toolbar-title>
          <q-chip
            :color="getStatusColor(proposal.status)"
            text-color="white"
          >
            {{ proposal.status }}
          </q-chip>
        </q-toolbar>
      </div>

      <!-- Proposal Content -->
      <div class="proposal-content">
        <q-card
          flat
          bordered
          class="proposal-card q-ma-lg"
        >
          <!-- Cover Section -->
          <div
            v-if="proposal.cover_image"
            class="proposal-cover"
            :style="{ backgroundImage: `url(${proposal.cover_image})` }"
          >
            <div class="proposal-cover-overlay">
              <h1 class="text-h3 text-white">
                {{ proposal.title }}
              </h1>
              <p class="text-subtitle1 text-white">
                {{ proposal.subtitle }}
              </p>
            </div>
          </div>

          <!-- Proposal Meta -->
          <q-card-section class="proposal-meta bg-grey-1">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <div class="text-caption text-grey-7">
                  Proposal Date
                </div>
                <div class="text-body1">
                  {{ formatDate(proposal.proposal_date) }}
                </div>
              </div>
              <div class="col-12 col-md-3">
                <div class="text-caption text-grey-7">
                  Valid Until
                </div>
                <div class="text-body1">
                  {{ formatDate(proposal.valid_until) }}
                </div>
              </div>
              <div class="col-12 col-md-3">
                <div class="text-caption text-grey-7">
                  Total Value
                </div>
                <div class="text-h6 text-primary">
                  {{ formatCurrency(proposal.total_value) }}
                </div>
              </div>
              <div class="col-12 col-md-3">
                <div class="text-caption text-grey-7">
                  Payment Terms
                </div>
                <div class="text-body1">
                  {{ proposal.payment_terms || 'N/A' }}
                </div>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Proposal Blocks -->
          <q-card-section class="proposal-blocks">
            <div
              v-for="block in sortedBlocks"
              :key="block.id"
              class="proposal-block q-mb-lg"
            >
              <component
                :is="getBlockComponent(block.block_type)"
                :block="block"
              />
            </div>
          </q-card-section>

          <q-separator />

          <!-- Signature Section -->
          <q-card-section
            v-if="proposal.requires_signature"
            class="proposal-signature"
          >
            <div class="text-h6 q-mb-md">
              Signature
            </div>

            <div
              v-if="proposal.signed_at"
              class="signature-complete"
            >
              <q-icon
                name="check_circle"
                color="positive"
                size="48px"
              />
              <div class="q-ml-md">
                <div class="text-body1">
                  Signed by {{ proposal.signed_by_name }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ formatDate(proposal.signed_at) }}
                </div>
              </div>
            </div>

            <div v-else>
              <p class="text-body2 text-grey-7 q-mb-md">
                Please review the proposal and sign below to accept the terms.
              </p>

              <div class="signature-pad-container q-mb-md">
                <canvas
                  ref="signaturePad"
                  class="signature-pad"
                  width="600"
                  height="200"
                />
              </div>

              <div class="row q-gutter-sm">
                <q-btn
                  outline
                  color="grey-7"
                  label="Clear"
                  @click="clearSignature"
                />
                <q-btn
                  unelevated
                  color="primary"
                  label="Sign Proposal"
                  icon="draw"
                  :loading="signing"
                  @click="signProposal"
                />
              </div>
            </div>
          </q-card-section>

          <!-- Actions -->
          <q-card-section
            v-if="!proposal.signed_at"
            class="text-right bg-grey-1"
          >
            <q-btn
              outline
              color="primary"
              label="Download PDF"
              icon="download"
              class="q-mr-sm"
              @click="downloadProposal"
            />
            <q-btn
              v-if="proposal.status === 'sent' && !proposal.requires_signature"
              unelevated
              color="positive"
              label="Accept Proposal"
              icon="check"
              @click="acceptProposal"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProposals } from 'src/composables/useProposals';
import { date } from 'quasar';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

// Content block components
import TextBlock from 'src/components/blocks/TextBlock.vue';
import ImageBlock from 'src/components/blocks/ImageBlock.vue';
import PricingTableBlock from 'src/components/blocks/PricingTableBlock.vue';
import TimelineBlock from 'src/components/blocks/TimelineBlock.vue';
import TeamBlock from 'src/components/blocks/TeamBlock.vue';
import TestimonialBlock from 'src/components/blocks/TestimonialBlock.vue';

const route = useRoute();
const router = useRouter();
const { getProposal, signProposal: signProposalApi } = useProposals();

const proposal = ref<any>(null);
const loading = ref(false);
const signing = ref(false);
const signaturePad = ref<HTMLCanvasElement | null>(null);
let signaturePadInstance: any = null;

const sortedBlocks = computed(() => {
  if (!proposal.value?.blocks) return [];
  return [...proposal.value.blocks].sort((a, b) => a.sort_order - b.sort_order);
});

const getBlockComponent = (blockType: string) => {
  const components: Record<string, any> = {
    text: TextBlock,
    image: ImageBlock,
    pricing_table: PricingTableBlock,
    timeline: TimelineBlock,
    team: TeamBlock,
    testimonial: TestimonialBlock
  };
  return components[blockType] || TextBlock;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'grey',
    sent: 'blue',
    viewed: 'info',
    accepted: 'positive',
    rejected: 'negative',
    expired: 'grey-7'
  };
  return colors[status] || 'grey';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return date.formatDate(dateStr, 'MMMM D, YYYY');
};

const loadProposal = async () => {
  loading.value = true;
  try {
    const proposalId = route.params.id as string;
    const response = await getProposal(proposalId);
    proposal.value = response;
  } catch (error) {
    logError('Failed to load proposal:', error);
  } finally {
    loading.value = false;
  }
};

const initSignaturePad = () => {
  if (!signaturePad.value) return;

  // Simple signature pad implementation
  const canvas = signaturePad.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
  });

  signaturePadInstance = { canvas, ctx };
};

const clearSignature = () => {
  if (!signaturePadInstance) return;
  const { canvas, ctx } = signaturePadInstance;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const signProposal = async () => {
  if (!proposal.value || !signaturePad.value) return;

  signing.value = true;
  try {
    const signatureData = signaturePad.value.toDataURL();
    await signProposalApi(proposal.value.id, {
      signature: signatureData,
      signed_by_name: 'Client Name' // Would come from user profile
    });

    await loadProposal(); // Reload to show signed state
  } catch (error) {
    logError('Failed to sign proposal:', error);
  } finally {
    signing.value = false;
  }
};

const acceptProposal = async () => {
  // Implementation for accepting proposal without signature
  devLog('Accept proposal');
};

const downloadProposal = () => {
  // Implementation for downloading PDF
  devLog('Download proposal');
};

onMounted(() => {
  loadProposal();
  setTimeout(() => {
    initSignaturePad();
  }, 500);
});
</script>

<style scoped lang="scss">
.proposal-view {
  min-height: 100vh;
}

.proposal-header {
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.proposal-content {
  background: $grey-2;
  min-height: calc(100vh - 64px);
}

.proposal-card {
  max-width: 900px;
  margin: 0 auto;
}

.proposal-cover {
  height: 400px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.proposal-cover-overlay {
  background: rgba(0, 0, 0, 0.5);
  padding: 48px;
  text-align: center;
  width: 100%;
}

.proposal-meta {
  padding: 24px;
}

.proposal-blocks {
  padding: 48px;
  background: white;
}

.proposal-block {
  &:last-child {
    margin-bottom: 0;
  }
}

.signature-pad-container {
  border: 2px dashed $grey-5;
  border-radius: 8px;
  background: white;
  display: inline-block;
}

.signature-pad {
  display: block;
  cursor: crosshair;
}

.signature-complete {
  display: flex;
  align-items: center;
  padding: 24px;
  background: $grey-2;
  border-radius: 8px;
}
</style>
