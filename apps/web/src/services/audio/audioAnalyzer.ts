/**
 * Audio Analyzer Service
 *
 * Provides real-time audio analysis for waveform visualization
 * using the Web Audio API's AnalyserNode.
 */

// ============================================
// Types
// ============================================

export interface AudioAnalyzerOptions {
  fftSize?: number // Power of 2, default 2048
  smoothingTimeConstant?: number // 0-1, default 0.8
  minDecibels?: number // Default -100
  maxDecibels?: number // Default -30
}

export interface AudioLevels {
  peak: number // 0-1
  rms: number // 0-1 (root mean square)
  frequency: Uint8Array // Frequency data
  waveform: Uint8Array // Time domain data
}

export type VisualizationType = 'waveform' | 'frequency' | 'bars'

// ============================================
// AudioAnalyzer Class
// ============================================

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private animationFrame: number | null = null
  private options: Required<AudioAnalyzerOptions>

  private frequencyData: Uint8Array<ArrayBuffer> | null = null
  private waveformData: Uint8Array<ArrayBuffer> | null = null

  constructor(options: AudioAnalyzerOptions = {}) {
    this.options = {
      fftSize: options.fftSize ?? 2048,
      smoothingTimeConstant: options.smoothingTimeConstant ?? 0.8,
      minDecibels: options.minDecibels ?? -100,
      maxDecibels: options.maxDecibels ?? -30,
    }
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Connect to a media stream and start analysis
   */
  async connect(stream: MediaStream): Promise<void> {
    // Create audio context
    this.audioContext = new AudioContext()

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = this.options.fftSize
    this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant
    this.analyser.minDecibels = this.options.minDecibels
    this.analyser.maxDecibels = this.options.maxDecibels

    // Create source from stream
    this.source = this.audioContext.createMediaStreamSource(stream)
    this.source.connect(this.analyser)

    // Initialize data arrays
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    this.waveformData = new Uint8Array(this.analyser.fftSize)
  }

  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    this.stopAnimation()

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.frequencyData = null
    this.waveformData = null
  }

  /**
   * Get current audio levels
   */
  getAudioLevels(): AudioLevels | null {
    if (!this.analyser || !this.frequencyData || !this.waveformData) {
      return null
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.frequencyData)

    // Get waveform data
    this.analyser.getByteTimeDomainData(this.waveformData)

    // Calculate peak and RMS
    let peak = 0
    let sumSquares = 0

    for (let i = 0; i < this.waveformData.length; i++) {
      // Convert from 0-255 to -1 to 1
      const sample = (this.waveformData[i] - 128) / 128

      peak = Math.max(peak, Math.abs(sample))
      sumSquares += sample * sample
    }

    const rms = Math.sqrt(sumSquares / this.waveformData.length)

    return {
      peak: Math.min(peak, 1),
      rms: Math.min(rms, 1),
      frequency: this.frequencyData,
      waveform: this.waveformData,
    }
  }

  /**
   * Start continuous animation loop
   */
  startAnimation(callback: (levels: AudioLevels) => void): void {
    const animate = () => {
      const levels = this.getAudioLevels()
      if (levels) {
        callback(levels)
      }
      this.animationFrame = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  stopAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /**
   * Get frequency bin count
   */
  getFrequencyBinCount(): number {
    return this.analyser?.frequencyBinCount ?? 0
  }

  /**
   * Get FFT size
   */
  getFFTSize(): number {
    return this.analyser?.fftSize ?? 0
  }
}

// ============================================
// Waveform Renderer
// ============================================

export class WaveformRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private options: WaveformRendererOptions

  constructor(canvas: HTMLCanvasElement, options: Partial<WaveformRendererOptions> = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas 2D context')
    }
    this.ctx = ctx

    this.options = {
      lineColor: options.lineColor ?? '#FF6B35',
      lineWidth: options.lineWidth ?? 2,
      backgroundColor: options.backgroundColor ?? 'transparent',
      type: options.type ?? 'waveform',
      barWidth: options.barWidth ?? 3,
      barGap: options.barGap ?? 1,
      mirror: options.mirror ?? true,
      gradient: options.gradient ?? false,
      gradientColors: options.gradientColors ?? ['#FF6B35', '#2D9CDB'],
    }
  }

  /**
   * Render waveform visualization
   */
  renderWaveform(data: Uint8Array): void {
    const { width, height } = this.canvas
    const { lineColor, lineWidth, backgroundColor, mirror } = this.options

    // Clear canvas
    this.ctx.fillStyle = backgroundColor
    this.ctx.fillRect(0, 0, width, height)

    // Draw waveform
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = lineColor
    this.ctx.beginPath()

    const sliceWidth = width / data.length
    let x = 0

    for (let i = 0; i < data.length; i++) {
      // Convert from 0-255 to 0-1
      const v = data[i] / 255
      const y = mirror ? (v * height) / 2 + height / 4 : v * height

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    this.ctx.stroke()

    // Mirror effect
    if (mirror) {
      this.ctx.beginPath()
      x = 0

      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255
        const y = height - ((v * height) / 2 + height / 4)

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      this.ctx.globalAlpha = 0.5
      this.ctx.stroke()
      this.ctx.globalAlpha = 1
    }
  }

  /**
   * Render frequency bars visualization
   */
  renderBars(data: Uint8Array): void {
    const { width, height } = this.canvas
    const { lineColor, backgroundColor, barWidth, barGap, gradient, gradientColors } = this.options

    // Clear canvas
    this.ctx.fillStyle = backgroundColor
    this.ctx.fillRect(0, 0, width, height)

    // Calculate number of bars that fit
    const totalBarWidth = barWidth + barGap
    const numBars = Math.floor(width / totalBarWidth)
    const step = Math.floor(data.length / numBars)

    // Create gradient if enabled
    let fillStyle: string | CanvasGradient = lineColor
    if (gradient && gradientColors.length >= 2) {
      const grd = this.ctx.createLinearGradient(0, height, 0, 0)
      gradientColors.forEach((color, i) => {
        grd.addColorStop(i / (gradientColors.length - 1), color)
      })
      fillStyle = grd
    }

    this.ctx.fillStyle = fillStyle

    for (let i = 0; i < numBars; i++) {
      // Average the values for this bar
      let sum = 0
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j]
      }
      const avg = sum / step / 255

      const barHeight = avg * height * 0.9
      const x = i * totalBarWidth
      const y = height - barHeight

      // Draw bar with rounded corners
      this.roundRect(x, y, barWidth, barHeight, 2)
    }
  }

  /**
   * Render circular visualization
   */
  renderCircular(data: Uint8Array, peak: number): void {
    const { width, height } = this.canvas
    const { lineColor, backgroundColor, gradient, gradientColors } = this.options

    // Clear canvas
    this.ctx.fillStyle = backgroundColor
    this.ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2
    const baseRadius = Math.min(width, height) * 0.2
    const maxRadius = Math.min(width, height) * 0.4

    // Create gradient
    let strokeStyle: string | CanvasGradient = lineColor
    if (gradient && gradientColors.length >= 2) {
      const grd = this.ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius,
        centerX,
        centerY,
        maxRadius
      )
      gradientColors.forEach((color, i) => {
        grd.addColorStop(i / (gradientColors.length - 1), color)
      })
      strokeStyle = grd
    }

    // Draw base circle
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2)
    this.ctx.strokeStyle = strokeStyle
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw dynamic circle based on peak
    const dynamicRadius = baseRadius + peak * (maxRadius - baseRadius)
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2)
    this.ctx.strokeStyle = strokeStyle
    this.ctx.lineWidth = 3
    this.ctx.globalAlpha = 0.6 + peak * 0.4
    this.ctx.stroke()
    this.ctx.globalAlpha = 1

    // Draw radial bars
    const numBars = 64
    const step = Math.floor(data.length / numBars)

    for (let i = 0; i < numBars; i++) {
      const value = data[i * step] / 255
      const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2

      const innerRadius = baseRadius + 5
      const outerRadius = innerRadius + value * (maxRadius - baseRadius) * 0.8

      const x1 = centerX + Math.cos(angle) * innerRadius
      const y1 = centerY + Math.sin(angle) * innerRadius
      const x2 = centerX + Math.cos(angle) * outerRadius
      const y2 = centerY + Math.sin(angle) * outerRadius

      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
      this.ctx.strokeStyle = strokeStyle
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Resize canvas to match display size
   */
  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()

    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr

    this.ctx.scale(dpr, dpr)
  }

  /**
   * Update options
   */
  setOptions(options: Partial<WaveformRendererOptions>): void {
    this.options = { ...this.options, ...options }
  }

  // ============================================
  // Private Methods
  // ============================================

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    if (h < r * 2) {
      r = h / 2
    }

    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.arcTo(x + w, y, x + w, y + h, r)
    this.ctx.arcTo(x + w, y + h, x, y + h, r)
    this.ctx.arcTo(x, y + h, x, y, r)
    this.ctx.arcTo(x, y, x + w, y, r)
    this.ctx.closePath()
    this.ctx.fill()
  }
}

export interface WaveformRendererOptions {
  lineColor: string
  lineWidth: number
  backgroundColor: string
  type: VisualizationType
  barWidth: number
  barGap: number
  mirror: boolean
  gradient: boolean
  gradientColors: string[]
}

// ============================================
// Factory Functions
// ============================================

export function createAudioAnalyzer(options?: AudioAnalyzerOptions): AudioAnalyzer {
  return new AudioAnalyzer(options)
}

export function createWaveformRenderer(
  canvas: HTMLCanvasElement,
  options?: Partial<WaveformRendererOptions>
): WaveformRenderer {
  return new WaveformRenderer(canvas, options)
}
