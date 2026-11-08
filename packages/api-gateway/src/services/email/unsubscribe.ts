/**
 * @file services/email/unsubscribe.ts
 * @description Mail categories, unsubscribe tokens, suppressions and the
 * footer every mail carries.
 *
 * Every mail has a category. Required categories (security, receipts,
 * billing, account notices) still go after an unsubscribe; optional ones
 * stop. Each send gets a fresh token; only its SHA-256 is stored, with the
 * SHA-256 of the recipient's canonical address. The footer carries a
 * visible Unsubscribe link, the operator's postal address, and the mail
 * gets List-Unsubscribe and List-Unsubscribe-Post (RFC 8058).
 */

import { createHash, randomBytes } from 'crypto';
import { config } from '../../config/index.js';
import { escapeHtml } from './escape.js';

export { escapeHtml };

// ============================================
// CATEGORIES
// ============================================

export const MAIL_CATEGORY_NAMES = [
  'security',
  'receipts',
  'billing',
  'account_notices',
  'onboarding',
  'usage_alerts',
  'trial_reminders',
  'summaries',
  'invitations',
  'staff_alerts',
] as const;

export type MailCategory = (typeof MAIL_CATEGORY_NAMES)[number];

export interface MailCategoryInfo {
  /** Required mail still goes after an unsubscribe (only an operator stop ends it). */
  required: boolean;
  /** Commercial mail: carries offers, so it must carry the postal address. */
  commercial: boolean;
  /** Plural name used on the unsubscribe page ("usage alerts"). */
  label: string;
  /** Footer line saying why the person got the mail. `{product}` is replaced. */
  why: string;
  /** For required mail: when it comes, shown on the preferences page. */
  stillComes?: string;
}

export const MAIL_CATEGORIES: Record<MailCategory, MailCategoryInfo> = {
  security: {
    required: true,
    commercial: false,
    label: 'security emails',
    why: 'You got this security email because someone asked for it for your {product} account.',
    stillComes: 'Security emails (email checks, password resets and sign-in links) come only when someone asks for one.',
  },
  receipts: {
    required: true,
    commercial: false,
    label: 'receipts',
    why: 'You got this receipt because of a purchase on your {product} account.',
    stillComes: 'Receipts come only when you pay for something.',
  },
  billing: {
    required: true,
    commercial: false,
    label: 'billing notices',
    why: 'You got this billing notice because something changed on your {product} plan.',
    stillComes: 'Billing notices come only when a payment fails or your plan changes.',
  },
  account_notices: {
    required: true,
    commercial: false,
    label: 'account notices',
    why: 'You got this notice because of an action taken on your {product} account.',
    stillComes: 'Account notices come only when an action is taken on your account or your content.',
  },
  onboarding: {
    required: false,
    commercial: false,
    label: 'welcome emails',
    why: 'You got this because welcome emails are on for your {product} account.',
  },
  usage_alerts: {
    required: false,
    commercial: true,
    label: 'usage alerts',
    why: 'You got this because usage alerts are on for your {product} account.',
  },
  trial_reminders: {
    required: false,
    commercial: true,
    label: 'trial reminders',
    why: 'You got this because trial reminders are on for your {product} account.',
  },
  summaries: {
    required: false,
    commercial: false,
    label: 'activity summaries',
    why: 'You got this because activity summaries are on for your {product} account.',
  },
  invitations: {
    required: false,
    commercial: false,
    label: 'project invitations',
    why: 'You got this because someone on {product} invited this address to a project.',
  },
  staff_alerts: {
    required: false,
    commercial: false,
    label: 'staff alerts',
    why: 'You got this because this address receives {product} staff alerts.',
  },
};

export function isMailCategory(value: unknown): value is MailCategory {
  return typeof value === 'string' && (MAIL_CATEGORY_NAMES as readonly string[]).includes(value);
}

export const OPTIONAL_CATEGORIES = MAIL_CATEGORY_NAMES.filter((c) => !MAIL_CATEGORIES[c].required);

/** Database template slug -> category. */
const TEMPLATE_CATEGORIES: Record<string, MailCategory> = {
  'welcome': 'onboarding',
  'email-verification': 'security',
  'password-reset': 'security',
  'subscription-confirmed': 'receipts',
  'payment-receipt': 'receipts',
  'credit-purchased': 'receipts',
  'lifetime-welcome': 'receipts',
  'lifetime-invitation-sent': 'receipts',
  'lifetime-access-granted': 'receipts',
  'payment-failed': 'billing',
  'subscription-canceled': 'billing',
  'moderation-action': 'account_notices',
  'trial-ending': 'trial_reminders',
  'credit-low': 'usage_alerts',
  'demo-credit-low': 'usage_alerts',
  'generation-complete': 'usage_alerts',
  'weekly-summary': 'summaries',
  'team-invitation': 'invitations',
  'admin-report': 'staff_alerts',
};

