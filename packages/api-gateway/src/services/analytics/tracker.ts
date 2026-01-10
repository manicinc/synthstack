import type { FastifyInstance } from 'fastify';

export interface TrackEventData {
  eventType: string;
  eventCategory: 'user' | 'generation' | 'subscription' | 'content' | 'moderation' | 'system';
  userId?: string;
  sessionId?: string;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsTracker {
  constructor(private fastify: FastifyInstance) {}

  async track(data: TrackEventData): Promise<void> {
    try {
      await this.fastify.pg.query(`
        INSERT INTO analytics_events (
          event_type, event_category, user_id, session_id,
          page_url, referrer, user_agent, ip_address, metadata, properties
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        data.eventType, data.eventCategory, data.userId, data.sessionId,
        data.pageUrl, data.referrer, data.userAgent, data.ipAddress,
        JSON.stringify(data.metadata || {}), JSON.stringify(data.metadata || {})
      ]);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to track event');
    }
  }

  async trackBatch(events: TrackEventData[]): Promise<void> {
    for (const event of events) {
      await this.track(event);
    }
  }
}

export function createTracker(fastify: FastifyInstance): AnalyticsTracker {
  return new AnalyticsTracker(fastify);
}
