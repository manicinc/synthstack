<template>
  <q-page class="image-generation-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Image Generation</h1>
          <p class="subtitle">Generate images with AI (DALL·E)</p>
        </div>
        <div class="credits-display">
          <q-chip
            :color="hasEnoughCredits ? 'primary' : 'negative'"
            text-color="white"
            icon="stars"
          >
            {{ creditsRemaining }} credits
          </q-chip>
        </div>
      </div>

      <div class="generation-layout">
        <!-- Left Panel: Configuration -->
        <div class="config-panel">
          <!-- Style Presets -->
          <q-card flat bordered class="config-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="palette" />
                <span>Style Presets</span>
              </div>
            </q-card-section>
            <q-card-section class="presets-grid">
              <q-btn
                v-for="preset in IMAGE_PRESETS"
                :key="preset.id"
                :outline="selectedPreset?.id !== preset.id"
                :color="selectedPreset?.id === preset.id ? 'primary' : 'grey-7'"
                :icon="preset.icon"
                :label="preset.name"
                class="preset-btn"
                no-caps
                @click="selectPreset(preset)"
              >
                <q-tooltip>{{ preset.description }}</q-tooltip>
              </q-btn>
              <q-btn
                :outline="selectedPreset !== null"
                :color="selectedPreset === null ? 'primary' : 'grey-7'"
                icon="brush"
                label="No Style"
                class="preset-btn"
                no-caps
                @click="selectPreset(null)"
              />
            </q-card-section>
          </q-card>

          <!-- Image Settings -->
          <q-card flat bordered class="config-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="tune" />
                <span>Image Settings</span>
              </div>
            </q-card-section>
            <q-card-section>
              <!-- Size Selection -->
              <div class="size-selector">
                <span class="setting-label">Size</span>
                <div class="size-options">
                  <q-btn
                    v-for="option in sizeOptions"
                    :key="option.value"
                    :outline="size !== option.value"
                    :color="size === option.value ? 'primary' : 'grey-7'"
                    class="size-btn"
                    no-caps
                    @click="setSize(option.value as ImageSize)"
                  >
                    <div class="size-btn-content">
                      <div
                        class="aspect-preview"
                        :class="getAspectClass(option.value)"
                      />
                      <span>{{ option.aspect }}</span>
                    </div>
                  </q-btn>
                </div>
              </div>

              <!-- Quality Toggle -->
              <div class="quality-selector">
                <span class="setting-label">Quality</span>
                <q-btn-toggle
                  v-model="quality"
                  :options="[
                    { value: 'standard', label: 'Standard' },
                    { value: 'hd', label: 'HD' }
                  ]"
                  spread
                  no-caps
                  toggle-color="primary"
                />
              </div>

              <!-- Style Toggle -->
              <div class="style-selector">
                <span class="setting-label">Rendering Style</span>
                <q-btn-toggle
                  v-model="style"
                  :options="[
                    { value: 'vivid', label: 'Vivid' },
                    { value: 'natural', label: 'Natural' }
                  ]"
                  spread
                  no-caps
                  toggle-color="primary"
                />
              </div>

              <div class="credit-estimate">
                <q-icon name="stars" />
                <span>Estimated cost: <strong>{{ estimatedCredits }} credits</strong></span>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Main Panel: Prompt & Result -->
        <div class="main-panel">
          <!-- Prompt Input -->
          <q-card flat bordered class="prompt-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="edit_note" />
                <span>{{ selectedPreset ? selectedPreset.name + ' Style' : 'Describe Your Image' }}</span>
              </div>
              <p v-if="selectedPreset" class="preset-description">
                {{ selectedPreset.description }}
              </p>
            </q-card-section>
            <q-card-section>
              <q-input
                v-model="prompt"
                type="textarea"
                outlined
                placeholder="Describe the image you want to generate..."
                :rows="3"
                autogrow
                counter
                maxlength="1000"
              />
              <div v-if="selectedPreset" class="style-preview">
                <q-icon name="info" size="xs" />
                <span>Style prompt: <em>{{ selectedPreset.stylePrompt }}</em></span>
              </div>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                flat
                label="Clear"
                color="grey"
                @click="clearResult"
              />
              <q-btn
                color="primary"
                icon="auto_awesome"
                label="Generate Image"
                :loading="isGenerating"
                :disable="!prompt.trim() || !hasEnoughCredits"
                @click="generate"
              />
            </q-card-actions>
          </q-card>

          <!-- Result Display -->
          <q-card v-if="result" flat bordered class="result-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="image" />
                <span>Generated Image</span>
                <q-space />
                <q-btn-group flat>
                  <q-btn
                    flat
                    icon="content_copy"
                    size="sm"
                    @click="copyImageUrl"
                  >
                    <q-tooltip>Copy URL</q-tooltip>
                  </q-btn>
                  <q-btn flat size="sm">
                    <q-icon name="download" />
                    <q-tooltip>Download</q-tooltip>
                    <q-menu>
                      <q-list>
                        <q-item clickable v-close-popup @click="downloadImage('png')">
                          <q-item-section>PNG</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="downloadImage('jpg')">
                          <q-item-section>JPG</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-btn-group>
              </div>
            </q-card-section>
            <q-card-section class="result-content">
              <div class="image-container" :class="getAspectClass(result.size)">
                <q-img
                  :src="result.imageUrl"
                  :ratio="getAspectRatio(result.size)"
                  fit="contain"
                  class="generated-image"
                >
                  <template v-slot:loading>
                    <q-spinner-dots color="primary" size="40px" />
                  </template>
                </q-img>
              </div>
            </q-card-section>
            <q-card-section v-if="result.revisedPrompt" class="revised-prompt">
              <q-icon name="auto_fix_high" />
              <span><strong>Revised prompt:</strong> {{ result.revisedPrompt }}</span>
            </q-card-section>
            <q-card-section class="result-meta">
              <q-chip size="sm" icon="aspect_ratio">{{ result.size }}</q-chip>
              <q-chip size="sm" icon="high_quality">{{ result.quality }}</q-chip>
              <q-chip size="sm" icon="stars">{{ result.creditsUsed }} credits</q-chip>
            </q-card-section>
          </q-card>

          <!-- Error Display -->
          <q-banner v-if="error" class="bg-negative text-white">
            <template v-slot:avatar>
              <q-icon name="error" />
            </template>
            {{ error }}
          </q-banner>
        </div>

        <!-- Right Panel: History Gallery -->
        <div class="history-panel">
          <q-card flat bordered class="history-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="collections" />
                <span>Recent</span>
              </div>
            </q-card-section>
            <q-card-section class="history-gallery">
              <div
                v-for="item in recentGenerations"
                :key="item.id"
                class="history-thumbnail"
                @click="loadFromHistory(item)"
              >
                <q-img
                  :src="item.imageUrl"
                  :ratio="1"
                  fit="cover"
                  class="thumbnail-img"
                >
                  <template v-slot:loading>
                    <q-spinner-dots color="primary" size="20px" />
                  </template>
                </q-img>
                <q-tooltip>{{ item.prompt }}</q-tooltip>
              </div>
              <div v-if="recentGenerations.length === 0" class="empty-history">
                <q-icon name="image" size="48px" color="grey-5" />
                <span>No images yet</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useImageGenerationStore, IMAGE_PRESETS, type ImageSize } from '@/stores/imageGeneration'
