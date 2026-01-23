<template>
  <q-page class="generate-page">
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            AI Content Generator
          </h1>
          <p class="page-subtitle">
            Generate high-quality content, images, code, and documents using advanced AI models
          </p>
        </div>
      </div>

      <!-- Generation Type Selector -->
      <div class="generation-types">
        <q-btn-toggle
          v-model="generationType"
          toggle-color="primary"
          :options="[
            { label: 'Text', value: 'text', icon: 'article' },
            { label: 'Images', value: 'images', icon: 'image' },
            { label: 'Code', value: 'code', icon: 'code' },
            { label: 'Documents', value: 'documents', icon: 'description' }
          ]"
          class="type-toggle"
          unelevated
        />
      </div>

      <!-- Text Generation -->
      <div
        v-if="generationType === 'text'"
        class="generation-panel"
      >
        <q-card class="generation-card">
          <q-card-section>
            <div class="card-title">
              <q-icon
                name="article"
                size="24px"
                color="primary"
              />
              <h3>Text Generation</h3>
            </div>
            <p class="card-description">
              Generate blog posts, marketing copy, emails, social media content, and more
            </p>
          </q-card-section>

          <q-card-section>
            <q-select
              v-model="textTemplate"
              :options="textTemplates"
              label="Content Template"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="text_snippet" />
              </template>
            </q-select>

            <q-input
              v-model="textPrompt"
              type="textarea"
              label="Describe what you want to generate"
              outlined
              rows="6"
              placeholder="E.g., Write a blog post about the benefits of AI-powered project management for agencies..."
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="edit_note" />
              </template>
            </q-input>

            <div class="generation-options">
              <q-select
                v-model="textModel"
                :options="textModels"
                label="AI Model"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />

              <q-input
                v-model.number="textLength"
                type="number"
                label="Word Count"
                outlined
                dense
                min="50"
                max="5000"
                class="option-field"
              />

              <q-select
                v-model="textTone"
                :options="['Professional', 'Casual', 'Friendly', 'Formal', 'Persuasive']"
                label="Tone"
                outlined
                dense
                class="option-field"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Generate Text"
              color="primary"
              unelevated
              icon="auto_awesome"
              :loading="generating"
              @click="generateText"
            />
          </q-card-actions>

          <!-- Generated Result -->
          <q-card-section
            v-if="generatedText"
            class="result-section"
          >
            <div class="result-header">
              <h4>Generated Content</h4>
              <div class="result-actions">
                <q-btn
                  flat
                  dense
                  icon="content_copy"
                  @click="copyToClipboard(generatedText)"
                >
                  <q-tooltip>Copy to clipboard</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  icon="download"
                  @click="downloadText"
                >
                  <q-tooltip>Download as text file</q-tooltip>
                </q-btn>
              </div>
            </div>
            <div class="generated-content">
              {{ generatedText }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Image Generation -->
      <div
        v-if="generationType === 'images'"
        class="generation-panel"
      >
        <q-card class="generation-card">
          <q-card-section>
            <div class="card-title">
              <q-icon
                name="image"
                size="24px"
                color="primary"
              />
              <h3>Image Generation</h3>
            </div>
            <p class="card-description">
              Create custom images, illustrations, logos, and graphics using AI
            </p>
          </q-card-section>

          <q-card-section>
            <q-input
              v-model="imagePrompt"
              type="textarea"
              label="Describe the image you want to create"
              outlined
              rows="4"
              placeholder="E.g., A modern minimalist logo for a tech startup, blue and white color scheme, featuring abstract geometric shapes..."
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="palette" />
              </template>
            </q-input>

            <div class="generation-options">
              <q-select
                v-model="imageQuality"
                :options="imageQualities"
                label="Quality"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />

              <q-select
                v-model="imageSize"
                :options="imageSizes"
                label="Image Size"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />

              <q-select
                v-model="imageStyle"
                :options="imageStyles"
                label="Style"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Generate Image"
              color="primary"
              unelevated
              icon="auto_awesome"
              :loading="generating"
              @click="generateImage"
            />
          </q-card-actions>

          <!-- Generated Images -->
          <q-card-section
            v-if="generatedImages.length > 0"
            class="result-section"
          >
            <div class="result-header">
              <h4>Generated Images</h4>
            </div>
            <div class="image-grid">
              <div
                v-for="(img, i) in generatedImages"
                :key="i"
                class="image-item"
              >
                <img
                  :src="img.url"
                  :alt="`Generated image ${i + 1}`"
                  class="generated-image"
                >
                <div class="image-actions">
                  <q-btn
                    flat
                    dense
                    icon="download"
                    size="sm"
                    @click="downloadImage(img.url, i)"
                  >
                    <q-tooltip>Download</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Code Generation -->
      <div
        v-if="generationType === 'code'"
        class="generation-panel"
      >
        <q-card class="generation-card">
          <q-card-section>
            <div class="card-title">
              <q-icon
                name="code"
                size="24px"
                color="primary"
              />
              <h3>Code Generation</h3>
            </div>
            <p class="card-description">
              Generate code snippets, functions, components, and entire files
            </p>
          </q-card-section>

          <q-card-section>
            <q-select
              v-model="codeLanguage"
              :options="codeLanguages"
              label="Programming Language"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="code" />
              </template>
            </q-select>

            <q-input
              v-model="codePrompt"
              type="textarea"
              label="Describe the code you want to generate"
              outlined
              rows="6"
              placeholder="E.g., Create a React component for a user profile card with avatar, name, email, and a follow button..."
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="edit_note" />
              </template>
            </q-input>

            <div class="generation-options">
              <q-select
                v-model="codeModel"
                :options="codeModels"
                label="AI Model"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />

              <q-toggle
                v-model="includeComments"
                label="Include Comments"
                class="option-toggle"
              />

              <q-toggle
                v-model="includeTests"
                label="Include Unit Tests"
                class="option-toggle"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Generate Code"
              color="primary"
              unelevated
              icon="auto_awesome"
              :loading="generating"
              @click="generateCode"
            />
          </q-card-actions>

          <!-- Generated Code -->
          <q-card-section
            v-if="generatedCode"
            class="result-section"
          >
            <div class="result-header">
              <h4>Generated Code</h4>
              <div class="result-actions">
                <q-btn
                  flat
                  dense
                  icon="content_copy"
                  @click="copyToClipboard(generatedCode)"
                >
                  <q-tooltip>Copy to clipboard</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  icon="download"
                  @click="downloadCode"
                >
                  <q-tooltip>Download file</q-tooltip>
                </q-btn>
              </div>
            </div>
            <pre class="code-block"><code>{{ generatedCode }}</code></pre>
          </q-card-section>
        </q-card>
      </div>

      <!-- Document Generation -->
      <div
        v-if="generationType === 'documents'"
        class="generation-panel"
      >
        <q-card class="generation-card">
          <q-card-section>
            <div class="card-title">
              <q-icon
                name="description"
                size="24px"
                color="primary"
              />
              <h3>Document Generation</h3>
            </div>
            <p class="card-description">
              Generate proposals, contracts, reports, and business documents
            </p>
          </q-card-section>

          <q-card-section>
            <q-select
              v-model="documentType"
              :options="documentTypes"
              label="Document Type"
              outlined
              emit-value
              map-options
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="text_snippet" />
              </template>
            </q-select>

            <q-input
              v-model="documentPrompt"
              type="textarea"
              label="Document requirements"
              outlined
              rows="6"
              placeholder="E.g., Create a project proposal for a website redesign for an e-commerce company, including scope, timeline, and pricing..."
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="edit_note" />
              </template>
            </q-input>

            <div class="generation-options">
              <q-select
                v-model="documentFormat"
                :options="documentFormats"
                label="Output Format"
                outlined
                dense
                emit-value
                map-options
                class="option-field"
              />

              <q-select
                v-model="documentLength"
                :options="['Short', 'Medium', 'Long', 'Comprehensive']"
                label="Length"
                outlined
                dense
                class="option-field"
              />
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              label="Generate Document"
              color="primary"
              unelevated
              icon="auto_awesome"
              :loading="generating"
              @click="generateDocument"
            />
          </q-card-actions>

          <!-- Generated Document -->
          <q-card-section
            v-if="generatedDocument"
            class="result-section"
          >
            <div class="result-header">
              <h4>Generated Document</h4>
              <div class="result-actions">
                <q-btn
                  flat
                  dense
                  icon="content_copy"
                  @click="copyToClipboard(generatedDocument)"
                >
                  <q-tooltip>Copy to clipboard</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  icon="download"
                  @click="downloadDocument"
                >
                  <q-tooltip>Download {{ documentFormat.toUpperCase() }}</q-tooltip>
                </q-btn>
              </div>
            </div>
            <div class="document-preview">
              <div
                v-if="documentFormat === 'html'"
                v-html="generatedDocument"
              />
              <pre
                v-else
                class="document-text"
              ><code>{{ generatedDocument }}</code></pre>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import DOMPurify from 'dompurify'
import { api } from '@/services/api'
import { logError } from '@/utils/devLogger'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'

const $q = useQuasar()
const authStore = useAuthStore()
const creditsStore = useCreditsStore()

// Generation type
const generationType = ref('text')
const generating = ref(false)

// Text Generation
const textTemplate = ref('blog-post')
const textTemplates = [
  { label: 'Blog Post', value: 'blog-post' },
  { label: 'Marketing Copy', value: 'marketing' },
  { label: 'Email', value: 'email' },
  { label: 'Social Media Post', value: 'social' },
  { label: 'Product Description', value: 'product' },
  { label: 'Custom', value: 'custom' }
]
const textPrompt = ref('')
const textModel = ref('gpt-4')
const textModels = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
]
const textLength = ref(500)
const textTone = ref('Professional')
const generatedText = ref('')

