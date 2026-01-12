/**
 * @file services/qdrant/collections.ts
 * @description Qdrant collection stub for Community Edition
 * 
 * Vector database features are disabled in Community Edition.
 * Upgrade to Pro for AI-powered semantic search and RAG capabilities.
 */

import { logger } from '../../utils/logger.js'

export const PORTAL_CONTEXT_COLLECTION = 'portal_context'

export async function initializePortalContextCollection(): Promise<void> {
  logger.info('Qdrant disabled in Community Edition - skipping collection initialization')
}

export function getQdrantClient(): null {
  return null
}

export async function checkQdrantHealth(): Promise<boolean> {
  return false
}

export async function getCollectionStats(_collectionName: string): Promise<any> {
  return { disabled: true, edition: 'community' }
}

export async function deleteCollection(_collectionName: string): Promise<void> {
  logger.info('Qdrant disabled in Community Edition')
}

export default {
  PORTAL_CONTEXT_COLLECTION,
  initializePortalContextCollection,
  getQdrantClient,
  checkQdrantHealth,
  getCollectionStats,
  deleteCollection
}
