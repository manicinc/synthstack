# SynthStack Production Setup Checklist

## ✅ Completed

- [x] Stripe products created (Maker, Pro, Agency, Lifetime)
- [x] Stripe price IDs configured in .env files
- [x] 3-day free trial implemented
- [x] Supabase project created
- [x] Supabase API keys configured
- [x] Email fixed (noreply@manic.agency, replies to team@manic.agency)

## 🔄 Required Next Steps

### 1. Choose Edition (LITE vs PRO)

**Action Required:** Decide which edition to deploy

**LITE (Community Edition)** - Free for learning/personal/evaluation (Community License, non-commercial):
- ✅ Core platform (projects, auth, billing, CMS, i18n)
- ✅ Stripe integration
- ✅ TypeScript ML service + text/image generation (BYOK keys)
- ❌ AI Copilot/Agent system
- ❌ Referral system
- ❌ Workflow automation (Node-RED / agent workflows)

**PRO (Commercial Edition)** - Full features:
- ✅ Everything in LITE
- ✅ AI Copilot/Agent system (LangGraph)
- ✅ Referral & rewards system
- ✅ Workflow automation (Node-RED + advanced orchestration)
- ✅ Optional Python backends (FastAPI, Django)

**Setup:**
```bash
# For LITE version
cp .env.lite.example .env

# For PRO version
cp .env.pro.example .env
```

**Environment Variables:**
- LITE: `ENABLE_COPILOT=false`, `ENABLE_REFERRALS=false`
- PRO: `ENABLE_COPILOT=true`, `ENABLE_REFERRALS=true`

📖 [Full comparison →](./VERSIONS.md)

**Current Status:** [ ] Choose edition and configure environment

---

### 2. Supabase Database Connection

**Action Required:** Get the Supabase database connection string

**Steps:**
1. Go to Supabase Dashboard → **Project Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **Connection Pooling** mode (port 6543) - **IMPORTANT for production**
4. Copy the connection string (format: `postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`)
5. Replace `[PASSWORD]` with your database password
6. Update in `.env` and `packages/api-gateway/.env`:
   ```bash
   DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**Current Status:** Placeholder value set, needs actual connection string

---

### 3. Stripe Webhook Configuration

**Action Required:** Set up webhook endpoint in Stripe dashboard

**Steps:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL:
   - **Production:** `https://api.synthstack.app/api/v1/webhooks/stripe`
   - **Development:** Use Stripe CLI forwarding (see below)
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.paused`
   - ✅ `customer.subscription.resumed`
   - ✅ `customer.subscription.trial_will_end`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.upcoming`
   - ✅ `invoice.finalized`
   - ✅ `customer.created`
   - ✅ `customer.updated`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update in `.env` and `packages/api-gateway/.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

**Development Testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local API
stripe listen --forward-to localhost:3030/api/v1/webhooks/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

**Current Status:** Webhook secret is placeholder, needs actual value

---

### 4. Run Database Migrations

**Action Required:** Run all SQL migration files in Supabase

**Steps:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Run migrations in order (they're numbered):
   ```
   services/directus/migrations/001_initial_schema.sql
   services/directus/migrations/003_subscription_billing.sql
   services/directus/migrations/070_local_auth.sql
   services/directus/migrations/082_demo_copilot_credits.sql
   services/directus/migrations/084_payment_sessions.sql
   ... (run all relevant migrations)
   ```
3. Or use migration runner if available

**Key Tables Created:**
- `app_users` - User accounts
- `subscription_plans` - Tier configurations
- `payment_webhooks` - Webhook event log
- `credit_transactions` - Credit usage history
- `subscription_history` - Tier changes audit
- `invoice_cache` - Stripe invoice cache
- `credit_purchases` - One-time credit purchases

**Current Status:** Migrations not yet run on Supabase

---

### 5. Supabase Authentication Setup

**Action Required:** Enable auth providers in Supabase

**Steps:**
1. Go to Supabase Dashboard → **Authentication** → **Providers**

**Email Provider:**
- Enable **Email** provider
- Configure email templates:
  - Confirmation email
  - Magic link email
  - Password reset email
- Set **Site URL:** `https://synthstack.app`
- Set **Redirect URLs:**
  - `https://synthstack.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for development)

**OAuth Providers (Optional):**
- **Google OAuth:**
  1. Enable Google provider
  2. Enter Client ID and Client Secret from [Google Cloud Console](https://console.cloud.google.com)

- **GitHub OAuth:**
  1. Enable GitHub provider
  2. Enter Client ID and Client Secret from [GitHub Developer Settings](https://github.com/settings/developers)

**Current Status:** Auth providers not yet configured

---

### 6. Row Level Security (RLS)

**Action Required:** Enable RLS policies for security

**Steps:**
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Enable RLS on all tables
3. Create policies (or run from SQL editor):

```sql
-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON app_users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON app_users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to view own transactions
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to view own subscription history
CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to view own invoices
CREATE POLICY "Users can view own invoices" ON invoice_cache
  FOR SELECT USING (auth.uid() = user_id);