/** Reference types of mails sent without a database template -> category. */
const REFERENCE_CATEGORIES: Record<string, MailCategory> = {
  auth_password_reset: 'security',
  auth_email_verification: 'security',
  auth_magic_link: 'security',
  auth_welcome: 'onboarding',
  lifetime_license_welcome: 'receipts',
  lifetime_license_invitation: 'receipts',
  lifetime_license_access_granted: 'receipts',
};

/**
 * The category of a mail: the explicit one, else its template's, else its
 * reference type's. Null when none is known; such a mail is not sent.
 */
export function resolveCategory(options: {
  category?: string | null;
  templateSlug?: string | null;
  referenceType?: string | null;
}): MailCategory | null {
  if (options.category != null) {
    return isMailCategory(options.category) ? options.category : null;
  }
  // Built-in templates have a fixed category; any other template needs an
  // explicit one (a reference type alone does not say what a custom template is).
  if (options.templateSlug && TEMPLATE_CATEGORIES[options.templateSlug]) {
    return TEMPLATE_CATEGORIES[options.templateSlug];
  }
  if (!options.templateSlug && options.referenceType && REFERENCE_CATEGORIES[options.referenceType]) {
    return REFERENCE_CATEGORIES[options.referenceType];
  }
  return null;
}

/** The suppression scopes that stop a mail of this category. */
export function suppressionScopes(category: MailCategory): string[] {
  return MAIL_CATEGORIES[category].required ? ['all'] : ['all', 'optional', category];
}

// ============================================
// ADDRESSES AND HASHES
// ============================================

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * One spelling per mailbox: lower case, display name and +tag dropped,
 * and for Gmail the dots too (googlemail.com is gmail.com).
 */
export function canonicalAddress(input: string): string {
  let address = String(input ?? '').trim();
  const angle = address.match(/<([^<>]+)>\s*$/);
  if (angle) address = angle[1];
  address = address.trim().toLowerCase();

  const at = address.lastIndexOf('@');
  if (at <= 0) return address;

  let local = address.slice(0, at);
  let domain = address.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export function addressHash(address: string): string {
  return sha256Hex(canonicalAddress(address));
}

// ============================================
// DO-NOT-CONTACT
// ============================================

/**
 * MAIL_DO_NOT_CONTACT: addresses (or `sha256:<hex>` of a canonical address),
 * separated by commas, semicolons or white space. They get no mail at all,
 * required mail included, and are never added to the newsletter.
 */
export function doNotContactHashes(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const hashes = new Set<string>();
  for (const entry of (env.MAIL_DO_NOT_CONTACT ?? '').split(/[\s,;]+/)) {
    const value = entry.trim();
    if (!value || (!value.includes('@') && !value.toLowerCase().startsWith('sha256:'))) continue;
    const hashed = value.match(/^sha256:([0-9a-f]{64})$/i);
    hashes.add(hashed ? hashed[1].toLowerCase() : addressHash(value));
  }
  return hashes;
}

export function isDoNotContact(address: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!address) return false;
  return doNotContactHashes(env).has(addressHash(address));
}

// ============================================
// SETTINGS
// ============================================

export interface MailSettings {
  /** Public base URL of this API; links go to <base>/api/v1/email/unsubscribe/<token>. */
  publicBaseUrl: string;
  productName: string;
  operatorName: string;
  postalAddress: string;
  supportEmail: string;
  frontendUrl: string;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/** Read at each send, so a deploy can change them without a code change. */
export function mailSettings(env: NodeJS.ProcessEnv = process.env): MailSettings {
  return {
    publicBaseUrl: trimSlash(env.MAIL_PUBLIC_URL || env.API_URL || 'http://localhost:3003'),
    productName: env.MAIL_PRODUCT_NAME || config.smtp.fromName || 'SynthStack',
    // Empty counts as unset: a compose file passes unset variables as ''.
    operatorName: env.MAIL_OPERATOR_NAME || 'Manic Agency LLC',
    postalAddress: env.MAIL_POSTAL_ADDRESS || '2831 St Rose Parkway, Suite 200, Henderson, NV 89052',
    supportEmail: env.SUPPORT_EMAIL || 'team@manic.agency',
    frontendUrl: trimSlash(config.frontendUrl || 'http://localhost:3050'),
  };
}

/** Why links cannot be built from these settings, or null when they can. */
export function unsubscribeUrlProblem(
  settings: MailSettings,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  let url: URL;
  try {
    url = new URL(settings.publicBaseUrl);
  } catch {
    return 'MAIL_PUBLIC_URL is not a URL';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'MAIL_PUBLIC_URL must be an http or https URL';
  }
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    return 'MAIL_PUBLIC_URL must be https in production';
  }
  return null;
}

export function unsubscribeUrl(settings: MailSettings, token: string): string {
  return `${settings.publicBaseUrl}/api/v1/email/unsubscribe/${token}`;
}

