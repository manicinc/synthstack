# Self-Hosting SynthStack

This guide covers how to self-host SynthStack on your own infrastructure after purchasing a lifetime license.

## Prerequisites

- Docker and Docker Compose installed
- A server with at least 4GB RAM (8GB recommended)
- Domain name with SSL certificate (recommended for production)
- PostgreSQL 15+ (included in docker-compose)
- Redis (optional, for caching)

## Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/synthstack.git
cd synthstack
```

2. **Copy environment files**

```bash
cp .env.example .env
```

3. **Configure environment variables**

Edit `.env` and set the following required variables:

```bash
# Database
DATABASE_URL=postgresql://synthstack:your_secure_password@postgres:5432/synthstack

# Security - REQUIRED: Generate unique keys!
# Run these commands to generate:
#   node -e "console.log('DIRECTUS_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
#   node -e "console.log('DIRECTUS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
#   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'))"
DIRECTUS_KEY=your-unique-directus-key-here
DIRECTUS_SECRET=your-unique-directus-secret-here
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# BYOK Encryption (Required for user API key storage)
ENCRYPTION_KEY=your-64-char-hex-key-here

# AI Services (platform keys - users can also use BYOK)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Directus Admin (CMS backend)
ADMIN_EMAIL=admin@synthstack.app
ADMIN_PASSWORD=change_this_immediately

# Application
NODE_ENV=production
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

4. **Generate secure keys**

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY for BYOK (user API key storage)
# This 64-character hex key encrypts all stored user API keys with AES-256-GCM
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated keys to your `.env`:
- `JWT_SECRET` - for authentication tokens
- `ENCRYPTION_KEY` - for BYOK (must be exactly 64 hex characters)

5. **Start the services**

```bash
docker-compose up -d
```

6. **Run database migrations**

```bash
docker-compose exec api-gateway pnpm migrate
```

7. **Access your instance**

- Web App: http://localhost:3050
- API: http://localhost:3003
- Directus CMS: http://localhost:8099
- **Admin Dashboard: http://localhost:3050/admin/llm-costs** (requires admin account)

## Admin Dashboard

SynthStack includes a powerful admin dashboard for monitoring AI costs and managing your instance.

### Setting Up Admin Access

1. Create your admin account or update the default owner:

```sql
UPDATE app_users
SET is_admin = true, is_moderator = true
WHERE email = 'your-email@example.com';
```

2. Access the admin dashboard at `/admin/llm-costs`

### Admin Features

| Feature | URL | Description |
|---------|-----|-------------|
| LLM Cost Dashboard | `/admin/llm-costs` | Monitor global AI costs, usage trends, and provider breakdown |
| Organization Breakdown | `/admin/llm-costs/orgs` | Compare AI usage across all organizations |
| Budget Alerts | `/admin/llm-costs/alerts` | Set up cost limits with email/Slack notifications |

### Cost Tracking Database Migration

The cost tracking tables are created automatically when you run migrations:

```bash
docker-compose exec api-gateway pnpm migrate
```

This creates:
- `llm_usage_log` - Logs all AI API requests
- `llm_cost_aggregates` - Pre-computed hourly/daily stats
- `llm_budget_alerts` - Alert configurations

### Default Budget Alerts

The migration seeds default alerts for `team@manic.agency`:
- Daily spend > $100
- Monthly spend > $1,000
- Cost spike > 200% above average

Update these via the UI or directly in the database.

> See [Admin LLM Cost Dashboard Guide](./ADMIN_LLM_COST_DASHBOARD.md) for detailed documentation.

## Authentication Provider Setup

SynthStack supports multiple authentication providers. Choose one based on your requirements:

### Option 1: Supabase Auth (Default, Recommended)

**Pros:** Managed service, easy OAuth setup, built-in admin UI
**Cons:** External dependency, data hosted by Supabase

**Setup:**
1. Sign up at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to **Settings → API**
4. Copy credentials:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

5. Add to `.env` files:
   ```bash
   # apps/web/.env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...

   # packages/api-gateway/.env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

6. Configure in database (optional - default is already Supabase):
   ```sql
   UPDATE auth_provider_config
   SET active_provider = 'supabase', supabase_enabled = true;
   ```

### Option 2: Local PostgreSQL Auth (Self-Hosted)

**Pros:** No external dependencies, full data control, built-in OAuth, cost-effective
**Cons:** No built-in admin UI (use database queries)

**Setup:**

1. Generate JWT secret (256-bit):
   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env` files:
   ```bash
   # packages/api-gateway/.env
   JWT_SECRET=your-generated-secret-here
   DATABASE_URL=postgresql://user:pass@localhost/synthstack

   # Email configuration (required for password reset, verification)
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxx
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=SynthStack
   FRONTEND_URL=https://yourdomain.com
   ```

3. Migration 070_local_auth.sql auto-applies on first run

4. Configure in database:
   ```sql
   UPDATE auth_provider_config
   SET
     active_provider = 'local',
     local_enabled = true,
     supabase_enabled = false,
     require_email_verification = true;  -- Recommended for production
   ```

5. (Optional) Configure OAuth providers via environment variables:
   ```bash
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-secret

   # GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-secret

   # Discord OAuth
   DISCORD_CLIENT_ID=your-discord-client-id
   DISCORD_CLIENT_SECRET=your-discord-secret

   # Apple Sign In (requires additional setup)
   APPLE_CLIENT_ID=your-apple-client-id
   APPLE_TEAM_ID=your-apple-team-id
   APPLE_KEY_ID=your-apple-key-id
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

See [Authentication Documentation](./AUTHENTICATION.md) for detailed OAuth setup.

### Switching Providers Later

You can switch auth providers anytime via database config:

```sql
-- Switch to Local from Supabase
UPDATE auth_provider_config SET active_provider = 'local';

