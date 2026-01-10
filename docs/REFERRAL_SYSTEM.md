# Referral System Documentation

## Overview

SynthStack includes a full-featured referral system that enables users to earn rewards by inviting others to the platform. The system supports configurable seasons, tiered rewards, discount code generation, and comprehensive analytics.

> **Looking for user documentation?** See the [Referral Getting Started Guide](./guides/REFERRAL_GETTING_STARTED.md) for a user-friendly walkthrough.

## Key Features

- **Seasonal Campaigns**: Time-limited referral programs with unique reward structures
- **Tier-Based Rewards**: Progressive rewards as users hit referral milestones
- **Multiple Reward Types**: Discount codes, credits, free months, tier upgrades
- **Real-Time Tracking**: Click tracking, signup attribution, conversion tracking
- **Leaderboards**: Competitive rankings with public/anonymous display
- **Admin Dashboard**: Full control over seasons, tiers, and reward configuration
- **Discount Code Integration**: Auto-generated and manual discount codes for checkout
- **Unified Credit System Integration**: Credit rewards integrate with the [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md)

---

## Database Schema

The referral system uses 8 interconnected tables:

### Core Tables

| Table | Purpose |
|-------|---------|
| `referral_seasons` | Campaign periods with configurable settings |
| `referral_tiers` | Reward thresholds within seasons |
| `referral_codes` | User-specific referral codes |
| `referrals` | Individual referral tracking records |
| `referral_rewards` | Earned rewards per user |
| `discount_codes` | Generated/manual discount codes |
| `discount_usage` | Discount application history |
| `referral_stats` | Denormalized user statistics |

### Entity Relationship

```
referral_seasons (1) ─────────────── (N) referral_tiers
       │                                      │
       │                                      │
       └──── (N) referral_codes               │
                    │                         │
                    │                         │
                    └──── (N) referrals       │
                              │               │
                              │               │
                              └──── referral_rewards
                                         │
                                         │
                                         └──── discount_codes
                                                    │
                                                    └──── discount_usage
```

---

## Configuration

### Season Setup

Seasons define the active campaign period and configuration:

```sql
INSERT INTO referral_seasons (name, slug, description, start_date, end_date, is_active, is_default, config)
VALUES (
  'Launch Season',
  'launch-2024',
  'Founding member rewards program',
  '2024-01-01',
  '2024-12-31',
  true,
  true,
  '{
    "allow_self_referral": false,
    "min_conversion_value": 0,
    "attribution_window_days": 30,
    "require_email_verification": true
  }'
);
```

**Config Options:**
- `allow_self_referral`: Allow users to use their own codes (default: false)
- `min_conversion_value`: Minimum purchase to count as conversion
- `attribution_window_days`: Days to attribute signup to referrer
- `require_email_verification`: Require verified email for referral credit

### Tier Configuration

Define reward tiers within a season:

```sql
-- Tier 1: Bronze (3 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Bronze Referrer',
  'Unlock 10% discount code',
  3,
  'discount_code',
  '{"percent": 10, "max_uses": 1, "applies_to": "all"}',
  'military_tech',
  '#CD7F32',
  false,
  1
);

-- Tier 2: Silver (5 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Silver Referrer',
  '500 bonus credits',
  5,
  'credits',
  '{"amount": 500}',
  'workspace_premium',
  '#C0C0C0',
  true,
  2
);

-- Tier 3: Gold (10 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Gold Referrer',
  '25% off any purchase',
  10,
  'discount_code',
  '{"percent": 25, "max_uses": 3, "applies_to": "all"}',
  'emoji_events',
  '#FFD700',
  false,
  3
);

-- Tier 4: Platinum (25 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Platinum Referrer',
  'One free month of Pro',
  25,
  'free_month',
  '{"months": 1, "tier": "pro"}',
  'stars',
  '#E5E4E2',
  false,
  4
);

-- Tier 5: Diamond (50 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Diamond Referrer',
  '50% lifetime discount',
  50,
  'discount_code',
  '{"percent": 50, "max_uses": 1, "applies_to": "lifetime"}',
  'diamond',
  '#B9F2FF',
  false,
  5
);

-- Tier 6: Elite (100 referrals)
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
VALUES (
  '<season_id>',
  'Elite Referrer',
  'Free lifetime Pro access',
  100,
  'tier_upgrade',
  '{"tier": "pro", "duration": "lifetime"}',
  'local_fire_department',
  '#FF4500',
  false,
  6
);
```

