/**
 * Directus Sync Service
 * Bidirectional sync between SynthStack and Directus CMS
 */
import type { FastifyInstance } from 'fastify'
import { config } from '../config/index.js'
import { emitDashboardEvent } from '../routes/dashboard-events.js'

// Types
export interface SyncableCollection {
  name: string
  clientEditableFields: string[]
  readOnlyFields: string[]
}

export interface WebhookPayload {
  event: 'items.create' | 'items.update' | 'items.delete'
  collection: string
  key: string | number
  payload: Record<string, unknown>
  accountability: {
    user: string
    role: string
  }
}

export interface SyncResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  conflictResolved?: boolean
}

export interface SyncConflict<T = unknown> {
  local: T
  remote: T
  resolvedTo: 'local' | 'remote' | 'merged'
  timestamp: Date
}

// Client-editable collections configuration
const SYNCABLE_COLLECTIONS: SyncableCollection[] = [
  {
    name: 'projects',
    clientEditableFields: ['description', 'client_notes', 'client_attachments'],
    readOnlyFields: ['name', 'status', 'created_at', 'organization_id', 'owner_id'],
  },
  {
    name: 'todos',
    clientEditableFields: ['client_task_details', 'client_status', 'client_attachments', 'client_notes'],
    readOnlyFields: ['title', 'description', 'assignee_id', 'due_date', 'project_id', 'created_at'],
  },
  {
    name: 'messages',
    clientEditableFields: ['text', 'attachments'], // Only for new messages
    readOnlyFields: ['sender_id', 'is_internal_note', 'date_created', 'thread_id'],
  },
  {
    name: 'project_files',
    clientEditableFields: ['description', 'client_tags'],
    readOnlyFields: ['filename', 'file_id', 'uploaded_by', 'project_id', 'created_at'],
  },
]

