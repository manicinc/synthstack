<template>
  <q-page class="upload-wizard-page">
    <div class="wizard-container">
      <!-- Header -->
      <div class="wizard-header">
        <router-link
          to="/community"
          class="back-link"
        >
          <q-icon name="arrow_back" /> Back to Community
        </router-link>
        <h1>Share Your Creation</h1>
        <p>Contribute to the open source 3D printing community</p>
      </div>

      <!-- Progress Steps -->
      <div class="wizard-steps">
        <div 
          v-for="(step, idx) in steps" 
          :key="step.id"
          class="step"
          :class="{ active: currentStep === idx, completed: currentStep > idx }"
        >
          <div class="step-indicator">
            <q-icon
              v-if="currentStep > idx"
              name="check"
            />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        <!-- Step 1: Upload Files -->
        <div
          v-show="currentStep === 0"
          class="step-panel"
        >
          <h2>Upload Your Model</h2>
          <p class="step-desc">
            Support STL, OBJ, 3MF files up to 100MB
          </p>
          
          <div 
            class="upload-zone"
            :class="{ 'drag-over': isDragging, 'has-file': modelFile }"
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @click="triggerUpload"
          >
            <input 
              ref="fileInput" 
              type="file" 
              accept=".stl,.obj,.3mf" 
              hidden 
              @change="handleFileSelect" 
            >
            
            <template v-if="!modelFile">
              <q-icon
                name="cloud_upload"
                size="64px"
              />
              <p>Drag & drop your 3D model</p>
              <span class="upload-hint">or click to browse</span>
            </template>
            
            <template v-else>
              <div class="file-preview">
                <q-icon
                  name="view_in_ar"
                  size="48px"
                  color="primary"
                />
                <div class="file-info">
                  <span class="file-name">{{ modelFile.name }}</span>
                  <span class="file-size">{{ formatSize(modelFile.size) }}</span>
                </div>
                <q-btn
                  flat
                  round
                  icon="close"
                  @click.stop="removeFile"
                />
              </div>
            </template>
          </div>

          <!-- Preview Images -->
          <div
            v-if="modelFile"
            class="images-section"
          >
            <h4>Add Preview Images (Optional)</h4>
            <p class="text-caption">
              Add photos of your printed model
            </p>
            <div class="image-grid">
              <div 
                v-for="(img, idx) in previewImages" 
                :key="idx"
                class="image-slot"
              >
                <img
                  :src="img.preview"
                  :alt="`Preview ${idx + 1}`"
                >
                <q-btn 
                  round 
                  flat 
                  icon="close" 
                  size="sm" 
                  class="remove-btn"
                  @click="removeImage(idx)" 
                />
              </div>
              <div 
                v-if="previewImages.length < 5"
                class="image-slot add-slot"
                @click="triggerImageUpload"
              >
                <q-icon
                  name="add_photo_alternate"
                  size="32px"
                />
                <span>Add Image</span>
              </div>
            </div>
            <input 
              ref="imageInput" 
              type="file" 
              accept="image/*" 
              hidden 
              multiple
              @change="handleImageSelect" 
            >
          </div>
        </div>

        <!-- Step 2: Model Details -->
        <div
          v-show="currentStep === 1"
          class="step-panel"
        >
          <h2>Model Details</h2>
          <p class="step-desc">
            Tell us about your creation
          </p>

          <div class="form-grid">
            <q-input 
              v-model="form.title"
              label="Title *"
              outlined
              :rules="[val => !!val || 'Title is required']"
              class="full-width"
            />

            <q-input 
              v-model="form.description"
              label="Description *"
              type="textarea"
              outlined
              :rules="[val => !!val || 'Description is required']"
              hint="Describe what this model is, its purpose, and any special features"
              class="full-width"
            />

            <q-select
              v-model="form.category"
              label="Category *"
              outlined
              :options="categories"
              emit-value
              map-options
            />

            <q-select
              v-model="form.tags"
              label="Tags"
              outlined
              multiple
              use-chips
              use-input
              new-value-mode="add-unique"
              :options="suggestedTags"
              hint="Add tags to help others find your model"
            />

            <q-input 
              v-model="form.version"
              label="Version"
              outlined
              placeholder="1.0.0"
            />

            <q-input 
              v-model="form.sourceUrl"
              label="Source URL (if remix)"
              outlined
              placeholder="https://..."
              hint="Credit the original if this is a remix"
            />
          </div>
        </div>

        <!-- Step 3: Print Settings -->
        <div
          v-show="currentStep === 2"
          class="step-panel"
        >
          <h2>Recommended Print Settings</h2>
          <p class="step-desc">
            Help others print your model successfully
          </p>

          <div class="form-grid">
            <q-select
              v-model="form.recommendedMaterial"
              label="Recommended Material *"
              outlined
              :options="materials"
              emit-value
              map-options
            />

            <q-select
              v-model="form.supportedMaterials"
              label="Also Works With"
              outlined
              multiple
              use-chips
              :options="materials"
              emit-value
              map-options
            />

            <div class="form-group">
              <label>Layer Height</label>
              <div class="range-inputs">
                <q-input
                  v-model.number="form.layerHeightMin"
                  type="number"
                  step="0.04"
                  outlined
                  dense
                  suffix="mm"
                />
                <span>to</span>
                <q-input
                  v-model.number="form.layerHeightMax"
                  type="number"
                  step="0.04"
                  outlined
                  dense
                  suffix="mm"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Infill Percentage</label>
              <div class="range-inputs">
                <q-input
                  v-model.number="form.infillMin"
                  type="number"
                  outlined
                  dense
                  suffix="%"
                />
                <span>to</span>
                <q-input
                  v-model.number="form.infillMax"
                  type="number"
                  outlined
                  dense
                  suffix="%"
                />
              </div>
            </div>

            <q-select
              v-model="form.supportsRequired"
              label="Supports Required"
              outlined
              :options="[
                { label: 'No supports needed', value: 'none' },
                { label: 'Supports recommended', value: 'recommended' },
                { label: 'Supports required', value: 'required' },
                { label: 'Tree supports recommended', value: 'tree' }
              ]"
              emit-value
              map-options
            />

            <q-select
              v-model="form.bedAdhesion"
              label="Bed Adhesion"
              outlined
              :options="[
                { label: 'None needed', value: 'none' },
                { label: 'Skirt', value: 'skirt' },
                { label: 'Brim recommended', value: 'brim' },
                { label: 'Raft recommended', value: 'raft' }
              ]"
              emit-value
              map-options
            />

            <q-input 
              v-model="form.printNotes"
              label="Print Notes"
              type="textarea"
              outlined
              hint="Any tips or warnings for printing this model"
              class="full-width"
            />
          </div>

          <div class="compatible-printers">
            <h4>Compatible Printers (Optional)</h4>
            <q-select
              v-model="form.testedPrinters"
              label="Tested On"
              outlined
              multiple
              use-chips
              :options="printerOptions"
              option-value="id"
              option-label="displayName"
              emit-value
              map-options
            />
          </div>
        </div>

        <!-- Step 4: License & Copyright -->
        <div
          v-show="currentStep === 3"
          class="step-panel"
        >
          <h2>License & Copyright</h2>
          <p class="step-desc">
            Choose how others can use your work
          </p>

          <div class="license-grid">
            <div 
              v-for="license in licenses"
              :key="license.id"
              class="license-card"
              :class="{ selected: form.license === license.id }"
              @click="form.license = license.id"
            >
              <div class="license-header">
                <q-icon
                  :name="license.icon"
                  size="24px"
                />
                <span class="license-name">{{ license.name }}</span>
              </div>
              <p class="license-desc">
                {{ license.description }}
              </p>
              <div class="license-permissions">
                <span
                  v-if="license.commercial"
                  class="perm allow"
                >
                  <q-icon name="check" /> Commercial use
                </span>
                <span
                  v-else
                  class="perm deny"
                >
                  <q-icon name="close" /> No commercial use
                </span>
                <span
                  v-if="license.modification"
                  class="perm allow"
                >
                  <q-icon name="check" /> Modifications allowed
                </span>
                <span
                  v-if="license.attribution"
                  class="perm"
                >
                  <q-icon name="info" /> Attribution required
                </span>
                <span
                  v-if="license.shareAlike"
                  class="perm"
                >
                  <q-icon name="info" /> Share alike
                </span>
              </div>
            </div>
          </div>

          <div class="copyright-section">
            <h4>Copyright Information</h4>
            
            <q-toggle 
              v-model="form.isOriginal"
              label="This is my original work"
            />
            
            <div
              v-if="!form.isOriginal"
              class="attribution-fields"
            >
              <q-input 
                v-model="form.originalCreator"
                label="Original Creator"
                outlined
              />
              <q-input 
                v-model="form.originalSource"
                label="Original Source URL"
                outlined
              />
              <q-input 
                v-model="form.originalLicense"
                label="Original License"
                outlined
              />
            </div>

            <q-input 
              v-model="form.copyrightHolder"
              label="Copyright Holder *"
              outlined
              hint="Usually your name or organization"
            />

            <q-input 
              v-model.number="form.copyrightYear"
              label="Copyright Year"
              outlined
              type="number"
              :placeholder="new Date().getFullYear().toString()"
            />
          </div>

          <div class="legal-acknowledgment">
            <q-checkbox v-model="form.ackOwnership">
              I confirm I have the right to share this model and grant the selected license
            </q-checkbox>
            <q-checkbox v-model="form.ackTerms">
              I agree to the <router-link to="/terms">
                Terms of Service
              </router-link> and 
              <router-link to="/community/guidelines">
                Community Guidelines
              </router-link>
            </q-checkbox>
          </div>
        </div>

        <!-- Step 5: Creator Profile -->
        <div
          v-show="currentStep === 4"
          class="step-panel"
        >
          <h2>Creator Profile</h2>
          <p class="step-desc">
            Build your creator reputation
          </p>

          <div class="creator-profile-card">
            <div class="profile-header">
              <div
                class="avatar-upload"
                @click="triggerAvatarUpload"
              >
                <img
                  v-if="creatorAvatar"
                  :src="creatorAvatar"
                  alt="Avatar"
                >
                <q-icon
                  v-else
                  name="person"
                  size="48px"
                />
                <div class="avatar-overlay">
                  <q-icon name="photo_camera" />
                </div>
              </div>
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                hidden
                @change="handleAvatarUpload"
              >
              
              <div class="profile-info">
                <q-input 
                  v-model="creator.displayName"
                  label="Display Name *"
                  outlined
                  dense
                />
                <q-input 
                  v-model="creator.bio"
                  label="Bio"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                />
              </div>
            </div>

            <div class="profile-links">
              <h4>Social Links (Optional)</h4>
              <div class="links-grid">
                <q-input
                  v-model="creator.website"
                  label="Website"
                  outlined
                  dense
                >
                  <template #prepend>
                    <q-icon name="language" />
                  </template>
                </q-input>
                <q-input
                  v-model="creator.github"
                  label="GitHub"
                  outlined
                  dense
                >
                  <template #prepend>
                    <q-icon name="mdi-github" />
                  </template>
                </q-input>
                <q-input
                  v-model="creator.twitter"
                  label="Twitter/X"
                  outlined
                  dense
                >
                  <template #prepend>
                    <q-icon name="mdi-twitter" />
                  </template>
                </q-input>
                <q-input
                  v-model="creator.youtube"
                  label="YouTube"
                  outlined
                  dense
                >
                  <template #prepend>
                    <q-icon name="mdi-youtube" />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="creator-program">
              <div class="program-badge">
                <q-icon
                  name="verified"
                  color="primary"
                  size="24px"
                />
                <span>Open Source Art Program</span>
              </div>
              <p>
                Join our creator program to earn recognition and potentially share in future 
                revenue from your popular designs.
              </p>
              <q-toggle 
                v-model="creator.joinProgram"
                label="I want to join the Open Source Art Program"
              />
              
              <div
                v-if="creator.joinProgram"
                class="program-details"
              >
                <q-checkbox v-model="creator.allowTips">
                  Enable tips from the community
                </q-checkbox>
                <q-checkbox v-model="creator.revenueShare">
                  Opt-in to future revenue sharing (coming soon)
                </q-checkbox>
                <q-input 
                  v-model="creator.paymentEmail"
                  label="Payment Email (for tips/revenue)"
                  outlined
                  hint="We'll contact you when tips or revenue sharing becomes available"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Step 6: Review & Submit -->
        <div
          v-show="currentStep === 5"
          class="step-panel"
        >
          <h2>Review & Submit</h2>
          <p class="step-desc">
            Double-check everything before publishing
          </p>

          <div class="review-summary">
            <div class="review-section">
              <h4><q-icon name="view_in_ar" /> Model</h4>
              <div class="review-item">
                <span>File:</span>
                <span>{{ modelFile?.name || 'No file' }}</span>
              </div>
              <div class="review-item">
                <span>Title:</span>
                <span>{{ form.title }}</span>
              </div>
              <div class="review-item">
                <span>Category:</span>
                <span>{{ form.category }}</span>
              </div>
            </div>

            <div class="review-section">
              <h4><q-icon name="settings" /> Print Settings</h4>
              <div class="review-item">
                <span>Material:</span>
                <span>{{ form.recommendedMaterial }}</span>
              </div>
              <div class="review-item">
                <span>Supports:</span>
                <span>{{ form.supportsRequired }}</span>
              </div>
            </div>

            <div class="review-section">
              <h4><q-icon name="gavel" /> License</h4>
              <div class="review-item">
                <span>License:</span>
                <span>{{ licenses.find(l => l.id === form.license)?.name }}</span>
              </div>
              <div class="review-item">
                <span>Copyright:</span>
                <span>© {{ form.copyrightYear || new Date().getFullYear() }} {{ form.copyrightHolder }}</span>
              </div>
            </div>
          </div>

          <div class="moderation-note">
            <q-icon
              name="security"
              size="24px"
              color="primary"
            />
            <div>
              <strong>Moderation Process</strong>
              <p>
                Your submission will be reviewed by our AI system and may be subject to 
                human moderation. Most submissions are approved within minutes.
              </p>
            </div>
          </div>

          <div class="submit-options">
            <q-checkbox v-model="submitOptions.notifyOnApproval">
              Notify me when approved
            </q-checkbox>
            <q-checkbox v-model="submitOptions.allowComments">
              Allow comments on this model
            </q-checkbox>
            <q-checkbox v-model="submitOptions.showInCatalog">
              Show in community catalog
            </q-checkbox>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="wizard-nav">
        <q-btn 
          v-if="currentStep > 0"
          flat 
          label="Back"
          icon="arrow_back"
          @click="prevStep"
        />
        <q-space />
        <q-btn 
          v-if="currentStep < steps.length - 1"
          color="primary"
          label="Continue"
          icon-right="arrow_forward"
          :disable="!canProceed"
          @click="nextStep"
        />
        <q-btn 
          v-else
          color="primary"
          label="Submit for Review"
          icon="cloud_upload"
          :loading="submitting"
          :disable="!canSubmit"
          @click="submit"
        />
      </div>
    </div>

    <!-- Success Dialog -->
    <q-dialog
      v-model="showSuccess"
      persistent
    >
      <q-card class="success-card">
        <q-card-section class="text-center">
          <q-icon
            name="check_circle"
            size="64px"
            color="positive"
          />
          <h3>Submitted Successfully!</h3>
          <p>Your model is being reviewed. You'll be notified when it's approved.</p>
          <p class="text-caption">
            Estimated review time: 2-5 minutes
          </p>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            color="primary"
            label="View My Uploads"
            to="/community/my-uploads"
          />
          <q-btn
            flat
            label="Upload Another"
            @click="resetWizard"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Steps
