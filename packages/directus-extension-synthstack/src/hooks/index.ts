/**
 * SynthStack Hooks
 * 
 * Directus hooks for SynthStack integration including:
 * - Audit logging for all operations
 * - Webhook triggers for external systems
 * - License validation on startup
 * - Activity tracking
 */

import { defineHook } from '@directus/extensions-sdk';

export default defineHook(({ filter, action, init }, { services, database, logger, env }) => {
  const { ItemsService, ActivityService } = services;

  // Initialize SynthStack on Directus startup
  init('app.before', async () => {
    logger.info('[SynthStack] Initializing extension...');
    
    // Verify license on startup (non-blocking)
    try {
      const licenseKey = env.SYNTHSTACK_LICENSE_KEY;
      if (licenseKey) {
        const response = await fetch('https://api.synthstack.app/api/v1/licenses/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-License-Key': licenseKey
          },
          body: JSON.stringify({ product: 'directus-extension' })
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.info(`[SynthStack] License verified: ${data.tier} tier`);
        } else {
          logger.warn('[SynthStack] License verification failed - using community features');
        }
      } else {
        logger.info('[SynthStack] No license key configured - using community features');
      }
    } catch (error) {
      logger.warn('[SynthStack] Could not verify license:', error);
    }
  });

  // Audit logging for workflow-related collections
  const auditCollections = ['workflows', 'workflow_executions', 'agents', 'agent_invocations'];
  
  action('items.create', async ({ collection, key, payload }, { accountability, schema }) => {
    if (!auditCollections.includes(collection)) return;
    
    try {
      const activityService = new ActivityService({
        knex: database,
        schema,
        accountability
      });

      await activityService.createOne({
        action: 'create',
        collection,
        item: key,
        comment: `[SynthStack] Created ${collection} item`,
        ip: accountability?.ip || 'system'
      });

      logger.debug(`[SynthStack] Audit: Created ${collection}/${key}`);
    } catch (error) {
      logger.error('[SynthStack] Audit logging failed:', error);
    }
  });

  action('items.update', async ({ collection, keys, payload }, { accountability, schema }) => {
    if (!auditCollections.includes(collection)) return;
    
    try {
      const activityService = new ActivityService({
        knex: database,
        schema,
        accountability
      });

      for (const key of keys) {
        await activityService.createOne({
          action: 'update',
          collection,
          item: key,
          comment: `[SynthStack] Updated ${collection} item`,
          ip: accountability?.ip || 'system'
        });
      }

      logger.debug(`[SynthStack] Audit: Updated ${collection}/${keys.join(',')}`);
    } catch (error) {
      logger.error('[SynthStack] Audit logging failed:', error);
    }
  });

  action('items.delete', async ({ collection, keys }, { accountability, schema }) => {
    if (!auditCollections.includes(collection)) return;
    
    try {
      const activityService = new ActivityService({
        knex: database,
        schema,
        accountability
      });

      for (const key of keys) {
        await activityService.createOne({
          action: 'delete',
          collection,
          item: key,
          comment: `[SynthStack] Deleted ${collection} item`,
          ip: accountability?.ip || 'system'
        });
      }

      logger.debug(`[SynthStack] Audit: Deleted ${collection}/${keys.join(',')}`);
    } catch (error) {
      logger.error('[SynthStack] Audit logging failed:', error);
    }
  });

  // Webhook triggers for workflow events
  action('items.create', async ({ collection, key, payload }, { schema }) => {
    if (collection !== 'workflow_executions') return;
    
    // Trigger webhook for new workflow execution
    const webhookUrl = env.SYNTHSTACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'workflow.execution.created',
          data: { id: key, ...payload },
          timestamp: new Date().toISOString()
        })
      });
      
      logger.debug(`[SynthStack] Webhook sent for workflow execution ${key}`);
    } catch (error) {
      logger.error('[SynthStack] Webhook failed:', error);
    }
  });

  // Filter to add SynthStack metadata to items
  filter('items.read', async (payload, { collection }, { schema }) => {
    // Add computed fields or metadata if needed
    return payload;
  });

  // Validate workflow data before creation
  filter('items.create', async (payload, { collection }, { schema, accountability }) => {
    if (collection !== 'workflows') return payload;

    // Ensure required fields
    if (!payload.name) {
      throw new Error('Workflow name is required');
    }

    // Add default values
    return {
      ...payload,
      status: payload.status || 'draft',
      created_by: accountability?.user || null,
      created_at: new Date().toISOString()
    };
  });

  // Clean up related data when workflow is deleted
  action('items.delete', async ({ collection, keys }, { schema }) => {
    if (collection !== 'workflows') return;

    try {
      const executionsService = new ItemsService('workflow_executions', {
        knex: database,
        schema
      });

      // Delete related executions
      for (const workflowId of keys) {
        const executions = await executionsService.readByQuery({
          filter: { workflow_id: { _eq: workflowId } },
          fields: ['id']
        });

        if (executions.length > 0) {
          await executionsService.deleteMany(executions.map((e: any) => e.id));
          logger.info(`[SynthStack] Cleaned up ${executions.length} executions for workflow ${workflowId}`);
        }
      }
    } catch (error) {
      logger.error('[SynthStack] Cleanup failed:', error);
    }
  });
});


