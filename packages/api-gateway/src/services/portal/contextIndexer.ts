/**
 * @file services/portal/contextIndexer.ts
 * @description Portal context indexing stub for Community Edition
 *
 * Vector search and AI features are disabled in Community Edition.
 * Upgrade to Pro for AI-powered semantic search and RAG capabilities.
 */

import { logger } from '../../utils/logger.js'
import type { PoolClient } from 'pg'

interface ContextDocument {
  id: string
  contactId: string
  organizationId: string
  projectId?: string
  contentType: 'project' | 'task' | 'conversation'
  title: string
  content: string
  metadata: Record<string, any>
  updatedAt: Date
}

interface SearchResult {
  id: string
  title: string
  content: string
  contentType: string
  score: number
  metadata: Record<string, any>
}

/**
 * Generate embedding - disabled in Community Edition
 */
async function generateEmbedding(_text: string): Promise<number[]> {
  logger.debug('Embeddings disabled in Community Edition')
  return []
}

/**
 * Index a single context document - disabled in Community Edition
 */
export async function indexContextDocument(_doc: ContextDocument): Promise<void> {
  logger.debug('Context indexing disabled in Community Edition')
}

/**
 * Index multiple documents in batch - disabled in Community Edition
 */
export async function batchIndexContextDocuments(_docs: ContextDocument[]): Promise<void> {
  logger.debug('Batch indexing disabled in Community Edition')
}

/**
 * Delete context documents - disabled in Community Edition
 */
export async function deleteContextDocuments(_filter: {
  contactId?: string
  organizationId?: string
  projectId?: string
  contentType?: string
}): Promise<void> {
  logger.debug('Context deletion disabled in Community Edition')
}

/**
 * Search portal context - returns empty results in Community Edition
 */
export async function searchPortalContext(
  _contactId: string,
  _query: string,
  _options?: {
    contentTypes?: string[]
    projectId?: string
    limit?: number
  }
): Promise<SearchResult[]> {
  logger.debug('Context search disabled in Community Edition')
  return []
}

/**
 * Full reindex - disabled in Community Edition
 */
export async function fullReindexForContact(
  _contactId: string,
  _db: PoolClient
): Promise<{ indexed: number; errors: number }> {
  logger.debug('Full reindex disabled in Community Edition')
  return { indexed: 0, errors: 0 }
}

/**
 * Index project context - disabled in Community Edition
 */
export async function indexProjectContext(
  _projectId: string,
  _db: PoolClient
): Promise<void> {
  logger.debug('Project context indexing disabled in Community Edition')
}

export default {
  indexContextDocument,
  batchIndexContextDocuments,
  deleteContextDocuments,
  searchPortalContext,
  fullReindexForContact,
  indexProjectContext
}