const steps = [
  { id: 'upload', label: 'Upload' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Print Settings' },
  { id: 'license', label: 'License' },
  { id: 'profile', label: 'Creator' },
  { id: 'review', label: 'Review' }
]

const currentStep = ref(0)
const submitting = ref(false)
const showSuccess = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const modelFile = ref<File | null>(null)
const previewImages = ref<Array<{ file: File; preview: string }>>([])
const isDragging = ref(false)

// Form data
const form = ref({
  title: '',
  description: '',
  category: '',
  tags: [] as string[],
  version: '1.0.0',
  sourceUrl: '',
  recommendedMaterial: 'PLA',
  supportedMaterials: [] as string[],
  layerHeightMin: 0.12,
  layerHeightMax: 0.28,
  infillMin: 10,
  infillMax: 30,
  supportsRequired: 'none',
  bedAdhesion: 'skirt',
  printNotes: '',
  testedPrinters: [] as string[],
  license: 'cc-by-sa',
  isOriginal: true,
  originalCreator: '',
  originalSource: '',
  originalLicense: '',
  copyrightHolder: '',
  copyrightYear: new Date().getFullYear(),
  ackOwnership: false,
  ackTerms: false
})

// Creator profile
const creator = ref({
  displayName: '',
  bio: '',
  website: '',
  github: '',
  twitter: '',
  youtube: '',
  joinProgram: false,
  allowTips: false,
  revenueShare: false,
  paymentEmail: ''
})
const creatorAvatar = ref<string | null>(null)

// Submit options
const submitOptions = ref({
  notifyOnApproval: true,
  allowComments: true,
  showInCatalog: true
})

// Options
const categories = [
  { label: 'Functional Parts', value: 'functional' },
  { label: 'Art & Decorative', value: 'art' },
  { label: 'Tools & Accessories', value: 'tools' },
  { label: 'Mechanical Parts', value: 'mechanical' },
  { label: 'Electronics Enclosures', value: 'electronics' },
  { label: 'Toys & Games', value: 'toys' },
  { label: 'Cosplay & Props', value: 'cosplay' },
  { label: 'Home & Garden', value: 'home' },
  { label: 'Education', value: 'education' },
  { label: 'Other', value: 'other' }
]

const materials = [
  { label: 'PLA', value: 'PLA' },
  { label: 'PETG', value: 'PETG' },
  { label: 'ABS', value: 'ABS' },
  { label: 'TPU', value: 'TPU' },
  { label: 'ASA', value: 'ASA' },
  { label: 'Nylon', value: 'Nylon' },
  { label: 'PC', value: 'PC' },
  { label: 'Resin', value: 'Resin' }
]

const suggestedTags = [
  'functional', 'decorative', 'replacement-part', 'organizer', 'holder',
  'bracket', 'mount', 'enclosure', 'tool', 'accessory', 'miniature',
  'figurine', 'vase', 'planter', 'keychain', 'phone-stand'
]

const licenses = [
  {
    id: 'cc-by',
    name: 'CC BY 4.0',
    icon: 'copyright',
    description: 'Attribution only - others can use for any purpose with credit',
    commercial: true,
    modification: true,
    attribution: true,
    shareAlike: false
  },
  {
    id: 'cc-by-sa',
    name: 'CC BY-SA 4.0',
    icon: 'share',
    description: 'Attribution + Share Alike - derivatives must use same license',
    commercial: true,
    modification: true,
    attribution: true,
    shareAlike: true
  },
  {
    id: 'cc-by-nc',
    name: 'CC BY-NC 4.0',
    icon: 'money_off',
    description: 'Attribution + Non-Commercial - no commercial use allowed',
    commercial: false,
    modification: true,
    attribution: true,
    shareAlike: false
  },
  {
    id: 'cc-by-nc-sa',
    name: 'CC BY-NC-SA 4.0',
    icon: 'lock',
    description: 'Attribution + Non-Commercial + Share Alike',
    commercial: false,
    modification: true,
    attribution: true,
    shareAlike: true
  },
  {
    id: 'cc0',
    name: 'CC0 (Public Domain)',
    icon: 'public',
    description: 'No restrictions - anyone can use for any purpose',
    commercial: true,
    modification: true,
    attribution: false,
    shareAlike: false
  },
  {
    id: 'gpl',
    name: 'GPL 3.0',
    icon: 'code',
    description: 'Open source license - derivatives must also be open source',
    commercial: true,
    modification: true,
    attribution: true,
    shareAlike: true
  }
]

const printerOptions = ref([
  { id: '1', displayName: 'Bambu Lab X1 Carbon' },
  { id: '2', displayName: 'Bambu Lab P1S' },
  { id: '3', displayName: 'Prusa MK4' },
  { id: '4', displayName: 'Prusa MK3S+' },
  { id: '5', displayName: 'Creality K1' },
  { id: '6', displayName: 'Voron 2.4' }
])

// Computed
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0: return !!modelFile.value
    case 1: return form.value.title && form.value.description && form.value.category
    case 2: return !!form.value.recommendedMaterial
    case 3: return form.value.license && form.value.ackOwnership && form.value.ackTerms && form.value.copyrightHolder
    case 4: return !!creator.value.displayName
    default: return true
  }
})