// Image Generation
const imagePrompt = ref('')
const imageQuality = ref<'standard' | 'hd'>('standard')
const imageQualities = [
  { label: 'Standard', value: 'standard' },
  { label: 'HD', value: 'hd' }
]
const imageSize = ref('1024x1024')
const imageSizes = [
  { label: '1024x1024', value: '1024x1024' },
  { label: '1792x1024', value: '1792x1024' },
  { label: '1024x1792', value: '1024x1792' }
]
const imageStyle = ref<'natural' | 'vivid'>('natural')
const imageStyles = [
  { label: 'Natural', value: 'natural' },
  { label: 'Vivid', value: 'vivid' }
]
const generatedImages = ref<Array<{ url: string }>>([])

// Code Generation
const codeLanguage = ref('typescript')
const codeLanguages = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' }
]
const codePrompt = ref('')
const codeModel = ref('gpt-4')
const codeModels = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
]
const includeComments = ref(true)
const includeTests = ref(false)
const generatedCode = ref('')

// Document Generation
const documentType = ref('proposal')
const documentTypes = [
  { label: 'Project Proposal', value: 'proposal' },
  { label: 'Contract', value: 'contract' },
  { label: 'Report', value: 'report' },
  { label: 'Memo', value: 'memo' },
  { label: 'SOP (Standard Operating Procedure)', value: 'sop' },
  { label: 'Custom', value: 'custom' }
]
const documentPrompt = ref('')
const documentFormat = ref('markdown')
const documentFormats = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'PDF (Coming Soon)', value: 'pdf', disable: true },
  { label: 'DOCX (Coming Soon)', value: 'docx', disable: true }
]
const documentLength = ref('Medium')
const generatedDocument = ref('')