export class DirectusSyncService {
  private fastify: FastifyInstance
  private directusUrl: string
  private directusToken: string
  private syncCache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private cacheTTL = 30000 // 30 seconds

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
    this.directusUrl = config.directus?.url || process.env.DIRECTUS_URL || ''
    this.directusToken = config.directus?.token || process.env.DIRECTUS_TOKEN || ''
  }

  /**
   * Get syncable collection configuration
   */
  getSyncableCollection(name: string): SyncableCollection | undefined {
    return SYNCABLE_COLLECTIONS.find(c => c.name === name)
  }

  /**
   * Check if a field is client-editable
   */
  isFieldEditable(collection: string, field: string): boolean {
    const config = this.getSyncableCollection(collection)
    if (!config) return false
    return config.clientEditableFields.includes(field)
  }

  /**
   * Filter payload to only include client-editable fields
   */
  filterEditableFields(collection: string, data: Record<string, unknown>): Record<string, unknown> {
    const config = this.getSyncableCollection(collection)
    if (!config) return {}

    const filtered: Record<string, unknown> = {}
    for (const field of config.clientEditableFields) {
      if (field in data) {
        filtered[field] = data[field]
      }
    }
    return filtered
  }

  /**
   * Sync client changes to Directus
   */
  async syncToDirectus<T>(
    collection: string,
    id: string,
    data: Partial<T>
  ): Promise<SyncResult<T>> {
    const collectionConfig = this.getSyncableCollection(collection)
    if (!collectionConfig) {
      return { success: false, error: `Collection ${collection} is not syncable` }
    }

    // Filter to only editable fields
    const filteredData = this.filterEditableFields(collection, data as Record<string, unknown>)
    
    if (Object.keys(filteredData).length === 0) {
      return { success: false, error: 'No editable fields in payload' }
    }

    try {
      // Check for conflicts first
      const remoteData = await this.fetchFromDirectus<T>(collection, id)
      
      if (remoteData) {
        const conflict = await this.detectConflict(collection, id, filteredData, remoteData)
        if (conflict) {
          const resolved = await this.resolveConflict(conflict)
          filteredData[conflict.field as string] = resolved.value
        }
      }

      // Update Directus
      const response = await fetch(`${this.directusUrl}/items/${collection}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.directusToken}`,
        },
        body: JSON.stringify(filteredData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.message || `Directus sync failed: ${response.status}`)
      }

      const result = await response.json()
      
      // Update local cache
      this.updateCache(collection, id, result.data)
      
      // Log sync event
      await this.logSyncEvent(collection, id, 'to_directus', filteredData)

      // Emit dashboard event for real-time updates
      try {
        emitDashboardEvent({
          type: 'sync_completed',
          data: {
            collection,
            itemId: id,
            direction: 'to_directus',
            fields: Object.keys(filteredData),
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        this.fastify.log.warn(error, 'Failed to emit sync_completed dashboard event')
      }

      return { success: true, data: result.data }
    } catch (error) {
      this.fastify.log.error(error, `Failed to sync ${collection}/${id} to Directus`)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }
    }
  }

  /**
   * Handle Directus webhook updates
   */
  async handleDirectusWebhook(payload: WebhookPayload): Promise<SyncResult> {
    const { event, collection, key, payload: data, accountability } = payload

    const collectionConfig = this.getSyncableCollection(collection)
    if (!collectionConfig) {
      return { success: false, error: `Collection ${collection} is not syncable` }
    }

    try {
      // Log the webhook event
      await this.logSyncEvent(collection, String(key), 'from_directus', data, accountability)

      switch (event) {
        case 'items.create':
          await this.handleRemoteCreate(collection, String(key), data)
          break
        case 'items.update':
          await this.handleRemoteUpdate(collection, String(key), data)
          break
        case 'items.delete':
          await this.handleRemoteDelete(collection, String(key))
          break
      }

      // Invalidate cache
      this.invalidateCache(collection, String(key))

      // Notify connected clients via WebSocket
      await this.notifyClients(collection, String(key), event, data)

      // Emit dashboard event for real-time updates
      try {
        emitDashboardEvent({
          type: 'sync_completed',
          data: {
            collection,
            itemId: String(key),
            direction: 'from_directus',
            event,
            fields: Object.keys(data),
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        this.fastify.log.warn(error, 'Failed to emit sync_completed dashboard event')
      }

      return { success: true }
    } catch (error) {
      this.fastify.log.error(error, `Failed to handle webhook for ${collection}/${key}`)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook handling failed' 
      }
    }
  }

  /**
   * Fetch item from Directus
   */
  async fetchFromDirectus<T>(collection: string, id: string): Promise<T | null> {
    // Check cache first
    const cached = this.getFromCache<T>(collection, id)
    if (cached) return cached

    try {
      const response = await fetch(`${this.directusUrl}/items/${collection}/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.directusToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Directus fetch failed: ${response.status}`)
      }

      const result = await response.json()
      this.updateCache(collection, id, result.data)
      return result.data
    } catch (error) {
      this.fastify.log.error(error, `Failed to fetch ${collection}/${id} from Directus`)
      return null
    }
  }

  /**
   * Detect sync conflicts
   */
  private async detectConflict(
    collection: string,
    id: string,
    localChanges: Record<string, unknown>,
    remoteData: unknown
  ): Promise<{ field: string; local: unknown; remote: unknown } | null> {
    // Get local data from database
    const localResult = await this.fastify.pg.query(
      `SELECT * FROM ${collection} WHERE id = $1`,
      [id]
    )
    const localData = localResult.rows[0]

    if (!localData) return null

    // Check each changed field for conflicts
    for (const [field, newValue] of Object.entries(localChanges)) {
      const localValue = localData[field]
      const remoteValue = (remoteData as Record<string, unknown>)[field]

      // If remote has changed since our last sync and differs from what we're trying to set
      if (remoteValue !== localValue && remoteValue !== newValue) {
        return { field, local: newValue, remote: remoteValue }
      }
    }

    return null
  }

  /**
   * Resolve sync conflicts (last-write-wins with audit trail)
   */
  async resolveConflict<T>(
    conflict: { field: string; local: unknown; remote: unknown }
  ): Promise<{ value: unknown; resolution: 'local' | 'remote' }> {
    // Last-write-wins: prefer local changes (user's latest input)
    // Log the conflict for audit trail
    await this.fastify.pg.query(
      `INSERT INTO sync_conflicts (
        field_name, local_value, remote_value, resolution, resolved_at
      ) VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())`,
      [conflict.field, JSON.stringify(conflict.local), JSON.stringify(conflict.remote), 'local']
    )

    return { value: conflict.local, resolution: 'local' }
  }

  /**
   * Handle remote item creation
   */
  private async handleRemoteCreate(
    collection: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Map Directus collection to local table
    const tableMap: Record<string, string> = {
      projects: 'projects',
      todos: 'todos',
      messages: 'messages',
      project_files: 'project_files',
    }

    const localTable = tableMap[collection]
    if (!localTable) return

    // This would sync to local database if needed
    // For now, we primarily use Directus as source of truth
    this.fastify.log.info({ collection, id }, 'Remote item created')
  }

  /**
   * Handle remote item update
   */
  private async handleRemoteUpdate(
    collection: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    this.fastify.log.info({ collection, id, fields: Object.keys(data) }, 'Remote item updated')
    
    // Update local cache with new data
    const existing = this.getFromCache(collection, id) || {}
    this.updateCache(collection, id, { ...existing, ...data })
  }

  /**
   * Handle remote item deletion
   */
  private async handleRemoteDelete(collection: string, id: string): Promise<void> {
    this.fastify.log.info({ collection, id }, 'Remote item deleted')
    this.invalidateCache(collection, id)
  }

  /**
   * Notify clients via WebSocket
   */
  private async notifyClients(
    collection: string,
    id: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // This would integrate with the WebSocket service
    // For now, we'll emit an event that can be picked up by the WebSocket handler
    this.fastify.log.info({ collection, id, event }, 'Notifying clients of sync event')
    
    // The WebSocket service would broadcast this to relevant connected clients
    // Example: ws.broadcast('sync.directus', { collection, id, event, data })
  }

  /**
   * Log sync events for audit trail
   */
  private async logSyncEvent(
    collection: string,
    itemId: string,
    direction: 'to_directus' | 'from_directus',
    data: Record<string, unknown>,
    accountability?: { user: string; role: string }
  ): Promise<void> {
    try {
      await this.fastify.pg.query(
        `INSERT INTO sync_logs (
          collection_name, item_id, direction, payload, 
          directus_user, directus_role, synced_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())`,
        [
          collection,
          itemId,
          direction,
          JSON.stringify(data),
          accountability?.user || null,
          accountability?.role || null,
        ]
      )
    } catch (error) {
      this.fastify.log.warn(error, 'Failed to log sync event')
    }
  }

  // Cache methods
  private getCacheKey(collection: string, id: string): string {
    return `${collection}:${id}`
  }

  private getFromCache<T>(collection: string, id: string): T | null {
    const key = this.getCacheKey(collection, id)
    const cached = this.syncCache.get(key)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T
    }
    
    return null
  }

  private updateCache(collection: string, id: string, data: unknown): void {
    const key = this.getCacheKey(collection, id)
    this.syncCache.set(key, { data, timestamp: Date.now() })
  }

  private invalidateCache(collection: string, id: string): void {
    const key = this.getCacheKey(collection, id)
    this.syncCache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.syncCache.clear()
  }

  /**
   * Get sync status for an item
   */
  async getSyncStatus(collection: string, id: string): Promise<{
    lastSyncedAt: Date | null
    direction: 'to_directus' | 'from_directus' | null
    hasConflicts: boolean
  }> {
    const result = await this.fastify.pg.query<{
      synced_at: Date
      direction: string
    }>(
      `SELECT synced_at, direction FROM sync_logs 
       WHERE collection_name = $1 AND item_id = $2 
       ORDER BY synced_at DESC LIMIT 1`,
      [collection, id]
    )

    const conflictsResult = await this.fastify.pg.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM sync_conflicts 
       WHERE field_name LIKE $1 AND resolved_at IS NULL`,
      [`${collection}.${id}.%`]
    )

    return {
      lastSyncedAt: result.rows[0]?.synced_at || null,
      direction: result.rows[0]?.direction as 'to_directus' | 'from_directus' | null,
      hasConflicts: parseInt(conflictsResult.rows[0]?.count || '0', 10) > 0,
    }
  }
}

// Singleton
let directusSyncService: DirectusSyncService | null = null

export function initDirectusSyncService(fastify: FastifyInstance): DirectusSyncService {
  if (!directusSyncService) {
    directusSyncService = new DirectusSyncService(fastify)
  }
  return directusSyncService
}

export function getDirectusSyncService(): DirectusSyncService {
  if (!directusSyncService) {
    throw new Error('Directus sync service not initialized')
  }
  return directusSyncService
}

export default DirectusSyncService

