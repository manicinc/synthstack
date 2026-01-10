/**
 * @file quota.ts
 * @description Storage quota monitoring and management
 */

import type { StorageQuota } from '../ai/types'
import { formatBytes } from '../ai/utils'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Quota Thresholds
// ============================================

const WARNING_THRESHOLD = 0.8 // Warn at 80% usage
const CRITICAL_THRESHOLD = 0.9 // Start eviction at 90%
const DANGER_THRESHOLD = 0.95 // Aggressive eviction at 95%

// ============================================
// Quota Monitoring
// ============================================

/**
 * Get current storage quota and usage
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      usage: 0,
      quota: 0,
      percentUsed: 0,
      persistent: false,
    }
  }

  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const percentUsed = quota > 0 ? usage / quota : 0

    // Check if storage is persistent
    let persistent = false
    if (navigator.storage.persisted) {
      persistent = await navigator.storage.persisted()
    }

    return {
      usage,
      quota,
      percentUsed,
      persistent,
    }
  } catch (error) {
    logError('Failed to get storage quota:', error)
    return {
      usage: 0,
      quota: 0,
      percentUsed: 0,
      persistent: false,
    }
  }
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false
  }

  try {
    const isPersisted = await navigator.storage.persist()
    if (isPersisted) {
      devLog('✅ Persistent storage granted')
    } else {
      devWarn('⚠️  Persistent storage denied')
    }
    return isPersisted
  } catch (error) {
    logError('Failed to request persistent storage:', error)
    return false
  }
}

/**
 * Check if quota is approaching limits
 */
export async function checkQuotaStatus(): Promise<{
  status: 'ok' | 'warning' | 'critical' | 'danger'
  message: string
  percentUsed: number
  usageFormatted: string
  quotaFormatted: string
}> {
  const quota = await getStorageQuota()

  let status: 'ok' | 'warning' | 'critical' | 'danger' = 'ok'
  let message = 'Storage usage is healthy'

  if (quota.percentUsed >= DANGER_THRESHOLD) {
    status = 'danger'
    message = `Storage almost full! (${(quota.percentUsed * 100).toFixed(0)}%)`
  } else if (quota.percentUsed >= CRITICAL_THRESHOLD) {
    status = 'critical'
    message = `Storage usage is critical (${(quota.percentUsed * 100).toFixed(0)}%)`
  } else if (quota.percentUsed >= WARNING_THRESHOLD) {
    status = 'warning'
    message = `Storage usage is high (${(quota.percentUsed * 100).toFixed(0)}%)`
  }

  return {
    status,
    message,
    percentUsed: quota.percentUsed,
    usageFormatted: formatBytes(quota.usage),
    quotaFormatted: formatBytes(quota.quota),
  }
}

/**
 * Estimate storage needed for a document
 */
export function estimateDocumentSize(document: {
  content: string
  embedding: Float32Array
  metadata: any
}): number {
  // Estimate:
  // - Content: ~1 byte per character
  // - Embedding: 4 bytes per float × dimension
  // - Metadata: ~500 bytes average
  // - IndexedDB overhead: ~20% additional

  const contentSize = document.content.length
  const embeddingSize = document.embedding.length * 4 // Float32
  const metadataSize = 500 // Rough estimate
  const overhead = (contentSize + embeddingSize + metadataSize) * 0.2

  return contentSize + embeddingSize + metadataSize + overhead
}

/**
 * Check if there's enough space for a new document
 */
export async function canStoreDocument(estimatedSize: number): Promise<{
  canStore: boolean
  reason?: string
}> {
  const quota = await getStorageQuota()

  if (quota.quota === 0) {
    // Quota API not available, assume we can store
    return { canStore: true }
  }

  const availableSpace = quota.quota - quota.usage
  const wouldExceedLimit = estimatedSize > availableSpace

  if (wouldExceedLimit) {
    return {
      canStore: false,
      reason: `Not enough space. Need ${formatBytes(estimatedSize)}, have ${formatBytes(availableSpace)}`,
    }
  }

  // Check if storing would push us over danger threshold
  const newUsage = quota.usage + estimatedSize
  const newPercent = newUsage / quota.quota

  if (newPercent > DANGER_THRESHOLD) {
    return {
      canStore: false,
      reason: `Storing this document would exceed storage limit (${(newPercent * 100).toFixed(0)}%)`,
    }
  }

  return { canStore: true }
}

/**
 * Get recommended cleanup actions
 */
export async function getCleanupRecommendations(): Promise<
  Array<{
    action: string
    description: string
    estimatedSavings: string
  }>
> {
  const quota = await getStorageQuota()
  const recommendations: Array<{
    action: string
    description: string
    estimatedSavings: string
  }> = []

  if (quota.percentUsed > WARNING_THRESHOLD) {
    recommendations.push({
      action: 'clear-old-search-cache',
      description: 'Clear expired search results cache',
      estimatedSavings: '~5-10 MB',
    })

    recommendations.push({
      action: 'remove-old-documents',
      description: 'Remove documents not accessed in 30+ days',
      estimatedSavings: '~20-50 MB',
    })
  }

  if (quota.percentUsed > CRITICAL_THRESHOLD) {
    recommendations.push({
      action: 'reduce-document-count',
      description: 'Keep only 50 most recent documents',
      estimatedSavings: '~100+ MB',
    })

    recommendations.push({
      action: 'request-more-quota',
      description: 'Request persistent storage permission',
      estimatedSavings: 'Prevent automatic cleanup',
    })
  }

  return recommendations
}

/**
 * Monitor quota changes and emit warnings
 */
export class QuotaMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastStatus: 'ok' | 'warning' | 'critical' | 'danger' = 'ok'
  private listeners: Array<(status: Awaited<ReturnType<typeof checkQuotaStatus>>) => void> =
    []

  /**
   * Start monitoring quota every N milliseconds
   */
  start(intervalMs = 60000): void {
    if (this.intervalId) {
      return // Already monitoring
    }

    this.intervalId = setInterval(() => {
      this.check()
    }, intervalMs)

    // Check immediately
    this.check()
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Add listener for quota status changes
   */
  onStatusChange(
    callback: (status: Awaited<ReturnType<typeof checkQuotaStatus>>) => void
  ): void {
    this.listeners.push(callback)
  }

  /**
   * Remove listener
   */
  removeListener(
    callback: (status: Awaited<ReturnType<typeof checkQuotaStatus>>) => void
  ): void {
    this.listeners = this.listeners.filter((cb) => cb !== callback)
  }

  /**
   * Check quota and notify listeners if status changed
   */
  private async check(): Promise<void> {
    const status = await checkQuotaStatus()

    if (status.status !== this.lastStatus) {
      devLog(`Storage quota status changed: ${this.lastStatus} → ${status.status}`)
      this.lastStatus = status.status
      this.notifyListeners(status)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(status: Awaited<ReturnType<typeof checkQuotaStatus>>): void {
    for (const listener of this.listeners) {
      try {
        listener(status)
      } catch (error) {
        logError('Quota listener error:', error)
      }
    }
  }
}

// ============================================
// Singleton Monitor Instance
// ============================================

let monitorInstance: QuotaMonitor | null = null

/**
 * Get singleton quota monitor
 */
export function getQuotaMonitor(): QuotaMonitor {
  if (!monitorInstance) {
    monitorInstance = new QuotaMonitor()
  }
  return monitorInstance
}

// ============================================
// Export
// ============================================

export default {
  getStorageQuota,
  requestPersistentStorage,
  checkQuotaStatus,
  estimateDocumentSize,
  canStoreDocument,
  getCleanupRecommendations,
  getQuotaMonitor,
}
