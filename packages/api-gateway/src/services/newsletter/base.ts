/**
 * @file services/newsletter/base.ts
 * @description Abstract base class for newsletter providers
 */

// ============================================
// TYPES
// ============================================

export interface SubscriberData {
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: string;
  interests?: string[];
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  customFields?: Record<string, any>;
}

export interface SubscriberStatus {
  subscribed: boolean;
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'cleaned' | 'pending';
  email: string;
  providerId?: string;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
  groups?: string[];
  tags?: string[];
}

export interface SegmentData {
  name: string;
  criteria: Record<string, any>;
}

export interface SegmentResult {
  id: string;
  name: string;
  subscriberCount: number;
  providerId?: string;
}

export interface CampaignData {
  name: string;
  subject: string;
  previewText?: string;
  contentHtml: string;
  contentText?: string;
  segmentId?: string;
  scheduledAt?: Date;
}

export interface CampaignResult {
  id: string;
  providerId: string;
  status: string;
  recipientCount?: number;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export interface WebhookEvent {
  type: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained' | 'opened' | 'clicked';
  email: string;
  timestamp: Date;
  campaignId?: string;
  metadata?: Record<string, any>;
}

// ============================================
// ABSTRACT PROVIDER
// ============================================

export abstract class NewsletterProvider {
  protected name: string;
  protected apiKey: string;

  constructor(name: string, apiKey: string) {
    this.name = name;
    this.apiKey = apiKey;
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if provider is configured
   */
  abstract isConfigured(): boolean;

  /**
   * Subscribe an email to the newsletter
   */
  abstract subscribe(data: SubscriberData): Promise<{ success: boolean; providerId?: string; error?: string }>;

  /**
   * Unsubscribe an email
   */
  abstract unsubscribe(email: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Update subscriber data
   */
  abstract updateSubscriber(email: string, data: Partial<SubscriberData>): Promise<{ success: boolean; error?: string }>;

  /**
   * Get subscriber status
   */
  abstract getSubscriberStatus(email: string): Promise<SubscriberStatus | null>;

  /**
   * Add tag to subscriber
   */
  abstract addTag(email: string, tag: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Remove tag from subscriber
   */
  abstract removeTag(email: string, tag: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Create a segment/group
   */
  abstract createSegment(data: SegmentData): Promise<SegmentResult | null>;

  /**
   * Get all segments
   */
  abstract getSegments(): Promise<SegmentResult[]>;

  /**
   * Add subscriber to segment
   */
  abstract addToSegment(email: string, segmentId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Create and send a campaign
   */
  abstract createCampaign(data: CampaignData): Promise<CampaignResult | null>;

  /**
   * Get campaign stats
   */
  abstract getCampaignStats(campaignId: string): Promise<CampaignStats | null>;

  /**
   * Sync subscribers with provider (push local to provider)
   */
  abstract pushSubscribers(subscribers: SubscriberData[]): Promise<SyncResult>;

  /**
   * Pull subscribers from provider
   */
  abstract pullSubscribers(limit?: number, cursor?: string): Promise<{ subscribers: SubscriberData[]; nextCursor?: string }>;

  /**
   * Parse webhook payload
   */
  abstract parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(payload: any, headers: Record<string, string>): boolean;
}

export default NewsletterProvider;