const canSubmit = computed(() => {
  return modelFile.value && 
         form.value.title && 
         form.value.license && 
         form.value.ackOwnership && 
         form.value.ackTerms &&
         creator.value.displayName
})

// Methods
function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function triggerUpload() { fileInput.value?.click() }
function triggerImageUpload() { imageInput.value?.click() }
function triggerAvatarUpload() { avatarInput.value?.click() }

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files[0]) {
    const file = e.dataTransfer.files[0]
    if (isValidModel(file)) {
      modelFile.value = file
    }
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0] && isValidModel(target.files[0])) {
    modelFile.value = target.files[0]
  }
}

function isValidModel(file: File) {
  const validTypes = ['.stl', '.obj', '.3mf']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!validTypes.includes(ext)) {
    $q.notify({ type: 'negative', message: 'Please upload STL, OBJ, or 3MF files only' })
    return false
  }
  if (file.size > 100 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'File size must be under 100MB' })
    return false
  }
  return true
}

function removeFile() {
  modelFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleImageSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    Array.from(target.files).forEach(file => {
      if (previewImages.value.length < 5) {
        const reader = new FileReader()
        reader.onload = () => {
          previewImages.value.push({
            file,
            preview: reader.result as string
          })
        }
        reader.readAsDataURL(file)
      }
    })
  }
}

