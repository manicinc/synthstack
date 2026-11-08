/**
 * @file routes/email-unsubscribe.ts
 * @description The page every mail's Unsubscribe link and List-Unsubscribe
 * header open: /api/v1/email/unsubscribe/:token.
 *
 * GET shows the choice and changes nothing, so a link scanner opening the
 * link stops nothing. POST suppresses at once. A mailbox provider's
 * one-click POST (List-Unsubscribe=One-Click, RFC 8058) carries no scope:
 * it stops the mail's own optional category, or every optional mail when
 * the link came in required mail. No mail is sent about an unsubscribe.
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  MAIL_CATEGORIES,
  MAIL_CATEGORY_NAMES,
  OPTIONAL_CATEGORIES,
  UnsubscribeStore,
  escapeHtml,
  mailSettings,
  operatorLine,
  type MailCategory,
  type MailSettings,
  type SuppressionScope,
} from '../services/email/unsubscribe.js';

interface TokenParams {
  token: string;
}

const optionalList = () => OPTIONAL_CATEGORIES.map((c) => MAIL_CATEGORIES[c].label).join(', ');

const requiredList = () =>
  MAIL_CATEGORY_NAMES.filter((c) => MAIL_CATEGORIES[c].required)
    .map((c) => MAIL_CATEGORIES[c].stillComes)
    .join(' ');

function sendPage(reply: FastifyReply, status: number, title: string, body: string): FastifyReply {
  const settings = mailSettings();
  const operator = operatorLine(settings);
  return reply
    .code(status)
    .header('content-type', 'text/html; charset=utf-8')
    .header('cache-control', 'no-store')
    .header('x-robots-tag', 'noindex')
    .header('referrer-policy', 'no-referrer')
    .send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} | ${escapeHtml(settings.productName)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: #f6f7fb; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.55; }
  main { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
  h1 { font-size: 24px; line-height: 1.25; margin: 0 0 12px; }
  p { margin: 0 0 14px; }
  form { margin: 0 0 12px; }
  button { display: block; width: 100%; min-height: 48px; padding: 12px 16px; border-radius: 10px; border: 1px solid #4338ca; background: #4338ca; color: #ffffff; font-size: 16px; font-weight: 600; cursor: pointer; }
  button.secondary { background: #ffffff; color: #4338ca; }
  .muted { color: #4b5563; font-size: 15px; }
  a { color: #4338ca; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d0d0d; color: #f3f4f6; }
    .card { background: #18181b; border-color: #27272a; }
    .muted { color: #d1d5db; }
    a { color: #a5b4fc; }
    button { background: #6366f1; border-color: #6366f1; }
    button.secondary { background: transparent; color: #c7d2fe; }
  }
</style>
</head>
<body>
<main>
<div class="card">
${body}
</div>
${operator ? `<p class="muted" style="margin-top:16px;text-align:center;">${escapeHtml(operator)}</p>` : ''}
</main>
</body>
</html>`);
}

function deleteAccount(settings: MailSettings): string {
  return (
    `<p class="muted"><strong>Delete account.</strong> To delete your account and the data it holds, ` +
    `see <a href="${escapeHtml(settings.frontendUrl)}/gdpr">your data rights</a> or write to ` +
    `<a href="mailto:${escapeHtml(settings.supportEmail)}">${escapeHtml(settings.supportEmail)}</a>.</p>`
  );
}

function turnOffAllOptional(primary: boolean): string {
  return (
    `<form method="post"><button${primary ? '' : ' class="secondary"'} type="submit" name="scope" value="optional">` +
    `Turn off all optional email</button></form>`
  );
}

function choicePage(category: MailCategory, settings: MailSettings): { title: string; body: string } {
  const info = MAIL_CATEGORIES[category];
  const product = escapeHtml(settings.productName);

  if (info.required) {
    return {
      title: 'Email preferences',
      body:
        `<h1>Email preferences</h1>` +
        `<p>This link came in one of your ${escapeHtml(info.label)} from ${product}. ` +
        `${escapeHtml(info.stillComes ?? '')} Unsubscribing does not stop them.</p>` +
        `<p>You can turn off every optional email: ${escapeHtml(optionalList())}.</p>` +
        turnOffAllOptional(true) +
        `<p class="muted">What still comes: ${escapeHtml(requiredList())}</p>` +
        deleteAccount(settings),
    };
  }

  return {
    title: 'Unsubscribe',
    body:
      `<h1>Unsubscribe</h1>` +
      `<p>Stop ${escapeHtml(info.label)} from ${product} to the address this email went to?</p>` +
      `<form method="post"><button type="submit" name="scope" value="${escapeHtml(category)}">` +
      `Unsubscribe from ${escapeHtml(info.label)}</button></form>` +
      turnOffAllOptional(false) +
      `<p class="muted">Optional email: ${escapeHtml(optionalList())}.</p>` +
      `<p class="muted">What still comes: ${escapeHtml(requiredList())}</p>` +
      deleteAccount(settings),
  };
}

function donePage(scope: SuppressionScope, settings: MailSettings): { title: string; body: string } {
  const product = escapeHtml(settings.productName);
  if (scope === 'optional' || scope === 'all') {
    return {
      title: 'Optional email is off',
      body:
        `<h1>Optional email is off</h1>` +
        `<p>${product} will send no optional email to this address: ${escapeHtml(optionalList())}.</p>` +
        `<p class="muted">What still comes: ${escapeHtml(requiredList())}</p>` +
        deleteAccount(settings),
    };
  }
  const label = escapeHtml(MAIL_CATEGORIES[scope].label);
  return {
    title: 'Unsubscribed',
    body:
      `<h1>Unsubscribed</h1>` +
      `<p>${product} will send no more ${label} to this address.</p>` +
      turnOffAllOptional(false) +
      `<p class="muted">What still comes: ${escapeHtml(requiredList())}</p>` +
      deleteAccount(settings),
  };
}

const NOT_FOUND_BODY =
  '<h1>This link does not work</h1>' +
  '<p>Use the Unsubscribe link in the email itself. It may have been copied in part.</p>';

const STORE_DOWN_BODY =
  '<h1>Nothing was changed</h1>' +
  '<p>Your choice could not be saved just now. Please open the link again in a few minutes.</p>';

/** The scope a form sent, or undefined for a one-click POST (no scope field). */
function requestedScope(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'scope' in body) {
    const value = (body as Record<string, unknown>).scope;
    return typeof value === 'string' ? value : '';
  }
  return undefined;
}

