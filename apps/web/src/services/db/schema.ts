/**
 * @file schema.ts
 * @description IndexedDB schema and operations for offline AI document storage
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import type {
  Document,
  ModelCacheEntry,
  SearchCacheEntry,
  StoreName,
} from '../ai/types'

// ============================================
// Schema Definition
// ============================================

/**
 * IndexedDB database schema
 */
interface SynthStackAIDB extends DBSchema {
  documents: {
    key: string // document.id
    value: Document
    indexes: {
      'by-type': string // document.type
      'by-uploadedAt': string // document.uploadedAt
      'by-tag': string // tags[] (multiEntry)
    }
  }
  model_cache: {
    key: string // 'onnx-model' | 'tokenizer' | 'config'
    value: ModelCacheEntry
  }
  search_cache: {
    key: string // queryHash
    value: SearchCacheEntry
    indexes: {
      'by-timestamp': number // timestamp
    }
  }
}

const DB_NAME = 'synthstack-ai'
const DB_VERSION = 1

// ============================================
// Database Singleton
// ============================================

let dbInstance: IDBPDatabase<SynthStackAIDB> | null = null

/**
 * Open IndexedDB connection
 */
async function getDB(): Promise<IDBPDatabase<SynthStackAIDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<SynthStackAIDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      devLog(`Upgrading database from v${oldVersion} to v${newVersion}`)

      // Create documents store
      if (!db.objectStoreNames.contains('documents')) {
        const documentsStore = db.createObjectStore('documents', { keyPath: 'id' })

        // Indexes for filtering
        documentsStore.createIndex('by-type', 'type', { unique: false })
        documentsStore.createIndex('by-uploadedAt', 'uploadedAt', { unique: false })
        documentsStore.createIndex('by-tag', 'tags', {
          unique: false,
          multiEntry: true,
        })

        devLog('Created documents store with indexes')
      }

      // Create model_cache store
      if (!db.objectStoreNames.contains('model_cache')) {
        db.createObjectStore('model_cache', { keyPath: 'key' })
        devLog('Created model_cache store')
      }

      // Create search_cache store
      if (!db.objectStoreNames.contains('search_cache')) {
        const searchCacheStore = db.createObjectStore('search_cache', {
          keyPath: 'queryHash',
        })
        searchCacheStore.createIndex('by-timestamp', 'timestamp', { unique: false })
        devLog('Created search_cache store')
      }
    },
    blocked() {
      devWarn('Database upgrade blocked. Close all other tabs.')
    },
    blocking() {
      devWarn('This tab is blocking a database upgrade.')
    },
  })

  return dbInstance
}

// ============================================
// Document Operations
// ============================================

/**
 * Add a document to the database
 */
export async function addDocument(document: Document): Promise<void> {
  const db = await getDB()
  await db.put('documents', document)
  devLog(`Added document: ${document.id}`)
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDB()
  return await db.get('documents', id)
}

/**
 * Get all documents
 */
export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB()
  return await db.getAll('documents')
}

/**
 * Get documents by type
 */
export async function getDocumentsByType(type: string): Promise<Document[]> {
  const db = await getDB()
  return await db.getAllFromIndex('documents', 'by-type', type)
}

/**
 * Get documents by tag
 */
export async function getDocumentsByTag(tag: string): Promise<Document[]> {
  const db = await getDB()
  return await db.getAllFromIndex('documents', 'by-tag', tag)
}

/**
 * Update a document
 */
export async function updateDocument(document: Document): Promise<void> {
  const db = await getDB()
  await db.put('documents', document)
  devLog(`Updated document: ${document.id}`)
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('documents', id)
  devLog(`Deleted document: ${id}`)
}

/**
 * Delete all documents
 */
export async function clearDocuments(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('documents', 'readwrite')
  await tx.store.clear()
  await tx.done
  devLog('Cleared all documents')
}

/**
 * Count total documents
 */
export async function countDocuments(): Promise<number> {
  const db = await getDB()
  return await db.count('documents')
}

// ============================================
// Model Cache Operations
// ============================================

/**
 * Cache model data
 */
export async function cacheModel(entry: ModelCacheEntry): Promise<void> {
  const db = await getDB()
  await db.put('model_cache', entry)
  devLog(`Cached model: ${entry.key}`)
}

/**
 * Get cached model data
 */
export async function getCachedModel(
  key: string
): Promise<ModelCacheEntry | undefined> {
  const db = await getDB()
  return await db.get('model_cache', key)
}