// Methods
function clampTokens(raw: number): number {
  const safe = Number.isFinite(raw) ? raw : 1000
  return Math.max(100, Math.min(4000, Math.round(safe)))
}

function tokensForWords(words: number): number {
  const safeWords = Number.isFinite(words) ? Math.max(50, Math.min(8000, words)) : 500
  return clampTokens(safeWords * 2)
}

function estimateTextCreditCost(model: string): number {
  if (model === 'gpt-4') return 5
  if (model === 'gpt-4-turbo') return 3
  return 1
}

function estimateImageCreditCost(quality: 'standard' | 'hd', size: string): number {
  const key = `${quality}-${size}`
  if (key === 'standard-1024x1024') return 5
  if (key === 'standard-1792x1024') return 7
  if (key === 'standard-1024x1792') return 7
  if (key === 'hd-1024x1024') return 10
  if (key === 'hd-1792x1024') return 15
  if (key === 'hd-1024x1792') return 15
  return 5
}

function buildTextSystemPrompt(): string {
  const tone = textTone.value || 'Professional'
  const templatePrompts: Record<string, string> = {
    'blog-post': 'You are an expert blog writer.',
    marketing: 'You are an expert marketing copywriter.',
    email: 'You are an expert email copywriter.',
    social: 'You are an expert social media writer.',
    product: 'You are an expert product copywriter.',
    custom: 'You are an expert writer.'
  }
  const base = templatePrompts[textTemplate.value] || templatePrompts.custom
  return `${base} Tone: ${tone}.`
}

