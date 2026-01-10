import type { FastifyInstance } from 'fastify';
import { NewsletterProvider, SubscriberData, WebhookEvent } from './base.js';
import { MailerLiteProvider } from './mailerlite.js';
import { MailchimpProvider } from './mailchimp.js';
import { BrevoProvider } from './brevo.js';

export * from './base.js';
export { MailerLiteProvider, MailchimpProvider, BrevoProvider };

export class NewsletterService {
  private providers: Map<string, NewsletterProvider> = new Map();
  private primaryProvider: NewsletterProvider | null = null;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initializeProviders();
  }

  private initializeProviders() {
    if (process.env.MAILERLITE_API_KEY) {
      this.providers.set('mailerlite', new MailerLiteProvider(process.env.MAILERLITE_API_KEY, process.env.MAILERLITE_GROUP_ID));
      if (!this.primaryProvider) this.primaryProvider = this.providers.get('mailerlite')!;
    }
    if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_SERVER_PREFIX && process.env.MAILCHIMP_LIST_ID) {
      this.providers.set('mailchimp', new MailchimpProvider(process.env.MAILCHIMP_API_KEY, process.env.MAILCHIMP_SERVER_PREFIX, process.env.MAILCHIMP_LIST_ID));
      if (!this.primaryProvider) this.primaryProvider = this.providers.get('mailchimp')!;
    }
    if (process.env.BREVO_API_KEY) {
      this.providers.set('brevo', new BrevoProvider(process.env.BREVO_API_KEY, process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : undefined));
      if (!this.primaryProvider) this.primaryProvider = this.providers.get('brevo')!;
    }
    const primaryName = process.env.NEWSLETTER_PROVIDER;
    if (primaryName && this.providers.has(primaryName)) this.primaryProvider = this.providers.get(primaryName)!;
  }

  isConfigured() { return this.primaryProvider !== null; }
  getProvider(name?: string) { return name ? this.providers.get(name) || null : this.primaryProvider; }
  getAllProviders() { return Array.from(this.providers.values()); }

  async getSubscriberStatus(email: string) {
    if (!this.primaryProvider) return null;
    return this.primaryProvider.getSubscriberStatus(email);
  }

  async subscribe(data: SubscriberData) {
    const results: Record<string, any> = {};
    let anySuccess = false;
    try { await this.saveSubscriberToDb(data); } catch (error: any) { this.fastify.log.error({ error }, 'DB save failed'); }
    for (const [name, provider] of this.providers) {
      try {
        const result = await provider.subscribe(data);
        results[name] = result;
        if (result.success) { anySuccess = true; await this.updateProviderIds(data.email, name, result.providerId); }
      } catch (error: any) { results[name] = { success: false, error: error.message }; }
    }
    return { success: anySuccess, results };
  }

  async unsubscribe(email: string) {
    const results: Record<string, any> = {};
    let anySuccess = false;
    try {
      await this.fastify.pg.query('UPDATE newsletter_subscribers SET status = $1, unsubscribed_at = NOW() WHERE email = $2', ['unsubscribed', email]);
    } catch {
      // DB update is non-critical - provider unsubscribe will still proceed
    }
    for (const [name, provider] of this.providers) {
      try { const result = await provider.unsubscribe(email); results[name] = result; if (result.success) anySuccess = true; } catch (error: any) { results[name] = { success: false, error: error.message }; }
    }
    return { success: anySuccess, results };
  }

  async syncToProviders() {
    const results: Record<string, any> = {};
    const localResult = await this.fastify.pg.query('SELECT email, first_name, last_name, subscription_tier, source FROM newsletter_subscribers WHERE status = $1', ['active']);
    const subscribers: SubscriberData[] = localResult.rows.map(r => ({ email: r.email, firstName: r.first_name, lastName: r.last_name, subscriptionTier: r.subscription_tier, source: r.source }));
    for (const [name, provider] of this.providers) {
      try { results[name] = await provider.pushSubscribers(subscribers); } catch (error: any) { results[name] = { success: false, error: error.message }; }
    }
    await this.logSync('push', results);
    return { success: true, results };
  }

  async processWebhook(providerName: string, payload: any, headers: Record<string, string>) {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.verifyWebhook(payload, headers)) return null;
    const event = provider.parseWebhook(payload, headers);
    if (event) await this.handleWebhookEvent(event, providerName);
    return event;
  }

  private async saveSubscriberToDb(data: SubscriberData) {
    await this.fastify.pg.query('INSERT INTO newsletter_subscribers (email, first_name, last_name, subscription_tier, interests, source, utm_source, utm_medium, utm_campaign, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (email) DO UPDATE SET first_name = COALESCE(EXCLUDED.first_name, newsletter_subscribers.first_name), last_name = COALESCE(EXCLUDED.last_name, newsletter_subscribers.last_name), subscription_tier = COALESCE(EXCLUDED.subscription_tier, newsletter_subscribers.subscription_tier), updated_at = NOW()',
      [data.email, data.firstName, data.lastName, data.subscriptionTier, data.interests || [], data.source, data.utmSource, data.utmMedium, data.utmCampaign, 'active']);
  }

  private async updateProviderIds(email: string, provider: string, id?: string) {
    if (!id) return;
    await this.fastify.pg.query(`UPDATE newsletter_subscribers SET ${provider}_id = $1, provider_synced_at = NOW(), sync_status = $2 WHERE email = $3`, [id, 'synced', email]);
  }

  private async handleWebhookEvent(event: WebhookEvent, provider: string) {
    const { type, email } = event;
    const subscriberResult = await this.fastify.pg.query('SELECT id FROM newsletter_subscribers WHERE email = $1', [email]);
    const subscriberId = subscriberResult.rows[0]?.id;
    await this.fastify.pg.query('INSERT INTO email_events (subscriber_id, event_type, email, provider, occurred_at) VALUES ($1, $2, $3, $4, $5)', [subscriberId, type, email, provider, event.timestamp]);
    if (type === 'subscribed') await this.fastify.pg.query('UPDATE newsletter_subscribers SET status = $1 WHERE email = $2', ['active', email]);
    else if (type === 'unsubscribed') await this.fastify.pg.query('UPDATE newsletter_subscribers SET status = $1, unsubscribed_at = NOW() WHERE email = $2', ['unsubscribed', email]);
    else if (type === 'bounced') await this.fastify.pg.query('UPDATE newsletter_subscribers SET status = $1 WHERE email = $2', ['bounced', email]);
    else if (type === 'opened' || type === 'clicked') await this.fastify.pg.query('UPDATE newsletter_subscribers SET emails_opened = emails_opened + $1, emails_clicked = emails_clicked + $2 WHERE email = $3', [type === 'opened' ? 1 : 0, type === 'clicked' ? 1 : 0, email]);
  }

  private async logSync(direction: string, results: Record<string, any>) {
    let total = 0, failed = 0;
    for (const r of Object.values(results)) { if (r.processed) total += r.processed; if (r.failed) failed += r.failed; }
    await this.fastify.pg.query('INSERT INTO newsletter_sync_log (provider, direction, sync_type, status, records_processed, records_failed, completed_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', ['all', direction, 'full', failed > 0 ? 'partial' : 'completed', total, failed]);
  }
}

let newsletterServiceInstance: NewsletterService | null = null;
export function initNewsletterService(fastify: FastifyInstance) { if (!newsletterServiceInstance) newsletterServiceInstance = new NewsletterService(fastify); return newsletterServiceInstance; }
export function getNewsletterService() { if (!newsletterServiceInstance) throw new Error('Newsletter service not initialized'); return newsletterServiceInstance; }
export default NewsletterService;
