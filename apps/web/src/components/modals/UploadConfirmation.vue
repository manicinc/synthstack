<template>
  <q-dialog
    v-model="showDialog"
    persistent
  >
    <q-card class="confirm-card">
      <q-card-section class="confirm-header">
        <q-icon
          :name="isPublicMode ? 'public' : 'lock'"
          size="40px"
          :color="isPublicMode ? 'warning' : 'positive'"
        />
        <h3>{{ isPublicMode ? 'Confirm Public Upload' : 'Upload Model' }}</h3>
      </q-card-section>

      <q-card-section>
        <div class="file-info">
          <div class="file-name">
            {{ fileName }}
          </div>
          <div class="file-size">
            {{ formattedSize }}
          </div>
        </div>

        <div
          v-if="isPublicMode"
          class="public-reminder"
        >
          <q-icon
            name="warning"
            color="warning"
          />
          <div>
            <strong>Reminder: This file will be shared publicly</strong>
            <p>
              Anyone will be able to view and download this model. 
              <a
                href="#"
                @click.prevent="showDetails = true"
              >Learn more</a>
            </p>
          </div>
        </div>

        <div
          v-else
          class="private-note"
        >
          <q-icon
            name="check_circle"
            color="positive"
          />
          <div>
            <strong>File will remain private</strong>
            <p>Only you can access this model.</p>
          </div>
        </div>

        <q-checkbox
          v-if="isPublicMode"
          v-model="confirmPublic"
          label="I understand this file will be public"
          color="warning"
          class="confirm-checkbox"
        />
      </q-card-section>

      <q-card-actions class="confirm-actions">
        <q-btn
          flat
          label="Cancel"
          @click="cancel"
        />
        <q-space />
        <q-btn
          color="primary"
          :label="isPublicMode ? 'Upload Publicly' : 'Upload'"
          :disable="isPublicMode && !confirmPublic"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Details Dialog -->
  <q-dialog v-model="showDetails">
    <q-card style="max-width: 450px">
      <q-card-section>
        <h4 class="q-mt-none">
          About Public Sharing
        </h4>
        <p>When you upload a file publicly:</p>
        <ul>
          <li>It appears in our community model library</li>
          <li>Other users can download and use it</li>
          <li>You help grow the community knowledge base</li>
          <li>You get access to premium AI features for free</li>
        </ul>
        <p>
          <strong>Files cannot be made private after upload.</strong>
          If you need privacy, upgrade to a paid plan or use the Free (Private) tier.
        </p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-close-popup
          flat
          color="primary"
          label="Got it"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  fileName: string
  fileSize: number
  isPublicMode: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const showDialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const confirmPublic = ref(false)
const showDetails = ref(false)

const formattedSize = computed(() => {
  const bytes = props.fileSize
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
})

function cancel() {
  confirmPublic.value = false
  emit('cancel')
  showDialog.value = false
}

function confirm() {
  if (props.isPublicMode && !confirmPublic.value) return
  confirmPublic.value = false
  emit('confirm')
  showDialog.value = false
}
</script>

<style lang="scss" scoped>
.confirm-card {
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
}

.confirm-header {
  text-align: center;
  
  h3 {
    margin: 12px 0 0;
    font-size: 1.25rem;
  }
}

.file-info {
  text-align: center;
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  margin-bottom: 16px;
  
  .file-name {
    font-weight: 600;
    word-break: break-all;
    margin-bottom: 4px;
  }
  
  .file-size {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
}

.public-reminder, .private-note {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  
  .q-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  strong {
    display: block;
    margin-bottom: 4px;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    
    a {
      color: var(--q-primary);
    }
  }
}

.public-reminder {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.private-note {
  background: rgba(34, 197, 94, 0.1);
}

.confirm-checkbox {
  margin-top: 8px;
}

.confirm-actions {
  padding: 16px;
  border-top: 1px solid var(--color-border);
}
</style>