function buildCodeSystemPrompt(): string {
  const language = codeLanguage.value
  const commentRule = includeComments.value ? 'Include concise comments.' : 'Do not include comments.'
  const testsRule = includeTests.value
    ? 'Include unit tests as well (clearly separated with filenames).'
    : ''

  return [
    'You are a senior software engineer.',
    `Return only ${language} code.`,
    commentRule,
    testsRule,
    'Do not wrap in Markdown fences. Do not include explanations.'
  ].filter(Boolean).join(' ')
}

function buildDocumentSystemPrompt(): string {
  const format = documentFormat.value === 'html' ? 'HTML' : 'Markdown'
  const type = documentType.value
  const length = documentLength.value
  return `You are an expert consultant. Generate a ${type} in ${format}. Length: ${length}. Output only the ${format} content (no preamble).`
}

async function generateText() {
  if (!textPrompt.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a prompt',
      position: 'top'
    })
    return
  }

  generating.value = true
  try {
    const response = await api.post('/api/v1/generation/text', {
      prompt: `${textPrompt.value.trim()}\n\nTarget length: about ${textLength.value} words.`,
      systemPrompt: buildTextSystemPrompt(),
      maxTokens: tokensForWords(textLength.value),
      temperature: 0.7,
      model: textModel.value
    })

    generatedText.value = response.data?.content || ''

    await Promise.allSettled([
      authStore.fetchUser(),
      creditsStore.fetchUnifiedCredits(),
    ])

    $q.notify({
      type: 'positive',
      message: 'Text generated successfully!',
      position: 'top'
    })
  } catch (error: any) {
    if (error?.status === 402) {
      creditsStore.showInsufficientCreditsModal(estimateTextCreditCost(textModel.value))
      return
    }
    logError('Text generation failed:', error)
    $q.notify({
      type: 'negative',
      message: error?.message || 'Failed to generate text',
      position: 'top'
    })
  } finally {
    generating.value = false
  }
}

async function generateImage() {
  if (!imagePrompt.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter an image description',
      position: 'top'
    })
    return
  }

  generating.value = true
  try {
    const response = await api.post('/api/v1/generation/image', {
      prompt: imagePrompt.value.trim(),
      size: imageSize.value,
      quality: imageQuality.value,
      style: imageStyle.value
    })

    const imageUrl = response.data?.imageUrl
    generatedImages.value = imageUrl ? [{ url: imageUrl }] : []

    await Promise.allSettled([
      authStore.fetchUser(),
      creditsStore.fetchUnifiedCredits(),
    ])

    $q.notify({
      type: 'positive',
      message: 'Image generated successfully!',
      position: 'top'
    })
  } catch (error: any) {
    if (error?.status === 402) {
      creditsStore.showInsufficientCreditsModal(
        estimateImageCreditCost(imageQuality.value, imageSize.value),
      )
      return
    }
    logError('Image generation failed:', error)
    $q.notify({
      type: 'negative',
      message: error?.message || 'Failed to generate image',
      position: 'top'
    })
  } finally {
    generating.value = false
  }
}

