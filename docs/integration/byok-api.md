# BYOK API Integration Guide

## Overview

The BYOK (Bring Your Own Keys) system allows premium users to use their own OpenAI and Anthropic API keys instead of consuming platform credits. This guide covers the API contracts, routing logic, and integration patterns.

---

## Architecture

```
User Request
    ↓
Authentication Middleware
    ↓
Rate Limiting Middleware ← BYOK Router (bypass if BYOK)
    ↓
ML Credits Middleware ← BYOK Router (skip deduction if BYOK)
    ↓
Service Layer (Copilot/Agents/Embeddings)
    ↓
BYOK Router ← Makes final routing decision
    ↓
    ├─→ User's API Key (BYOK) → api_key_usage table
    └─→ Internal API Key → credit_transactions table
```

---

## API Endpoints

### 1. Get BYOK Settings

**Endpoint:** `GET /api/v1/api-keys/settings`

**Auth:** Required

**Description:** Returns current BYOK configuration and routing decision for the authenticated user.

**Response:**

```json
{
  "enabled": true,
  "flags": {
    "byokEnabled": true,
    "byokUsesInternalCredits": false,
    "byokOnlyMode": false
  },
  "hasCredits": true,
  "hasByokKeys": true,
  "byokProviders": ["openai", "anthropic"],
  "keySource": {
    "source": "byok",
    "reason": "BYOK-first mode: User has BYOK keys"
  }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether user can access BYOK (based on tier + feature flag) |
| `flags.byokEnabled` | boolean | BYOK feature flag status |
| `flags.byokUsesInternalCredits` | boolean | Credit-first mode flag |
| `flags.byokOnlyMode` | boolean | BYOK-only mode flag |
| `hasCredits` | boolean | Whether user has internal credits remaining |
| `hasByokKeys` | boolean | Whether user has configured BYOK keys |
| `byokProviders` | string[] | List of configured providers |
| `keySource.source` | string | Routing decision: `"internal"`, `"byok"`, or `"error"` |
| `keySource.reason` | string | Human-readable reason for routing decision |

---

### 2. List API Keys

**Endpoint:** `GET /api/v1/api-keys`

**Auth:** Required (Premium+)

**Response:**

```json
{
  "keys": [
    {
      "id": "key_abc123",
      "provider": "openai",
      "keyHint": "sk-...xyz",
      "isActive": true,
      "isValid": true,
      "lastError": null,
      "totalRequests": 1250,
      "totalTokens": 425000,
      "lastUsedAt": "2026-01-10T15:30:00Z"
    }
  ]
}
```

---

### 3. Add/Update API Key

**Endpoint:** `POST /api/v1/api-keys`

**Auth:** Required (Premium+)

**Body:**

```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

**Response:**

```json
{
  "success": true,
  "key": {
    "id": "key_abc123",
    "provider": "openai",
    "keyHint": "sk-...xyz",
    "isActive": true,
    "isValid": true,
    "lastError": null
  },
  "message": "API key added and validated successfully"
}
```

**Validation:** Keys are automatically validated against provider APIs upon creation.

---

### 4. Delete API Key

**Endpoint:** `DELETE /api/v1/api-keys/:id`

**Auth:** Required (Premium+)

**Response:**

```json
{
  "success": true,
  "message": "API key deleted"
}
```

---

### 5. Test API Key

**Endpoint:** `POST /api/v1/api-keys/:id/test`

**Auth:** Required (Premium+)

**Response:**

```json
{
  "success": true,
  "valid": true,
  "message": "API key is valid"
}
```

---

### 6. Get Usage Statistics

**Endpoint:** `GET /api/v1/api-keys/usage?days=30`

**Auth:** Required (Premium+)

**Response:**

```json
{
  "period": "30 days",
  "totalRequests": 1500,
  "totalTokens": 520000,
  "estimatedCostCents": 1250,
  "estimatedCostDollars": "12.50",
  "byProvider": {
    "openai": {
      "requests": 1200,
      "tokens": 420000,
      "cost": 1050
    },
    "anthropic": {
      "requests": 300,
      "tokens": 100000,
      "cost": 200
    }
  }
}
```

---

## Routing Logic

### Decision Flow

```javascript
// Pseudo-code
function determineKeySource(context) {
  const { hasCredits, byokProviders, flags } = context;
  const hasByok = byokProviders.length > 0;

  // Flow C: BYOK-Only Mode (highest precedence)
  if (flags.byokOnlyMode) {
    if (hasByok) return 'byok';
    return 'error'; // Must configure BYOK
  }

  // Flow A: Credit-First Mode
  if (flags.byokUsesInternalCredits) {
    if (hasCredits) return 'internal';
    if (hasByok) return 'byok'; // Fallback
    return 'error';
  }

  // Flow B: BYOK-First Mode (default)
  if (hasByok && flags.byokEnabled) return 'byok';
  if (hasCredits) return 'internal'; // Fallback
  return 'error';
}
```