function removeImage(idx: number) {
  previewImages.value.splice(idx, 1)
}

function handleAvatarUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) {
    const reader = new FileReader()
    reader.onload = () => {
      creatorAvatar.value = reader.result as string
    }
    reader.readAsDataURL(target.files[0])
  }
}

function nextStep() {
  if (canProceed.value && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submit() {
  if (!canSubmit.value) return
  
  submitting.value = true
  
  try {
    // Simulate submission with AI moderation
    await new Promise(r => setTimeout(r, 2000))
    
    showSuccess.value = true
    $q.notify({ type: 'positive', message: 'Model submitted for review!' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to submit. Please try again.' })
  } finally {
    submitting.value = false
  }
}

function resetWizard() {
  currentStep.value = 0
  modelFile.value = null
  previewImages.value = []
  showSuccess.value = false
  form.value = {
    title: '',
    description: '',
    category: '',
    tags: [],
    version: '1.0.0',
    sourceUrl: '',
    recommendedMaterial: 'PLA',
    supportedMaterials: [],
    layerHeightMin: 0.12,
    layerHeightMax: 0.28,
    infillMin: 10,
    infillMax: 30,
    supportsRequired: 'none',
    bedAdhesion: 'skirt',
    printNotes: '',
    testedPrinters: [],
    license: 'cc-by-sa',
    isOriginal: true,
    originalCreator: '',
    originalSource: '',
    originalLicense: '',
    copyrightHolder: '',
    copyrightYear: new Date().getFullYear(),
    ackOwnership: false,
    ackTerms: false
  }
}
</script>

<style lang="scss" scoped>
.upload-wizard-page {
  padding: 40px 24px;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.wizard-container {
  max-width: 800px;
  margin: 0 auto;
}

.wizard-header {
  text-align: center;
  margin-bottom: 40px;
  
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-secondary);
    text-decoration: none;
    margin-bottom: 16px;
    
    &:hover { color: var(--q-primary); }
  }
  
  h1 { margin: 0 0 8px; font-size: 2rem; }
  p { margin: 0; color: var(--color-text-secondary); }
}

.wizard-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 16px;
    left: 24px;
    right: 24px;
    height: 2px;
    background: var(--color-border);
  }
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1;
  
  .step-indicator {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .step-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  
  &.active .step-indicator {
    background: var(--q-primary);
    border-color: var(--q-primary);
    color: white;
  }
  
  &.completed .step-indicator {
    background: var(--q-positive);
    border-color: var(--q-positive);
    color: white;
  }
}

.wizard-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
}

.step-panel {
  h2 {
    margin: 0 0 8px;
    font-size: 1.5rem;
  }
  
  .step-desc {
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

.upload-zone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover, &.drag-over {
    border-color: var(--q-primary);
    background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.05);
  }
  
  &.has-file {
    border-style: solid;
    border-color: var(--q-positive);
  }
  
  p { margin: 16px 0 8px; font-weight: 500; }
  .upload-hint { font-size: 0.875rem; color: var(--color-text-muted); }
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .file-info {
    text-align: left;
    flex: 1;
    
    .file-name { display: block; font-weight: 500; word-break: break-all; }
    .file-size { font-size: 0.875rem; color: var(--color-text-muted); }
  }
}

.images-section {
  margin-top: 24px;
  
  h4 { margin: 0 0 8px; }
}

.image-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.image-slot {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0,0,0,0.5);
    color: white;
  }
  
  &.add-slot {
    border: 2px dashed var(--color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text-muted);
    
    span { font-size: 0.7rem; margin-top: 4px; }
    
    &:hover {
      border-color: var(--q-primary);
      color: var(--q-primary);
    }
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  
  .full-width { grid-column: 1 / -1; }
}

