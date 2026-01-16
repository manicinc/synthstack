/**
 * @file imageGeneration.ts
 * @description Pinia store for image generation workflow (Community-safe).
 *
 * Community scope:
 * - Image generation UI/UX parity with Pro
 * - No premium agent features
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

/** Image size options */
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792'

/** Image quality options */
export type ImageQuality = 'standard' | 'hd'

/** Image style options */
export type ImageStyle = 'vivid' | 'natural'

/** Image generation preset */
export interface ImageGenerationPreset {
  id: string
  name: string
  description: string
  stylePrompt: string
  icon: string
  category: 'artistic' | 'realistic' | 'abstract' | 'technical'
}

/** Image generation result */
export interface ImageGenerationResult {
  id: string
  prompt: string
  imageUrl: string
  revisedPrompt?: string
  size: ImageSize
  quality: ImageQuality
  style: ImageStyle
  creditsUsed: number
  presetId?: string
  createdAt: string
}

/** Available style presets */
export const IMAGE_PRESETS: ImageGenerationPreset[] = [
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic photographs with natural lighting',
    stylePrompt: 'photorealistic, highly detailed, professional photography, natural lighting, 8K resolution',
    icon: 'photo_camera',
    category: 'realistic',
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    description: 'Modern digital artwork with vibrant colors',
    stylePrompt: 'digital art, vibrant colors, detailed illustration, trending on ArtStation, high quality',
    icon: 'palette',
    category: 'artistic',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting style',
    stylePrompt: 'watercolor painting, soft edges, flowing colors, artistic, traditional media feel',
    icon: 'water_drop',
    category: 'artistic',
  },
  {
    id: 'line-drawing',
    name: 'Line Drawing',
    description: 'Clean line art and sketches',
    stylePrompt: 'line drawing, clean lines, minimalist sketch, black and white, detailed linework',
    icon: 'draw',
    category: 'technical',
  },
  {
    id: '3d-render',
    name: '3D Render',
    description: 'Polished 3D rendered visuals',
    stylePrompt: '3D render, octane render, ray tracing, high detail, professional 3D visualization',
    icon: 'view_in_ar',
    category: 'technical',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, simple, and elegant designs',
    stylePrompt: 'minimalist design, clean composition, simple shapes, elegant, modern aesthetic',
    icon: 'crop_square',
    category: 'abstract',
  },
  {
    id: 'vintage',
    name: 'Vintage/Retro',
    description: 'Nostalgic retro and vintage aesthetics',
    stylePrompt: 'vintage style, retro aesthetic, film grain, nostalgic colors, 1970s photography',
    icon: 'filter_vintage',
    category: 'artistic',
  },
  {
    id: 'comic',
    name: 'Comic Style',
    description: 'Bold comic book and graphic novel art',
    stylePrompt: 'comic book style, bold outlines, cel shading, graphic novel art, dynamic composition',
    icon: 'auto_awesome',
    category: 'artistic',
  },
]

/** Credit costs per size and quality */
export const IMAGE_CREDIT_COSTS = {
  'standard-1024x1024': 5,
  'standard-1792x1024': 7,
  'standard-1024x1792': 7,
  'hd-1024x1024': 10,
  'hd-1792x1024': 15,
  'hd-1024x1792': 15,
}

