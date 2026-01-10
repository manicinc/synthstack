/**
 * @file services/qdrant/collections.ts
 * @description Qdrant collection initialization and management
 *
 * Manages vector database collections for portal copilot semantic search
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { logger } from '../../utils/logger.js'

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333'
})

export const PORTAL_CONTEXT_COLLECTION = 'portal_context'

/**
 * Initialize portal context collection in Qdrant
 * Stores embeddings for projects, tasks, and conversations
 *
 * Collection schema:
 * - Vectors: 1536 dimensions (OpenAI text-embedding-ada-002)
 * - Distance: Cosine similarity
 * - Indexed fields: contact_id, organization_id, project_id, content_type, updated_at
 */
export async function initializePortalContextCollection(): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections()
    const exists = collections.collections.some(c => c.name === PORTAL_CONTEXT_COLLECTION)

    if (!exists) {
      logger.info(`Creating Qdrant collection: ${PORTAL_CONTEXT_COLLECTION}`)

      // Create collection with OpenAI embedding dimensions (1536)
      await qdrantClient.createCollection(PORTAL_CONTEXT_COLLECTION, {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        },
        optimizers_config: {
          indexing_threshold: 10000
        },
        hnsw_config: {
          m: 16,
          ef_construct: 100
        }
      })

      logger.info(`Created Qdrant collection: ${PORTAL_CONTEXT_COLLECTION}`)

      // Create payload indexes for filtering
      await qdrantClient.createPayloadIndex(PORTAL_CONTEXT_COLLECTION, {
        field_name: 'contact_id',
        field_schema: 'keyword'
      })

      await qdrantClient.createPayloadIndex(PORTAL_CONTEXT_COLLECTION, {
        field_name: 'organization_id',
        field_schema: 'keyword'
      })

      await qdrantClient.createPayloadIndex(PORTAL_CONTEXT_COLLECTION, {
        field_name: 'project_id',
        field_schema: 'keyword'
      })

      await qdrantClient.createPayloadIndex(PORTAL_CONTEXT_COLLECTION, {
        field_name: 'content_type',
        field_schema: 'keyword'
      })

      await qdrantClient.createPayloadIndex(PORTAL_CONTEXT_COLLECTION, {
        field_name: 'updated_at',
        field_schema: 'datetime'
      })

      logger.info(`Created payload indexes for ${PORTAL_CONTEXT_COLLECTION}`)
    } else {
      logger.info(`Qdrant collection ${PORTAL_CONTEXT_COLLECTION} already exists`)
    }

    // Verify collection
    const collectionInfo = await qdrantClient.getCollection(PORTAL_CONTEXT_COLLECTION)
    logger.info(`Portal context collection status:`, {
      points_count: collectionInfo.points_count,
      vectors_count: (collectionInfo as any).vectors_count,
      indexed_vectors_count: collectionInfo.indexed_vectors_count,
      status: collectionInfo.status
    })
  } catch (error) {
    logger.error('Failed to initialize portal context collection:', error)
    throw error
  }
}

/**
 * Get Qdrant client instance
 */
export function getQdrantClient(): QdrantClient {
  return qdrantClient
}

/**
 * Health check for Qdrant connection
 */
export async function checkQdrantHealth(): Promise<boolean> {
  try {
    await qdrantClient.getCollections()
    return true
  } catch (error) {
    logger.error('Qdrant health check failed:', error)
    return false
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(collectionName: string): Promise<any> {
  try {
    const info = await qdrantClient.getCollection(collectionName)
    return {
      name: collectionName,
      pointsCount: info.points_count,
      vectorsCount: (info as any).vectors_count,
      indexedVectorsCount: info.indexed_vectors_count,
      status: info.status,
      vectorSize: info.config.params.vectors?.size || 0,
      distance: info.config.params.vectors?.distance || 'unknown'
    }
  } catch (error) {
    logger.error(`Failed to get stats for collection ${collectionName}:`, error)
    throw error
  }
}

/**
 * Delete a collection (use with caution)
 */
export async function deleteCollection(collectionName: string): Promise<void> {
  try {
    logger.warn(`Deleting Qdrant collection: ${collectionName}`)
    await qdrantClient.deleteCollection(collectionName)
    logger.info(`Deleted Qdrant collection: ${collectionName}`)
  } catch (error) {
    logger.error(`Failed to delete collection ${collectionName}:`, error)
    throw error
  }
}

export default {
  PORTAL_CONTEXT_COLLECTION,
  initializePortalContextCollection,
  getQdrantClient,
  checkQdrantHealth,
  getCollectionStats,
  deleteCollection
}
