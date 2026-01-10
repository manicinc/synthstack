/**
 * @file jobs/indexPortalContext.ts
 * @description Background job to re-index portal context daily
 *
 * Runs at 2 AM every day to update vector embeddings for active portal users
 * Processes users in batches to avoid overload
 */

import cron from 'node-cron'
import { logger } from '../utils/logger.js'
import { indexContactContext } from '../services/portal/contextIndexer.js'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

/**
 * Background job to re-index portal context daily
 * Runs at 2 AM every day
 */
export function startPortalContextIndexingJob(server: FastifyInstance) {
  // Schedule: Run at 2 AM every day (0 2 * * *)
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily portal context indexing')

    try {
      // Get all active portal users (accessed in last 30 days)
      const contactsResult = await server.pg.query(
        `SELECT DISTINCT c.id, c.organization_id
         FROM contacts c
         JOIN conversation_participants cp ON cp.contact_id = c.id
         JOIN conversations conv ON conv.id = cp.conversation_id
         WHERE conv.date_updated > NOW() - INTERVAL '30 days'
         ORDER BY c.id`
      )

      logger.info(`Found ${contactsResult.rows.length} active portal users to index`)

      // Index in batches (10 at a time to avoid overload)
      const batchSize = 10
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < contactsResult.rows.length; i += batchSize) {
        const batch = contactsResult.rows.slice(i, i + batchSize)

        // Get pooled clients for the batch
        const clients = await Promise.all(
          batch.map(() => server.pg.pool.connect())
        )

        try {
          const batchResults = await Promise.allSettled(
            batch.map((contact, idx) =>
              indexContactContext(contact.id, contact.organization_id, clients[idx])
            )
          )

          // Count successes and failures
          batchResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              successCount++
            } else {
              errorCount++
              logger.error(`Failed to index contact ${batch[idx].id}:`, result.reason)
            }
          })

          logger.info(`Batch ${i / batchSize + 1} complete: ${successCount} succeeded, ${errorCount} failed`)
        } finally {
          // Release all clients in the batch
          clients.forEach(client => client.release())
        }

        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < contactsResult.rows.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      logger.info('Completed daily portal context indexing', {
        total: contactsResult.rows.length,
        succeeded: successCount,
        failed: errorCount
      })
    } catch (error) {
      logger.error('Portal context indexing job failed:', error)
    }
  })

  logger.info('Portal context indexing job scheduled (daily at 2 AM)')
}

/**
 * Manually trigger indexing for a specific contact
 * Useful for testing or on-demand reindexing
 */
export async function indexContactManually(
  server: FastifyInstance,
  contactId: string
): Promise<void> {
  logger.info(`Manually indexing contact ${contactId}`)

  const client = await server.pg.pool.connect()

  try {
    // Get organization ID
    const result = await client.query(
      `SELECT organization_id FROM contacts WHERE id = $1`,
      [contactId]
    )

    if (result.rows.length === 0) {
      throw new Error(`Contact ${contactId} not found`)
    }

    const organizationId = result.rows[0].organization_id

    await indexContactContext(contactId, organizationId, client)

    logger.info(`Successfully indexed contact ${contactId}`)
  } catch (error) {
    logger.error(`Failed to manually index contact ${contactId}:`, error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Batch reindex all active contacts
 * Useful for initial setup or full reindex
 */
export async function batchReindexAll(server: FastifyInstance): Promise<{
  total: number
  succeeded: number
  failed: number
}> {
  logger.info('Starting batch reindex of all active portal users')

  const contactsResult = await server.pg.query(
    `SELECT DISTINCT c.id, c.organization_id
     FROM contacts c
     JOIN conversation_participants cp ON cp.contact_id = c.id
     JOIN conversations conv ON conv.id = cp.conversation_id
     WHERE conv.date_updated > NOW() - INTERVAL '30 days'`
  )

  logger.info(`Found ${contactsResult.rows.length} contacts to reindex`)

  let successCount = 0
  let errorCount = 0

  // Process in batches of 10
  const batchSize = 10

  for (let i = 0; i < contactsResult.rows.length; i += batchSize) {
    const batch = contactsResult.rows.slice(i, i + batchSize)

    const clients = await Promise.all(
      batch.map(() => server.pg.pool.connect())
    )

    try {
      const results = await Promise.allSettled(
        batch.map((contact, idx) =>
          indexContactContext(contact.id, contact.organization_id, clients[idx])
        )
      )

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successCount++
        } else {
          errorCount++
          logger.error(`Failed to reindex contact ${batch[idx].id}:`, result.reason)
        }
      })

      logger.info(`Batch ${i / batchSize + 1}/${Math.ceil(contactsResult.rows.length / batchSize)} complete`)
    } finally {
      clients.forEach(client => client.release())
    }

    // Delay between batches
    if (i + batchSize < contactsResult.rows.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const result = {
    total: contactsResult.rows.length,
    succeeded: successCount,
    failed: errorCount
  }

  logger.info('Batch reindex complete', result)

  return result
}

export default {
  startPortalContextIndexingJob,
  indexContactManually,
  batchReindexAll
}