export default async function emailUnsubscribeRoutes(fastify: FastifyInstance) {
  const store = new UnsubscribeStore({
    query: (text: string, values?: unknown[]) => fastify.pg.query(text, values as any[]),
  });

  // Form posts and one-click posts are form encoded. Any other body is read
  // as a one-click POST, so a provider's multipart POST works too.
  if (!fastify.hasContentTypeParser('application/x-www-form-urlencoded')) {
    fastify.addContentTypeParser(
      'application/x-www-form-urlencoded',
      { parseAs: 'string', bodyLimit: 4096 },
      (_request, body, done) => {
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      }
    );
  }
  if (!fastify.hasContentTypeParser('*')) {
    fastify.addContentTypeParser('*', { parseAs: 'string', bodyLimit: 65536 }, (_request, _body, done) => {
      done(null, null);
    });
  }

  fastify.get<{ Params: TokenParams }>('/email/unsubscribe/:token', {
    schema: { tags: ['Email'], summary: 'Unsubscribe page (asks; changes nothing)' },
  }, async (request, reply) => {
    let found;
    try {
      found = await store.findToken(request.params.token);
    } catch (error) {
      request.log.error({ error }, 'Unsubscribe page: token lookup failed');
      return sendPage(reply, 500, 'Nothing was changed', STORE_DOWN_BODY);
    }
    if (!found) return sendPage(reply, 404, 'Link not found', NOT_FOUND_BODY);

    const page = choicePage(found.category, mailSettings());
    return sendPage(reply, 200, page.title, page.body);
  });

  fastify.post<{ Params: TokenParams }>('/email/unsubscribe/:token', {
    schema: { tags: ['Email'], summary: 'Unsubscribe (one-click or form); suppresses at once' },
  }, async (request, reply) => {
    let found;
    try {
      found = await store.findToken(request.params.token);
    } catch (error) {
      request.log.error({ error }, 'Unsubscribe: token lookup failed');
      return sendPage(reply, 500, 'Nothing was changed', STORE_DOWN_BODY);
    }
    if (!found) return sendPage(reply, 404, 'Link not found', NOT_FOUND_BODY);

    const info = MAIL_CATEGORIES[found.category];
    const requested = requestedScope(request.body);
    let scope: SuppressionScope;
    if (requested === undefined) {
      scope = info.required ? 'optional' : found.category;
    } else if (requested === 'optional') {
      scope = 'optional';
    } else if (requested === found.category && !info.required) {
      scope = found.category;
    } else {
      request.log.warn({ category: found.category }, 'Unsubscribe refused: scope does not match the link');
      return sendPage(
        reply,
        400,
        'Nothing was changed',
        '<h1>Nothing was changed</h1><p>That choice does not match this link. Go back and pick one of the buttons.</p>'
      );
    }

    try {
      await store.suppress(found.addressHash, scope, requested === undefined ? 'one_click' : 'page');
    } catch (error) {
      request.log.error({ error }, 'Unsubscribe: suppression not saved');
      return sendPage(reply, 500, 'Nothing was changed', STORE_DOWN_BODY);
    }

    request.log.info({ scope, oneClick: requested === undefined }, 'Unsubscribe recorded');
    const page = donePage(scope, mailSettings());
    return sendPage(reply, 200, page.title, page.body);
  });
}
