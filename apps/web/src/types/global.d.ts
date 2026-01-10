/**
 * @file global.d.ts
 * @description Global TypeScript declarations for browser APIs and third-party libraries
 */

// ============================================
// WebGPU API
// ============================================

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance'
  forceFallbackAdapter?: boolean
}

interface GPUAdapter {
  readonly name: string
  readonly features: Set<string>
  readonly limits: Record<string, number>
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>
}

interface GPUDeviceDescriptor {
  requiredFeatures?: string[]
  requiredLimits?: Record<string, number>
}

interface GPUDevice {
  readonly features: Set<string>
  readonly limits: Record<string, number>
  destroy(): void
}

interface Navigator {
  readonly gpu?: GPU
}

// ============================================
// Third-party library declarations
// ============================================

declare module 'pdf-parse' {
  interface PDFData {
    numpages: number
    numrender: number
    info: any
    metadata: any
    text: string
    version: string
  }

  function pdfParse(dataBuffer: Buffer): Promise<PDFData>
  export = pdfParse
}

declare module 'mammoth' {
  interface ConversionOptions {
    styleMap?: string[]
    includeDefaultStyleMap?: boolean
    includeEmbeddedStyleMap?: boolean
  }

  interface ConversionResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }

  export function extractRawText(options: {
    buffer?: Buffer
    path?: string
  }): Promise<ConversionResult>

  export function convertToHtml(options: {
    buffer?: Buffer
    path?: string
  } & ConversionOptions): Promise<ConversionResult>
}
