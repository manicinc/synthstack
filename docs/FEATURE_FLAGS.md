# SynthStack Feature Flags System

This document describes the comprehensive feature flag system that enables SynthStack to support multiple editions and tier-based access control.

## Overview

The feature flag system supports:
- **LITE vs PRO builds**: Self-hosted feature modules are toggled via env flags (`ENABLE_*`, `VITE_ENABLE_*`)
- **Subscription tiers**: `free`, `maker`, `pro`, `agency` control credits, rate limits, and certain premium UX
- **Feature tiers**: `community`, `subscriber`, `premium`, `lifetime` are used by `feature_flags.min_tier` for UI/feature gating
- **Lifetime licenses**: One-time purchase that unlocks source access + premium tier features

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Database                                 │
│  ┌─────────────────┐  ┌──────────────────────┐                  │
│  │  feature_flags  │  │  user_feature_overrides │               │
│  │  - key          │  │  - user_id              │               │
│  │  - is_premium   │  │  - feature_key          │               │
│  │  - min_tier     │  │  - is_enabled           │               │
│  └────────┬────────┘  └───────────┬─────────────┘               │
└───────────┼───────────────────────┼─────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Fastify)                        │
│  ┌─────────────────────────┐  ┌────────────────────────────┐    │
│  │  featureFlagsService    │  │  featureFlagsMiddleware    │    │
│  │  - getUserTier()        │  │  - requireFeature()        │    │
│  │  - hasFeature()         │  │  - requireAICofounders()   │    │
│  │  - getUserFeatureAccess │  │  - requireGitHub()         │    │
│  └────────────┬────────────┘  └──────────────┬─────────────┘    │
└───────────────┼──────────────────────────────┼──────────────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Vue 3)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  featureStore   │  │  v-feature      │  │ UpgradePrompt   │  │
│  │  (Pinia)        │  │  directive      │  │ component       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## User Tiers

### Subscription tiers (app_users.subscription_tier)

| Tier | Price | Credits/day |
|------|-------|-------------|
| `free` | $0 | 10 |
| `maker` | $9.99/mo or $99.90/yr | 30 |
| `pro` | $24.99/mo or $249.90/yr | 100 |
| `agency` | $49.99/mo or $499.90/yr | 500 |

### Feature tiers (feature_flags.min_tier)

These tiers are used for *feature gating* (not billing). The API normalizes subscription tiers into feature tiers:

| Feature tier | Maps from subscription tiers |
|--------------|-----------------------------|
| `community` | `free` |
| `subscriber` | `maker` |
| `premium` | `pro`, `agency` |
| `lifetime` | `lifetime`, `enterprise` |

## Subscription & Billing Features

SynthStack includes **two complete billing systems** ready to use:

### Recurring Subscriptions
- **Status**: ✅ Production Ready
- **File**: [packages/api-gateway/src/routes/billing.ts](../packages/api-gateway/src/routes/billing.ts)
- **Stripe Mode**: `subscription`
- **Plans**:
  - **Free**: 10 credits/day, $0/month
  - **Maker**: 30 credits/day, $9.99/month or $99.90/year
  - **Pro**: 100 credits/day, $24.99/month or $249.90/year
  - **Agency**: 500 credits/day, $49.99/month or $499.90/year

**Includes:**
- Automatic Stripe webhook handling
- Credit allocation and daily reset via cron
- Customer billing portal integration
- Proration on plan changes
- Invoice caching and history

### Lifetime Licenses
- **Status**: ✅ Production Ready
- **File**: [packages/api-gateway/src/routes/billing.ts](../packages/api-gateway/src/routes/billing.ts) (line 450+)
- **Stripe Mode**: `payment` (one-time)
- **Pricing**:
  - **Early Bird**: $149 for first 150 licenses
  - **Regular**: $249
- **Includes**: Full source code, no recurring charges, complete subscription system code

### How They Work Together

**Important:** Both systems coexist. Lifetime license buyers receive the complete codebase including the working subscription billing system. This allows you to offer SaaS subscriptions to your own customers using the same infrastructure.

