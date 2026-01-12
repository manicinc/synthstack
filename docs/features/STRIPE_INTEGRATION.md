# Stripe Integration Plan for Printverse

## Overview

This document outlines the comprehensive plan for integrating Stripe payments with Printverse, including user authentication via Supabase, subscription management, and credit-based usage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Vue/Quasar)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Auth Flow    │  Subscription Flow  │  Credit Flow  │  Community    │
│  - Supabase   │  - Pricing Page     │  - Usage      │  - Uploads    │
│  - OAuth      │  - Checkout         │  - Purchase   │  - Moderation │
└───────┬───────┴─────────┬───────────┴───────┬───────┴───────────────┘
        │                 │                   │
        ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                             │
├─────────────────────────────────────────────────────────────────────┤
│  /auth/*      │  /subscriptions/*   │  /credits/*   │  /community/* │
│  - Login      │  - Create checkout  │  - Use        │  - Upload     │
│  - Register   │  - Webhook handler  │  - Purchase   │  - Moderate   │
│  - OAuth CB   │  - Portal session   │  - Balance    │  - Reports    │
└───────┬───────┴─────────┬───────────┴───────┬───────┴───────────────┘
        │                 │                   │
        ▼                 ▼                   ▼
┌───────────────┐ ┌───────────────┐ ┌─────────────────────────────────┐
│   Supabase    │ │    Stripe     │ │           PostgreSQL            │
│  - Auth       │ │  - Checkout   │ │  - Users                        │
│  - OAuth      │ │  - Webhooks   │ │  - Subscriptions                │
│  - Sessions   │ │  - Portal     │ │  - Credits                      │
└───────────────┘ │  - Invoices   │ │  - Community uploads            │
                  └───────────────┘ │  - Moderation logs              │
                                    └─────────────────────────────────┘
```

## 1. Stripe Account Setup

### Products & Prices to Create in Stripe Dashboard

Current API env vars and tiers:

| Tier | Env Var | Example Price ID | Credits/Day | Price |
|------|---------|------------------|-------------|-------|
| Free | - | - | 10 | $0 |
| Maker | `STRIPE_PRICE_MAKER` | price_1SmoJoCBrYnyjAOOrEyKLXgz | 30 | $12.99/mo ($116.91/yr) |
| Pro | `STRIPE_PRICE_PRO` | price_1SmoyiCBrYnyjAOOTZbX7tpl | 100 | $24.99/mo ($224.91/yr) |
| Agency | `STRIPE_PRICE_AGENCY` | price_1Smp4ZCBrYnyjAOOlCWqbRrs | 500 | $39.99/mo ($359.91/yr) |

### Required Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs - Monthly (used by API Gateway)
STRIPE_PRICE_MAKER=price_1SmoJoCBrYnyjAOOrEyKLXgz
STRIPE_PRICE_PRO=price_1SmoyiCBrYnyjAOOTZbX7tpl
STRIPE_PRICE_AGENCY=price_1Smp4ZCBrYnyjAOOlCWqbRrs

# Stripe Price IDs - Yearly (25% discount)
STRIPE_PRICE_MAKER_YEARLY=price_1SmorLCBrYnyjAOObE3vITjH
STRIPE_PRICE_PRO_YEARLY=price_1SmozfCBrYnyjAOOFVksu8TN
STRIPE_PRICE_AGENCY_YEARLY=price_1Smp9NCBrYnyjAOOnSZQW843

# Lifetime License (one-time purchase with GitHub repo access)
STRIPE_PRICE_LIFETIME=price_1SmmNGCBrYnyjAOOjpcxHmRG
STRIPE_PROMO_EARLYSYNTH=EARLYSYNTH

# GitHub Organization Management (for lifetime license buyers)
GITHUB_ORG_NAME=manicinc
GH_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # PAT with admin:org + repo scopes
GITHUB_TEAM_SLUG=synthstack-pro
GITHUB_PRO_REPO=manicinc/synthstack-pro

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 2. User Authentication Flow

### Supabase Auth Integration

1. **Sign Up** → Create user in Supabase → Create user row in PostgreSQL → Set default tier
2. **Sign In** → Supabase session → Fetch user profile + subscription from PostgreSQL
3. **OAuth** (Google/GitHub) → Supabase handles → Create/fetch user profile

### User Table Sync

```sql
-- Trigger to sync Supabase auth.users to our users table
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, subscription_tier, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'free',
    10
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. Subscription Flow

### Checkout Session Creation

```typescript
// POST /api/v1/subscriptions/checkout
async function createCheckout(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/app?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/pricing`,
    metadata: { userId, priceId },
    subscription_data: {
      metadata: { userId },
      trial_period_days: 3, // ← Free trial before first charge
    },
  });
  return session.url;
}
```

### Trial Period Configuration

> **Important**: Trial periods are configured in code, NOT in the Stripe Dashboard.

| Setting | Location | Default | Notes |
|---------|----------|---------|-------|
| `trialDays` | `billing.ts` line 335 | 3 days | Passed to Stripe at checkout |
| Trial ending email | `customer.subscription.trial_will_end` webhook | 3 days before end | Sends reminder email |

To change the trial period:

```typescript
// packages/api-gateway/src/routes/billing.ts
const session = await stripeService.createCheckoutSession({
  userId,
  email,
  tier: tier as SubscriptionTier,
  isYearly,
  promoCode,
  trialDays: 3, // ← Change this value (0 to disable trials)
});
```

**How trials work:**
1. Customer subscribes → Card is validated but NOT charged
2. Subscription status = `trialing` for the trial period
3. After trial ends → Stripe automatically charges the card
4. Subscription status = `active`

**Trial behaviors:**
- No payment collected during trial (card is authorized only)
- User has full access to paid features during trial
- `customer.subscription.trial_will_end` webhook fires 3 days before end
- If payment fails after trial, status becomes `past_due`
```

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription, update user tier, add credits |
| `customer.subscription.updated` | Update tier if plan changed |
| `customer.subscription.deleted` | Downgrade to free tier, reset credits |
| `invoice.payment_succeeded` | Reset monthly credits, log transaction |
| `invoice.payment_failed` | Mark subscription as past_due, send email |
| `customer.subscription.trial_will_end` | (Optional) notify user of trial ending |

### Customer Portal

```typescript
// POST /api/v1/subscriptions/portal
async function createPortalSession(userId: string) {
  const user = await getUser(userId);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${FRONTEND_URL}/app/subscription`,
  });
  return session.url;
}
```

## 4. Credit System

### Credit Allocation by Tier

| Tier | Credits/Day | Max File Size | AI Model |
|------|-------------|---------------|----------|
| Free (Public) | 5 | 25 MB | Premium |
| Free (Private) | 3 | 10 MB | Basic |
| Maker | 50 | 100 MB | Advanced |
| Pro | 200 | 500 MB | Premium |
| Agency | Unlimited | 1 GB | Premium |

### Credit Operations

```typescript
// Deduct credit for generation
async function useCredit(userId: string, amount: number = 1) {
  // Check balance
  const user = await getUser(userId);
  
  // Check daily reset
  if (new Date() > user.credits_reset_at) {
    await resetDailyCredits(userId);
  }
  
  if (user.credits_remaining < amount) {
    throw new InsufficientCreditsError();
  }
  
  // Deduct and log
  await db.query(`
    UPDATE users SET credits_remaining = credits_remaining - $1, lifetime_credits_used = lifetime_credits_used + $1
    WHERE id = $2
  `, [amount, userId]);
  
  await logCreditTransaction(userId, -amount, 'generation');
}
```

## 5. Community Moderation (Directus Admin)

### Directus Collections

Directus automatically creates an admin UI for these tables:
- `users` - View/edit users, subscription status, ban users
- `uploaded_models` - View uploads, approve/reject, flag content
- `community_model_metadata` - Edit model details
- `comments` - Moderate comments, hide/delete
- `moderation_reports` - Review and resolve reports
- `moderation_log` - Audit trail of all actions
- `creator_profiles` - Verify creators, edit profiles

### Admin Roles in Directus

1. **Admin** - Full access to everything
2. **Moderator** - Can moderate content, resolve reports, but cannot edit users
3. **Support** - Can view users and content, but cannot take action

### Moderation Workflow

1. Content flagged by AI or user report
2. Appears in `moderation_reports` (status: pending)
3. Moderator reviews in Directus
4. Takes action: approve, remove, warn, ban
5. Action logged in `moderation_log`

## 6. Implementation Checklist

### Backend (API Gateway)

- [ ] Install Stripe SDK: `pnpm add stripe`
- [ ] Create `/subscriptions/checkout` endpoint
- [ ] Create `/subscriptions/webhook` endpoint
- [ ] Create `/subscriptions/portal` endpoint
- [ ] Create `/subscriptions/current` endpoint
- [ ] Implement credit deduction middleware
- [ ] Add daily credit reset cron job
- [ ] Set up Supabase JWT verification
- [ ] Create user sync trigger

### Frontend

- [ ] Install Stripe.js: `pnpm add @stripe/stripe-js`
- [ ] Update PricingPage with Stripe checkout buttons
- [ ] Add subscription management in AccountPage
- [ ] Show credit balance in app header
- [ ] Handle successful subscription redirect
- [ ] Add "Manage Subscription" button (Portal)

### Stripe Dashboard

- [ ] Create Products (Basic, Pro, Enterprise)
- [ ] Create Prices (monthly + yearly for each)
- [ ] Configure Customer Portal
- [ ] Set up Webhook endpoint
- [ ] Enable test mode for development

### Directus

- [ ] Configure collections permissions
- [ ] Create Admin role
- [ ] Create Moderator role
- [ ] Set up webhook for report notifications
- [ ] Configure email templates

## 7. Testing

### Test Cards

| Scenario | Card Number |
|----------|-------------|
| Success | 4242 4242 4242 4242 |
| Decline | 4000 0000 0000 0002 |
| Requires Auth | 4000 0025 0000 3155 |
| Insufficient Funds | 4000 0000 0000 9995 |

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3003/api/v1/subscriptions/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Test Mode Guidance
- Use Stripe test keys and test price IDs (prefix `price_`).
- Point Stripe webhook to dev API: `http://localhost:3003/api/v1/webhooks/stripe`.
- Stripe CLI forwarding: `stripe listen --forward-to localhost:3003/api/v1/webhooks/stripe`.
- For portal sessions, set `return_url` to your local app (e.g., `http://localhost:3050/app/subscription`).

## 8. Security Considerations

1. **Webhook Signature Verification** - Always verify `stripe-signature` header
2. **Idempotency** - Handle duplicate webhook events gracefully
3. **User Verification** - Verify user owns the subscription being modified
4. **Rate Limiting** - Limit checkout creation to prevent abuse
5. **Credit Validation** - Always check credits before expensive operations

## 9. Monitoring & Alerts

Set up alerts for:
- Failed webhook deliveries
- High rate of failed payments
- Unusual credit usage patterns
- Moderation queue backlog
- User reports spike

## 10. Future Enhancements

- [ ] Usage-based billing for API access
- [ ] Team/organization subscriptions
- [ ] Annual plan discounts
- [ ] Referral credits
- [ ] Creator revenue sharing
- [ ] Tip jar for creators

## 11. Lifetime License Checkout & GitHub Access

### Overview

SynthStack supports one-time lifetime license purchases with automatic GitHub repository access provisioning. When a customer purchases a lifetime license, they receive:

1. Welcome email with GitHub username submission link
2. Automated GitHub organization invitation
3. Read access to the private `manicinc/synthstack-pro` repository
4. Lifetime updates via `git pull origin main`

### Architecture

```
Purchase → Stripe Checkout → Webhook → License Record Created
                                           ↓
                              Welcome Email with Access Link
                                           ↓
Customer Submits GitHub Username → Validates via GitHub API
                                           ↓
                        GitHub Org Invitation Sent → Invitation Email
                                           ↓
                  Customer Accepts Invite → Access Granted Email
                                           ↓
                   Customer Clones Repo & Starts Building 🚀
```

### Database Schema

```sql
-- Created via migration: services/directus/migrations/122_lifetime_license_github_access.sql
CREATE TABLE lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Purchase info
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  amount_paid_cents INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- GitHub access
  github_username VARCHAR(100),
  github_username_submitted_at TIMESTAMPTZ,
  github_invitation_sent_at TIMESTAMPTZ,
  github_invitation_accepted_at TIMESTAMPTZ,
  github_access_status VARCHAR(50) DEFAULT 'pending'
    CHECK (github_access_status IN ('pending', 'username_submitted', 'invited', 'active', 'revoked')),

  -- Onboarding
  welcome_email_sent_at TIMESTAMPTZ,
  access_email_sent_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Implementation

#### 1. Checkout Session Creation

```typescript
// POST /api/v1/billing/lifetime-checkout
async function createLifetimeLicenseCheckout(promoCode?: string) {
  let priceId = process.env.STRIPE_PRICE_LIFETIME!;

  // Apply promo code for early bird pricing
  const promotionCode = promoCode === 'EARLYSYNTH'
    ? await getStripePromotionCode('EARLYSYNTH')
    : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment', // One-time payment, not subscription
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/?license=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/?license=cancelled`,
    metadata: {
      type: 'lifetime_license', // Critical for webhook routing
    },
    ...(promotionCode && { discounts: [{ promotion_code: promotionCode.id }] }),
  });

  return session.url;
}
```

#### 2. Webhook Processing

When `checkout.session.completed` fires with `metadata.type === 'lifetime_license'`:

```typescript
// In stripe-webhooks.ts
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.type === 'lifetime_license') {
    const { customer_email, id: sessionId, amount_total } = session;

    // 1. Create license record
    await db.query(`
      INSERT INTO lifetime_licenses (
        stripe_session_id,
        stripe_customer_id,
        email,
        amount_paid_cents,
        github_access_status
      ) VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (stripe_session_id) DO NOTHING
    `, [sessionId, session.customer, customer_email, amount_total]);

    // 2. Send welcome email with license access link
    const emailService = getEmailService();
    await emailService.sendLifetimeWelcomeEmail({
      to: customer_email!,
      sessionId,
      licenseAccessUrl: `${FRONTEND_URL}/license-access?session=${sessionId}`,
    });

    // 3. Update email sent timestamp
    await db.query(`
      UPDATE lifetime_licenses
      SET welcome_email_sent_at = NOW()
      WHERE stripe_session_id = $1
    `, [sessionId]);

    fastify.log.info({ email: customer_email, sessionId }, 'Lifetime license purchased');
  }
}
```

#### 3. GitHub Username Submission

**API Route:** `/api/v1/license-access/submit-username`

```typescript
// POST /api/v1/license-access/submit-username
async function submitGithubUsername(sessionId: string, githubUsername: string) {
  // 1. Validate license exists
  const license = await db.query(
    'SELECT id, email FROM lifetime_licenses WHERE stripe_session_id = $1',
    [sessionId]
  );

  if (!license.rows.length) {
    throw new NotFoundError('License not found');
  }

  // 2. Validate GitHub username exists
  const githubService = new GitHubOrgService(fastify);
  const validation = await githubService.validateUsername(githubUsername);

  if (!validation.valid) {
    throw new BadRequestError(validation.error || 'Invalid GitHub username');
  }

  // 3. Update license with username
  await db.query(`
    UPDATE lifetime_licenses
    SET github_username = $1,
        github_username_submitted_at = NOW(),
        github_access_status = 'username_submitted'
    WHERE stripe_session_id = $2
  `, [githubUsername, sessionId]);

  // 4. Send GitHub invitation
  const { email } = license.rows[0];
  const invitation = await githubService.inviteToOrganization(githubUsername, email);

  if (!invitation.success) {
    throw new InternalServerError('Failed to send GitHub invitation');
  }

  // 5. Update status and send confirmation email
  await db.query(`
    UPDATE lifetime_licenses
    SET github_access_status = 'invited',
        github_invitation_sent_at = NOW()
    WHERE stripe_session_id = $1
  `, [sessionId]);

  await emailService.sendLifetimeInvitationSentEmail({
    to: email,
    githubUsername,
  });

  return { success: true, message: 'GitHub invitation sent!' };
}
```

#### 4. GitHub Organization Service

**Service:** `packages/api-gateway/src/services/github-org.ts`

```typescript
import { Octokit } from '@octokit/rest';

export class GitHubOrgService {
  private octokit: Octokit;
  private orgName = process.env.GITHUB_ORG_NAME || 'manicinc';
  private teamSlug = process.env.GITHUB_TEAM_SLUG || 'synthstack-pro';

  constructor(fastify: FastifyInstance) {
    this.octokit = new Octokit({
      auth: process.env.GH_PAT
    });
  }

  async validateUsername(username: string) {
    try {
      await this.octokit.users.getByUsername({ username });
      return { valid: true };
    } catch (error: any) {
      if (error.status === 404) {
        return { valid: false, error: 'GitHub username not found' };
      }
      return { valid: false, error: 'Failed to validate username' };
    }
  }

  async inviteToOrganization(username: string, email: string) {
    try {
      const userId = await this.getUserId(username);
      const teamId = await this.getTeamId();

      await this.octokit.orgs.createInvitation({
        org: this.orgName,
        invitee_id: userId,
        role: 'member', // Read-only access
        team_ids: [teamId],
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async checkMembershipStatus(username: string) {
    try {
      await this.octokit.orgs.checkMembershipForUser({
        org: this.orgName,
        username,
      });
      return 'active';
    } catch (error: any) {
      if (error.status === 404) {
        const invitations = await this.octokit.orgs.listPendingInvitations({
          org: this.orgName,
        });
        const hasPending = invitations.data.some(
          inv => inv.login?.toLowerCase() === username.toLowerCase()
        );
        return hasPending ? 'pending' : 'none';
      }
      throw error;
    }
  }

  private async getUserId(username: string): Promise<number> {
    const { data } = await this.octokit.users.getByUsername({ username });
    return data.id;
  }

  private async getTeamId(): Promise<number> {
    const { data } = await this.octokit.teams.getByName({
      org: this.orgName,
      team_slug: this.teamSlug,
    });
    return data.id;
  }
}
```

### Email Templates

Three email templates are sent during the access flow:

1. **Welcome Email** (`lifetime-welcome.ts`) - Sent immediately after purchase
2. **Invitation Sent Email** (`lifetime-invitation-sent.ts`) - After GitHub invitation sent
3. **Access Granted Email** (`lifetime-access-granted.ts`) - After invitation accepted

All templates are located in: `packages/api-gateway/src/services/email/templates/`

### Frontend Portal

**Page:** `apps/web/src/pages/LicenseAccess.vue`

The license access portal provides a step-by-step UI for:
- Entering GitHub username
- Viewing invitation status
- Confirming invitation acceptance
- Displaying repository clone instructions

Access via: `https://synthstack.app/license-access?session={CHECKOUT_SESSION_ID}`

### Manual Steps Required (One-Time Setup)

Before deploying this feature, complete these manual steps:

1. **Create GitHub Team**
   - Go to https://github.com/orgs/manicinc/teams
   - Create team: "synthstack-pro"
   - Visibility: Secret
   - Grant Read access to `synthstack-pro` repository

2. **Generate GitHub PAT**
   - Go to https://github.com/settings/tokens/new
   - Scopes: `admin:org`, `repo`
   - Set as `GH_PAT` environment variable

3. **Configure Stripe Product**
   - Create "SynthStack Lifetime License" product
   - Create one-time payment price
   - Set as `STRIPE_PRICE_LIFETIME` environment variable

4. **Test End-to-End**
   - Complete test purchase with Stripe test card
   - Verify welcome email received
   - Submit test GitHub username
   - Accept invitation
   - Clone repository

### Monitoring & Support

**Key Metrics:**
- Total lifetime licenses sold
- Conversion rate (invited → active)
- Average time to accept invitation
- Stuck licenses (pending > 24h, invited > 7 days)

**Admin Queries:**

```sql
-- View all licenses
SELECT email, github_username, github_access_status, purchased_at
FROM lifetime_licenses
ORDER BY purchased_at DESC;

-- Find stuck licenses
SELECT * FROM lifetime_licenses
WHERE github_access_status = 'invited'
  AND github_invitation_sent_at < NOW() - INTERVAL '7 days';
```

**Customer Support:**

For common issues (invitation not received, changed username, etc.), see the internal operations guide:
[`docs/internal/LIFETIME_LICENSE_OPERATIONS.md`](../internal/LIFETIME_LICENSE_OPERATIONS.md)

### Security Considerations

- **GitHub PAT Security**: Store in environment variables, rotate every 6-12 months
- **Webhook Validation**: Always verify Stripe signature
- **Rate Limiting**: Limit username submission attempts
- **Idempotency**: Handle duplicate webhook events gracefully

### Related Documentation

- **Customer Guide**: [`docs/guides/LIFETIME_LICENSE_GETTING_STARTED.md`](../guides/LIFETIME_LICENSE_GETTING_STARTED.md)
- **Internal Ops Guide**: [`docs/internal/LIFETIME_LICENSE_OPERATIONS.md`](../internal/LIFETIME_LICENSE_OPERATIONS.md)
- **Pricing & Features**: [`docs/PRICING_AND_FEATURES.md`](../PRICING_AND_FEATURES.md)

---

## 12. References
- API docs: Swagger UI at `/docs`, OpenAPI at `/openapi.json` and `/openapi.yaml`
- Admin CMS: `docs/ADMIN_CMS.md`
- Pricing/plan docs: see `README.md` and this file for env mapping




