# Newsletter & Analytics Integration

Comprehensive newsletter management and analytics tracking for SynthStack.

## Newsletter Integration

### Supported Providers

- **MailerLite** - Simple, affordable email marketing
- **Mailchimp** - Industry-standard email platform  
- **Brevo (Sendinblue)** - Marketing automation + transactional emails

### Configuration

Set environment variables in `.env`:

```bash
# Choose primary provider
NEWSLETTER_PROVIDER=mailerlite

# MailerLite
MAILERLITE_API_KEY=your-api-key
MAILERLITE_GROUP_ID=your-group-id

# Mailchimp
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_LIST_ID=your-list-id

# Brevo
BREVO_API_KEY=your-api-key
BREVO_LIST_ID=1
```

### Features

**Subscriber Management:**
- Subscribe/unsubscribe with double opt-in support
- Automatic tier-based segmentation
- Two-way sync with provider(s)
- Engagement scoring

**Campaigns:**
- Create and send campaigns from Directus
- Schedule campaigns
- Track opens, clicks, bounces
- A/B testing support

**Automation:**
- Welcome email series
- Trial ending reminders
- Upgrade prompts
- Re-engagement campaigns

### API Endpoints

**Public:**
- `POST /api/v1/newsletter/subscribe` - Subscribe email
- `POST /api/v1/newsletter/unsubscribe` - Unsubscribe
- `GET /api/v1/newsletter/status` - Check subscription status

**Admin:**
- `GET /api/v1/admin/newsletter/subscribers` - List subscribers
- `GET /api/v1/admin/newsletter/segments` - List segments
- `POST /api/v1/admin/newsletter/campaigns` - Create campaign
- `POST /api/v1/admin/newsletter/sync` - Manual sync

**Webhooks:**
- `POST /api/v1/newsletter/webhooks/mailerlite`
- `POST /api/v1/newsletter/webhooks/mailchimp`
- `POST /api/v1/newsletter/webhooks/brevo`

### Worker Jobs

Run these via cron or manually:

```bash
# Daily sync with providers
curl -X POST http://localhost:3003/api/v1/workers/sync-newsletter \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Process automated sequences
curl -X POST http://localhost:3003/api/v1/workers/process-sequences \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Update dynamic segments
curl -X POST http://localhost:3003/api/v1/workers/update-segments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Analytics Integration

### Features

**Real-time Event Tracking:**
- Page views and API requests
- User actions (signup, login, generation)
- Subscription lifecycle events
- Content interactions
- Error tracking

**Dashboards:**
- KPI overview (signups, revenue, active users)
- Daily/hourly metrics
- User growth charts
- Revenue analytics
- Engagement metrics

**Advanced Analytics:**
- Conversion funnels
- Cohort analysis
- Custom reports with SQL
- Data exports (CSV, JSON)

### Database Tables

**Core:**
- `analytics_events` - Real-time event stream
- `analytics_daily` - Daily aggregated metrics
- `analytics_hourly` - Hourly metrics for dashboards

**Advanced:**
- `analytics_funnels` - Funnel definitions
- `analytics_funnel_progress` - User funnel tracking
- `analytics_cohorts` - Cohort definitions
- `analytics_reports` - Custom report definitions
- `analytics_exports` - Export job tracking

### API Endpoints

**Public:**
- `GET /api/v1/analytics/overview` - User usage summary
- `GET /api/v1/analytics/usage` - Detailed usage stats

**Admin:**
- `GET /api/v1/admin/analytics/dashboard` - Full metrics
- `GET /api/v1/admin/analytics/daily` - Daily metrics
- `GET /api/v1/admin/analytics/events` - Event stream
- `GET /api/v1/admin/analytics/funnels` - List funnels
- `GET /api/v1/admin/analytics/funnels/:id` - Compute funnel
- `POST /api/v1/admin/analytics/funnels` - Create funnel
- `GET /api/v1/admin/analytics/cohorts` - List cohorts
- `GET /api/v1/admin/analytics/cohorts/:id` - Compute cohort
- `GET /api/v1/admin/analytics/reports` - List reports
- `POST /api/v1/admin/analytics/reports/:id/execute` - Run report
- `POST /api/v1/admin/analytics/export` - Export data

### Worker Jobs

```bash
# Aggregate daily analytics (run at midnight UTC)
curl -X POST http://localhost:3003/api/v1/workers/aggregate-analytics

