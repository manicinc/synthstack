<template>
  <q-dialog
    v-model="showDialog"
    persistent
  >
    <q-card class="warning-card">
      <q-card-section class="warning-header">
        <q-icon
          name="warning"
          size="48px"
          color="warning"
        />
        <h2>Public Sharing Notice</h2>
      </q-card-section>

      <q-card-section class="warning-content">
        <div class="warning-message">
          <p class="primary-warning">
            <strong>By using the Free (Public) tier, your uploaded files will be shared publicly.</strong>
          </p>
          
          <div class="warning-details">
            <div class="detail-item">
              <q-icon
                name="public"
                color="warning"
              />
              <div>
                <strong>Files become public</strong>
                <p>Your STL, OBJ, or 3MF files will be available for anyone to view and download.</p>
              </div>
            </div>
            
            <div class="detail-item">
              <q-icon
                name="people"
                color="warning"
              />
              <div>
                <strong>Community access</strong>
                <p>Other users can use your models to generate their own print profiles.</p>
              </div>
            </div>
            
            <div class="detail-item">
              <q-icon
                name="lock_open"
                color="warning"
              />
              <div>
                <strong>Cannot be undone</strong>
                <p>Once shared, files cannot be made private again.</p>
              </div>
            </div>
          </div>

          <div class="benefit-note">
            <q-icon
              name="auto_awesome"
              color="primary"
            />
            <p>
              <strong>In exchange,</strong> you get access to our premium AI models 
              and full customization features for free!
            </p>
          </div>
        </div>

        <!-- Consent Checkbox -->
        <div class="consent-section">
          <q-checkbox
            v-model="consent1"
            label="I understand my files will be shared publicly"
            color="warning"
          />
          <q-checkbox
            v-model="consent2"
            label="I confirm I have the rights to share these files"
            color="warning"
          />
          <q-checkbox
            v-model="consent3"
            label="I understand this cannot be undone"
            color="warning"
          />
        </div>
      </q-card-section>

      <q-card-actions class="warning-actions">
        <q-btn
          flat
          label="Go Back"
          @click="cancel"
        />
        <q-space />
        <q-btn
          flat
          color="primary"
          label="Keep Private (Limited)"
          @click="choosePrivate"
        />
        <q-btn
          color="warning"
          text-color="dark"
          label="Accept & Continue"
          :disable="!allConsented"
          @click="acceptPublic"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'accept-public'): void
  (e: 'choose-private'): void
  (e: 'cancel'): void
}>()

const showDialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const consent1 = ref(false)
const consent2 = ref(false)
const consent3 = ref(false)

const allConsented = computed(() => consent1.value && consent2.value && consent3.value)

function cancel() {
  resetConsents()
  emit('cancel')
  showDialog.value = false
}

function choosePrivate() {
  resetConsents()
  emit('choose-private')
  showDialog.value = false
}

function acceptPublic() {
  if (allConsented.value) {
    emit('accept-public')
    showDialog.value = false
  }
}

function resetConsents() {
  consent1.value = false
  consent2.value = false
  consent3.value = false
}

watch(showDialog, (val) => {
  if (!val) resetConsents()
})
</script>

<style lang="scss" scoped>
.warning-card {
  width: 100%;
  max-width: 560px;
  border: 2px solid #f59e0b;
  border-radius: 16px;
}

.warning-header {
  text-align: center;
  padding-bottom: 0;
  
  h2 {
    margin: 16px 0 0;
    font-size: 1.5rem;
  }
}

.warning-content {
  padding-top: 8px;
}

.warning-message {
  .primary-warning {
    text-align: center;
    font-size: 1rem;
    margin: 0 0 24px;
    padding: 16px;
    background: rgba(245, 158, 11, 0.1);
    border-radius: 8px;
  }
}

.warning-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.detail-item {
  display: flex;
  gap: 12px;
  
  .q-icon {
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  strong {
    display: block;
    margin-bottom: 4px;
  }
  
  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}

.benefit-note {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.1);
  border-radius: 8px;
  margin-bottom: 24px;
  
  .q-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.consent-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
}

.warning-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}
</style>




