# Admin LLM Cost Dashboard

The Admin LLM Cost Dashboard provides comprehensive monitoring of AI API costs, usage patterns, and budget alerts across all organizations in your SynthStack instance.

## Overview

The dashboard is accessible to admin users at `/admin/llm-costs` and provides:

- **Global cost tracking** - Monitor total spend across OpenAI, Anthropic, and OpenRouter
- **Organization breakdown** - See which orgs are consuming the most AI resources
- **Model usage analytics** - Understand which models are used and their cost efficiency
- **Budget alerts** - Set up daily, weekly, or monthly cost limits with notifications
- **CSV export** - Export usage data for accounting and analysis

## Access Requirements

To access the admin dashboard, a user must have `is_admin = true` in the `app_users` table.

### Grant Admin Access

```sql
UPDATE app_users
SET is_admin = true
WHERE email = 'your-email@example.com';
```

Or via Directus CMS:
1. Go to Directus at `http://localhost:8055`
2. Navigate to `app_users` collection
3. Find the user and set `is_admin` to `true`

## Dashboard Pages

### 1. Global Overview (`/admin/llm-costs`)

The main dashboard shows:

| Metric | Description |
|--------|-------------|
| Month to Date | Total cost for the current month |
| Today's Spend | Cost for the current day |
| Total Requests | Number of LLM API calls |
| Avg Latency | Average response time in ms |

**Charts:**
- **Cost Trend** - Line chart showing daily/hourly costs by provider
- **Provider Breakdown** - Donut chart showing cost distribution
- **Model Usage Table** - Detailed per-model statistics

### 2. Organization Breakdown (`/admin/llm-costs/orgs`)

View and compare AI usage across all organizations:

- Sortable table by cost, requests, or name
- Filter by minimum spend amount
- Click any org to view detailed usage:
  - Model breakdown
  - Cost trends
  - Recent requests

### 3. Budget Alerts (`/admin/llm-costs/alerts`)

Configure cost threshold alerts:

| Alert Type | Description |
|------------|-------------|
| Daily Limit | Alert when daily spend exceeds threshold |
| Weekly Limit | Alert when weekly spend exceeds threshold |
| Monthly Limit | Alert when monthly spend exceeds threshold |
| Cost Spike | Alert when hourly cost spikes above average |

**Notification Options:**
- Email notifications
- Slack webhook integration

## API Endpoints

All endpoints require admin authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/llm-costs/global` | GET | Global usage statistics |
| `/api/v1/admin/llm-costs/by-org` | GET | Per-organization breakdown |
| `/api/v1/admin/llm-costs/by-org/:id` | GET | Detailed org usage |
| `/api/v1/admin/llm-costs/by-model` | GET | Per-model usage stats |
| `/api/v1/admin/llm-costs/trends` | GET | Cost trend time-series |
| `/api/v1/admin/llm-costs/export` | GET | CSV export |
| `/api/v1/admin/llm-costs/alerts` | GET/POST | List/create alerts |
| `/api/v1/admin/llm-costs/alerts/:id` | GET/PUT/DELETE | Manage alert |
| `/api/v1/admin/llm-costs/alerts/:id/test` | POST | Test alert |

### Query Parameters

**Global Stats:**
```
GET /api/v1/admin/llm-costs/global?startDate=2024-01-01&endDate=2024-01-31
```

**Org Breakdown:**
```
GET /api/v1/admin/llm-costs/by-org?sortBy=cost&sortOrder=desc&minCostCents=1000&limit=50
```

**Trends:**
```
GET /api/v1/admin/llm-costs/trends?days=30&groupBy=day&provider=openai
```

## Database Schema

The cost tracking system uses these tables:

### `llm_usage_log`
Logs every LLM API request:
- `provider` - openai, anthropic, openrouter
- `model` - gpt-4o, claude-3-5-sonnet, etc.
- `tier` - cheap, standard, premium
- `prompt_tokens`, `completion_tokens`, `total_tokens`
- `estimated_cost_cents` - Cost in cents
- `latency_ms` - Response time
- `success` - Whether request succeeded

### `llm_cost_aggregates`
Pre-computed hourly/daily aggregates for fast queries.

### `llm_budget_alerts`
Alert configurations with thresholds and notification settings.

### `llm_alert_history`
History of triggered alerts.

## Background Jobs

Cost data is automatically aggregated by cron jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Hourly Aggregation | :05 past each hour | Compute hourly totals |
| Daily Aggregation | 1:00 AM | Compute daily totals |
| Alert Check | :10 past each hour | Check budget alerts |

## Setting Up Alerts

### Via UI

1. Go to `/admin/llm-costs/alerts`
2. Click "Create Alert"
3. Fill in:
   - **Name** - e.g., "Daily Global Limit"
   - **Type** - daily_limit, weekly_limit, etc.
   - **Threshold** - Amount in cents (10000 = $100)
   - **Emails** - Notification recipients
   - **Slack Webhook** - Optional webhook URL

### Via API

```bash
curl -X POST https://api.yourdomain.com/api/v1/admin/llm-costs/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Spend Alert",
    "alertType": "daily_limit",
    "thresholdCents": 10000,
    "notificationEmails": ["team@example.com"],
    "notificationFrequency": "once"
  }'
```

### Default Alerts

The migration seeds default global alerts:

1. **Daily Global Spend Alert** - $100/day
2. **Monthly Global Spend Alert** - $1,000/month
3. **Cost Spike Alert** - 200% above hourly average

## Exporting Data

### CSV Export

Download usage data for accounting:

```bash
curl -X GET "https://api.yourdomain.com/api/v1/admin/llm-costs/export?startDate=2024-01-01" \
  -H "Authorization: Bearer $TOKEN" \
  -o llm-costs-export.csv
```

The CSV includes:
- Date, Organization, User
- Provider, Model, Tier
- Token counts, Cost
- Latency, Success status

## Multi-Tenant Support

The dashboard supports multi-tenant deployments:

- **Global view** - See costs across all organizations
- **Per-org breakdown** - Drill down to individual orgs
- **Org-specific alerts** - Set budgets per organization

### Setting Up Org-Specific Alerts

```sql
-- Insert org-specific alert
INSERT INTO llm_budget_alerts (
  organization_id,
  name,
  alert_type,
  threshold_cents,
  notification_emails
) VALUES (
  'org-uuid-here',
  'Org Daily Limit',
  'daily_limit',
  5000,
  ARRAY['org-admin@example.com']
);
```

## Troubleshooting

### No Data Showing

1. Ensure LLM Router is logging requests (check `llm_usage_log` table)
2. Run aggregation manually:
   ```bash
   POST /api/v1/admin/llm-costs/aggregate
   {"periodType": "hourly"}
   ```

### Alerts Not Triggering

1. Check alert is active (`is_active = true`)
2. Verify threshold is in **cents** not dollars
3. Check cron job is running (logs show "LLM budget alert check completed")

### Slow Dashboard

1. Ensure indexes exist on `llm_usage_log`
2. Run aggregation jobs to populate `llm_cost_aggregates`
3. Use date range filters to limit data

## Security Considerations

- All endpoints require admin authentication
- Sensitive data (API keys) is never exposed in the dashboard
- Audit logs track all admin actions
- Use HTTPS in production

## Related Documentation

- [Admin Setup Guide](./ADMIN_SETUP.md)
- [BYOK (Bring Your Own Key)](./BYOK.md)
- [Self-Hosting Guide](./SELF_HOSTING.md)
- [LangGraph User Guide](./LANGGRAPH_USER_GUIDE.md)

