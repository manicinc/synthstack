# SynthStack Admin CMS Documentation

## Overview

The SynthStack Admin CMS is built on [Directus](https://directus.io/), providing a comprehensive internal management system for content, users, moderation, and analytics. This document covers the architecture, collections, flows, and testing infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DIRECTUS ADMIN CMS                       │
├─────────────────────────────────────────────────────────────┤
│  Collections          │  Flows              │  Insights     │
│  ─────────────────    │  ─────────────────  │  ───────────  │
│  • app_users (sync)   │  • User sync        │  • Overview   │
│  • printers           │  • Credit reset     │  • Business   │
│  • filaments          │  • Mod alerts       │  • Product    │
│  • print_profiles     │  • Weekly reports   │  • Moderation │
│  • community_*        │  • Email notify     │               │
│  • analytics_*        │                     │               │
└─────────────────────────────────────────────────────────────┘
            │                      │
            ▼                      ▼
     ┌──────────────┐      ┌──────────────┐
     │   Supabase   │      │  API Gateway │
     │  (Auth/DB)   │◄────►│  (Webhooks)  │
     └──────────────┘      └──────────────┘
```

## Access

- **URL**: `http://localhost:8099/admin` (dev) / `https://admin.synthstack.app` (prod)
- **Default Admin**: `admin@synthstack.app` / `admin123`

## Collections

### Content Management

#### `printers`
Printer database with specifications.
- Fields: manufacturer, model, build_volume, max_temps, features
- Admin actions: Add/edit printers, mark as verified

#### `filaments`
Filament database with print settings.
- Fields: material_type, brand, temps, requirements
- Admin actions: Add/edit filaments

#### `print_profiles`
User-generated and AI-generated print profiles.
- Fields: settings_json, slicer_exports, votes, public flag
- Admin actions: Review profiles, toggle visibility

### User Management

#### `app_users`
Mirror of Supabase users for admin management.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Supabase user ID |
| email | string | User email |
| display_name | string | Display name |
| subscription_tier | enum | free/maker/pro/unlimited |
| subscription_status | enum | active/canceled/past_due |
| credits_remaining | int | Current credits |
| is_banned | boolean | Ban status |
| warning_count | int | Total warnings |
| admin_notes | text | Internal notes |

**Admin Actions:**
- Edit subscription tier (syncs to Stripe)
- Adjust credits with audit log
- Ban/unban users
- Generate impersonation token
- Add internal notes

#### `credit_adjustments`
Audit log for all credit changes.

| Field | Type |
|-------|------|
| user_id | UUID |
| adjustment | int |
| reason | string |
| balance_before | int |
| balance_after | int |
| adjusted_by | UUID |

### Community Moderation

#### `community_comments`
User comments on profiles.

| Field | Type |
|-------|------|
| user_id | UUID |
| profile_id | UUID |
| content | text |
| status | enum: pending/approved/rejected/flagged |
| moderated_by | UUID |

#### `community_reports`
User-submitted reports.

| Field | Type |
|-------|------|
| reporter_id | UUID |
| reported_item_type | enum: profile/comment/user |
| reason | enum: spam/inappropriate/copyright/other |
| status | enum: open/investigating/resolved/dismissed |
| resolution_notes | text |

#### `user_warnings`
Warnings issued to users.

| Field | Type |
|-------|------|
| user_id | UUID |
| warning_type | enum: content/behavior/spam |
| severity | enum: notice/warning/strike/final |
| message | text |
| expires_at | datetime |

### Analytics

#### `analytics_daily`
Aggregated daily metrics.

| Field | Type |
|-------|------|
| date | date (PK) |
| new_users | int |
| active_users | int |
| generations | int |
| credits_used | int |
| revenue_cents | int |

#### `analytics_events`
Granular event log.

| Field | Type |
|-------|------|
| event_type | string |
| event_category | enum |
| user_id | UUID |
| metadata | JSONB |
| timestamp | datetime |

### Configuration

#### `feature_flags`
Feature flags for A/B testing and rollouts.

| Field | Type |
|-------|------|
| key | string (unique) |
| enabled | boolean |
| rollout_percentage | int (0-100) |
| user_ids | UUID[] |
| subscription_tiers | string[] |

#### `system_config`
System configuration values.

| Key | Description |
|-----|-------------|
| credits_per_tier | Daily credits per subscription |
| credit_reset_time | UTC time for daily reset |
| max_warnings_before_ban | Auto-ban threshold |
| maintenance_mode | Enable maintenance mode |

## Directus Flows

### User Sync Flow
- **Trigger**: Webhook from Supabase
- **Action**: Upsert user to `app_users`
- **Endpoint**: `POST /api/v1/admin/sync/user`

### Subscription Change Flow
- **Trigger**: `app_users.subscription_tier` update
- **Action**: Notify API Gateway → Stripe

### Daily Credit Reset
- **Trigger**: Cron `0 0 * * *` (midnight UTC)
- **Action**: Call `/api/v1/admin/reset-credits`

### Weekly Analytics Report
- **Trigger**: Cron `0 9 * * 0` (Sunday 9am)
- **Action**: Compute and store analytics

### New Report Alert
- **Trigger**: New `community_reports` item
- **Action**: Log and notify moderators

### Warning Issued Alert
- **Trigger**: New `user_warnings` item
- **Action**: Log event

## Insights Dashboards

### Overview
- Total Users (gauge)
- Pro Subscribers (metric)
- Total Generations (metric)
- Pending Moderation (metric)

### Business Metrics
- Free/Maker/Pro/Unlimited user counts
- Subscription tier breakdown

### Product Analytics
- Printers in Database
- Filaments in Database
- Public Profiles
- STL Files Analyzed

### Moderation
- Open Reports
- Pending Comments
- Banned Users
- Active Warnings

## API Endpoints

### Admin Sync Routes
```
POST /api/v1/admin/sync/user          # Supabase → Directus sync
POST /api/v1/admin/sync/directus-update # Directus → external sync
POST /api/v1/admin/users/:id/credits   # Adjust credits
POST /api/v1/admin/users/:id/ban       # Ban/unban user
POST /api/v1/admin/users/:id/impersonate # Generate debug token
POST /api/v1/admin/users/:id/warn      # Issue warning
POST /api/v1/admin/reset-credits       # Daily credit reset
```

### Analytics Routes
```
GET  /api/v1/admin/analytics/daily     # Get daily metrics
POST /api/v1/admin/analytics/event     # Log event
POST /api/v1/admin/analytics/compute-daily # Compute aggregates
```

### Moderation Routes
```
GET  /api/v1/admin/moderation/queue    # Get pending items
POST /api/v1/admin/moderation/comment/:id/action # Moderate comment
POST /api/v1/admin/moderation/report/:id/resolve # Resolve report
```

## Testing

### Test Structure
```
tests/admin/
├── api/
│   ├── directus-collections.test.ts  # CRUD tests
│   ├── user-sync.test.ts             # Sync verification
│   └── analytics.test.ts             # Metrics accuracy
├── e2e/
│   ├── user-management.spec.ts       # Playwright
│   ├── moderation-workflow.spec.ts
│   └── analytics-dashboard.spec.ts
├── integration/
│   ├── supabase-sync.test.ts         # Full sync test
│   └── stripe-webhook.test.ts
├── setup.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

### Running Tests

```bash
# Navigate to tests directory
cd tests/admin

# Install dependencies
pnpm install

# Run API/integration tests
pnpm test

# Run specific test suite
pnpm test:api
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run E2E with UI
pnpm test:e2e:ui

# Run all tests
pnpm test:all
```

### Environment Variables
```env
DIRECTUS_URL=http://localhost:8099
DIRECTUS_ADMIN_EMAIL=admin@synthstack.app
DIRECTUS_ADMIN_PASSWORD=admin123
API_GATEWAY_URL=http://localhost:3003
ADMIN_SECRET=dev-admin-secret
```

## Database Migrations

Migrations are located in `services/directus/migrations/`:

- `001_initial_schema.sql` - Base collections (printers, filaments, profiles)
- `002_admin_extensions.sql` - Admin features (app_users, moderation, analytics)

### Running Migrations
```bash
# Via Docker
docker exec synthstack-postgres psql -U postgres -d synthstack -f /docker-entrypoint-initdb.d/002_admin_extensions.sql

# Or locally with psql
psql -U postgres -d synthstack -f services/directus/migrations/002_admin_extensions.sql
```

## Security

### Admin Access
- Admin routes require `Authorization: Bearer {ADMIN_SECRET}` header
- Directus uses role-based access control
- Impersonation tokens are logged and time-limited (15 minutes)

### Audit Logging
- All credit adjustments are logged with before/after balance
- Admin actions are tracked in `admin_activity_log`
- Analytics events provide full audit trail

## Workflows

### User Ban Flow
1. Admin navigates to `app_users` collection
2. Selects user and toggles `is_banned`
3. Adds `ban_reason`
4. Saves → Directus Flow triggers
5. Sync to Supabase via API Gateway
6. User receives "Account suspended" on next auth

### Moderation Flow
1. User report created → Alert Flow triggers
2. Admin opens Moderation dashboard
3. Reviews open reports in queue
4. Takes action: resolve/dismiss
5. If resolved, may issue warning
6. Warning increments `warning_count`
7. Auto-ban if count >= `max_warnings_before_ban`

### Subscription Change Flow
1. Admin updates `subscription_tier` in Directus
2. Directus Flow triggers webhook
3. API Gateway receives update
4. Syncs to Stripe subscription
5. Credits adjusted based on new tier

## Troubleshooting

### Directus Not Connecting
```bash
# Check container status
docker ps | grep directus

# View logs
docker logs synthstack-directus

# Restart container
docker restart synthstack-directus
```

### Sync Issues
```bash
# Test sync endpoint
curl -X POST http://localhost:3003/api/v1/admin/sync/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-secret" \
  -d '{"type": "INSERT", "table": "users", "record": {...}}'
```

### Dashboard Not Loading
1. Check Directus Insights dashboards exist
2. Verify collections have data
3. Check browser console for errors
4. Ensure proper permissions on collections