# Aggregate hourly analytics (run every hour)
curl -X POST http://localhost:3003/api/v1/workers/aggregate-hourly

# Compute all funnels (run daily)
curl -X POST http://localhost:3003/api/v1/workers/compute-funnels

# Refresh cohort data (run weekly)
curl -X POST http://localhost:3003/api/v1/workers/refresh-cohorts
```

### Tracking in Your Code

Use the tracking utility:

```typescript
import { tracking } from '../utils/track.js';

// Track generation
await tracking.generation(fastify, userId, {
  printer_id, filament_id, slicer, quality
});

// Track signup
await tracking.signup(fastify, userId, {
  source: 'landing_page', tier: 'free'
});

// Track subscription
await tracking.subscriptionCreated(fastify, userId, {
  tier: 'pro', isYearly: true
});
```

### Default Funnels

Preconfigured funnels:
- **Signup to First Generation** - User activation tracking
- **Free to Paid** - Conversion tracking
- **Trial Conversion** - Trial to paid conversion

### Default Cohorts

- **Weekly Retention** - User retention by signup week
- **Monthly Revenue** - Revenue cohorts by signup month
- **Subscription Retention** - Retention by subscription start

## Directus Admin

### Insights Dashboards

Access dashboards at: `http://localhost:8099/admin/insights`

Pre-configured panels:
- KPI metrics (signups, revenue, active users)
- Daily metrics chart (30-day trend)
- Newsletter statistics
- Recent events log

### Managing Campaigns

1. Go to Newsletter Campaigns collection
2. Create new campaign
3. Select segment or send to all
4. Write content or use template
5. Schedule or send immediately
6. Track results in campaign stats

### Managing Segments

Dynamic segments automatically update:
- All Active Subscribers
- Free Tier Users
- Paid Subscribers
- Highly Engaged
- At Risk

Create custom segments with JSON criteria:

```json
{
  "subscription_tier": {"$in": ["pro", "unlimited"]},
  "engagement_score": {"$gte": 70}
}
```

## Cron Schedule

Recommended cron schedule for workers:

```cron
# Reset daily credits (midnight UTC)
0 0 * * * curl -X POST http://api-gateway:3003/api/v1/workers/reset-credits -H "Authorization: Bearer $CRON_SECRET"

# Aggregate daily analytics (1 AM UTC)
0 1 * * * curl -X POST http://api-gateway:3003/api/v1/workers/aggregate-analytics -H "Authorization: Bearer $CRON_SECRET"

# Aggregate hourly analytics (every hour)
0 * * * * curl -X POST http://api-gateway:3003/api/v1/workers/aggregate-hourly -H "Authorization: Bearer $CRON_SECRET"

# Newsletter sync (daily at 2 AM UTC)
0 2 * * * curl -X POST http://api-gateway:3003/api/v1/workers/sync-newsletter -H "Authorization: Bearer $CRON_SECRET"

# Process email sequences (every 6 hours)
0 */6 * * * curl -X POST http://api-gateway:3003/api/v1/workers/process-sequences -H "Authorization: Bearer $CRON_SECRET"

# Compute funnels (daily at 3 AM UTC)
0 3 * * * curl -X POST http://api-gateway:3003/api/v1/workers/compute-funnels -H "Authorization: Bearer $CRON_SECRET"

# Refresh cohorts (weekly on Monday at 4 AM UTC)
0 4 * * 1 curl -X POST http://api-gateway:3003/api/v1/workers/refresh-cohorts -H "Authorization: Bearer $CRON_SECRET"

# Cleanup old data (monthly on 1st at 5 AM UTC)
0 5 1 * * curl -X POST http://api-gateway:3003/api/v1/workers/cleanup -H "Authorization: Bearer $CRON_SECRET"
```

## Testing

### Test Newsletter Subscription

```bash
curl -X POST http://localhost:3003/api/v1/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "Test"}'
```

### Test Analytics Tracking

```bash
# Track custom event
curl -X POST http://localhost:3003/api/v1/admin/analytics/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "custom_event", "eventCategory": "user", "metadata": {}}'
```

### View Analytics Dashboard

```bash
curl http://localhost:3003/api/v1/admin/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