export const useImageGenerationStore = defineStore('imageGeneration', () => {
  const authStore = useAuthStore()

  // State
  const selectedPreset = ref<ImageGenerationPreset | null>(null)
  const prompt = ref('')
  const size = ref<ImageSize>('1024x1024')
  const quality = ref<ImageQuality>('standard')
  const style = ref<ImageStyle>('vivid')
  const result = ref<ImageGenerationResult | null>(null)
  const history = ref<ImageGenerationResult[]>([])
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const estimatedCredits = computed(() => {
    const key = `${quality.value}-${size.value}` as keyof typeof IMAGE_CREDIT_COSTS
    return IMAGE_CREDIT_COSTS[key]
  })

  const creditsRemaining = computed(() => authStore.credits)

  const hasEnoughCredits = computed(() => {
    return creditsRemaining.value >= estimatedCredits.value
  })

  const recentGenerations = computed(() => history.value.slice(0, 12))

  const sizeOptions = computed(() => [
    { value: '1024x1024', label: 'Square (1024x1024)', aspect: '1:1' },
    { value: '1792x1024', label: 'Landscape (1792x1024)', aspect: '16:9' },
    { value: '1024x1792', label: 'Portrait (1024x1792)', aspect: '9:16' },
  ])

  // Actions
  function selectPreset(preset: ImageGenerationPreset | null) {
    selectedPreset.value = preset
  }

  function setSize(s: ImageSize) {
    size.value = s
  }

  function buildFullPrompt(): string {
    const basePrompt = prompt.value.trim()
    if (!basePrompt) return ''
    if (selectedPreset.value) {
      return `${basePrompt}, ${selectedPreset.value.stylePrompt}`
    }
    return basePrompt
  }

  async function generate(): Promise<ImageGenerationResult | null> {
    if (!prompt.value.trim()) {
      error.value = 'Please enter a prompt'
      return null
    }

    if (!hasEnoughCredits.value) {
      error.value = 'Insufficient credits'
      return null
    }

    if (!authStore.accessToken) {
      error.value = 'You must be logged in to generate images'
      return null
    }

    isGenerating.value = true
    error.value = null

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/generation/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: JSON.stringify({
          prompt: buildFullPrompt(),
          presetId: selectedPreset.value?.id,
          size: size.value,
          quality: quality.value,
          style: style.value,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || err.error || 'Generation failed')
      }

      const data = await response.json()

      const generationResult: ImageGenerationResult = {
        id: data.id || `img-${Date.now()}`,
        prompt: prompt.value,
        imageUrl: data.imageUrl,
        revisedPrompt: data.revisedPrompt,
        size: size.value,
        quality: quality.value,
        style: style.value,
        creditsUsed: data.creditsUsed || estimatedCredits.value,
        presetId: selectedPreset.value?.id,
        createdAt: data.createdAt || new Date().toISOString(),
      }

      result.value = generationResult
      history.value.unshift(generationResult)

      // Refresh user credits
      await authStore.fetchUser()

      return generationResult
    } catch (err: any) {
      error.value = err.message || 'Generation failed'

      // Mock generation for development without network dependencies
      if (import.meta.env.DEV) {
        const mockResult: ImageGenerationResult = {
          id: `img-${Date.now()}`,
          prompt: prompt.value,
          imageUrl: getMockImageUrl(),
          revisedPrompt: buildFullPrompt(),
          size: size.value,
          quality: quality.value,
          style: style.value,
          creditsUsed: estimatedCredits.value,
          presetId: selectedPreset.value?.id,
          createdAt: new Date().toISOString(),
        }
        result.value = mockResult
        history.value.unshift(mockResult)
        return mockResult
      }

      return null
    } finally {
      isGenerating.value = false
    }
  }

  async function downloadImage(format: 'png' | 'jpg' = 'png') {
    if (!result.value) return

    try {
      const response = await fetch(result.value.imageUrl)
      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `image-${result.value.id}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(result.value.imageUrl, '_blank')
    }
  }

  async function copyImageUrl(): Promise<boolean> {
    if (!result.value) return false
    try {
      await navigator.clipboard.writeText(result.value.imageUrl)
      return true
    } catch {
      return false
    }
  }

  function clearResult() {
    result.value = null
    prompt.value = ''
    selectedPreset.value = null
  }

  function loadFromHistory(item: ImageGenerationResult) {
    result.value = item
    prompt.value = item.prompt
    size.value = item.size
    quality.value = item.quality
    style.value = item.style
    if (item.presetId) {
      selectedPreset.value = IMAGE_PRESETS.find((p) => p.id === item.presetId) || null
    }
  }

  function reset() {
    selectedPreset.value = null
    prompt.value = ''
    size.value = '1024x1024'
    quality.value = 'standard'
    style.value = 'vivid'
    result.value = null
    isGenerating.value = false
    error.value = null
  }

  function getMockImageUrl(): string {
    const [w, h] = size.value.split('x').map((n) => Number(n))
    const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E9']
    const bg = palette[Math.floor(Math.random() * palette.length)]
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${bg}"/>
            <stop offset="1" stop-color="#111827"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" font-family="ui-sans-serif, system-ui" font-size="42" fill="white" text-anchor="middle" dominant-baseline="middle">
          AI Image
        </text>
        <text x="50%" y="62%" font-family="ui-sans-serif, system-ui" font-size="18" fill="rgba(255,255,255,0.85)" text-anchor="middle">
          ${w}×${h}
        </text>
      </svg>
    `.trim()
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  return {
    // State
    selectedPreset,
    prompt,
    size,
    quality,
    style,
    result,
    history,
    isGenerating,
    error,

    // Getters
    estimatedCredits,
    creditsRemaining,
    hasEnoughCredits,
    recentGenerations,
    sizeOptions,

    // Actions
    selectPreset,
    setSize,
    buildFullPrompt,
    generate,
    downloadImage,
    copyImageUrl,
    clearResult,
    loadFromHistory,
    reset,

    // Constants
    IMAGE_PRESETS,
    IMAGE_CREDIT_COSTS,
  }
})

