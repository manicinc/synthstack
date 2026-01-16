# ⚡ Quick Reference Card

## 🚀 Start Services

```bash
# Full stack
docker-compose up -d

# Just API Gateway
docker-compose up api-gateway

# With logs
docker-compose up -d && docker-compose logs -f api-gateway
```

## 🔧 Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Apply migrations
docker-compose exec directus npx directus database migrate:latest
```

## 📡 Key API Endpoints

### Health & Docs
```
GET  /health                    - Health check
GET  /docs                      - Swagger UI
GET  /openapi.json              - OpenAPI spec
```

### Billing & Subscriptions
```
GET  /api/v1/billing/plans           - List plans
POST /api/v1/billing/checkout        - Create checkout
POST /api/v1/billing/portal          - Customer portal
POST /api/v1/billing/change-plan     - Upgrade/downgrade
POST /api/v1/billing/cancel          - Cancel subscription
GET  /api/v1/billing/invoices        - Invoice history
GET  /api/v1/billing/limits          - Rate limit status
```

### Credits
```
GET  /api/v1/credits                 - Get balance
GET  /api/v1/credits/history         - Transaction history
GET  /api/v1/credits/usage           - Usage statistics
GET  /api/v1/credits/check?amount=5  - Check availability
```

### Newsletter
```
POST /api/v1/newsletter/subscribe         - Subscribe
POST /api/v1/newsletter/unsubscribe       - Unsubscribe
GET  /api/v1/newsletter/status            - Get status
GET  /api/v1/admin/newsletter/subscribers - List (admin)
POST /api/v1/admin/newsletter/campaigns   - Create campaign
POST /api/v1/admin/newsletter/sync        - Manual sync
```

### Analytics
```
GET  /api/v1/analytics/overview              - User stats
GET  /api/v1/admin/analytics/dashboard       - Full dashboard
GET  /api/v1/admin/analytics/daily           - Daily metrics
GET  /api/v1/admin/analytics/events          - Event stream
GET  /api/v1/admin/analytics/funnels         - List funnels
GET  /api/v1/admin/analytics/funnels/:id     - Compute funnel
POST /api/v1/admin/analytics/export          - Export data
```

### Workers (Cron Jobs)
```
POST /api/v1/workers/reset-credits      - Daily credit reset
POST /api/v1/workers/aggregate-analytics - Daily metrics
POST /api/v1/workers/sync-newsletter    - Newsletter sync
POST /api/v1/workers/process-sequences  - Email automation
POST /api/v1/workers/compute-funnels    - Update funnels
POST /api/v1/workers/cleanup            - Data cleanup
GET  /api/v1/workers/health             - Worker health
```

## 🔐 Authentication

```bash
# All authenticated endpoints require:
Authorization: Bearer YOUR_JWT_TOKEN

# Worker endpoints require:
Authorization: Bearer YOUR_CRON_SECRET

# Example
curl http://localhost:3003/api/v1/credits \
  -H "Authorization: Bearer eyJhbGc..."
```

## 📊 Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U synthstack -d synthstack

# Useful queries
SELECT * FROM app_users LIMIT 10;
SELECT * FROM subscription_plans;
SELECT * FROM analytics_daily ORDER BY date DESC LIMIT 7;
SELECT * FROM newsletter_subscribers WHERE status = 'active';

# Check migrations
SELECT * FROM directus_migrations;
```

## 🧪 Testing Commands

```bash
# Test newsletter subscribe
curl -X POST http://localhost:3003/api/v1/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test"}'

# Test analytics tracking
curl -X POST http://localhost:3003/api/v1/admin/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Test worker job
curl -X POST http://localhost:3003/api/v1/workers/aggregate-analytics \
  -H "Authorization: Bearer dev-admin-secret"

# Test Stripe webhook (requires Stripe CLI)
stripe listen --forward-to localhost:3003/api/v1/webhooks/stripe
stripe trigger checkout.session.completed
```

## 📦 Package Management

```bash
# Install dependencies (from workspace root)
pnpm install

# Update dependencies
pnpm update

# Clean and reinstall
pnpm clean
pnpm install

# Build API Gateway
cd packages/api-gateway
pnpm build
```

## 🐛 Debugging

```bash
# View API Gateway logs
docker-compose logs -f api-gateway

# View Directus logs
docker-compose logs -f directus

# View database logs
docker-compose logs -f postgres

# View all logs
docker-compose logs -f

# Check container status
docker-compose ps

# Restart service
docker-compose restart api-gateway
```

## 🗄️ Database Management