**Dogfooding:** This documentation site uses subscriptions. The payment system you see live on [synthstack.app](https://synthstack.app) is exactly what you'll deploy when you buy the lifetime license. Test subscriptions, credits, and AI features - it all works out of the box.

**Migration Files (pricing defaults):**
- [127_pricing_tiers_subscription_plans.sql](../services/directus/migrations/127_pricing_tiers_subscription_plans.sql) - CMS pricing tiers seed
- [086_update_free_credits.sql](../services/directus/migrations/086_update_free_credits.sql) - Free tier credits/day (legacy installs)

## Feature Flags

### Premium Features (Pro/Agency/Lifetime)

| Key | Description |
|-----|-------------|
| `ai_cofounders` | Access to all 6 AI agents |
| `ai_suggestions` | Proactive AI recommendations |
| `github_integration` | GitHub PRs, code review |
| `shared_agent_context` | Cross-agent knowledge sharing |
| `agent_chain_of_thought` | View agent reasoning traces |

### Subscriber Features (Maker+)

| Key | Description |
|-----|-------------|
| `basic_chat` | Simple AI chat with limited credits |
| `doc_upload` | Upload documents for RAG indexing |
| `doc_chat` | Chat with uploaded documents |

### Community Features (always available)

| Key | Description |
|-----|-------------|
| `community_core` | Base platform features |
| `community_analytics` | Basic usage statistics |

### Authentication Feature Flags

#### Provider Flags

| Flag | Default | Tiers | Description |
|------|---------|-------|-------------|
| `auth_supabase` | enabled | all | Supabase Authentication |
| `auth_local_postgres` | disabled | all | Local PostgreSQL Auth |
| `auth_directus` | disabled | enterprise | Directus Authentication |

#### OAuth Provider Flags

| Flag | Default | Tiers | Description |
|------|---------|-------|-------------|
| `auth_oauth_google` | enabled | all | Google OAuth Login |
| `auth_oauth_github` | enabled | all | GitHub OAuth Login |
| `auth_oauth_discord` | disabled | subscriber+ | Discord OAuth Login |

#### Security Flags

| Flag | Default | Tiers | Description |
|------|---------|-------|-------------|
| `auth_mfa` | disabled | premium+ | Multi-Factor Authentication |

#### Configuration

Auth flags are controlled via the `auth_provider_config` table:

```sql
-- View current config
SELECT * FROM auth_provider_config;

-- Enable local auth
UPDATE auth_provider_config SET local_enabled = true;

-- Local auth OAuth fields exist for future work, but local OAuth is not implemented yet.
-- If you need OAuth today, use Supabase Auth.
-- (Reserved) UPDATE auth_provider_config SET oauth_discord_enabled = true;
```

See [Authentication Documentation](./AUTHENTICATION.md) for complete configuration reference.

## Backend Usage

### Protecting Routes with Middleware

```typescript
import { requireFeature, requireAICofounders } from '../middleware/featureFlags.js';

// Using the factory function
fastify.get('/agents/:agentSlug/chat', {
  preHandler: [
    server.authenticate,
    requireFeature({ features: 'ai_cofounders' })
  ]
}, handler);

// Using shorthand helpers
fastify.post('/github/create-pr', {
  preHandler: [server.authenticate, requireGitHub()]
}, handler);
```

### Checking Features in Route Handlers

```typescript
import { featureFlagsService } from '../services/featureFlags.js';

async function handler(request, reply) {
  const userId = request.user.id;

  // Check specific feature
  const hasAccess = await featureFlagsService.hasFeature(userId, 'ai_suggestions');

  // Get user tier
  const tier = await featureFlagsService.getUserTier(userId);

  // Get complete feature access profile
  const access = await featureFlagsService.getUserFeatureAccess(userId);
  // Returns: { userId, tier, features: { ai_cofounders: true, ... }, limits: {...} }
}
```

### API Endpoints

```
GET /api/v1/features        - Get current user's feature access (authenticated)
GET /api/v1/features/list   - Get all available features (public)
```

## Frontend Usage

### Pinia Feature Store

```typescript
// In component setup
import { useFeatureStore } from '@/stores/features';

const featureStore = useFeatureStore();

// Initialize on app mount
await featureStore.initialize();

// Check access
if (featureStore.hasAICofounders) {
  // Show AI features
}

// Available computed properties
featureStore.tier            // 'community' | 'subscriber' | 'premium' | 'lifetime'
featureStore.isPremium       // true if premium or lifetime
featureStore.isSubscriber    // true if subscriber+
featureStore.hasAICofounders
featureStore.hasGitHub
featureStore.hasAISuggestions
```

### v-feature Directive

```vue
<!-- Hide content if no access -->
<div v-feature="'ai_cofounders'">
  Pro AI content here
</div>

<!-- Hide completely (no placeholder) -->
<div v-feature:hidden="'ai_suggestions'">
  Hidden if no access
</div>

<!-- Check tier instead of feature -->
<div v-feature:tier="'premium'">
  Pro tier content
</div>

<!-- Show upgrade teaser for non-premium users -->
<div v-feature:teaser="'ai_cofounders'">
  AI agent interface (or upgrade prompt)
</div>
```

### UpgradePrompt Component

```vue
<UpgradePrompt
  feature="ai_cofounders"
  title="AI Co-Founders"
  description="Get access to 6 specialized AI agents"
>
  <!-- Slot: shown if user has access -->
  <AIAgentPanel />
</UpgradePrompt>
```

## Directus Extensions

Both `ai-cofounders` and `ai-suggestions` extensions include feature gates:

```vue
<template>
  <div class="panel">
    <!-- Pro Gate -->
    <div v-if="!hasPremiumAccess" class="premium-gate">
      <h3>Pro Feature</h3>
      <p>Upgrade to unlock this feature</p>
      <v-button @click="goToPricing">Upgrade</v-button>
    </div>

    <!-- Actual content -->
    <template v-else>
      <!-- Pro content here -->
    </template>
  </div>
</template>

<script setup>
const hasPremiumAccess = ref(false);

async function checkPremiumAccess() {
  const response = await fetch('/api/v1/features', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  hasPremiumAccess.value = data.features?.ai_cofounders === true;
}

onMounted(() => checkPremiumAccess());
</script>
```

## Database Schema

### feature_flags table

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_enabled BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  min_tier VARCHAR(50),  -- 'community', 'subscriber', 'premium', 'lifetime'
  rollout_percentage INTEGER DEFAULT 100,
  enabled_from TIMESTAMP WITH TIME ZONE,
  enabled_until TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_feature_overrides table

```sql
CREATE TABLE user_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  feature_key VARCHAR(100) NOT NULL REFERENCES feature_flags(key),
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,  -- 'beta_tester', 'trial', etc.
  granted_by UUID REFERENCES app_users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_key)
);
```

## Docker Compose Editions

### Pro Edition (default)
```bash
docker-compose up -d
```

Includes all services: PostgreSQL, Redis, Qdrant, Directus, API Gateway, ML Service, Web.

### Community Edition
```bash
docker-compose -f docker-compose.community.yml up -d
```

Excludes: Qdrant, ML Service. Sets `SYNTHSTACK_EDITION=community`.

## Admin Functions

### Grant Feature Override (Beta Testing, Trials)

```typescript
await featureFlagsService.grantFeatureOverride(
  userId,
  'ai_cofounders',
  true,              // is_enabled
  'beta_tester',     // reason
  adminUserId,       // granted_by
  30                 // expires in 30 days
);
```

### Revoke Feature Override

```typescript
await featureFlagsService.revokeFeatureOverride(userId, 'ai_cofounders');
```

## Environment Variables

```env
# Set edition mode
SYNTHSTACK_EDITION=pro  # or 'premium' / 'community'

# For frontend
VITE_SYNTHSTACK_EDITION=pro
```

## Migration

Apply the feature flags migration:

```bash
# Migration file: services/directus/migrations/017_feature_flags.sql
psql -U synthstack -d synthstack -f services/directus/migrations/017_feature_flags.sql
```

## Best Practices

1. **Always use middleware** for route protection - don't rely on frontend-only checks
2. **Cache feature access** on the frontend using the Pinia store
3. **Show upgrade prompts** instead of hiding features entirely - users should know what they're missing
4. **Use feature overrides** for beta testing before rolling out to all users
5. **Set rollout percentage** for gradual feature releases
