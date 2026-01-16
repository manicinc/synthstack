# BYOK Feature Flags Configuration

## Prerequisites

Before enabling BYOK, ensure the `ENCRYPTION_KEY` environment variable is set:

```bash
# Generate a secure 64-character hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to your `.env`:
```
ENCRYPTION_KEY=<your-64-char-hex-key>
```

This key encrypts all stored user API keys with AES-256-GCM. Without it, BYOK will not function and users cannot save their API keys.

---

## Overview

The BYOK (Bring Your Own Keys) system is controlled by three system-level feature flags that determine how users' API keys are used relative to internal platform credits.

**Location:** Directus CMS → Settings → Feature Flags (category: `system`)

## Feature Flags

### 1. `byok_enabled`

**Purpose:** Controls whether BYOK UI is visible to users

- **Type:** Premium feature flag
- **Default:** `true`
- **Min Tier:** `premium`
- **Category:** `system`

**Behavior:**
- When `true`: Premium/Lifetime users see the API Keys page and can configure their own API keys
- When `false`: API Keys page is hidden, BYOK functionality disabled for all users

**Use Case:** Disable BYOK platform-wide if needed for maintenance or policy changes.

---

### 2. `byok_uses_internal_credits`

**Purpose:** Controls whether to use internal credits first before BYOK

- **Type:** System flag (applies to all users)
- **Default:** `false` (BYOK-first mode)
- **Category:** `system`

**Behavior:**

#### When `false` (BYOK-First Mode - Default)
```
1. If user has BYOK keys → Use BYOK
2. Else if user has credits → Use internal credits
3. Else → Error (no credits, no BYOK)
```

**Best for:** Reducing platform API costs, encouraging BYOK usage

#### When `true` (Credit-First Mode)
```
1. If user has credits → Use internal credits
2. Else if user has BYOK keys → Use BYOK
3. Else → Error (no credits, no BYOK)
```

**Best for:** Monetization, consistent credit consumption

---

### 3. `byok_only_mode`

**Purpose:** Forces BYOK-only mode, never uses internal API keys

- **Type:** System flag (applies to all users)
- **Default:** `false`
- **Category:** `system`
- **⚠️ Precedence:** Overrides `byok_uses_internal_credits`

**Behavior:**

#### When `true` (BYOK-Only Mode)
```
1. If user has BYOK keys → Use BYOK
2. Else → Error (must configure BYOK)
```

**Key Points:**
- Internal credits are NEVER used, even if user has balance
- Users MUST configure their own API keys to use AI features
- Premium users see clear messaging to configure BYOK
- Useful for:
  - Cost control (zero API expenses)
  - Compliance (all API usage through customer keys)
  - Testing/staging environments

#### When `false` (Normal Mode - Default)
- Follows `byok_uses_internal_credits` logic
- Platform can provide fallback API access

---

## Configuration Matrix

| `byok_enabled` | `byok_only_mode` | `byok_uses_internal_credits` | Behavior |
|----------------|------------------|------------------------------|----------|
| `false` | any | any | BYOK disabled, internal only |
| `true` | `true` | any | BYOK required, no internal |
| `true` | `false` | `true` | Credit-first, BYOK fallback |
| `true` | `false` | `false` | BYOK-first, credit fallback (default) |

---

## Common Configurations

### Configuration 1: BYOK-First (Default)
**Recommended for most platforms**

```sql
UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_enabled';

UPDATE feature_flags SET is_enabled = false
WHERE key = 'byok_uses_internal_credits';

UPDATE feature_flags SET is_enabled = false
WHERE key = 'byok_only_mode';
```

**Result:** Users with BYOK use their keys first, fallback to internal credits when needed.

---

### Configuration 2: Credit-First
**Recommended for revenue-focused platforms**

```sql
UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_enabled';

UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_uses_internal_credits';

UPDATE feature_flags SET is_enabled = false
WHERE key = 'byok_only_mode';
```

**Result:** Users always consume internal credits first, BYOK only when credits are exhausted.

---

### Configuration 3: BYOK-Only (Zero Cost)
**Recommended for cost control or compliance**

```sql
UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_enabled';

UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_only_mode';

