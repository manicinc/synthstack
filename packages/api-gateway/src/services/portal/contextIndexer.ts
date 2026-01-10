/**
 * @file services/portal/contextIndexer.ts
 * @description Portal context indexing and search with vector embeddings
 *
 * Indexes projects, tasks, and conversations into Qdrant for semantic search
 * Implements hybrid caching (Redis + on-demand generation)
 */

import { v4 as uuidv4 } from 'uuid'
import { getQdrantClient, PORTAL_CONTEXT_COLLECTION } from '../qdrant/collections.js'
import { logger } from '../../utils/logger.js'
import { getRedisClient } from '../redis.js'
import type { PoolClient } from 'pg'

const qdrantClient = getQdrantClient()
const redis = getRedisClient()

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
 * Generate embedding using OpenAI API
 * Results are cached in Redis for 1 hour
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check cache first
    const cacheKey = `embedding:${Buffer.from(text.substring(0, 100)).toString('base64')}`
    const cached = await redis.get(cacheKey)

    if (cached) {
      logger.debug('Using cached embedding')
      return JSON.parse(cached)
    }

    // Generate new embedding
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const embedding = data.data[0].embedding

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(embedding))

    return embedding
  } catch (error) {
    logger.error('Failed to generate embedding:', error)
    throw error
  }
}

/**
 * Index a single context document with embedding
 */
export async function indexContextDocument(doc: ContextDocument): Promise<void> {
  try {
    // Generate embedding for content
    const embeddingText = `${doc.title}\n\n${doc.content}`
    const embedding = await generateEmbedding(embeddingText)

    // Store in Qdrant
    await qdrantClient.upsert(PORTAL_CONTEXT_COLLECTION, {
      points: [
        {
          id: doc.id,
          vector: embedding,
          payload: {
            contact_id: doc.contactId,
            organization_id: doc.organizationId,
            project_id: doc.projectId || null,
            content_type: doc.contentType,
            title: doc.title,
            content: doc.content,
            metadata: doc.metadata,
            updated_at: doc.updatedAt.toISOString()
          }
        }
      ]
    })

    logger.info(`Indexed ${doc.contentType} document: ${doc.id}`)

    // Cache embedding in Redis (1 hour TTL)
    const docCacheKey = `portal:embedding:${doc.id}`
    await redis.setex(docCacheKey, 3600, JSON.stringify(embedding))
  } catch (error) {
    logger.error(`Failed to index document ${doc.id}:`, error)
    throw error
  }
}

/**
 * Index all accessible content for a contact
 */
export async function indexContactContext(
  contactId: string,
  organizationId: string,
  db: PoolClient
): Promise<void> {
  try {
    logger.info(`Starting context indexing for contact ${contactId}`)

    // Get accessible projects
    const projectsResult = await db.query(
      `SELECT p.id, p.name, p.description, p.date_updated
       FROM projects p
       JOIN project_contacts pc ON pc.project_id = p.id
       WHERE pc.contact_id = $1 AND p.is_client_visible = true`,
      [contactId]
    )

    // Index projects
    for (const project of projectsResult.rows) {
      await indexContextDocument({
        id: `project:${project.id}`,
        contactId,
        organizationId,
        projectId: project.id,
        contentType: 'project',
        title: project.name,
        content: project.description || '',
        metadata: {
          project_name: project.name
        },
        updatedAt: new Date(project.date_updated)
      })
    }

    const projectIds = projectsResult.rows.map(p => p.id)

    if (projectIds.length === 0) {
      logger.info(`No accessible projects for contact ${contactId}`)
      return
    }

    // Get accessible tasks
    const tasksResult = await db.query(
      `SELECT id, title, description, client_task_details, status, due_date,
              project_id, date_updated
       FROM todos
       WHERE project_id = ANY($1::uuid[])
         AND is_visible_to_client = true`,
      [projectIds]
    )

    // Index tasks
    for (const task of tasksResult.rows) {
      const content = [
        task.description,
        task.client_task_details,
        `Status: ${task.status}`,
        task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : null
      ].filter(Boolean).join('\n\n')

      await indexContextDocument({
        id: `task:${task.id}`,
        contactId,
        organizationId,
        projectId: task.project_id,
        contentType: 'task',
        title: task.title,
        content,
        metadata: {
          task_status: task.status,
          task_due_date: task.due_date
        },
        updatedAt: new Date(task.date_updated)
      })
    }

    // Get accessible conversations
    const conversationsResult = await db.query(
      `SELECT DISTINCT c.id, c.title, m.text, c.date_updated
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       JOIN messages m ON m.conversation_id = c.id
       WHERE cp.contact_id = $1
         AND m.is_internal_note = false
         AND c.collection = 'projects'
         AND c.item = ANY($2::uuid[])
       ORDER BY c.date_updated DESC
       LIMIT 50`,
      [contactId, projectIds]
    )

    // Index conversations (grouped by conversation_id)
    const conversationMap = new Map<string, any>()

    for (const conv of conversationsResult.rows) {
      if (!conversationMap.has(conv.id)) {
        conversationMap.set(conv.id, {
          id: conv.id,
          title: conv.title,
          messages: [],
          date_updated: conv.date_updated
        })
      }
      conversationMap.get(conv.id).messages.push(conv.text)
    }

    for (const [convId, convData] of conversationMap.entries()) {
      await indexContextDocument({
        id: `conversation:${convId}`,
        contactId,
        organizationId,
        contentType: 'conversation',
        title: convData.title,
        content: convData.messages.join('\n---\n'),
        metadata: {
          message_count: convData.messages.length
        },
        updatedAt: new Date(convData.date_updated)
      })
    }

    logger.info(`Completed context indexing for contact ${contactId}`)
  } catch (error) {
    logger.error(`Failed to index context for contact ${contactId}:`, error)
    throw error
  }
}