### Three Routing Flows

#### Flow A: Credit-First Mode
```
byok_uses_internal_credits = true

1. User has credits? → Use internal keys
2. User has BYOK keys? → Use BYOK keys
3. Neither? → Error (402)
```

#### Flow B: BYOK-First Mode (Default)
```
byok_uses_internal_credits = false

1. User has BYOK keys? → Use BYOK keys
2. User has credits? → Use internal keys
3. Neither? → Error (402)
```

#### Flow C: BYOK-Only Mode
```
byok_only_mode = true

1. User has BYOK keys? → Use BYOK keys
2. No BYOK keys? → Error (402)

Note: Internal credits never used, even if available
```

---

## Service Integration

### Using BYOK Router in Services

```typescript
import { byokRouter } from './services/llm-router/byok-router';

// Example: Chat service
async function chat(userId: string, messages: ChatMessage[]) {
  const response = await byokRouter.chat(
    {
      messages,
      maxTokens: 2000,
      temperature: 0.7,
      userId, // Required for BYOK routing
    },
    taskHint
  );

  // Response includes:
  // - content: string
  // - model: string (actual model used)
  // - usage: { promptTokens, completionTokens, totalTokens }
  // - provider: string
  // - usingByok: boolean
  // - byokKeyId?: string (if using BYOK)

  return response;
}
```

### Streaming with BYOK Router

```typescript
async function* streamChat(userId: string, messages: ChatMessage[]) {
  for await (const event of byokRouter.streamChat({
    messages,
    maxTokens: 2000,
    temperature: 0.7,
    stream: true,
    userId,
  }, taskHint)) {

    if (event.type === 'content') {
      yield event.content;
    } else if (event.type === 'error') {
      throw new Error(event.error);
    } else if (event.type === 'done') {
      // Includes usage info
      return event.response;
    }
  }
}
```

---

## Middleware Integration

### ML Credits Middleware

```typescript
// packages/api-gateway/src/middleware/ml-credits.ts

// Pre-request hook
const byokContext = await byokRouter.getByokContext(userId);
const keySource = byokRouter.determineKeySource(byokContext);

if (keySource.source === 'byok') {
  // Skip credit check
  request.mlCreditsContext = { byokMode: true };
  return; // Continue to handler
}

if (keySource.source === 'error') {
  return reply.code(402).send({
    error: 'Insufficient Credits',
    message: keySource.reason,
    suggestion: 'Configure BYOK or purchase credits'
  });
}

// Continue with normal credit check...
```

### Rate Limiting Middleware

```typescript
// packages/api-gateway/src/middleware/rateLimit.ts

if (skipByok) {
  const byokContext = await byokRouter.getByokContext(userId);
  const keySource = byokRouter.determineKeySource(byokContext);

  if (keySource.source === 'byok') {
    // Bypass rate limits - user uses their own quota
    return;
  }
}

// Apply tier-based rate limits...
```

---

## Usage Tracking

### BYOK Usage (api_key_usage table)

```sql
CREATE TABLE api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES user_api_keys(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_cents INTEGER,
  response_time_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**When logged:** Every request using BYOK keys

**Fields:**
- `api_key_id`: Which user key was used
- `provider`: openai, anthropic, etc.
- `model`: Actual model used (gpt-4, claude-3-opus, etc.)
- `*_tokens`: Token counts from provider
- `estimated_cost_cents`: Calculated cost

---

### Internal Usage (credit_transactions table)

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(20),
  cost_cents INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  service_type VARCHAR(50),
  service_request_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**When logged:** Every request using internal API keys

**Fields:**
- `transaction_type`: 'deduction'
- `cost_cents`: Credits deducted
- `balance_after`: Remaining balance
- `service_type`: copilot, agents, embeddings, etc.

---

## Error Handling

### 402 Payment Required

Returned when user has no credits and no BYOK keys configured.

```json
{
  "success": false,
  "error": "Insufficient Credits",
  "message": "No credits remaining and no BYOK keys configured. Please purchase more credits or configure your own API keys (BYOK).",
  "data": {
    "byokOnlyMode": false,
    "hasCredits": false,
    "hasByok": false,
    "byokProviders": [],
    "suggestion": "Please upgrade your plan, purchase more credits, or configure your own API keys (BYOK)"
  }
}
```

### BYOK Key Validation Failure

```json
{
  "success": false,
  "valid": false,
  "error": "Invalid API key",
  "message": "Validation failed: The API key is invalid or has been revoked"
}
```

---

## Graceful Fallback

The BYOK router supports graceful fallback:

1. **Try BYOK first** (if BYOK-first mode and keys configured)
2. **On BYOK failure** (invalid key, rate limit, etc.):
   - If `byokOnlyMode = true`: Fail immediately
   - If user has credits: Fallback to internal keys
   - Else: Return error

```typescript
// Automatic fallback in byokRouter.chat()
try {
  // Attempt BYOK
  response = await makeByokRequest();
} catch (byokError) {
  if (context.flags.byokOnlyMode) {
    throw byokError; // No fallback in BYOK-only mode
  }

  if (context.hasCredits) {
    logger.warn('BYOK failed, falling back to internal', { byokError });
    response = await makeInternalRequest();
  } else {
    throw new Error('BYOK failed and no credits available');
  }
}
```

---

## Frontend Integration

### Check BYOK Status

```typescript
// Fetch settings
const settings = await api.get('/api-keys/settings');