import { useAuthStore } from '@/stores/auth'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const imageStore = useImageGenerationStore()
const authStore = useAuthStore()

const {
  selectedPreset,
  prompt,
  size,
  quality,
  style,
  result,
  isGenerating,
  error,
  estimatedCredits,
  hasEnoughCredits,
  recentGenerations,
  sizeOptions,
} = storeToRefs(imageStore)

const { selectPreset, setSize, generate: generateImage, downloadImage: downloadImg, copyImageUrl: copyUrl, clearResult, loadFromHistory } =
  imageStore

const creditsRemaining = computed(() => authStore.credits)

function getAspectClass(imageSize: ImageSize | string): string {
  switch (imageSize) {
    case '1024x1024':
      return 'aspect-square'
    case '1792x1024':
      return 'aspect-landscape'
    case '1024x1792':
      return 'aspect-portrait'
    default:
      return 'aspect-square'
  }
}

function getAspectRatio(imageSize: ImageSize | string): number {
  switch (imageSize) {
    case '1024x1024':
      return 1
    case '1792x1024':
      return 1792 / 1024
    case '1024x1792':
      return 1024 / 1792
    default:
      return 1
  }
}

async function generate() {
  const result = await generateImage()
  if (result) {
    $q.notify({
      type: 'positive',
      message: 'Image generated successfully!',
    })
  }
}