### Reward Types

| Type | Description | Value Schema |
|------|-------------|--------------|
| `discount_code` | Percentage or fixed discount | `{"percent": 25, "max_uses": 3, "applies_to": "all"}` |
| `credits` | Platform credits | `{"amount": 500}` |
| `free_month` | Free subscription months | `{"months": 1, "tier": "pro"}` |
| `tier_upgrade` | Account tier upgrade | `{"tier": "pro", "duration": "lifetime"}` |
| `custom` | Custom reward | `{"description": "...", "fulfillment": "manual"}` |

---

## API Reference

### Public Endpoints

#### Track Referral Click
```http
POST /api/v1/referral/track
Content-Type: application/json

{
  "code": "JOHN123",
  "utm_source": "twitter",
  "utm_medium": "social",
  "utm_campaign": "launch"
}
```

#### Validate Discount Code
```http
POST /api/v1/referral/discount/validate
Content-Type: application/json

{
  "code": "SAVE50",
  "purchase_type": "lifetime",
  "purchase_amount": 297
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "discount": {
      "type": "percent",
      "value": 50,
      "applies_to": "lifetime"
    },
    "final_amount": 148.50
  }
}
```

#### Get Active Seasons
```http
GET /api/v1/referral/seasons/active
```

#### Get Season Tiers
```http
GET /api/v1/referral/seasons/:seasonId/tiers
```

#### Get Leaderboard
```http
GET /api/v1/referral/leaderboard?limit=10&season_id=<uuid>
```

### Authenticated User Endpoints

#### Get/Generate Referral Code
```http
GET /api/v1/referral/code
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "JOHN123",
    "clicks": 45,
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Get User Stats
```http
GET /api/v1/referral/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_clicks": 150,
    "total_referrals": 25,
    "successful_referrals": 18,
    "pending_referrals": 7,
    "total_conversions": 12,
    "total_conversion_value": 2850.00,
    "total_rewards_earned": 5,
    "total_rewards_claimed": 3,
    "current_tier_id": "uuid",
    "next_tier_id": "uuid",
    "referrals_to_next_tier": 7,
    "leaderboard_rank": 15
  }
}
```

#### Get Referral History
```http
GET /api/v1/referral/history?status=converted&limit=50
Authorization: Bearer <token>
```

#### Get Rewards
```http
GET /api/v1/referral/rewards
Authorization: Bearer <token>
```

#### Claim Reward
```http
POST /api/v1/referral/rewards/:rewardId/claim
Authorization: Bearer <token>
```

#### Register Referral (on signup)
```http
POST /api/v1/referral/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "JOHN123"
}
```

#### Convert Referral (on purchase)
```http
POST /api/v1/referral/convert
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversion_type": "lifetime",
  "conversion_value": 297.00
}
```

#### Apply Discount Code
```http
POST /api/v1/referral/discount/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE50",
  "original_amount": 297.00,
  "product_type": "lifetime",
  "product_id": "pro-lifetime",
  "order_id": "order_123"
}
```

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### Season Management
```http
GET    /api/v1/referral/admin/seasons
POST   /api/v1/referral/admin/seasons
PUT    /api/v1/referral/admin/seasons/:id
DELETE /api/v1/referral/admin/seasons/:id
```

#### Tier Management
```http
GET    /api/v1/referral/admin/tiers?season_id=<uuid>
POST   /api/v1/referral/admin/tiers
PUT    /api/v1/referral/admin/tiers/:id
DELETE /api/v1/referral/admin/tiers/:id
```

#### Analytics
```http
GET /api/v1/referral/admin/stats?season_id=<uuid>&start_date=2024-01-01&end_date=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_codes": 1500,
    "total_clicks": 25000,
    "total_referrals": 3200,
    "successful_referrals": 2100,
    "conversion_rate": 65.6,
    "total_conversion_value": 125000.00,
    "total_rewards_granted": 450,
    "total_rewards_claimed": 380,
    "total_discounts_applied": 520,
    "total_discount_value": 18500.00,
    "top_referrers": [...]
  }
}
```

#### Code & Referral Management
```http
GET /api/v1/referral/admin/codes?user_id=<uuid>&is_active=true
GET /api/v1/referral/admin/referrals?status=pending&referrer_id=<uuid>
```

#### Manual Discount Code Creation
```http
POST /api/v1/referral/admin/discount-codes
Content-Type: application/json