```bash
# Create new migration
# (manually create file: services/directus/migrations/00X_name.sql)

# Apply migrations
docker-compose exec directus npx directus database migrate:latest

# Rollback last migration
docker-compose exec directus npx directus database migrate:down

# Check schema
docker-compose exec postgres psql -U synthstack -d synthstack -c "\dt"
```

## 🎨 Theme System

```typescript
// Available themes
const themes = [
  'default-dark', 'default-light',
  'ocean-dark', 'ocean-light',
  'sunset-dark', 'forest-dark',
  'purple-night', 'midnight',
  'rose-gold', 'mono-dark',
  'high-contrast'
];

// Set theme (in browser console)
const themeStore = useThemeStore();
themeStore.setTheme('ocean-dark');
```

## 📊 Subscription Tiers

| Tier | Price/mo | Credits/day | Rate Limit | File Size |
|------|----------|-------------|------------|-----------|
| Free | $0 | 3 | 10/min | 10MB |
| Maker | $12.99 | 30 | 30/min | 50MB |
| Pro | $24.99 | 100 | 60/min | 200MB |
| Agency | $39.99 | ∞ | 100/min | 500MB |

## 🔄 Worker Schedule (Cron)

```cron
0 0 * * *   # Midnight - Reset credits
0 1 * * *   # 1 AM - Check expirations  
0 2 * * *   # 2 AM - Aggregate daily analytics
0 3 * * *   # 3 AM - Sync newsletter
0 */6 * * * # Every 6h - Process sequences
0 * * * *   # Hourly - Aggregate hourly analytics
0 4 * * *   # 4 AM - Update segments
0 5 * * *   # 5 AM - Compute funnels
0 6 * * 1   # Monday 6 AM - Refresh cohorts
0 7 1 * *   # Monthly 1st - Cleanup
```

## 🌐 Service URLs (Default)

```
Frontend:        http://localhost:3050
API Gateway:     http://localhost:3003
API Docs:        http://localhost:3003/docs
Directus Admin:  http://localhost:8099/admin
PostgreSQL:      localhost:5499
Redis:           localhost:6399
ML Service:      http://localhost:8001
```

## 📂 Important Directories

```
/packages/api-gateway/src/
  /services/     - Business logic (stripe, newsletter, analytics)
  /routes/       - API endpoints
  /plugins/      - Fastify plugins
  /config/       - Configuration management
  /middleware/   - Request middleware
  /utils/        - Helper functions

/services/directus/
  /migrations/   - Database schema migrations
  /dashboards/   - Directus dashboard configs

/apps/web/src/
  /components/   - Vue components
  /pages/        - Route pages
  /layouts/      - Layout templates
  /stores/       - Pinia state management
  /css/          - Global styles & themes
```

## 🔑 Environment Variables (Essential)

```bash
# Stripe (required for billing)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MAKER=price_...
STRIPE_PRICE_PRO=price_...

# Newsletter (choose one)
NEWSLETTER_PROVIDER=mailerlite
MAILERLITE_API_KEY=...

# SMTP (required for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Workers
CRON_SECRET=your-secure-secret

# AI (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 🎯 Quick Wins

**1. Test the API:**
```bash
curl http://localhost:3003/health
```

**2. View Documentation:**
```bash
open http://localhost:3003/docs
```

**3. Access Directus:**
```bash
open http://localhost:8099/admin
# Login: admin@synthstack.app / Synthstackadmin!
```

**4. Subscribe to Newsletter:**
```bash
curl -X POST http://localhost:3003/api/v1/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

**5. Run a Worker:**
```bash
curl -X POST http://localhost:3003/api/v1/workers/aggregate-analytics \
  -H "Authorization: Bearer dev-admin-secret"
```

## 🐛 Common Issues

**"Connection refused"**
→ Check if services are running: `docker-compose ps`

**"Migration failed"**
→ Check database is up: `docker-compose exec postgres psql -U synthstack -l`

**"Rate limit exceeded"**
→ Check tier: `GET /api/v1/billing/limits`

**"Stripe webhook failed"**
→ Check webhook secret matches Stripe dashboard

**"Newsletter sync failed"**
→ Check API key is valid: `GET /api/v1/admin/newsletter/stats`

## 📖 Documentation Links

- **Main Docs:** `./ARCHITECTURE_OVERVIEW.md`
- **Roadmap:** `./ROADMAP.md`
- **Newsletter & Analytics:** `../NEWSLETTER_ANALYTICS.md`
- **Cron Jobs:** `../CRON_JOBS.md`
- **API Integration:** `/packages/api-gateway/INTEGRATION_SUMMARY.md`
- **This File:** `./API_QUICK_REFERENCE.md`

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Production Ready 🚀