.form-group {
  label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 8px;
    color: var(--color-text-secondary);
  }
  
  .range-inputs {
    display: flex;
    align-items: center;
    gap: 12px;
    
    span { color: var(--color-text-muted); }
  }
}

.license-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.license-card {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { border-color: var(--q-primary); }
  &.selected {
    border-color: var(--q-primary);
    background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.05);
  }
  
  .license-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    
    .license-name { font-weight: 600; }
  }
  
  .license-desc {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0 0 12px;
  }
  
  .license-permissions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    
    .perm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 100px;
      background: var(--color-bg-tertiary);
      
      &.allow { color: var(--q-positive); }
      &.deny { color: var(--q-negative); }
    }
  }
}

.copyright-section {
  padding: 24px;
  background: var(--color-bg-tertiary);
  border-radius: 12px;
  margin-bottom: 24px;
  
  h4 { margin: 0 0 16px; }
  
  .attribution-fields {
    display: grid;
    gap: 16px;
    margin: 16px 0;
  }
}

.legal-acknowledgment {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  a { color: var(--q-primary); }
}

.creator-profile-card {
  background: var(--color-bg-tertiary);
  border-radius: 12px;
  padding: 24px;
}

.profile-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  
  .avatar-upload {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    flex-shrink: 0;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .avatar-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: white;
    }
    
    &:hover .avatar-overlay { opacity: 1; }
  }
  
  .profile-info { flex: 1; display: flex; flex-direction: column; gap: 12px; }
}

