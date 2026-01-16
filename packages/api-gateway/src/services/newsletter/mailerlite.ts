/**
 * @file services/newsletter/mailerlite.ts
 * @description MailerLite newsletter provider implementation
 */

import {
  NewsletterProvider,
  SubscriberData,
  SubscriberStatus,
  SegmentData,
  SegmentResult,
  CampaignData,
  CampaignResult,
  CampaignStats,
  SyncResult,
  WebhookEvent,
} from './base.js';

const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api';

export class MailerLiteProvider extends NewsletterProvider {
  private groupId?: string;

  constructor(apiKey: string, groupId?: string) {
    super('mailerlite', apiKey);
    this.groupId = groupId;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(`${MAILERLITE_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `MailerLite API error: ${response.status}`);
    }

    return response.json();
  }

  async subscribe(data: SubscriberData): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      const fields: Record<string, any> = {};
      if (data.firstName) fields.name = data.firstName;
      if (data.lastName) fields.last_name = data.lastName;
      if (data.subscriptionTier) fields.subscription_tier = data.subscriptionTier;
      if (data.source) fields.source = data.source;

      const payload: any = {
        email: data.email,
        fields,
        status: 'active',
      };

      if (this.groupId) {
        payload.groups = [this.groupId];
      }

      const result = await this.request<{ data: { id: string } }>('POST', '/subscribers', payload);
      
      return { success: true, providerId: result.data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async unsubscribe(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get subscriber first
      const subscriber = await this.getSubscriberStatus(email);
      if (!subscriber?.providerId) {
        return { success: true }; // Already not subscribed
      }

      await this.request('DELETE', `/subscribers/${subscriber.providerId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateSubscriber(email: string, data: Partial<SubscriberData>): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = await this.getSubscriberStatus(email);
      if (!subscriber?.providerId) {
        return { success: false, error: 'Subscriber not found' };
      }

      const fields: Record<string, any> = {};
      if (data.firstName) fields.name = data.firstName;
      if (data.lastName) fields.last_name = data.lastName;
      if (data.subscriptionTier) fields.subscription_tier = data.subscriptionTier;

      await this.request('PUT', `/subscribers/${subscriber.providerId}`, { fields });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getSubscriberStatus(email: string): Promise<SubscriberStatus | null> {
    try {
      const result = await this.request<{ data: any }>('GET', `/subscribers/${encodeURIComponent(email)}`);
      const sub = result.data;

      return {
        subscribed: sub.status === 'active',
        status: this.mapStatus(sub.status),
        email: sub.email,
        providerId: sub.id,
        subscribedAt: sub.subscribed_at ? new Date(sub.subscribed_at) : undefined,
        unsubscribedAt: sub.unsubscribed_at ? new Date(sub.unsubscribed_at) : undefined,
        groups: sub.groups?.map((g: any) => g.id) || [],
      };
    } catch (error) {
      return null;
    }
  }

  async addTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = await this.getSubscriberStatus(email);
      if (!subscriber?.providerId) {
        return { success: false, error: 'Subscriber not found' };
      }

      // MailerLite uses groups, find or create the tag group
      const segments = await this.getSegments();
      let tagGroup = segments.find(s => s.name === `tag:${tag}`);
      
      if (!tagGroup) {
        tagGroup = (await this.createSegment({ name: `tag:${tag}`, criteria: {} })) ?? undefined;
      }

      if (tagGroup) {
        await this.addToSegment(email, tagGroup.providerId || tagGroup.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async removeTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = await this.getSubscriberStatus(email);
      if (!subscriber?.providerId) {
        return { success: false, error: 'Subscriber not found' };
      }

      const segments = await this.getSegments();
      const tagGroup = segments.find(s => s.name === `tag:${tag}`);
      
      if (tagGroup?.providerId) {
        await this.request('DELETE', `/subscribers/${subscriber.providerId}/groups/${tagGroup.providerId}`);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createSegment(data: SegmentData): Promise<SegmentResult | null> {
    try {
      const result = await this.request<{ data: any }>('POST', '/groups', {
        name: data.name,
      });

      return {
        id: result.data.id,
        name: result.data.name,
        subscriberCount: result.data.active_count || 0,
        providerId: result.data.id,
      };
    } catch (error) {
      return null;
    }
  }

  async getSegments(): Promise<SegmentResult[]> {
    try {
      const result = await this.request<{ data: any[] }>('GET', '/groups?limit=100');
      
      return result.data.map(g => ({
        id: g.id,
        name: g.name,
        subscriberCount: g.active_count || 0,
        providerId: g.id,
      }));
    } catch (error) {
      return [];
    }
  }

  async addToSegment(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = await this.getSubscriberStatus(email);
      if (!subscriber?.providerId) {
        return { success: false, error: 'Subscriber not found' };
      }

      await this.request('POST', `/subscribers/${subscriber.providerId}/groups/${segmentId}`, {});
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createCampaign(data: CampaignData): Promise<CampaignResult | null> {
    try {
      // Create campaign
      const campaign = await this.request<{ data: any }>('POST', '/campaigns', {
        name: data.name,
        type: 'regular',
        emails: [{
          subject: data.subject,
          from_name: process.env.SMTP_FROM_NAME || 'Newsletter',
          from: process.env.SMTP_FROM_EMAIL,
          content: data.contentHtml,
        }],
      });

      // Schedule or send
      if (data.scheduledAt) {
        await this.request('POST', `/campaigns/${campaign.data.id}/schedule`, {
          delivery: 'scheduled',
          schedule: {
            date: data.scheduledAt.toISOString().split('T')[0],
            hours: data.scheduledAt.getUTCHours().toString().padStart(2, '0'),
            minutes: data.scheduledAt.getUTCMinutes().toString().padStart(2, '0'),
          },
        });
      }

      return {
        id: campaign.data.id,
        providerId: campaign.data.id,
        status: campaign.data.status,
      };
    } catch (error) {
      return null;
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      const result = await this.request<{ data: any }>('GET', `/campaigns/${campaignId}`);
      const stats = result.data.stats || {};

      return {
        sent: stats.sent || 0,
        delivered: stats.sent - (stats.bounced || 0),
        opened: stats.opens_count || 0,
        clicked: stats.clicks_count || 0,
        bounced: stats.hard_bounced || 0 + (stats.soft_bounced || 0),
        complained: stats.spam_count || 0,
        unsubscribed: stats.unsubscribed || 0,
        openRate: stats.open_rate || 0,
        clickRate: stats.click_rate || 0,
      };
    } catch (error) {
      return null;
    }
  }

  async pushSubscribers(subscribers: SubscriberData[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const sub of subscribers) {
      result.processed++;
      try {
        const existing = await this.getSubscriberStatus(sub.email);
        if (existing) {
          await this.updateSubscriber(sub.email, sub);
          result.updated++;
        } else {
          await this.subscribe(sub);
          result.created++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({ email: sub.email, error: error.message });
      }
    }

    return result;
  }

  async pullSubscribers(limit: number = 100, cursor?: string): Promise<{ subscribers: SubscriberData[]; nextCursor?: string }> {
    try {
      let url = `/subscribers?limit=${limit}`;
      if (cursor) url += `&cursor=${cursor}`;

      const result = await this.request<{ data: any[]; links?: { next?: string } }>('GET', url);

      const subscribers = result.data.map(s => ({
        email: s.email,
        firstName: s.fields?.name,
        lastName: s.fields?.last_name,
        subscriptionTier: s.fields?.subscription_tier,
        source: s.fields?.source,
      }));

      // Extract cursor from next link
      let nextCursor: string | undefined;
      if (result.links?.next) {
        const match = result.links.next.match(/cursor=([^&]+)/);
        if (match) nextCursor = match[1];
      }

      return { subscribers, nextCursor };
    } catch (error) {
      return { subscribers: [] };
    }
  }

  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    try {
      const events = payload.events || [payload];
      const event = events[0];
      
      const typeMap: Record<string, WebhookEvent['type']> = {
        'subscriber.created': 'subscribed',
        'subscriber.unsubscribed': 'unsubscribed',
        'subscriber.bounced': 'bounced',
        'subscriber.complaint': 'complained',
        'campaign.opened': 'opened',
        'campaign.clicked': 'clicked',
      };

      const type = typeMap[event.type];
      if (!type) return null;

      return {
        type,
        email: event.data?.email || event.email,
        timestamp: new Date(event.created_at || Date.now()),
        campaignId: event.data?.campaign_id,
        metadata: event.data,
      };
    } catch {
      return null;
    }
  }

  verifyWebhook(payload: any, headers: Record<string, string>): boolean {
    // MailerLite uses a webhook secret for verification
    const secret = process.env.MAILERLITE_WEBHOOK_SECRET;
    if (!secret) return true; // Skip verification if no secret

    const signature = headers['x-mailerlite-signature'];
    if (!signature) return false;

    // Simple verification - in production, use proper HMAC
    return true; // Placeholder
  }

  private mapStatus(status: string): SubscriberStatus['status'] {
    const map: Record<string, SubscriberStatus['status']> = {
      active: 'active',
      unsubscribed: 'unsubscribed',
      bounced: 'bounced',
      junk: 'complained',
      unconfirmed: 'pending',
    };
    return map[status] || 'active';
  }
}

export default MailerLiteProvider;