/**
 * Search context using vector similarity
 */
export async function searchPortalContext(
  contactId: string,
  organizationId: string,
  query: string,
  projectId?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    // Check cache for query embedding
    const queryCacheKey = `portal:query:${contactId}:${query.substring(0, 50)}`
    let queryEmbedding: number[]

    const cachedEmbedding = await redis.get(queryCacheKey)
    if (cachedEmbedding) {
      queryEmbedding = JSON.parse(cachedEmbedding)
      logger.debug('Using cached query embedding')
    } else {
      queryEmbedding = await generateEmbedding(query)
      await redis.setex(queryCacheKey, 300, JSON.stringify(queryEmbedding)) // 5 min cache
    }

    // Build filter
    const filter: any = {
      must: [
        { key: 'contact_id', match: { value: contactId } },
        { key: 'organization_id', match: { value: organizationId } }
      ]
    }

    if (projectId) {
      filter.must.push({
        key: 'project_id',
        match: { value: projectId }
      })
    }

    // Search Qdrant
    const searchResults = await qdrantClient.search(PORTAL_CONTEXT_COLLECTION, {
      vector: queryEmbedding,
      filter,
      limit,
      with_payload: true,
      with_vector: false
    })

    return searchResults.map(result => ({
      id: result.id as string,
      title: result.payload?.title as string,
      content: result.payload?.content as string,
      contentType: result.payload?.content_type as string,
      score: result.score,
      metadata: result.payload?.metadata as Record<string, any>
    }))
  } catch (error) {
    logger.error('Failed to search portal context:', error)
    throw error
  }
}

/**
 * Delete context for a contact (when access revoked)
 */
export async function deleteContactContext(contactId: string): Promise<void> {
  try {
    await qdrantClient.delete(PORTAL_CONTEXT_COLLECTION, {
      filter: {
        must: [
          { key: 'contact_id', match: { value: contactId } }
        ]
      }
    })

    // Clear Redis cache
    const pattern = `portal:*:${contactId}*`
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    logger.info(`Deleted context for contact ${contactId}`)
  } catch (error) {
    logger.error(`Failed to delete context for contact ${contactId}:`, error)
    throw error
  }
}

/**
 * Update a single document (when content changes)
 */
export async function updateContextDocument(
  documentId: string,
  updates: Partial<ContextDocument>
): Promise<void> {
  try {
    // Retrieve existing document
    const existing = await qdrantClient.retrieve(PORTAL_CONTEXT_COLLECTION, {
      ids: [documentId]
    })

    if (existing.length === 0) {
      throw new Error(`Document ${documentId} not found`)
    }

    const existingPayload = existing[0].payload

    // Merge updates
    const updatedDoc: ContextDocument = {
      id: documentId,
      contactId: updates.contactId || (existingPayload?.contact_id as string),
      organizationId: updates.organizationId || (existingPayload?.organization_id as string),
      projectId: updates.projectId || (existingPayload?.project_id as string),
      contentType: updates.contentType || (existingPayload?.content_type as 'project' | 'task' | 'conversation'),
      title: updates.title || (existingPayload?.title as string),
      content: updates.content || (existingPayload?.content as string),
      metadata: updates.metadata || (existingPayload?.metadata as Record<string, any>),
      updatedAt: updates.updatedAt || new Date()
    }

    // Reindex
    await indexContextDocument(updatedDoc)

    logger.info(`Updated context document: ${documentId}`)
  } catch (error) {
    logger.error(`Failed to update document ${documentId}:`, error)
    throw error
  }
}

/**
 * Check if contact context is indexed
 */
export async function isContactIndexed(contactId: string): Promise<boolean> {
  try {
    const indexedKey = `portal:indexed:${contactId}`
    const isIndexed = await redis.get(indexedKey)
    return isIndexed === '1'
  } catch (error) {
    logger.error(`Failed to check if contact ${contactId} is indexed:`, error)
    return false
  }
}

/**
 * Mark contact as indexed
 */
export async function markContactAsIndexed(contactId: string): Promise<void> {
  try {
    const indexedKey = `portal:indexed:${contactId}`
    await redis.setex(indexedKey, 86400, '1') // 24-hour TTL
  } catch (error) {
    logger.error(`Failed to mark contact ${contactId} as indexed:`, error)
  }
}

export default {
  indexContextDocument,
  indexContactContext,
  searchPortalContext,
  deleteContactContext,
  updateContextDocument,
  isContactIndexed,
  markContactAsIndexed
}