.profile-links {
  margin-bottom: 24px;
  
  h4 { margin: 0 0 16px; }
  
  .links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.creator-program {
  padding: 20px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  
  .program-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    
    span { font-weight: 600; }
  }
  
  p {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin: 0 0 16px;
  }
  
  .program-details {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

.review-summary {
  display: grid;
  gap: 20px;
  margin-bottom: 24px;
}

.review-section {
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  
  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    font-size: 0.9rem;
  }
  
  .review-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 0.875rem;
    
    span:first-child { color: var(--color-text-muted); }
  }
}

.moderation-note {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(var(--q-primary-rgb, 249, 115, 22), 0.1);
  border-radius: 8px;
  margin-bottom: 24px;
  
  strong { display: block; margin-bottom: 4px; }
  p { margin: 0; font-size: 0.875rem; color: var(--color-text-secondary); }
}

.submit-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wizard-nav {
  display: flex;
  padding: 16px 0;
}

.success-card {
  min-width: 400px;
  
  h3 { margin: 16px 0 8px; }
  p { margin: 0 0 8px; color: var(--color-text-secondary); }
}

@media (max-width: 768px) {
  .wizard-steps {
    overflow-x: auto;
    padding-bottom: 8px;
    
    &::before { display: none; }
  }
  
  .form-grid, .license-grid, .links-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>