async function downloadImage(format: 'png' | 'jpg') {
  await downloadImg(format)
  $q.notify({
    type: 'positive',
    message: 'Download started!',
  })
}

async function copyImageUrl() {
  const success = await copyUrl()
  if (success) {
    $q.notify({
      type: 'positive',
      message: 'URL copied to clipboard!',
    })
  }
}
</script>

<style lang="scss" scoped>
.image-generation-page {
  padding: 24px;
  background: var(--q-background);
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
  }

  .subtitle {
    margin: 4px 0 0;
    color: var(--q-grey-7);
  }
}

.generation-layout {
  display: grid;
  grid-template-columns: 280px 1fr 200px;
  gap: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.config-card,
.prompt-card,
.result-card,
.history-card {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;

  .q-icon {
    color: var(--q-primary);
  }
}

.presets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .preset-btn {
    flex: 1 1 calc(50% - 4px);
    min-width: 90px;
    justify-content: flex-start;
  }
}

.setting-label {
  display: block;
  font-size: 0.875rem;
  color: var(--q-grey-7);
  margin-bottom: 8px;
}

.size-selector,
.quality-selector,
.style-selector {
  margin-bottom: 16px;
}

.size-options {
  display: flex;
  gap: 8px;

  .size-btn {
    flex: 1;
    padding: 8px;
  }

  .size-btn-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .aspect-preview {
    width: 24px;
    height: 24px;
    border: 2px solid currentColor;
    border-radius: 2px;

    &.aspect-square {
      width: 24px;
      height: 24px;
    }

    &.aspect-landscape {
      width: 32px;
      height: 18px;
    }

    &.aspect-portrait {
      width: 18px;
      height: 32px;
    }
  }
}

.credit-estimate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: var(--q-primary-light, rgba(var(--q-primary-rgb), 0.1));
  border-radius: 8px;
  font-size: 0.875rem;
}

.preset-description {
  font-size: 0.875rem;
  color: var(--q-grey-7);
  margin: 0;
}

.style-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(var(--q-primary-rgb), 0.06);
  border-radius: 8px;
  font-size: 0.875rem;

  em {
    font-style: normal;
    font-weight: 500;
  }
}

.result-content {
  padding-top: 0;
}

.image-container {
  border-radius: 12px;
  overflow: hidden;
  background: var(--q-grey-2);
  padding: 12px;

  &.aspect-square {
    max-width: 520px;
  }

  &.aspect-landscape {
    max-width: 720px;
  }

  &.aspect-portrait {
    max-width: 420px;
  }
}

.generated-image {
  border-radius: 10px;
}

.revised-prompt {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.875rem;
  color: var(--q-grey-8);
}

.result-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.history-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.history-thumbnail {
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(var(--q-primary-rgb), 0.35);
  }
}

.thumbnail-img {
  display: block;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 8px;
  color: var(--q-grey-7);
}
</style>