/**
 * Clear model cache
 */
export async function clearModelCache(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('model_cache', 'readwrite')
  await tx.store.clear()
  await tx.done
  devLog('Cleared model cache')
}

// ============================================
// Search Cache Operations
// ============================================

/**
 * Cache search results
 */
export async function cacheSearchResults(entry: SearchCacheEntry): Promise<void> {
  const db = await getDB()
  await db.put('search_cache', entry)
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  queryHash: string
): Promise<SearchCacheEntry | undefined> {
  const db = await getDB()
  const entry = await db.get('search_cache', queryHash)

  // Check if cache is expired
  if (entry && Date.now() - entry.timestamp > entry.ttl) {
    await db.delete('search_cache', queryHash)
    return undefined
  }

  return entry
}

/**
 * Clear expired search cache entries
 */
export async function clearExpiredSearchCache(): Promise<number> {
  const db = await getDB()
  const tx = db.transaction('search_cache', 'readwrite')
  const store = tx.store
  const index = store.index('by-timestamp')

  let deletedCount = 0
  const now = Date.now()

  for await (const cursor of index.iterate()) {
    const entry = cursor.value
    if (now - entry.timestamp > entry.ttl) {
      await cursor.delete()
      deletedCount++
    }
  }

  await tx.done
  devLog(`Cleared ${deletedCount} expired search cache entries`)
  return deletedCount
}

/**
 * Clear all search cache
 */
export async function clearSearchCache(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('search_cache', 'readwrite')
  await tx.store.clear()
  await tx.done
  devLog('Cleared search cache')
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Add multiple documents in a single transaction
 */
export async function addDocuments(documents: Document[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('documents', 'readwrite')

  await Promise.all(documents.map((doc) => tx.store.put(doc)))
  await tx.done

  devLog(`Added ${documents.length} documents`)
}

/**
 * Delete multiple documents in a single transaction
 */
export async function deleteDocuments(ids: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('documents', 'readwrite')

  await Promise.all(ids.map((id) => tx.store.delete(id)))
  await tx.done

  devLog(`Deleted ${ids.length} documents`)
}

// ============================================
// Advanced Queries
// ============================================

/**
 * Search documents by full-text (simple contains search)
 */
export async function searchDocuments(query: string): Promise<Document[]> {
  const db = await getDB()
  const allDocs = await db.getAll('documents')
  const queryLower = query.toLowerCase()

  return allDocs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(queryLower) ||
      doc.content.toLowerCase().includes(queryLower) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(queryLower))
  )
}

/**
 * Get documents with pagination
 */
export async function getDocumentsPaginated(
  offset: number,
  limit: number
): Promise<Document[]> {
  const db = await getDB()
  const tx = db.transaction('documents', 'readonly')
  const store = tx.store

  const documents: Document[] = []
  let cursor = await store.openCursor()
  let count = 0

  while (cursor && count < offset + limit) {
    if (count >= offset) {
      documents.push(cursor.value)
    }
    count++
    cursor = await cursor.continue()
  }

  await tx.done
  return documents
}

// ============================================
// Database Management
// ============================================

/**
 * Clear entire database
 */
export async function clearDatabase(): Promise<void> {
  await clearDocuments()
  await clearModelCache()
  await clearSearchCache()
  devLog('Cleared entire database')
}

/**
 * Get database stats
 */
export async function getDatabaseStats(): Promise<{
  documentsCount: number
  modelCacheCount: number
  searchCacheCount: number
}> {
  const db = await getDB()

  const [documentsCount, modelCacheCount, searchCacheCount] = await Promise.all([
    db.count('documents'),
    db.count('model_cache'),
    db.count('search_cache'),
  ])

  return {
    documentsCount,
    modelCacheCount,
    searchCacheCount,
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    devLog('Database connection closed')
  }
}

// ============================================
// Export
// ============================================

export { getDB }
export default {
  getDB,
  addDocument,
  getDocument,
  getAllDocuments,
  getDocumentsByType,
  getDocumentsByTag,
  updateDocument,
  deleteDocument,
  clearDocuments,
  countDocuments,
  addDocuments,
  deleteDocuments,
  searchDocuments,
  getDocumentsPaginated,
  cacheModel,
  getCachedModel,
  clearModelCache,
  cacheSearchResults,
  getCachedSearchResults,
  clearExpiredSearchCache,
  clearSearchCache,
  clearDatabase,
  getDatabaseStats,
  closeDatabase,
}
