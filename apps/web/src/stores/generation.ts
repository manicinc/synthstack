/**
 * @file generation.ts
 * @description Pinia store for profile generation workflow.
 * Manages the entire generation process from file upload to download.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  analysis as analysisApi, 
  generation as generationApi,
  type AnalysisResult,
  type GeneratedProfile,
  type GenerationRequest
} from '@/services/api'

/** Generation step type */
export type GenerationStep = 'upload' | 'configure' | 'generate' | 'complete'

/** Generation quality preset */
export type QualityPreset = 'draft' | 'standard' | 'high' | 'ultra'

/** Generation priority */
export type GenerationPriority = 'speed' | 'quality' | 'balanced'

export const useGenerationStore = defineStore('generation', () => {
  // ============================================
  // State
  // ============================================
  
  /** Current step in generation workflow */
  const currentStep = ref<GenerationStep>('upload')
  
  /** Uploaded file */
  const uploadedFile = ref<File | null>(null)
  
  /** Upload progress (0-100) */
  const uploadProgress = ref(0)
  
  /** Analysis result */
  const analysisResult = ref<AnalysisResult | null>(null)
  
  /** Selected printer ID */
  const selectedPrinterId = ref<string | null>(null)
  
  /** Selected filament ID */
  const selectedFilamentId = ref<string | null>(null)
  
  /** Selected slicer */
  const selectedSlicer = ref<'cura' | 'prusaslicer' | 'orcaslicer' | 'bambu-studio'>('cura')
  
  /** Quality preset */
  const quality = ref<QualityPreset>('standard')
  
  /** Priority */
  const priority = ref<GenerationPriority>('balanced')
  
  /** Custom settings overrides */
  const customSettings = ref<Record<string, unknown>>({})
  
  /** Generated profile */
  const generatedProfile = ref<GeneratedProfile | null>(null)
  
  /** Loading states */
  const isUploading = ref(false)
  const isAnalyzing = ref(false)
  const isGenerating = ref(false)
  
  /** Error state */
  const error = ref<string | null>(null)

  // ============================================
  // Getters
  // ============================================
  
  /** Check if file is uploaded and analyzed */
  const isAnalyzed = computed(() => analysisResult.value !== null)
  
  /** Check if configuration is complete */
  const isConfigured = computed(() =>
    selectedPrinterId.value !== null &&
    selectedFilamentId.value !== null &&
    selectedSlicer.value !== null
  )
  
  /** Check if generation is complete */
  const isComplete = computed(() => generatedProfile.value !== null)
  
  /** Step progress (1-4) */
  const stepNumber = computed(() => {
    switch (currentStep.value) {
      case 'upload': return 1
      case 'configure': return 2
      case 'generate': return 3
      case 'complete': return 4
      default: return 1
    }
  })
  
  /** Can proceed to next step */
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 'upload': return isAnalyzed.value
      case 'configure': return isConfigured.value
      case 'generate': return isComplete.value
      default: return false
    }
  })

  // ============================================
  // Actions
  // ============================================
  
  /**
   * Upload and analyze STL file
   */
  async function uploadFile(file: File) {
    uploadedFile.value = file
    uploadProgress.value = 0
    isUploading.value = true
    isAnalyzing.value = true
    error.value = null
    
    try {
      // Upload with progress tracking
      const result = await analysisApi.upload(file, (progress: number) => {
        uploadProgress.value = progress
      })
      
      uploadProgress.value = 100
      isUploading.value = false
      
      // Set analysis result
      analysisResult.value = result
      isAnalyzing.value = false
      
      // Auto-advance to configure step
      currentStep.value = 'configure'
      
      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to upload file'
      isUploading.value = false
      isAnalyzing.value = false
      
      // Fallback mock analysis for development
      if (import.meta.env.DEV) {
        analysisResult.value = getMockAnalysis(file)
        currentStep.value = 'configure'
        return analysisResult.value
      }
      
      throw err
    }
  }
  
  /**
   * Set printer selection
   */
  function setPrinter(printerId: string) {
    selectedPrinterId.value = printerId
  }
  
  /**
   * Set filament selection
   */
  function setFilament(filamentId: string) {
    selectedFilamentId.value = filamentId
  }
  
  /**
   * Set slicer
   */
  function setSlicer(slicer: 'cura' | 'prusaslicer' | 'orcaslicer' | 'bambu-studio') {
    selectedSlicer.value = slicer
  }
  
  /**
   * Set quality preset
   */
  function setQuality(preset: QualityPreset) {
    quality.value = preset
  }
  
  /**
   * Set priority
   */
  function setPriority(p: GenerationPriority) {
    priority.value = p
  }
  
  /**
   * Set custom settings
   */
  function setCustomSetting(key: string, value: unknown) {
    customSettings.value[key] = value
  }
  
  /**
   * Generate profile
   */
  async function generate() {
    if (!analysisResult.value || !selectedPrinterId.value || !selectedFilamentId.value) {
      error.value = 'Missing required configuration'
      return
    }
    
    currentStep.value = 'generate'
    isGenerating.value = true
    error.value = null
    
    const request: GenerationRequest = {
      analysisId: analysisResult.value.id,
      printerId: selectedPrinterId.value,
      filamentId: selectedFilamentId.value,
      slicer: selectedSlicer.value,
      quality: quality.value,
      priority: priority.value,
      customSettings: Object.keys(customSettings.value).length > 0 
        ? customSettings.value 
        : undefined
    }
    
    try {
      const profile = await generationApi.create(request)
      generatedProfile.value = profile
      currentStep.value = 'complete'
      return profile
    } catch (err: any) {
      error.value = err.message || 'Failed to generate profile'
      
      // Mock generation for development
      if (import.meta.env.DEV) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        generatedProfile.value = getMockProfile()
        currentStep.value = 'complete'
        return generatedProfile.value
      }
      
      throw err
    } finally {
      isGenerating.value = false
    }
  }
  
  /**
   * Download generated profile
   */
  async function downloadProfile() {
    if (!generatedProfile.value) return
    
    try {
      const { url } = await generationApi.download(generatedProfile.value.id)
      // Trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `${generatedProfile.value.name}.${getFileExtension()}`
      link.click()
    } catch {
      // Direct download fallback
      if (generatedProfile.value.downloadUrl) {
        window.open(generatedProfile.value.downloadUrl, '_blank')
      }
    }
  }
  
  /**
   * Get file extension for slicer
   */
  function getFileExtension(): string {
    switch (selectedSlicer.value) {
      case 'cura': return 'curaprofile'
      case 'prusaslicer': return '3mf'
      case 'orcaslicer': return '3mf'
      case 'bambu-studio': return '3mf'
      default: return 'json'
    }
  }
  
  /**
   * Go to specific step
   */
  function goToStep(step: GenerationStep) {
    // Only allow going back or to valid next steps
    const steps: GenerationStep[] = ['upload', 'configure', 'generate', 'complete']
    const currentIndex = steps.indexOf(currentStep.value)
    const targetIndex = steps.indexOf(step)
    
    if (targetIndex <= currentIndex || canProceed.value) {
      currentStep.value = step
    }
  }
  
  /**
   * Reset entire generation state
   */
  function reset() {
    currentStep.value = 'upload'
    uploadedFile.value = null
    uploadProgress.value = 0
    analysisResult.value = null
    selectedPrinterId.value = null
    selectedFilamentId.value = null
    selectedSlicer.value = 'cura'
    quality.value = 'standard'
    priority.value = 'balanced'
    customSettings.value = {}
    generatedProfile.value = null
    isUploading.value = false
    isAnalyzing.value = false
    isGenerating.value = false
    error.value = null
  }

  // ============================================
  // Mock Data
  // ============================================
  
  function getMockAnalysis(file: File): AnalysisResult {
    return {
      id: `analysis-${Date.now()}`,
      filename: file.name,
      fileSize: file.size,
      dimensions: { x: 120.5, y: 80.3, z: 45.2 },
      volume: 85420.5,
      surfaceArea: 12500.8,
      triangleCount: 125000,
      isManifold: true,
      hasOverhangs: true,
      maxOverhangAngle: 62,
      hasThinWalls: false,
      minWallThickness: 1.2,
      hasBridges: true,
      maxBridgeLength: 15.5,
      complexity: 'medium',
      recommendedLayerHeight: 0.2,
      estimatedPrintTime: 180 // minutes
    }
  }
  
  function getMockProfile(): GeneratedProfile {
    return {
      id: `profile-${Date.now()}`,
      name: 'Generated Profile',
      slicer: selectedSlicer.value,
      printer: {} as any,
      filament: {} as any,
      settings: {
        layer_height: 0.2,
        print_speed: 60,
        infill_density: 20,
        support_enabled: true
      },
      downloadUrl: '#',
      estimatedPrintTime: 180,
      estimatedFilamentUsage: 45.5,
      createdAt: new Date().toISOString()
    }
  }

  return {
    // State
    currentStep,
    uploadedFile,
    uploadProgress,
    analysisResult,
    selectedPrinterId,
    selectedFilamentId,
    selectedSlicer,
    quality,
    priority,
    customSettings,
    generatedProfile,
    isUploading,
    isAnalyzing,
    isGenerating,
    error,
    
    // Getters
    isAnalyzed,
    isConfigured,
    isComplete,
    stepNumber,
    canProceed,
    
    // Actions
    uploadFile,
    setPrinter,
    setFilament,
    setSlicer,
    setQuality,
    setPriority,
    setCustomSetting,
    generate,
    downloadProfile,
    goToStep,
    reset
  }
})





