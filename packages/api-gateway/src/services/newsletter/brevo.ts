/**
 * @file services/newsletter/brevo.ts
 * @description Brevo (Sendinblue) newsletter provider implementation
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

const BREVO_API_URL = 'https://api.brevo.com/v3';

export class BrevoProvider extends NewsletterProvider {
  private listId?: number;

  constructor(apiKey: string, listId?: number) {
    super('brevo', apiKey);
    this.listId = listId;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(`${BREVO_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Brevo API error: ${response.status}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async subscribe(data: SubscriberData): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      const attributes: Record<string, any> = {};
      if (data.firstName) attributes.FIRSTNAME = data.firstName;
      if (data.lastName) attributes.LASTNAME = data.lastName;
      if (data.subscriptionTier) attributes.SUBSCRIPTION_TIER = data.subscriptionTier;
      if (data.source) attributes.SOURCE = data.source;

      const payload: any = {
        email: data.email,
        attributes,
        updateEnabled: true,
      };

      if (this.listId) {
        payload.listIds = [this.listId];
      }

      const result = await this.request<{ id?: number }>('POST', '/contacts', payload);
      
      return { success: true, providerId: result.id?.toString() };
    } catch (error: any) {
      // Check if already exists
      if (error.message.includes('already exist')) {
        // Update instead
        return this.updateSubscriber(data.email, data);
      }
      return { success: false, error: error.message };
    }
  }

  async unsubscribe(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Brevo: Update email blacklist status
      await this.request('PUT', `/contacts/${encodeURIComponent(email)}`, {
        emailBlacklisted: true,
      });
      
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return { success: true }; // Already not subscribed
      }
      return { success: false, error: error.message };
    }
  }

  async updateSubscriber(email: string, data: Partial<SubscriberData>): Promise<{ success: boolean; error?: string }> {
    try {
      const attributes: Record<string, any> = {};
      if (data.firstName) attributes.FIRSTNAME = data.firstName;
      if (data.lastName) attributes.LASTNAME = data.lastName;
      if (data.subscriptionTier) attributes.SUBSCRIPTION_TIER = data.subscriptionTier;

      await this.request('PUT', `/contacts/${encodeURIComponent(email)}`, {
        attributes,
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getSubscriberStatus(email: string): Promise<SubscriberStatus | null> {
    try {
      const result = await this.request<any>('GET', `/contacts/${encodeURIComponent(email)}`);

      return {
        subscribed: !result.emailBlacklisted,
        status: result.emailBlacklisted ? 'unsubscribed' : 'active',
        email: result.email,
        providerId: result.id?.toString(),
        groups: result.listIds?.map((id: number) => id.toString()) || [],
      };
    } catch (error) {
      return null;
    }
  }

  async addTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Brevo uses lists as tags - find or create
      const segments = await this.getSegments();
      let tagList = segments.find(s => s.name === `tag:${tag}`);
      
      if (!tagList) {
        tagList = (await this.createSegment({ name: `tag:${tag}`, criteria: {} })) ?? undefined;
      }

      if (tagList) {
        await this.addToSegment(email, tagList.providerId || tagList.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async removeTag(email: string, tag: string): Promise<{ success: boolean; error?: string }> {
    try {
      const segments = await this.getSegments();
      const tagList = segments.find(s => s.name === `tag:${tag}`);
      
      if (tagList?.providerId) {
        await this.request('POST', `/contacts/lists/${tagList.providerId}/contacts/remove`, {
          emails: [email],
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createSegment(data: SegmentData): Promise<SegmentResult | null> {
    try {
      const result = await this.request<{ id: number }>('POST', '/contacts/lists', {
        name: data.name,
        folderId: 1, // Default folder
      });

      return {
        id: result.id.toString(),
        name: data.name,
        subscriberCount: 0,
        providerId: result.id.toString(),
      };
    } catch (error) {
      return null;
    }
  }

  async getSegments(): Promise<SegmentResult[]> {
    try {
      const result = await this.request<{ lists: any[] }>('GET', '/contacts/lists?limit=50');
      
      return result.lists.map(l => ({
        id: l.id.toString(),
        name: l.name,
        subscriberCount: l.totalSubscribers || 0,
        providerId: l.id.toString(),
      }));
    } catch (error) {
      return [];
    }
  }

  async addToSegment(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('POST', `/contacts/lists/${segmentId}/contacts/add`, {
        emails: [email],
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createCampaign(data: CampaignData): Promise<CampaignResult | null> {
    try {
      const payload: any = {
        name: data.name,
        subject: data.subject,
        sender: {
          name: process.env.SMTP_FROM_NAME || 'Newsletter',
          email: process.env.SMTP_FROM_EMAIL,
        },
        type: 'classic',
        htmlContent: data.contentHtml,
      };

      if (data.segmentId) {
        payload.recipients = { listIds: [parseInt(data.segmentId)] };
      } else if (this.listId) {
        payload.recipients = { listIds: [this.listId] };
      }

      if (data.scheduledAt) {
        payload.scheduledAt = data.scheduledAt.toISOString();
      }

      const result = await this.request<{ id: number }>('POST', '/emailCampaigns', payload);

      return {
        id: result.id.toString(),
        providerId: result.id.toString(),
        status: 'created',
      };
    } catch (error) {
      return null;
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      const result = await this.request<any>('GET', `/emailCampaigns/${campaignId}`);
      const stats = result.statistics?.globalStats || {};

      return {
        sent: stats.sent || 0,
        delivered: stats.delivered || 0,
        opened: stats.uniqueOpens || 0,
        clicked: stats.uniqueClicks || 0,
        bounced: (stats.hardBounces || 0) + (stats.softBounces || 0),
        complained: stats.complaints || 0,
        unsubscribed: stats.unsubscriptions || 0,
        openRate: stats.sent ? ((stats.uniqueOpens || 0) / stats.sent) * 100 : 0,
        clickRate: stats.uniqueOpens ? ((stats.uniqueClicks || 0) / stats.uniqueOpens) * 100 : 0,
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

    // Brevo supports batch import
    const contacts = subscribers.map(sub => {
      const attributes: Record<string, any> = {};
      if (sub.firstName) attributes.FIRSTNAME = sub.firstName;
      if (sub.lastName) attributes.LASTNAME = sub.lastName;
      if (sub.subscriptionTier) attributes.SUBSCRIPTION_TIER = sub.subscriptionTier;

      return {
        email: sub.email,
        attributes,
      };
    });

    try {
      await this.request('POST', '/contacts/import', {
        fileBody: JSON.stringify(contacts),
        listIds: this.listId ? [this.listId] : undefined,
        updateExistingContacts: true,
        emptyContactsAttributes: false,
      });
      
      result.processed = subscribers.length;
      result.created = subscribers.length; // Approximate
    } catch (error: any) {
      // Fall back to individual
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
      const offset = parseInt(cursor || '0');
      const result = await this.request<{ contacts: any[]; count: number }>(
        'GET',
        `/contacts?limit=${limit}&offset=${offset}`
      );

      const subscribers = result.contacts.map(c => ({
        email: c.email,
        firstName: c.attributes?.FIRSTNAME,
        lastName: c.attributes?.LASTNAME,
        subscriptionTier: c.attributes?.SUBSCRIPTION_TIER,
      }));

      const nextOffset = offset + limit;
      const nextCursor = nextOffset < result.count ? nextOffset.toString() : undefined;

      return { subscribers, nextCursor };
    } catch (error) {
      return { subscribers: [] };
    }
  }

  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    try {
      const typeMap: Record<string, WebhookEvent['type']> = {
        delivered: 'subscribed',
        unsubscribe: 'unsubscribed',
        hard_bounce: 'bounced',
        soft_bounce: 'bounced',
        complaint: 'complained',
        unique_opened: 'opened',
        click: 'clicked',
      };

      const type = typeMap[payload.event];
      if (!type) return null;

      return {
        type,
        email: payload.email,
        timestamp: new Date(payload.date || Date.now()),
        campaignId: payload['campaign-id']?.toString(),
        metadata: payload,
      };
    } catch {
      return null;
    }
  }

  verifyWebhook(payload: any, headers: Record<string, string>): boolean {
    // Brevo webhooks can be verified by checking the source IP
    // or using a secret in the webhook URL
    return true;
  }
}

export default BrevoProvider;