-- Note: byok_uses_internal_credits doesn't matter when byok_only_mode is true
```

**Result:** Platform never uses internal API keys. Users must configure BYOK.

⚠️ **Warning:** Ensure all premium users have BYOK configured before enabling BYOK-only mode!

---

### Configuration 4: Disable BYOK
**Temporary disable or legacy mode**

```sql
UPDATE feature_flags SET is_enabled = false
WHERE key = 'byok_enabled';
```

**Result:** BYOK completely disabled, all users use internal credits.

---

## Monitoring & Analytics

### Check Current Configuration

```sql
SELECT key, is_enabled, name, description
FROM feature_flags
WHERE category = 'system' AND key LIKE 'byok%'
ORDER BY sort_order;
```

### Monitor BYOK Usage

```sql
-- BYOK usage in last 30 days
SELECT
  provider,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(estimated_cost_cents) / 100.0 as cost_dollars
FROM api_key_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider;
```

### Monitor Internal Credit Usage

```sql
-- Internal credit usage in last 30 days
SELECT
  service_type,
  COUNT(*) as requests,
  SUM(cost_cents) / 100.0 as cost_dollars
FROM credit_transactions
WHERE transaction_type = 'deduction'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY service_type;
```

### Compare BYOK vs Internal Usage

```sql
-- Percentage of requests using BYOK
WITH byok_stats AS (
  SELECT COUNT(*) as byok_count
  FROM api_key_usage
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
internal_stats AS (
  SELECT COUNT(*) as internal_count
  FROM credit_transactions
  WHERE transaction_type = 'deduction'
    AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  byok_count,
  internal_count,
  byok_count + internal_count as total,
  ROUND(100.0 * byok_count / (byok_count + internal_count), 2) as byok_percentage
FROM byok_stats, internal_stats;
```

---

## User Impact

### Premium/Lifetime Users
- See API Keys page when `byok_enabled = true`
- Can configure OpenAI and Anthropic API keys
- Keys are AES-256-GCM encrypted
- Rate limits bypassed when using BYOK
- Usage tracked separately in `api_key_usage` table

### Non-Premium Users
- No access to BYOK regardless of flags
- Always use internal credits
- Subject to tier-based rate limits

---

## Troubleshooting

### Issue: Users complain about unexpected credit deduction

**Check:** Is `byok_uses_internal_credits = true`?

**Solution:** If you want BYOK-first behavior, set it to `false`.

---

### Issue: Platform API costs too high

**Solution:** Enable BYOK-first mode or BYOK-only mode:

```sql
-- Option 1: BYOK-first (fallback to internal)
UPDATE feature_flags SET is_enabled = false
WHERE key = 'byok_uses_internal_credits';

-- Option 2: BYOK-only (no internal keys)
UPDATE feature_flags SET is_enabled = true
WHERE key = 'byok_only_mode';
```

---

### Issue: Users report "Action Required" errors

**Check:** Are they in BYOK-only mode without keys configured?

```sql
-- Check if BYOK-only mode is enabled
SELECT is_enabled FROM feature_flags WHERE key = 'byok_only_mode';

-- Check which users have no BYOK keys
SELECT u.id, u.email, u.subscription_tier
FROM users u
LEFT JOIN user_api_keys k ON u.id = k.user_id AND k.is_active = true
WHERE u.subscription_tier IN ('premium', 'lifetime')
  AND k.id IS NULL;
```

**Solution:** Either:
1. Ask users to configure BYOK keys
2. Temporarily disable BYOK-only mode

---

## Feature Flag Cache

**Important:** Feature flags are cached for 5 minutes by default.

After changing flags:
- Changes apply to new requests after cache expires (5 min)
- Restart API gateway for immediate effect

```bash
# Force cache clear by restarting
pm2 restart api-gateway
```

---

## Best Practices

1. **Test flag changes in staging first**
2. **Notify users before enabling BYOK-only mode**
3. **Monitor cost impact after flag changes**
4. **Document your configuration choice** (why you chose it)
5. **Review BYOK usage monthly** to optimize settings

---

## Support

For questions or issues with BYOK configuration:
- Check [Integration Documentation](../integration/byok-api.md)
- Review [BYOK Router Source](../../packages/api-gateway/src/services/llm-router/byok-router.ts)
- Contact: engineering@yourplatform.com