-- Switch to Supabase from Local
UPDATE auth_provider_config SET active_provider = 'supabase';
```

**Note:** User migration may be required when switching providers.

## Business Model Configuration

When self-hosting, you can choose which billing model to offer to your customers:

### Option 1: Subscriptions Only

Configure Stripe with monthly/yearly price IDs for recurring billing:

```bash
# In packages/api-gateway/.env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Monthly price IDs
STRIPE_PRICE_MAKER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx

# Yearly price IDs (optional but recommended)
STRIPE_PRICE_MAKER_YEARLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxx

# Webhook secret for Stripe events
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Subscription Tiers:**
- **Free**: 10 credits/day, $0/month (no Stripe)
- **Maker**: 30 credits/day, $9.99/month or $99.90/year
- **Pro**: 100 credits/day, $24.99/month or $249.90/year
- **Agency**: ∞ credits/day, $49.99/month or $499.90/year

### Option 2: Lifetime Licenses Only

Configure one-time payment for perpetual access:

```bash
# In packages/api-gateway/.env
STRIPE_PRODUCT_LIFETIME=prod_xxx
STRIPE_PRICE_LIFETIME=price_xxx
STRIPE_COUPON_EARLYBIRD=EARLYCODE  # Optional early bird discount
```

**Pricing Example:**
- **Early Bird**: $149 (limited quantity)
- **Regular**: $297

### Option 3: Both Models (Recommended)

Enable both subscription and lifetime models - let customers choose:

```bash
# Both subscription price IDs AND lifetime product
STRIPE_PRICE_MAKER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
STRIPE_PRICE_LIFETIME=price_xxx
```

**Why both?**
- **Monthly subscriptions**: Lower barrier to entry, recurring revenue
- **Lifetime license**: Maximize LTV from power users, upfront capital

**This is how synthstack.app works** - you're seeing the live implementation with both models active.

### Credit System

All tiers use the same credit infrastructure defined in [packages/api-gateway/src/config/index.ts](../packages/api-gateway/src/config/index.ts):

```typescript
creditsPerTier: {
  free: 10,         // 10 credits/day
  maker: 30,        // 30 credits/day
  pro: 100,         // 100 credits/day
  agency: Infinity  // Agency tier
}
```

**Credit Reset:**
Credits automatically reset daily via cron job at `/api/v1/workers/reset-credits`. Configure this in your scheduler:

```bash
# Crontab example (runs at midnight UTC)
0 0 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/v1/workers/reset-credits
```

**Dogfooding Note:** The credits you see on the live demo at synthstack.app are tracked using this exact same system. Your production users' credits will work identically.

### Stripe Webhook Setup

1. Create webhook endpoint in Stripe Dashboard
2. Point to: `https://yourdomain.com/api/v1/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy webhook signing secret to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

See [packages/api-gateway/src/routes/stripe-webhooks.ts](../packages/api-gateway/src/routes/stripe-webhooks.ts) for webhook handler implementation.

## Production Deployment

### Using Docker Compose (Recommended)

The included `docker-compose.yml` is production-ready:

```bash
docker-compose -f docker-compose.yml up -d
```

### Using Kubernetes

Helm charts are available in the `/deploy/k8s` directory.

### Using a Reverse Proxy

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3003/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| web | 3050 | Vue.js frontend |
| api-gateway | 3003 | Fastify API server |
| directus | 8099 | CMS & admin interface |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Cache (optional) |

## Database Backups

### Manual Backup

```bash
docker-compose exec postgres pg_dump -U synthstack synthstack > backup.sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U synthstack synthstack < backup.sql
```

### Automated Backups

Add to your crontab:

```bash
0 2 * * * cd /path/to/synthstack && docker-compose exec -T postgres pg_dump -U synthstack synthstack | gzip > backups/synthstack_$(date +\%Y\%m\%d).sql.gz
```

## Updating

1. Pull latest changes:

```bash
git pull origin main
```

2. Rebuild containers:

```bash
docker-compose build
docker-compose up -d
```

3. Run new migrations:

```bash
docker-compose exec api-gateway pnpm migrate
```

## Troubleshooting

### Container won't start

Check logs:

```bash
docker-compose logs -f api-gateway
```

### Database connection issues

Verify PostgreSQL is running:

```bash
docker-compose ps postgres
docker-compose exec postgres pg_isready
```

### Memory issues

Increase Docker memory limits or add swap:

```bash
# In docker-compose.yml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          memory: 2G
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated unique JWT_SECRET
- [ ] Generated unique ENCRYPTION_KEY
- [ ] Enabled SSL/TLS
- [ ] Configured firewall rules
- [ ] Set up database backups
- [ ] Enabled rate limiting
- [ ] Reviewed CORS settings
- [ ] Error tracking configured (Sentry recommended)

## Monitoring & Observability

### Error Tracking (Sentry)

> **IMPORTANT**: The default `.env` files contain our development Sentry DSN. You **MUST** create your own Sentry project and replace the DSN to receive error reports.

**Setup Steps:**
1. Create a free account at [sentry.io](https://sentry.io)
2. Create two projects: Vue.js (frontend) + Node.js (backend)
3. Copy your DSN and replace in your `.env` files:

```bash
# Frontend (.env)
VITE_SENTRY_DSN=https://YOUR-DSN@o123456.ingest.sentry.io/xxx

# Backend (.env)
SENTRY_DSN=https://YOUR-DSN@o123456.ingest.sentry.io/xxx
```

**Benefits:**
- Real-time error alerts
- Stack traces with source maps
- Performance monitoring
- User session context

📖 [Full Setup Guide](./guides/SENTRY_SETUP.md)

## Support

For self-hosting support, contact team@manic.agency or open an issue on GitHub.