if (settings.keySource.source === 'error') {
  // Show banner: "Action Required"
  showBanner({
    type: 'error',
    message: settings.keySource.reason,
    action: 'Configure BYOK'
  });
} else if (settings.keySource.source === 'byok') {
  // Show success banner: "Using Your API Keys"
  showBanner({
    type: 'success',
    message: 'Using your API keys',
    details: `Providers: ${settings.byokProviders.join(', ')}`
  });
}
```

### Display Current Mode

```typescript
function getCurrentMode(settings) {
  if (settings.flags.byokOnlyMode) {
    return 'BYOK-Only Mode';
  }
  if (settings.flags.byokUsesInternalCredits) {
    return 'Credit-First Mode';
  }
  return 'BYOK-First Mode';
}
```

---

## Testing

### Unit Tests

Located at: `packages/api-gateway/src/services/llm-router/__tests__/byok-router.test.ts`

```bash
# Run unit tests
npm test byok-router.test.ts
```

### Integration Tests

Located at: `packages/api-gateway/src/__tests__/integration/byok-integration.test.ts`

```bash
# Run integration tests
npm test byok-integration.test.ts
```

---

## Security Considerations

1. **Encryption:** All API keys encrypted with AES-256-GCM
2. **Storage:** Keys never logged or exposed in responses
3. **Validation:** Keys validated before first use
4. **Isolation:** Each user's keys isolated from others
5. **Audit:** All BYOK usage logged to `api_key_usage` table

---

## Performance

- **Feature Flag Cache:** 5-minute TTL
- **BYOK Context Cache:** Per-request (no caching)
- **Key Retrieval:** Single query per request
- **Routing Decision:** O(1) complexity

---

## Monitoring Queries

### BYOK Adoption Rate

```sql
SELECT
  COUNT(DISTINCT user_id) as total_premium_users,
  COUNT(DISTINCT CASE WHEN has_keys THEN user_id END) as users_with_byok,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN has_keys THEN user_id END) / COUNT(DISTINCT user_id), 2) as adoption_percentage
FROM (
  SELECT u.id as user_id, k.id IS NOT NULL as has_keys
  FROM users u
  LEFT JOIN user_api_keys k ON u.id = k.user_id AND k.is_active = true
  WHERE u.subscription_tier IN ('premium', 'lifetime')
) sub;
```

### BYOK Cost Savings

```sql
-- Estimated savings from BYOK vs internal
SELECT
  SUM(estimated_cost_cents) / 100.0 as total_byok_cost_dollars,
  COUNT(*) as byok_requests,
  AVG(estimated_cost_cents::float / NULLIF(total_tokens, 0)) as avg_cost_per_1k_tokens
FROM api_key_usage
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## Troubleshooting

### Issue: BYOK not being used despite keys configured

**Debug steps:**

1. Check feature flags:
```sql
SELECT key, is_enabled FROM feature_flags WHERE key LIKE 'byok%';
```

2. Check user's keys:
```sql
SELECT * FROM user_api_keys WHERE user_id = 'xxx' AND is_active = true;
```

3. Check routing decision:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourplatform.com/api/v1/api-keys/settings
```

---

### Issue: Keys marked as invalid

**Check validation errors:**

```sql
SELECT provider, last_error, last_validated_at
FROM user_api_keys
WHERE user_id = 'xxx' AND is_valid = false;
```

**Re-test key:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.yourplatform.com/api/v1/api-keys/{keyId}/test
```

---

## Migration Guide

### Migrating from Legacy to BYOK

1. **Run migration:**
```bash
cd services/directus
psql $DATABASE_URL -f migrations/123_byok_feature_flags.sql
```

2. **Configure flags** (see [Admin Documentation](../admin/byok-feature-flags.md))

3. **Update services** to pass `userId` parameter

4. **Deploy** with zero downtime (graceful fallback to internal keys)

5. **Monitor** usage in first 24 hours

---

## Support

- **Documentation:** [Admin Guide](../admin/byok-feature-flags.md)
- **Source Code:** [BYOK Router](../../packages/api-gateway/src/services/llm-router/byok-router.ts)
- **Issues:** [GitHub Issues](https://github.com/yourorg/synthstack/issues)
- **Slack:** #engineering-support