{
  "code": "SPECIAL50",
  "type": "percent",
  "value": 50,
  "applies_to": "all",
  "max_uses": 100,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### Export Data
```http
GET /api/v1/referral/admin/export?format=csv&type=referrals
```

---

## Frontend Integration

### Pinia Store Usage

```typescript
import { useReferralStore } from '@/stores/referral'

const referralStore = useReferralStore()

// Load dashboard data
await referralStore.loadDashboard()

// Get referral link
const link = referralStore.referralLink // https://app.synthstack.io/ref/JOHN123

// Copy link to clipboard
await referralStore.copyReferralLink()

// Check progress
const progress = referralStore.progressToNextTier // 0-100
const nextTier = referralStore.nextTier
const currentTier = referralStore.currentTier

// Claim a reward
await referralStore.claimReward(rewardId)

// Validate discount at checkout
const result = await referralStore.validateDiscount('SAVE50', 'lifetime', 297)
if (result.valid) {
  console.log(`Final amount: $${297 - result.discount.value}`)
}
```

### Referral Link Tracking

The referral tracking flow:

1. User visits `/ref/JOHN123`
2. `ReferralPage.vue` captures the code
3. Click is tracked via API
4. Code stored in localStorage
5. If not authenticated, redirect to signup with `?ref=JOHN123`
6. On successful signup, code is used to attribute referral

```typescript
// In ReferralPage.vue
onMounted(async () => {
  const code = route.params.code as string
  if (code) {
    // Track click
    await referralStore.trackClick(code, {
      source: route.query.utm_source,
      medium: route.query.utm_medium,
      campaign: route.query.utm_campaign,
    })

    // Store for attribution
    localStorage.setItem('referral_code', code)

    // Redirect to signup if not authenticated
    if (!isAuthenticated.value) {
      router.push({ path: '/auth/register', query: { ref: code } })
    }
  }
})
```

### Checkout Integration

Apply discount codes during checkout:

```typescript
// In checkout flow
const discountCode = ref('')
const discountResult = ref<DiscountValidation | null>(null)

async function applyDiscount() {
  discountResult.value = await referralStore.validateDiscount(
    discountCode.value,
    'lifetime',
    originalAmount.value
  )
}

async function completePurchase() {
  if (discountResult.value?.valid) {
    await referralStore.applyDiscount(
      discountCode.value,
      originalAmount.value,
      'lifetime',
      'pro-lifetime',
      orderId
    )
  }
  // Continue with payment...
}
```

---

## Admin Guide

### Creating a New Season

1. Navigate to Admin > Referral System
2. Click "New Season"
3. Configure:
   - Name and slug
   - Start/end dates (leave end blank for indefinite)
   - Set as default if it should be the primary season
   - Configure options (attribution window, etc.)
4. Save and add tiers

### Setting Up Tiers

1. Select the season
2. Click "Add Tier"
3. Configure:
   - Name and description
   - Referrals required
   - Reward type and value
   - Badge icon (Material Icons) and color
   - Whether rewards stack with previous tiers
4. Order tiers by sort_order

### Monitoring Performance

The admin dashboard shows:
- Real-time referral activity
- Conversion funnel (clicks → signups → conversions)
- Revenue attribution
- Top referrers leaderboard
- Reward claim rates

### Managing Discount Codes

- **Auto-generated**: Created when users claim tier rewards
- **Manual**: Create via admin panel for promotions

Manual code creation:
1. Admin > Discount Codes > Create
2. Set code, type, value
3. Configure usage limits and expiration
4. Assign to specific products or "all"

---

## Testing

### Test Mode

During development/test mode:
- All Stripe amounts are $0.00
- Referral tracking still functions
- Rewards are granted but discount codes may not apply to real payments

### Manual Testing Flow

1. **Create test users**: User A (referrer) and User B (referred)
2. **Generate referral code**: Log in as User A, visit /referral
3. **Track click**: Open `/ref/<CODE>` in incognito
4. **Sign up**: Complete registration as User B with code
5. **Verify attribution**: Check User A's referral history
6. **Complete purchase**: As User B, make a purchase
7. **Check conversion**: Verify User A shows converted referral
8. **Claim reward**: If threshold met, claim tier reward
9. **Use discount**: Apply generated discount code

### API Testing with cURL

```bash
# Track a click
curl -X POST http://localhost:3003/api/v1/referral/track \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST123"}'

# Get user stats (authenticated)
curl http://localhost:3003/api/v1/referral/stats \
  -H "Authorization: Bearer <token>"

# Admin: Get overall stats
curl http://localhost:3003/api/v1/referral/admin/stats \
  -H "Authorization: Bearer <admin_token>"
```

---

## Troubleshooting

### Common Issues

**Referral not attributed:**
- Check localStorage for `referral_code`
- Verify attribution window hasn't expired
- Ensure referred user completed email verification

**Discount code invalid:**
- Check code hasn't expired
- Verify max_uses not reached
- Confirm applies_to matches purchase type

**Tier rewards not unlocking:**
- Stats may need refresh (call `fetchStats()`)
- Verify referrals are "successful" not "pending"
- Check tier's `is_active` status

### Logs

Check API logs for referral operations:
```bash
# Filter referral-related logs
docker logs synthstack-api | grep -i referral
```

---

## Migration

### Applying the Schema

```bash
# Run migration
cd services/directus
psql $DATABASE_URL < migrations/016_referral_system.sql
```

### Seeding Default Data

```bash
# Seed default season and tiers
psql $DATABASE_URL < migrations/016_referral_system.sql
```

The migration includes a default "Launch Season" with 6 tiers pre-configured.

---

## Security Considerations

1. **Rate Limiting**: Click tracking is rate-limited to prevent abuse
2. **Self-Referral Prevention**: Users cannot use their own referral codes
3. **Discount Code Security**: Codes are unique, tracked, and limited
4. **Admin-Only Operations**: Season/tier management requires admin role
5. **Attribution Window**: Referrals expire after configurable period
6. **Conversion Validation**: Conversions verified against actual payments

---

## Integration with Unified Credit System

The referral system integrates with SynthStack's [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md) for credit-based rewards.

### How Credit Rewards Work

When a user claims a credit reward (e.g., Silver Tier - 500 credits):

1. The reward is marked as claimed in `referral_rewards`
2. A credit transaction is created in `credit_transactions`
3. The user's credit balance is updated immediately
4. Credits are available for immediate use

### Credit Transaction Example

```sql
-- When claiming a 500 credit referral reward
INSERT INTO credit_transactions (user_id, amount, balance_after, type, source, reference_id)
VALUES (
  'user-uuid',
  500,
  current_balance + 500,
  'referral',
  'referral_silver_tier',
  'reward-uuid'
);
```

### Credit vs. Other Rewards

| Reward Type | Delivery | Expiration | Use |
|-------------|----------|------------|-----|
| Credits | Instant | Never | Any feature |
| Discount Code | Generated | Configurable | Purchases only |
| Free Month | Applied to billing | N/A | Subscription |
| Tier Upgrade | Instant | Duration-based | Account access |

---

## Related Documentation

- [Referral Getting Started Guide](./guides/REFERRAL_GETTING_STARTED.md) - User-facing tutorial
- [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md) - How credits work platform-wide
- [Pricing & Features](./PRICING_AND_FEATURES.md) - Tier comparison and pricing

---

## Future Enhancements

- [ ] Affiliate payouts (cash rewards)
- [ ] Multi-level referrals (friend-of-friend tracking)
- [ ] Custom referral landing pages
- [ ] Email notifications for tier unlocks
- [ ] Referral link analytics (click geography, devices)
- [ ] A/B testing for reward structures