export function listUnsubscribeHeaders(url: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ============================================
// FOOTER
// ============================================

/**
 * Templates that print their own unsubscribe link get this placeholder as
 * `unsubscribeUrl`; the sender replaces it with the mail's own link.
 */
export const UNSUBSCRIBE_URL_PLACEHOLDER = '__UNSUBSCRIBE_URL__';


export function operatorLine(settings: MailSettings): string {
  return [settings.operatorName, settings.postalAddress].filter((part) => part && part.trim()).join(', ');
}

export function renderFooter(
  category: MailCategory,
  url: string,
  settings: MailSettings
): { html: string; text: string } {
  const why = MAIL_CATEGORIES[category].why.replace('{product}', settings.productName);
  const operator = operatorLine(settings);
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const html =
    `<div style="max-width:600px;margin:24px auto 0;padding:16px 20px;border-top:1px solid #e5e7eb;` +
    `font-family:${font};font-size:14px;line-height:1.5;color:#4b5563;text-align:center;">` +
    `<p style="margin:0 0 8px;font-size:14px;color:#4b5563;">${escapeHtml(why)}</p>` +
    `<p style="margin:0 0 8px;font-size:14px;"><a href="${escapeHtml(url)}" ` +
    `style="color:#4338ca;text-decoration:underline;font-size:14px;">Unsubscribe</a></p>` +
    (operator ? `<p style="margin:0;font-size:13px;color:#4b5563;">${escapeHtml(operator)}</p>` : '') +
    `</div>`;

  const text = ['--', why, `Unsubscribe: ${url}`, operator].filter(Boolean).join('\n');
  return { html, text };
}

/** An HTML body for a mail queued with text only. */
export function htmlFromText(text: string): string {
  return (
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
    `font-size:16px;line-height:1.55;color:#111827;">${escapeHtml(text).replace(/\r?\n/g, '<br>')}</div>`
  );
}

/** A plain-text part for a mail queued with HTML only. */
export function textFromHtml(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol)>/gi, '\n')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, i, lines) => line !== '' || (i > 0 && lines[i - 1] !== ''))
    .join('\n')
    .trim();
}

/**
 * Put the footer before the last </body> when the mail has one, else at the
 * end. A text part is made from the HTML when the mail has none.
 */
export function appendFooter(
  html: string | null | undefined,
  text: string | null | undefined,
  footer: { html: string; text: string }
): { html: string; text: string } {
  const source = html ?? '';
  // Search the original string: lower-casing can change its length.
  let close = -1;
  for (const match of source.matchAll(/<\/body\s*>/gi)) close = match.index ?? close;
  const withFooter =
    close >= 0 ? `${source.slice(0, close)}${footer.html}${source.slice(close)}` : `${source}${footer.html}`;
  const baseText = text && text.trim() ? text : textFromHtml(source);
  return { html: withFooter, text: `${baseText.replace(/\s+$/, '')}\n\n${footer.text}\n` };
}

export function fillUnsubscribeUrl<T extends string | null | undefined>(body: T, url: string): T {
  if (typeof body !== 'string') return body;
  return body.split(UNSUBSCRIBE_URL_PLACEHOLDER).join(url) as T;
}

// ============================================
// STORE
// ============================================

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: R[]; rowCount?: number | null }>;
}

export type SuppressionScope = MailCategory | 'optional' | 'all';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class UnsubscribeStore {
  constructor(private readonly db: Queryable) {}

  async isSuppressed(address: string, category: MailCategory): Promise<boolean> {
    const result = await this.db.query<{ one: number }>(
      'SELECT 1 AS one FROM email_suppressions WHERE address_hash = $1 AND scope = ANY($2::text[]) LIMIT 1',
      [addressHash(address), suppressionScopes(category)]
    );
    return result.rows.length > 0;
  }

  /** A fresh 256-bit token for one mail; only its hash is stored. */
  async issueToken(address: string, category: MailCategory): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.query(
      'INSERT INTO email_unsubscribe_tokens (token_hash, address_hash, category) VALUES ($1, $2, $3)',
      [sha256Hex(token), addressHash(address), category]
    );
    return token;
  }

  async findToken(token: string): Promise<{ addressHash: string; category: MailCategory } | null> {
    if (!TOKEN_PATTERN.test(token)) return null;
    const result = await this.db.query<{ address_hash: string; category: string }>(
      'SELECT address_hash, category FROM email_unsubscribe_tokens WHERE token_hash = $1',
      [sha256Hex(token)]
    );
    const row = result.rows[0];
    if (!row || !isMailCategory(row.category)) return null;
    return { addressHash: row.address_hash, category: row.category };
  }

  /**
   * Remove token rows older than `days`. Their links stop working (404 page);
   * the default retention keeps every link working for over a year.
   */
  async pruneTokens(days: number): Promise<number> {
    const result = await this.db.query(
      "DELETE FROM email_unsubscribe_tokens WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')",
      [Math.max(30, Math.floor(days))]
    );
    return result.rowCount ?? 0;
  }

  async suppress(addressHashValue: string, scope: SuppressionScope, source: string): Promise<void> {
    await this.db.query(
      `INSERT INTO email_suppressions (address_hash, scope, source) VALUES ($1, $2, $3)
       ON CONFLICT (address_hash, scope) DO NOTHING`,
      [addressHashValue, scope, source]
    );
  }
}
