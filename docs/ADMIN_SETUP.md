# Admin Setup Guide

This guide covers setting up and managing admin accounts for your SynthStack instance.

## Default Owner Account

SynthStack ships with a default owner account:

| Field | Value |
|-------|-------|
| Email | `team@manic.agency` |
| Role | Admin + Lifetime Premium |
| Directus Access | Full edit access |

**IMPORTANT:** After first login, immediately:
1. Change the password
2. Update the email to your own
3. Or create a new admin account and disable the default one

## Account Types

### App Users (app_users table)

Regular application users with subscription tiers:

| Tier | AI Access | Directus Access | Rate Limits |
|------|-----------|-----------------|-------------|
| community | None | Read-only preview | N/A |
| subscriber | Basic chat | Read-only preview | Standard |
| premium | Full 6 AI agents | Read-only preview | Higher |
| lifetime | Full 6 AI agents | Read-only preview | Higher + BYOK |
| admin | Full | Full edit access | Unlimited |

### Directus Admin

Separate from app users, Directus has its own admin for CMS management:

- Default email: `admin@synthstack.app`
- Set password via `ADMIN_PASSWORD` in `.env`

## Creating a New Admin

### Via Database

```sql
UPDATE app_users
SET is_admin = true, is_moderator = true, subscription_tier = 'lifetime'
WHERE email = 'your-email@example.com';
```

### Via Directus

1. Log in to Directus at `http://localhost:8055`
2. Navigate to `app_users` collection
3. Find the user and set:
   - `is_admin`: true
   - `is_moderator`: true
   - `subscription_tier`: lifetime

## Admin Capabilities

### Application Admin (is_admin = true)

- Access all admin API endpoints
- View all users' data
- Manage subscriptions
- Access analytics
- Moderate community content
- Full AI feature access
- **[LLM Cost Dashboard](/admin/llm-costs)** - Monitor AI API costs and usage
  - Global cost tracking (MTD, daily, by provider)
  - Organization breakdown and comparison
  - Model usage analytics
  - Budget alerts with email/Slack notifications
  - CSV export for accounting

> See [Admin LLM Cost Dashboard Guide](./ADMIN_LLM_COST_DASHBOARD.md) for detailed documentation.

### Moderator (is_moderator = true)

- Review flagged content
- Suspend/unsuspend users
- View moderation queue
- Limited admin access

## Changing the Default Owner

1. **Update via migration** (recommended):

Create a new migration file:

```sql
-- Update default owner email
UPDATE app_users
SET email = 'your-email@example.com'
WHERE email = 'team@manic.agency';
```

2. **Update via Directus UI**:
   - Log in to Directus
   - Navigate to app_users
   - Edit the team@manic.agency record

## Security Best Practices

### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Never reuse passwords
- Use a password manager

### Two-Factor Authentication

Enable 2FA in account settings (if implemented) or use Directus's built-in 2FA.

### Session Management

- Sessions expire after 7 days of inactivity
- Force logout all sessions from account settings
- Monitor active sessions in Directus

### Audit Logging

All admin actions are logged. View audit logs:

```sql
SELECT * FROM directus_activity
WHERE action = 'update'
ORDER BY timestamp DESC
LIMIT 100;
```

## API Authentication

### JWT Tokens

Admin users receive JWTs with elevated permissions:

```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "is_admin": true,
  "subscription_tier": "lifetime"
}
```

### Admin-Only Endpoints

Endpoints requiring admin auth use the `requireAdmin` decorator:

```
GET  /api/v1/admin/users
POST /api/v1/admin/sync
GET  /api/v1/analytics/admin
```

## Troubleshooting

### Locked Out

If locked out of admin:

```bash
# Reset via database
docker-compose exec postgres psql -U synthstack -c "
  UPDATE app_users
  SET password_hash = '\$2b\$10\$demo_hash_here'
  WHERE email = 'admin@example.com';
"
```

Then login with the demo password and change immediately.

### Directus Admin Recovery

```bash
# Reset Directus admin password
docker-compose exec directus npx directus users passwd --email admin@synthstack.app
```

### Permission Issues

Check user flags:

```sql
SELECT email, is_admin, is_moderator, subscription_tier, is_banned
FROM app_users
WHERE email = 'your-email@example.com';
```

## Monitoring

### Active Admins

```sql
SELECT email, last_login_at, created_at
FROM app_users
WHERE is_admin = true;
```

### Recent Admin Actions

Check Directus activity:

```sql
SELECT * FROM directus_activity
WHERE user IN (SELECT id FROM app_users WHERE is_admin = true)
ORDER BY timestamp DESC;
```
