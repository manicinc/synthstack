/**
 * Every mail the API sends, sent through the real EmailService into a
 * capturing Resend client, against a real Postgres that holds the real
 * migrations. The unsubscribe routes and the newsletter route are called
 * through Fastify's inject.
 *
 * Needs TEST_DATABASE_URL (a Postgres the test may wipe). CI provides one.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { initEmailService, getEmailService } from '../mailer.js';
import { initResendService } from '../resend.js';
import * as helpers from '../helpers.js';
import { AuthEmailService } from '../../auth/auth-email.service.js';
import { sendContactNotification } from '../../email.js';
import { initNewsletterService, getNewsletterService } from '../../newsletter/index.js';
import { parse as parseYaml } from 'yaml';
import { canonicalAddress } from '../unsubscribe.js';
import emailUnsubscribeRoutes from '../../../routes/email-unsubscribe.js';
import newsletterRoutes from '../../../routes/newsletter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../../..');
const MIGRATIONS = resolve(REPO_ROOT, 'services/directus/migrations');
const DATABASE_URL = process.env.TEST_DATABASE_URL;

const PUBLIC_URL = 'https://api.example.test';
const TOKEN_HEADER = /^<https:\/\/api\.example\.test\/api\/v1\/email\/unsubscribe\/([A-Za-z0-9_-]{43})>$/;
const POSTAL_LINE = 'Manic Agency LLC, 2831 St Rose Parkway, Suite 200, Henderson, NV 89052';
const DNC_GMAIL = 'blocked.person@gmail.com';
const DNC_HASHED = 'hashed@example.test';

interface SentMail {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

const sent: SentMail[] = [];
const capture = {
  emails: {
    send: async (payload: SentMail) => {
      sent.push(payload);
      return { data: { id: `msg-${sent.length}` }, error: null };
    },
  },
};

let pool: Pool;
let app: FastifyInstance;
let userId: string;
let auth: AuthEmailService;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const recipients = (m: SentMail) => (Array.isArray(m.to) ? m.to : [m.to]).map((t) => t.toLowerCase());
const mailsTo = (to: string) => sent.filter((m) => recipients(m).includes(to.toLowerCase()));

async function waitForCount(to: string, n: number, timeoutMs = 8000): Promise<SentMail[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const got = mailsTo(to);
    if (got.length >= n) return got;
    await sleep(25);
  }
  throw new Error(`expected ${n} mail(s) to ${to}, got ${mailsTo(to).length}`);
}

async function waitForMail(to: string): Promise<SentMail> {
  const got = await waitForCount(to, 1);
  return got[got.length - 1];
}

async function queueRows(to: string) {
  const r = await pool.query(
    'SELECT status, error_code, category FROM email_queue WHERE lower(to_email) = lower($1) ORDER BY created_at',
    [to]
  );
  return r.rows as Array<{ status: string; error_code: string | null; category: string | null }>;
}

async function waitForRowStatus(to: string, done: (s: string) => boolean, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await queueRows(to);
    if (rows.length > 0 && done(rows[rows.length - 1].status)) return rows[rows.length - 1];
    await sleep(25);
  }
  throw new Error(`queue row for ${to} did not settle`);
}

async function suppressionScopes(to: string): Promise<string[]> {
  const r = await pool.query(
    'SELECT scope FROM email_suppressions WHERE address_hash = $1 ORDER BY scope',
    [sha256(canonicalAddress(to))]
  );
  return r.rows.map((row: { scope: string }) => row.scope);
}

function tokenOf(mail: SentMail): string {
  const header = mail.headers?.['List-Unsubscribe'] ?? '';
  const m = header.match(TOKEN_HEADER);
  if (!m) throw new Error(`no List-Unsubscribe token in ${JSON.stringify(mail.headers)}`);
  return m[1];
}

const unsubscribePath = (token: string) => `/api/v1/email/unsubscribe/${token}`;

function oneClick(token: string) {
  return app.inject({
    method: 'POST',
    url: unsubscribePath(token),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: 'List-Unsubscribe=One-Click',
  });
}

function formPost(token: string, scope: string) {
  return app.inject({
    method: 'POST',
    url: unsubscribePath(token),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: `scope=${encodeURIComponent(scope)}`,
  });
}

async function expectCompliant(mail: SentMail, category: string, opts: { text: boolean }) {
  const token = tokenOf(mail);
  const url = `${PUBLIC_URL}/api/v1/email/unsubscribe/${token}`;

  expect(mail.headers?.['List-Unsubscribe']).toBe(`<${url}>`);
  expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');

  const link = new RegExp(
    `<a href="${escapeRe(url)}"[^>]*style="[^"]*font-size:\\s*(\\d+)px[^"]*"[^>]*>Unsubscribe</a>`
  );
  const found = mail.html.match(link);
  expect(found, 'visible Unsubscribe link in the footer').not.toBeNull();
  expect(Number(found![1])).toBeGreaterThanOrEqual(13);
  expect(mail.html).not.toMatch(/font-size:\s*(?:\d|1[0-2])px/);
  expect(mail.html).toContain(POSTAL_LINE);
  expect(mail.html).not.toContain('__UNSUBSCRIBE_URL__');

  if (opts.text) {
    expect(mail.text).toContain(`Unsubscribe: ${url}`);
    expect(mail.text).toContain(POSTAL_LINE);
  }

  const stored = await pool.query(
    'SELECT category, address_hash FROM email_unsubscribe_tokens WHERE token_hash = $1',
    [sha256(token)]
  );
  expect(stored.rows[0]?.category).toBe(category);
  expect(stored.rows[0]?.address_hash).toBe(sha256(canonicalAddress(recipients(mail)[0])));

  const raw = await pool.query(
    `SELECT
       (SELECT count(*) FROM email_unsubscribe_tokens WHERE token_hash = $1)::int AS tokens,
       (SELECT count(*) FROM email_queue WHERE html_body LIKE $2 OR coalesce(text_body, '') LIKE $2)::int AS queue`,
    [token, `%${token}%`]
  );
  expect(raw.rows[0]).toEqual({ tokens: 0, queue: 0 });

  return { token, url };
}

async function resetSchema() {
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await pool.query('CREATE TABLE directus_users (id UUID PRIMARY KEY DEFAULT gen_random_uuid())');
  await pool.query(`
    CREATE TABLE app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(100),
      subscription_tier VARCHAR(20) DEFAULT 'free',
      status VARCHAR(50) DEFAULT 'active',
      email_preferences JSONB DEFAULT '{"demo_credits": true}'::jsonb
    )`);
  await pool.query(`
    CREATE TABLE newsletter_subscribers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      subscription_tier VARCHAR(50),
      interests TEXT[],
      source VARCHAR(100),
      utm_source VARCHAR(100),
      utm_medium VARCHAR(100),
      utm_campaign VARCHAR(100),
      status VARCHAR(50),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE TABLE newsletter_sync_log (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50),
      direction VARCHAR(20),
      sync_type VARCHAR(20),
      status VARCHAR(20),
      records_processed INT,
      records_failed INT,
      completed_at TIMESTAMPTZ
    )`);
  for (const file of [
    '005_email_system.sql',
    '042_team_invitation_email_template.sql',
    '130_demo_credit_low_email_template.sql',
    '136_email_unsubscribe.sql',
  ]) {
    await pool.query(readFileSync(resolve(MIGRATIONS, file), 'utf8'));
  }
}

beforeAll(async () => {
  if (!DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set: these tests need a Postgres they may wipe');
  }
  process.env.MAIL_DO_NOT_CONTACT = `${DNC_GMAIL}, sha256:${sha256(DNC_HASHED)}`;

  pool = new Pool({ connectionString: DATABASE_URL });
  await resetSchema();
  const user = await pool.query(
    "INSERT INTO app_users (email, display_name) VALUES ('owner@example.test', 'Ada') RETURNING id"
  );
  userId = user.rows[0].id;

  app = Fastify({ logger: false });
  await app.register(fastifyPostgres, { connectionString: DATABASE_URL });
  await app.after();
  initEmailService(app, { resendClient: capture });
  initResendService(app, { client: capture });
  initNewsletterService(app);
  // The newsletter plugin also declares admin routes; these tests call only
  // its public signup route, so the admin guards refuse everything.
  app.decorate('authenticate', async (_request: any, reply: any) => {
    reply.code(401).send();
  });
  app.decorate('requireAdmin', async (_request: any, reply: any) => {
    reply.code(403).send();
  });
  await app.register(emailUnsubscribeRoutes, { prefix: '/api/v1' });
  await app.register(newsletterRoutes, { prefix: '/api/v1/newsletter' });
  await app.ready();

  auth = new AuthEmailService({ emailService: getEmailService() });
}, 60000);

afterAll(async () => {
  await app?.close();
  await pool?.end();
});

describe('every mail carries the unsubscribe link and the one-click headers', () => {
  const cases: Array<{
    name: string;
    category: string;
    text: boolean;
    send: (to: string) => Promise<unknown>;
  }> = [
    { name: 'email verification', category: 'security', text: true,
      send: (to) => auth.sendVerificationEmail(to, 'verify-token', 'https://app.example.test/verify') },
    { name: 'password reset', category: 'security', text: true,
      send: (to) => auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset') },
    { name: 'magic link', category: 'security', text: true,
      send: (to) => auth.sendMagicLinkEmail(to, 'magic-token', 'https://app.example.test/magic') },
    { name: 'welcome after verification', category: 'onboarding', text: true,
      send: (to) => auth.sendWelcomeEmail(to, 'Ada') },
    { name: 'welcome', category: 'onboarding', text: true,
      send: (to) => helpers.sendWelcomeEmail(app, userId, to, 'Ada') },
    { name: 'subscription confirmed', category: 'receipts', text: true,
      send: (to) => helpers.sendSubscriptionConfirmedEmail(app, userId, to, 'Ada', 'Pro', 29, false, 100) },
    { name: 'payment receipt', category: 'receipts', text: true,
      send: (to) => helpers.sendPaymentReceiptEmail(app, userId, to, 'INV-1', 29, 'Pro plan', 'https://pay.example.test/inv-1', '4242') },
    { name: 'trial ending', category: 'trial_reminders', text: true,
      send: (to) => helpers.sendTrialEndingEmail(app, userId, to, 'Ada', 3, new Date(), 5) },
    { name: 'payment failed', category: 'billing', text: true,
      send: (to) => helpers.sendPaymentFailedEmail(app, userId, to, 'Pro', 29, new Date()) },
    { name: 'credit low', category: 'usage_alerts', text: true,
      send: (to) => helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker') },
    { name: 'credits purchased', category: 'receipts', text: true,
      send: (to) => helpers.sendCreditsPurchasedEmail(app, userId, to, 'Ada', 100, 10, '100 Credits', 'cs_test_purchase', 120) },
    { name: 'credits purchased, webhook path', category: 'receipts', text: true,
      send: (to) => getEmailService().sendEmail({
        to,
        templateSlug: 'credit-purchased',
        templateData: { userName: 'Ada', credits: 100, newBalance: 120 },
        userId,
        referenceType: 'purchase',
        referenceId: 'cs_test_webhook_session',
      }) },
    { name: 'subscription canceled', category: 'billing', text: true,
      send: (to) => helpers.sendSubscriptionCanceledEmail(app, userId, to, 'Ada', 'Pro', new Date()) },
    { name: 'moderation notice', category: 'account_notices', text: true,
      send: (to) => helpers.sendModerationWarningEmail(app, userId, to, 'Ada', 'warning', 'spam', 'details', 1) },
    { name: 'admin report', category: 'staff_alerts', text: true,
      send: (to) => helpers.sendAdminReportEmail(app, to, 'content', 'reporter@example.test', 'spam', 'details', 'content-1', 'https://app.example.test/review') },
    { name: 'team invitation', category: 'invitations', text: true,
      send: (to) => helpers.sendTeamInvitationEmail(app, to, userId, 'Ada', 'ada@example.test', randomUUID(), 'Rocket', undefined, 'member', 'invite-token', new Date()) },
    { name: 'lifetime licence welcome', category: 'receipts', text: true,
      send: (to) => getEmailService().sendLifetimeWelcomeEmail({ to, sessionId: 'cs_test_lifetime', licenseAccessUrl: 'https://app.example.test/license-access?session=cs_test_lifetime' }) },
    { name: 'lifetime invitation sent', category: 'receipts', text: false,
      send: (to) => getEmailService().sendLifetimeInvitationSentEmail({ to, githubUsername: 'octo-cat' }) },
    { name: 'lifetime access granted', category: 'receipts', text: false,
      send: (to) => getEmailService().sendLifetimeAccessGrantedEmail({ to, githubUsername: 'octo-cat' }) },
  ];

  for (const [i, c] of cases.entries()) {
    it(c.name, async () => {
      const to = `mail-${i}@example.test`;
      await c.send(to);
      const mail = await waitForMail(to);
      await expectCompliant(mail, c.category, { text: c.text });
      const rows = await queueRows(to);
      expect(rows.map((r) => r.category)).toEqual([c.category]);
    });
  }

  it('demo credit low, sent when its scheduled time comes', async () => {
    const to = 'demo-low@example.test';
    await helpers.sendDemoCreditLowEmail(app, userId, to, 'Ada', randomUUID());
    expect((await queueRows(to))[0]?.status).toBe('scheduled');
    await pool.query("UPDATE email_queue SET scheduled_at = NOW() - INTERVAL '1 minute' WHERE to_email = $1", [to]);
    await getEmailService().processQueue();
    const mail = await waitForMail(to);
    const { url } = await expectCompliant(mail, 'usage_alerts', { text: true });
    expect(mail.html.split(url).length - 1).toBeGreaterThanOrEqual(2);
    expect(mail.text?.split(url).length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('each send gets its own token', async () => {
    const to = 'twice@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 1, 30, 'maker');
    const [a, b] = await waitForCount(to, 2);
    expect(tokenOf(a)).not.toBe(tokenOf(b));
  });

  it('auth mail names the support address the product answers at', async () => {
    const to = 'support-line@example.test';
    await auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset');
    const mail = await waitForMail(to);
    expect(mail.html).toContain('team@manic.agency');
    expect(mail.html).not.toContain('synthstack.io');
  });

  it('fields people type are escaped', async () => {
    const welcomeTo = 'escape-welcome@example.test';
    await auth.sendWelcomeEmail(welcomeTo, '<img src=x onerror=alert(1)>');
    const welcome = await waitForMail(welcomeTo);
    expect(welcome.html).not.toContain('<img src=x');
    expect(welcome.html).toContain('&lt;img src=x onerror=alert(1)&gt;');

    const lifetimeTo = 'escape-lifetime@example.test';
    await getEmailService().sendLifetimeInvitationSentEmail({ to: lifetimeTo, githubUsername: '<b>octo</b>' });
    const lifetime = await waitForMail(lifetimeTo);
    expect(lifetime.html).not.toContain('<b>octo</b>');
    expect(lifetime.html).toContain('&lt;b&gt;octo&lt;/b&gt;');
  });
});

describe('the unsubscribe page', () => {
  it('a GET shows the choice and changes nothing', async () => {
    const to = 'get-only@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    const token = tokenOf(await waitForMail(to));

    const page = await app.inject({ method: 'GET', url: unsubscribePath(token) });
    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.headers['cache-control']).toContain('no-store');
    expect(page.body).toContain('method="post"');
    expect(page.body).toContain('name="scope" value="usage_alerts"');
    expect(page.body).toContain('name="scope" value="optional"');
    expect(await suppressionScopes(to)).toEqual([]);

    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 1, 30, 'maker');
    await waitForCount(to, 2);
  });

  it('a one-click POST stops that optional mail at once and sends no mail about it', async () => {
    const to = 'one-click@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    const token = tokenOf(await waitForMail(to));
    const before = sent.length;

    const res = await oneClick(token);
    expect(res.statusCode).toBe(200);
    await sleep(300);
    expect(sent.length).toBe(before);
    expect(await suppressionScopes(to)).toEqual(['usage_alerts']);

    const again = await getEmailService().sendEmail({ to, category: 'usage_alerts', subject: 'Low', html: '<p>low</p>', userId });
    expect(again).toMatchObject({ success: false, errorCode: 'SUPPRESSED' });
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 1, 30, 'maker');

    await helpers.sendPaymentReceiptEmail(app, userId, to, 'INV-2', 9, 'Credits', 'https://pay.example.test/inv-2', '4242');
    await helpers.sendTrialEndingEmail(app, userId, to, 'Ada', 2, new Date(), 1);
    await waitForCount(to, 3);
    await sleep(200);
    expect(mailsTo(to)).toHaveLength(3);
    expect(mailsTo(to).filter((m) => /credits remaining/i.test(m.subject))).toHaveLength(1);
  });

  it('a one-click POST sent as multipart form data works too', async () => {
    const to = 'multipart@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    const token = tokenOf(await waitForMail(to));
    const res = await app.inject({
      method: 'POST',
      url: unsubscribePath(token),
      headers: { 'content-type': 'multipart/form-data; boundary=x1' },
      payload: '--x1\r\nContent-Disposition: form-data; name="List-Unsubscribe"\r\n\r\nOne-Click\r\n--x1--\r\n',
    });
    expect(res.statusCode).toBe(200);
    expect(await suppressionScopes(to)).toEqual(['usage_alerts']);
  });

  it('the optional page can turn off every optional mail, and required mail still comes', async () => {
    const to = 'all-optional@example.test';
    await helpers.sendWelcomeEmail(app, userId, to, 'Ada');
    const token = tokenOf(await waitForMail(to));

    const res = await formPost(token, 'optional');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Optional email is off');
    expect(await suppressionScopes(to)).toEqual(['optional']);

    for (const category of ['onboarding', 'usage_alerts', 'trial_reminders', 'summaries', 'invitations', 'staff_alerts'] as const) {
      const r = await getEmailService().sendEmail({ to, category, subject: 's', html: '<p>s</p>' });
      expect(r, category).toMatchObject({ success: false, errorCode: 'SUPPRESSED' });
    }
    await auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset');
    await helpers.sendPaymentFailedEmail(app, userId, to, 'Pro', 29, new Date());
    await waitForCount(to, 3);
  });

  it('the link in required mail opens preferences that turn off optional mail only', async () => {
    const to = 'prefs@example.test';
    await auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset');
    const token = tokenOf(await waitForMail(to));

    const page = await app.inject({ method: 'GET', url: unsubscribePath(token) });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Email preferences');
    expect(page.body).toContain('Turn off all optional email');
    expect(page.body).toContain('Security emails');
    expect(page.body).toContain('Delete account');
    expect(page.body).toContain('https://app.example.test/gdpr');
    expect(page.body).not.toContain('value="security"');
    expect(await suppressionScopes(to)).toEqual([]);

    const res = await oneClick(token);
    expect(res.statusCode).toBe(200);
    expect(await suppressionScopes(to)).toEqual(['optional']);

    const welcome = await getEmailService().sendEmail({ to, category: 'onboarding', subject: 'Hi', html: '<p>hi</p>' });
    expect(welcome).toMatchObject({ success: false, errorCode: 'SUPPRESSED' });
    await auth.sendPasswordResetEmail(to, 'reset-token-2', 'https://app.example.test/reset');
    await waitForCount(to, 2);
  });

  it('a scope that is not the mail\'s own optional category is refused', async () => {
    const to = 'wrong-scope@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    const token = tokenOf(await waitForMail(to));
    for (const scope of ['trial_reminders', 'security', 'all', 'nonsense']) {
      const res = await formPost(token, scope);
      expect(res.statusCode, scope).toBe(400);
    }
    expect(await suppressionScopes(to)).toEqual([]);
  });

  it('an unknown or malformed token answers 404 and changes nothing', async () => {
    const countSuppressions = async () =>
      (await pool.query('SELECT count(*)::int AS n FROM email_suppressions')).rows[0].n as number;
    const before = await countSuppressions();
    const unknown = 'A'.repeat(43);
    for (const path of [unsubscribePath(unknown), unsubscribePath('short')]) {
      expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(404);
      expect((await app.inject({
        method: 'POST', url: path,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'List-Unsubscribe=One-Click',
      })).statusCode).toBe(404);
    }
    expect(await countSuppressions()).toBe(before);
  });

  it('a store failure answers 500', async () => {
    const broken = Fastify({ logger: false });
    broken.decorate('pg', { query: async () => { throw new Error('database down'); } } as never);
    await broken.register(emailUnsubscribeRoutes, { prefix: '/api/v1' });
    await broken.ready();
    const path = unsubscribePath('B'.repeat(43));
    expect((await broken.inject({ method: 'GET', url: path })).statusCode).toBe(500);
    expect((await broken.inject({
      method: 'POST', url: path,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    })).statusCode).toBe(500);
    await broken.close();
  });

  it('a scheduled optional mail is dropped when the address unsubscribes before it goes', async () => {
    const to = 'scheduled@example.test';
    await helpers.sendCreditLowEmail(app, userId, to, 'Ada', 2, 30, 'maker');
    const token = tokenOf(await waitForMail(to));
    await helpers.sendDemoCreditLowEmail(app, userId, to, 'Ada', randomUUID());
    expect((await oneClick(token)).statusCode).toBe(200);

    await pool.query(
      "UPDATE email_queue SET scheduled_at = NOW() - INTERVAL '1 minute' WHERE to_email = $1 AND status = 'scheduled'",
      [to]
    );
    await getEmailService().processQueue();
    const rows = await queueRows(to);
    expect(rows[rows.length - 1]).toMatchObject({ status: 'cancelled', error_code: 'SUPPRESSED' });
    expect(mailsTo(to)).toHaveLength(1);
  });
});

describe('the send gate', () => {
  it('do-not-contact addresses get nothing, receipts included, in any spelling', async () => {
    const spellings = [
      'Blocked.Person@gmail.com',
      'blockedperson+promo@googlemail.com',
      'Ada <blocked.person@gmail.com>',
      DNC_HASHED,
      'HASHED+news@Example.Test',
    ];
    for (const to of spellings) {
      const receipt = await getEmailService().sendEmail({ to, category: 'receipts', subject: 'Receipt', html: '<p>r</p>', userId });
      expect(receipt, to).toMatchObject({ success: false, errorCode: 'DO_NOT_CONTACT' });
      const reset = await auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset');
      expect(reset, to).toMatchObject({ success: false, errorCode: 'DO_NOT_CONTACT' });
      await helpers.sendWelcomeEmail(app, userId, to, 'Ada');
    }
    await sleep(300);
    for (const to of spellings) {
      expect(mailsTo(to), to).toHaveLength(0);
    }
    const queued = await pool.query(
      "SELECT count(*)::int AS n FROM email_queue WHERE lower(to_email) LIKE '%blocked%' OR lower(to_email) LIKE '%hashed%'"
    );
    expect(queued.rows[0].n).toBe(0);
  });

  it('an address added to the do-not-contact list after queueing gets nothing', async () => {
    const to = 'late-block@example.test';
    const later = new Date(Date.now() + 60 * 60 * 1000);
    const queued = await getEmailService().sendEmail({ to, category: 'receipts', subject: 'Receipt', html: '<p>r</p>', scheduledAt: later });
    expect(queued.success).toBe(true);
    const previous = process.env.MAIL_DO_NOT_CONTACT;
    process.env.MAIL_DO_NOT_CONTACT = `${previous}, ${to}`;
    try {
      await pool.query("UPDATE email_queue SET scheduled_at = NOW() - INTERVAL '1 minute' WHERE to_email = $1", [to]);
      await getEmailService().processQueue();
    } finally {
      process.env.MAIL_DO_NOT_CONTACT = previous;
    }
    expect((await queueRows(to))[0]).toMatchObject({ status: 'cancelled', error_code: 'DO_NOT_CONTACT' });
    expect(mailsTo(to)).toHaveLength(0);
  });

  it('mail without a known category is refused', async () => {
    const to = 'no-category@example.test';
    const bare = await getEmailService().sendEmail({ to, subject: 'x', html: '<p>x</p>' });
    expect(bare).toMatchObject({ success: false, errorCode: 'UNKNOWN_CATEGORY' });
    const unknownTemplate = await getEmailService().sendEmail({ to, templateSlug: 'no-such-template', templateData: {} });
    expect(unknownTemplate).toMatchObject({ success: false, errorCode: 'UNKNOWN_CATEGORY' });
    expect(await queueRows(to)).toHaveLength(0);
  });

  it('a row queued without a category is not sent', async () => {
    const to = 'legacy-row@example.test';
    await pool.query(
      "INSERT INTO email_queue (to_email, from_email, subject, html_body, status) VALUES ($1, 'team@manic.agency', 'Old', '<p>old</p>', 'pending')",
      [to]
    );
    await getEmailService().processQueue();
    expect((await queueRows(to))[0]).toMatchObject({ status: 'cancelled', error_code: 'UNKNOWN_CATEGORY' });
    expect(mailsTo(to)).toHaveLength(0);
  });

  it('nothing is sent in production when the unsubscribe address is not https', async () => {
    const to = 'http-only@example.test';
    const env = { NODE_ENV: process.env.NODE_ENV, MAIL_PUBLIC_URL: process.env.MAIL_PUBLIC_URL };
    process.env.NODE_ENV = 'production';
    process.env.MAIL_PUBLIC_URL = 'http://api.example.test';
    try {
      await auth.sendPasswordResetEmail(to, 'reset-token', 'https://app.example.test/reset');
      const row = await waitForRowStatus(to, (s) => s !== 'pending' && s !== 'processing');
      expect(row).toMatchObject({ status: 'failed', error_code: 'UNSUBSCRIBE_URL_INVALID' });
    } finally {
      process.env.NODE_ENV = env.NODE_ENV;
      process.env.MAIL_PUBLIC_URL = env.MAIL_PUBLIC_URL;
    }
    expect(mailsTo(to)).toHaveLength(0);
  });
});

describe('the contact relay and the newsletter', () => {
  it('the contact relay goes to the team inbox only, escaped', async () => {
    const result = await sendContactNotification({
      name: '<b>Ada</b>',
      email: 'visitor@example.test',
      subject: 'Hello',
      message: '<script>alert(1)</script>\nsecond line',
    });
    expect(result).toMatchObject({ success: true });
    const mail = await waitForMail('team@example.test');
    expect(recipients(mail)).toEqual(['team@example.test']);
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<b>Ada</b>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;<br>second line');
    expect(mail.replyTo).toBe('visitor@example.test');
    expect(mailsTo('visitor@example.test')).toHaveLength(0);
  });

  it('the contact relay withholds Reply-To for a do-not-contact sender', async () => {
    const before = mailsTo('team@example.test').length;
    await sendContactNotification({ name: 'X', email: 'Blocked.Person+x@gmail.com', message: 'hi' });
    const all = await waitForCount('team@example.test', before + 1);
    const mail = all[all.length - 1];
    expect(mail.replyTo).toBeUndefined();
    expect(mail.subject.startsWith('[Do not reply]')).toBe(true);
  });

  it('a do-not-contact address is never added to the newsletter', async () => {
    const ok = await app.inject({ method: 'POST', url: '/api/v1/newsletter/subscribe', payload: { email: 'reader@example.test' } });
    expect(ok.statusCode).toBe(200);
    const blocked = await app.inject({ method: 'POST', url: '/api/v1/newsletter/subscribe', payload: { email: 'Blocked.Person@gmail.com' } });
    expect(blocked.statusCode).toBe(200);
    expect(blocked.json()).toMatchObject({ success: true });

    const rows = await pool.query('SELECT lower(email) AS email FROM newsletter_subscribers ORDER BY email');
    expect(rows.rows.map((r: { email: string }) => r.email)).toEqual(['reader@example.test']);
  });
});

describe('newsletter providers never get a do-not-contact address', () => {
  const pushed: string[] = [];
  const fakeProvider = {
    subscribe: async () => ({ success: true }),
    unsubscribe: async () => ({ success: true }),
    pushSubscribers: async (subscribers: Array<{ email: string }>) => {
      pushed.push(...subscribers.map((s) => s.email.toLowerCase()));
      return { success: true, processed: subscribers.length, failed: 0 };
    },
  };

  beforeAll(() => {
    (getNewsletterService() as unknown as { providers: Map<string, unknown> }).providers.set('fake', fakeProvider);
  });

  it('a signup answers the same whether or not the address is on the list', async () => {
    const ok = await app.inject({ method: 'POST', url: '/api/v1/newsletter/subscribe', payload: { email: 'second-reader@example.test' } });
    const blocked = await app.inject({ method: 'POST', url: '/api/v1/newsletter/subscribe', payload: { email: 'blockedperson+x@gmail.com' } });
    expect(ok.statusCode).toBe(200);
    expect(blocked.statusCode).toBe(200);
    expect(blocked.json()).toEqual(ok.json());
  });

  it('a bulk sync leaves out an address added to the list after it signed up', async () => {
    await pool.query(
      "INSERT INTO newsletter_subscribers (email, status) VALUES ('late-blocked@example.test', 'active') ON CONFLICT (email) DO NOTHING"
    );
    const previous = process.env.MAIL_DO_NOT_CONTACT;
    process.env.MAIL_DO_NOT_CONTACT = `${previous}, late-blocked@example.test`;
    try {
      pushed.length = 0;
      await getNewsletterService().syncToProviders();
    } finally {
      process.env.MAIL_DO_NOT_CONTACT = previous;
    }
    expect(pushed).toContain('reader@example.test');
    expect(pushed).not.toContain('late-blocked@example.test');
  });
});

describe('the production compose file passes the mail settings to the API', () => {
  it('forwards every setting the footer and the unsubscribe link read', () => {
    const compose = parseYaml(readFileSync(resolve(REPO_ROOT, 'deploy/docker-compose.yml'), 'utf8'));
    const env: string[] = compose.services.api.environment;
    const names = env.map((entry) => entry.split('=')[0]);
    for (const name of ['FRONTEND_URL', 'MAIL_PUBLIC_URL', 'MAIL_OPERATOR_NAME', 'MAIL_POSTAL_ADDRESS', 'MAIL_PRODUCT_NAME', 'SUPPORT_EMAIL', 'MAIL_DO_NOT_CONTACT']) {
      expect(names, name).toContain(name);
    }
  });

  it('an empty operator or postal setting falls back to the stated address', async () => {
    const env = { MAIL_OPERATOR_NAME: process.env.MAIL_OPERATOR_NAME, MAIL_POSTAL_ADDRESS: process.env.MAIL_POSTAL_ADDRESS };
    process.env.MAIL_OPERATOR_NAME = '';
    process.env.MAIL_POSTAL_ADDRESS = '';
    const to = 'empty-postal@example.test';
    try {
      await helpers.sendTrialEndingEmail(app, userId, to, 'Ada', 3, new Date(), 5);
      const mail = await waitForMail(to);
      expect(mail.html).toContain(POSTAL_LINE);
    } finally {
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