```

**Current Status:** RLS not yet configured

---

### 7. Environment Variables Final Check

**Verify these are set in production .env:**

```bash
# Supabase
SUPABASE_URL=https://insonkkyuhktanzczcde.supabase.co
SUPABASE_ANON_KEY=sb_publishable_T-tJDS182b92RABeAfVnMg_Gq_qg7rD
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***

# Stripe (Production Keys - NOT test keys!)
STRIPE_SECRET_KEY=sk_live_... (currently set)
STRIPE_WEBHOOK_SECRET=whsec_... (NEEDS UPDATE)

# Database
DATABASE_URL=postgres://... (NEEDS UPDATE)

# Email
RESEND_API_KEY=***REMOVED*** (set)
RESEND_FROM_EMAIL=noreply@manic.agency (set)

# Frontend
FRONTEND_URL=https://synthstack.app (set)
APP_URL=https://synthstack.app (set)
```

---

### 8. Test the Complete Flow

**Action Required:** End-to-end testing

**Subscription Flow Test:**
1. Visit pricing page: `https://synthstack.app/pricing`
2. Click "Get Started" on Maker plan
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Verify webhook received in Supabase `payment_webhooks` table
5. Verify user upgraded in `app_users` table
6. Verify credits added
7. Test generation to consume credits
8. Test Stripe Customer Portal: `https://synthstack.app/app/subscription`

**Lifetime License Test:**
1. Apply promo code `EARLYSYNTH` at checkout
2. Verify $100 discount applied ($149 instead of $249)
3. Complete payment
4. Verify lifetime tier in database

---

## 📋 Additional Configuration

### Stripe Customer Portal

**Steps:**
1. Go to Stripe Dashboard → **Settings** → **Billing** → **Customer Portal**
2. **Activate** the customer portal
3. Configure allowed features:
   - ✅ Cancel subscriptions
   - ✅ Update payment methods
   - ✅ View invoices
   - ✅ Pause subscriptions (optional)
   - ✅ Switch plans (upgrade/downgrade)
4. Set business information and branding

### Stripe Tax (Optional but Recommended)

**Steps:**
1. Go to Stripe Dashboard → **Settings** → **Tax**
2. Enable **Stripe Tax**
3. Register tax IDs for your business
4. Configure tax collection for different regions

---

## 📊 Error Tracking (Recommended)

Set up Sentry for production error monitoring.

**Steps:**
1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create two projects:
   - **synthstack-web** (Vue.js platform)
   - **synthstack-api** (Node.js platform)
3. Get DSN for each project (Settings → Client Keys)
4. Update environment files:
   ```bash
   # apps/web/.env
   VITE_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/xxx
   VITE_SENTRY_ENVIRONMENT=production

   # packages/api-gateway/.env
   SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/xxx
   SENTRY_ENVIRONMENT=production
   ```
5. Deploy and verify errors are captured

**Current Status:** [ ] Not yet configured

📖 [Full Sentry Setup Guide →](./guides/SENTRY_SETUP.md)

---

## 🚨 Security Checklist

- [ ] All `.env` files in `.gitignore`
- [ ] Production API keys (not test keys)
- [ ] HTTPS enforced on all domains
- [ ] CORS configured correctly
- [ ] RLS enabled on all Supabase tables
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] API authentication required

---

## 📞 Support & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Stripe Webhooks Guide:** https://stripe.com/docs/webhooks
- **Supabase Auth Guide:** https://supabase.com/docs/guides/auth
- **API Documentation:** `/packages/api-gateway/README.md`
- **Stripe Integration:** `./features/STRIPE_INTEGRATION.md`

---

**Last Updated:** 2025-01-06
**Status:** ⚠️ In Progress - Critical items pending
