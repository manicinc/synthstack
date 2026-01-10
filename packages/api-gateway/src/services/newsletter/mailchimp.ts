/**
 * @file services/newsletter/mailchimp.ts
 * @description Mailchimp newsletter provider implementation
 */

import * as crypto from 'crypto';
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

export class MailchimpProvider extends NewsletterProvider {
  private serverPrefix: string;
  private listId: string;

  constructor(apiKey: string, serverPrefix: string, listId: string) {
    super('mailchimp', apiKey);
    this.serverPrefix = serverPrefix;
    this.listId = listId;
  }

  private get baseUrl(): string {
    return `https://${this.serverPrefix}.api.mailchimp.com/3.0`;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.serverPrefix && this.listId);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString('base64')}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Mailchimp API error: ${response.status}`);
    }

    return response.json();
  }

  private getSubscriberHash(email: string): string {
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  async subscribe(data: SubscriberData): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      const hash = this.getSubscriberHash(data.email);
      
      const mergeFields: Record<string, any> = {};
      if (data.firstName) mergeFields.FNAME = data.firstName;
      if (data.lastName) mergeFields.LNAME = data.lastName;
      if (data.subscriptionTier) mergeFields.TIER = data.subscriptionTier;

      const payload = {
        email_address: data.email,
        status: 'subscribed',
        merge_fields: mergeFields,
        tags: data.interests || [],
      };

      // Use PUT for upsert behavior
      const result = await this.request<{ id: string }>(
        'PUT',
        `/lists/${this.listId}/members/${hash}`,
        payload
      );
      
      return { success: true, providerId: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async unsubscribe(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hash = this.getSubscriberHash(email);
      
      await this.request('PATCH', `/lists/${this.listId}/members/${hash}`, {
        status: 'unsubscribed',
      });
      
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('404')) {
        return { success: true }; // Already not in list
      }
      return { success: false, error: error.message };
    }
  }

  async updateSubscriber(email: string, data: Partial<SubscriberData>): Promise<{ success: boolean; error?: string }> {
    try {
      const hash = this.getSubscriberHash(email);
      
      const mergeFields: Record<string, any> = {};
      if (data.firstName) mergeFields.FNAME = data.firstName;
      if (data.lastName) mergeFields.LNAME = data.lastName;
      if (data.subscriptionTier) mergeFields.TIER = data.subscriptionTier;

      await this.request('PATCH', `/lists/${this.listId}/members/${hash}`, {
        merge_fields: mergeFields,
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getSubscriberStatus(email: string): Promise<SubscriberStatus | null> {
    try {
      const hash = this.getSubscriberHash(email);
      const result = await this.request<any>('GET', `/lists/${this.listId}/members/${hash}`);

      return {
        subscribed: result.status === 'subscribed',
        status: this.mapStatus(result.status),
        email: result.email_address,
        providerId: result.id,
        subscribedAt: result.timestamp_opt ? new Date(result.timestamp_opt) : undefined,
        tags: result.tags?.map((t: any) => t.name) || [],
      };
    } catch (error) {
      return null;
    }
  }

  async addTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hash = this.getSubscriberHash(email);
      
      await this.request('POST', `/lists/${this.listId}/members/${hash}/tags`, {
        tags: [{ name: tag, status: 'active' }],
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async removeTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hash = this.getSubscriberHash(email);
      
      await this.request('POST', `/lists/${this.listId}/members/${hash}/tags`, {
        tags: [{ name: tag, status: 'inactive' }],
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createSegment(data: SegmentData): Promise<SegmentResult | null> {
    try {
      // Mailchimp segments use conditions
      const result = await this.request<any>('POST', `/lists/${this.listId}/segments`, {
        name: data.name,
        static_segment: [], // Start empty for manual segments
      });

      return {
        id: result.id.toString(),
        name: result.name,
        subscriberCount: result.member_count || 0,
        providerId: result.id.toString(),
      };
    } catch (error) {
      return null;
    }
  }

  async getSegments(): Promise<SegmentResult[]> {
    try {
      const result = await this.request<{ segments: any[] }>('GET', `/lists/${this.listId}/segments?count=100`);
      
      return result.segments.map(s => ({
        id: s.id.toString(),
        name: s.name,
        subscriberCount: s.member_count || 0,
        providerId: s.id.toString(),
      }));
    } catch (error) {
      return [];
    }
  }

  async addToSegment(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('POST', `/lists/${this.listId}/segments/${segmentId}/members`, {
        email_address: email,
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createCampaign(data: CampaignData): Promise<CampaignResult | null> {
    try {
      // Create campaign
      const campaign = await this.request<any>('POST', '/campaigns', {
        type: 'regular',
        recipients: {
          list_id: this.listId,
          segment_opts: data.segmentId ? { saved_segment_id: parseInt(data.segmentId) } : undefined,
        },
        settings: {
          subject_line: data.subject,
          preview_text: data.previewText,
          title: data.name,
          from_name: process.env.SMTP_FROM_NAME || 'Newsletter',
          reply_to: process.env.SMTP_FROM_EMAIL,
        },
      });

      // Set content
      await this.request('PUT', `/campaigns/${campaign.id}/content`, {
        html: data.contentHtml,
        plain_text: data.contentText,
      });

      // Schedule or send
      if (data.scheduledAt) {
        await this.request('POST', `/campaigns/${campaign.id}/actions/schedule`, {
          schedule_time: data.scheduledAt.toISOString(),
        });
      }

      return {
        id: campaign.id,
        providerId: campaign.id,
        status: campaign.status,
        recipientCount: campaign.recipients?.recipient_count,
      };
    } catch (error) {
      return null;
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      const result = await this.request<any>('GET', `/reports/${campaignId}`);

      return {
        sent: result.emails_sent || 0,
        delivered: result.emails_sent - (result.bounces?.hard_bounces || 0) - (result.bounces?.soft_bounces || 0),
        opened: result.opens?.unique_opens || 0,
        clicked: result.clicks?.unique_clicks || 0,
        bounced: (result.bounces?.hard_bounces || 0) + (result.bounces?.soft_bounces || 0),
        complained: result.abuse_reports || 0,
        unsubscribed: result.unsubscribed || 0,
        openRate: (result.opens?.open_rate || 0) * 100,
        clickRate: (result.clicks?.click_rate || 0) * 100,
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

    // Mailchimp supports batch operations
    const operations = subscribers.map(sub => {
      const hash = this.getSubscriberHash(sub.email);
      const mergeFields: Record<string, any> = {};
      if (sub.firstName) mergeFields.FNAME = sub.firstName;
      if (sub.lastName) mergeFields.LNAME = sub.lastName;
      if (sub.subscriptionTier) mergeFields.TIER = sub.subscriptionTier;

      return {
        method: 'PUT',
        path: `/lists/${this.listId}/members/${hash}`,
        body: JSON.stringify({
          email_address: sub.email,
          status_if_new: 'subscribed',
          merge_fields: mergeFields,
        }),
      };
    });

    try {
      const batchResult = await this.request<any>('POST', '/batches', { operations });
      result.processed = subscribers.length;
      // Batch processing is async in Mailchimp, can't get immediate results
      result.created = subscribers.length; // Approximate
    } catch (error: any) {
      // Fall back to individual requests
      for (const sub of subscribers) {
        result.processed++;
        try {
          await this.subscribe(sub);
          result.created++;
        } catch (err: any) {
          result.failed++;
          result.errors.push({ email: sub.email, error: err.message });
        }
      }
    }

    return result;
  }

  async pullSubscribers(limit: number = 100, cursor?: string): Promise<{ subscribers: SubscriberData[]; nextCursor?: string }> {
    try {
      let url = `/lists/${this.listId}/members?count=${limit}`;
      if (cursor) url += `&offset=${cursor}`;

      const result = await this.request<{ members: any[]; total_items: number }>('GET', url);

      const subscribers = result.members.map(m => ({
        email: m.email_address,
        firstName: m.merge_fields?.FNAME,
        lastName: m.merge_fields?.LNAME,
        subscriptionTier: m.merge_fields?.TIER,
      }));

      const offset = parseInt(cursor || '0');
      const nextOffset = offset + limit;
      const nextCursor = nextOffset < result.total_items ? nextOffset.toString() : undefined;

      return { subscribers, nextCursor };
    } catch (error) {
      return { subscribers: [] };
    }
  }

  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    try {
      const typeMap: Record<string, WebhookEvent['type']> = {
        subscribe: 'subscribed',
        unsubscribe: 'unsubscribed',
        cleaned: 'bounced',
        campaign: 'opened', // Need to check subtype
      };

      const type = typeMap[payload.type];
      if (!type) return null;

      return {
        type,
        email: payload.data?.email || payload.email,
        timestamp: new Date(payload.fired_at || Date.now()),
        campaignId: payload.data?.campaign_id,
        metadata: payload.data,
      };
    } catch {
      return null;
    }
  }

  verifyWebhook(payload: any, headers: Record<string, string>): boolean {
    // Mailchimp webhooks don't have built-in signature verification
    // You should use a secret URL path instead
    return true;
  }

  private mapStatus(status: string): SubscriberStatus['status'] {
    const map: Record<string, SubscriberStatus['status']> = {
      subscribed: 'active',
      unsubscribed: 'unsubscribed',
      cleaned: 'cleaned',
      pending: 'pending',
      transactional: 'active',
    };
    return map[status] || 'active';
  }
}

export default MailchimpProvider;