async function generateCode() {
  if (!codePrompt.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a code description',
      position: 'top'
    })
    return
  }

  generating.value = true
  try {
    const response = await api.post('/api/v1/generation/text', {
      prompt: codePrompt.value.trim(),
      systemPrompt: buildCodeSystemPrompt(),
      maxTokens: 2000,
      temperature: 0.2,
      model: codeModel.value
    })

    generatedCode.value = response.data?.content || ''

    await Promise.allSettled([
      authStore.fetchUser(),
      creditsStore.fetchUnifiedCredits(),
    ])

    $q.notify({
      type: 'positive',
      message: 'Code generated successfully!',
      position: 'top'
    })
  } catch (error: any) {
    if (error?.status === 402) {
      creditsStore.showInsufficientCreditsModal(estimateTextCreditCost(codeModel.value))
      return
    }
    logError('Code generation failed:', error)
    $q.notify({
      type: 'negative',
      message: error?.message || 'Failed to generate code',
      position: 'top'
    })
  } finally {
    generating.value = false
  }
}

async function generateDocument() {
  if (!documentPrompt.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter document requirements',
      position: 'top'
    })
    return
  }

  generating.value = true
  try {
    const response = await api.post('/api/v1/generation/text', {
      prompt: documentPrompt.value.trim(),
      systemPrompt: buildDocumentSystemPrompt(),
      maxTokens: 2500,
      temperature: 0.6,
      model: textModel.value
    })

    const raw = response.data?.content || ''
    generatedDocument.value = documentFormat.value === 'html' ? DOMPurify.sanitize(raw) : raw

    await Promise.allSettled([
      authStore.fetchUser(),
      creditsStore.fetchUnifiedCredits(),
    ])

    $q.notify({
      type: 'positive',
      message: 'Document generated successfully!',
      position: 'top'
    })
  } catch (error: any) {
    if (error?.status === 402) {
      creditsStore.showInsufficientCreditsModal(estimateTextCreditCost(textModel.value))
      return
    }
    logError('Document generation failed:', error)
    $q.notify({
      type: 'negative',
      message: error?.message || 'Failed to generate document',
      position: 'top'
    })
  } finally {
    generating.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  $q.notify({
    type: 'positive',
    message: 'Copied to clipboard!',
    position: 'top',
    timeout: 1500
  })
}

function downloadText() {
  const blob = new Blob([generatedText.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'generated-text.txt'
  link.click()
  URL.revokeObjectURL(url)
}

function downloadCode() {
  const extensions: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    python: 'py',
    java: 'java',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    php: 'php'
  }
  const ext = extensions[codeLanguage.value] || 'txt'

  const blob = new Blob([generatedCode.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `generated-code.${ext}`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadDocument() {
  const mimeTypes: Record<string, string> = {
    markdown: 'text/markdown',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    html: 'text/html'
  }

  const blob = new Blob([generatedDocument.value], { type: mimeTypes[documentFormat.value] })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `generated-document.${documentFormat.value}`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadImage(url: string, index: number) {
  const link = document.createElement('a')
  link.href = url
  link.download = `generated-image-${index + 1}.png`
  link.click()
}
</script>

<style scoped lang="scss">
.generate-page {
  background: var(--color-bg-primary);
  min-height: 100vh;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;

  .page-title {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 12px;
    background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .page-subtitle {
    font-size: 18px;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.generation-types {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;

  .type-toggle {
    box-shadow: var(--shadow-md);
  }
}

.generation-panel {
  .generation-card {
    box-shadow: var(--shadow-lg);
    border-radius: 12px;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;

    h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }

  .card-description {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .generation-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;

    .option-field,
    .option-toggle {
      margin: 0;
    }
  }

  .result-section {
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-secondary);

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h4 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .result-actions {
        display: flex;
        gap: 8px;
      }
    }

    .generated-content {
      background: var(--color-bg-primary);
      padding: 20px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.6;
    }

    .code-block {
      background: var(--color-bg-primary);
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0;

      code {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .document-preview {
      background: var(--color-bg-primary);
      padding: 30px;
      border-radius: 8px;
      line-height: 1.8;
    }
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;

    .image-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--shadow-md);

      .generated-image {
        width: 100%;
        height: auto;
        display: block;
      }

      .image-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        padding: 4px;
      }
    }
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 20px 16px;
  }

  .page-header {
    .page-title {
      font-size: 32px;
    }

    .page-subtitle {
      font-size: 16px;
    }
  }

  .generation-options {
    grid-template-columns: 1fr !important;
  }

  .image-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
