# Demo Credit System

## Overview

The Demo Credit System provides a free trial experience for guest users to try the SynthStack AI Copilot without requiring registration. Users receive **5 AI messages** per session to test the platform's capabilities.

## Features

- **5 Free Messages**: Each demo session gets 5 copilot credits
- **Session-Based Tracking**: Credits persist across page refreshes using localStorage
- **7-Day Expiration**: Sessions expire after 7 days of inactivity
- **Visual Feedback**: Progressive notifications as credits deplete
- **24-Hour Cooldown**: After depletion, users must wait 24 hours or upgrade

## User Experience

### Credit Lifecycle

#### 1. Session Initialization
When a user first opens the copilot:
- A new session is created with 5 credits
- Session ID is stored in localStorage
- Welcome notification displays credit count

#### 2. Credit Usage (5 → 2 credits)
- Each AI message deducts 1 credit
- Silently tracks usage
- No interruptions to user experience

#### 3. Low Credits Warning (1 credit remaining)
**Banner Display:**
```
⚠️ 1 AI message remaining                [Upgrade] [×]
```

**Features:**
- Appears at top of copilot interface
- Dismissible for current session
- Includes upgrade CTA

#### 4. Credits Depleted (0 credits)
**Modal Display:**
```
┌─────────────────────────────────────────────┐
│         🎯 AI Credits Depleted              │
├─────────────────────────────────────────────┤
│ You've used all 5 demo AI messages.        │
│ Upgrade to continue using AI features.      │
│                                              │
│      [Upgrade to Premium]  [Maybe Later]    │
└─────────────────────────────────────────────┘
```

**Behavior:**
- Translucent modal overlay
- Blocks new messages
- Dismissible (can close without upgrading)
- Includes "try again in X hours" if blocked

#### 5. Blocked Period (24 hours)
After depletion:
- Session is blocked for 24 hours
- "Try again in Xh Ym" message shown
- User can still browse but not send messages
- Upgrade option available

## Technical Implementation

### Architecture

```
┌─────────────┐
│   Browser   │
│  ┌────────┐ │      ┌──────────────┐      ┌──────────────┐
│  │Copilot │ │─────▶│  API Gateway │─────▶│  PostgreSQL  │
│  │Widget  │ │◀─────│              │◀─────│demo_sessions │
│  └────────┘ │      └──────────────┘      └──────────────┘
│      │      │
│      ▼      │
│ localStorage│
│  sessionId  │
└─────────────┘
```

### Database Schema

**Table: `demo_sessions`**
```sql
CREATE TABLE demo_sessions (
  session_id VARCHAR(64) PRIMARY KEY,

  -- Copilot Credits
  copilot_credits_remaining INTEGER DEFAULT 5,
  copilot_credits_used INTEGER DEFAULT 0,
  copilot_last_used_at TIMESTAMPTZ,
  copilot_blocked_until TIMESTAMPTZ,

  -- Session Management
  ip_address INET,
  user_agent TEXT,
  fingerprint VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
```

**Table: `copilot_usage_log`**
```sql
CREATE TABLE copilot_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_session_id VARCHAR(64) REFERENCES demo_sessions(session_id),
  message_type VARCHAR(50) DEFAULT 'chat',
  credits_deducted INTEGER DEFAULT 1,
  scope VARCHAR(50) DEFAULT 'global',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

#### POST /api/v1/demo/session
Create or restore a demo session.

**Request:**
```json
{
  "fingerprint": "optional-browser-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123def456",
  "copilot_credits_remaining": 5,
  "copilot_credits_used": 0,
  "expires_at": "2026-01-13T10:00:00Z",
  "expiresIn": "7 days"
}
```

#### GET /api/v1/demo/session/:sessionId
Get current session status.

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123def456",
  "copilot_credits_remaining": 3,
  "copilot_credits_used": 2,
  "copilot_last_used_at": "2026-01-06T15:30:00Z",
  "copilot_blocked_until": null,
  "expires_at": "2026-01-13T10:00:00Z"
}
```

#### POST /api/v1/demo/deduct-credit
Deduct one credit from the session.

**Request:**
```json
{
  "sessionId": "abc123def456",
  "feature": "copilot_messages"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "creditsRemaining": 4,
  "creditsUsed": 1
}
```

**Depleted Response (429):**
```json
{
  "success": false,
  "error": "No credits remaining",
  "blockedUntil": "2026-01-07T15:30:00Z",
  "message": "All 5 demo messages used. Upgrade to continue."
}
```

**Blocked Response (429):**
```json
{
  "success": false,
  "error": "Rate limited",
  "blockedUntil": "2026-01-07T15:30:00Z",
  "message": "Demo credits depleted. Please upgrade for unlimited access."
}
```

### Frontend Store

**File:** `apps/web/src/stores/demoCredits.ts`

```typescript
import { useDemoCreditsStore } from 'src/stores/demoCredits'

const store = useDemoCreditsStore()

// Initialize session
await store.initializeSession()

// Check if user can send message
if (store.hasCredits) {
  // Deduct credit before sending
  const success = await store.deductCredit()
  if (success) {
    // Send AI message
  }
}

// Get status
console.log(store.creditsRemaining) // 4
console.log(store.isLowCredits) // false
console.log(store.isBlocked) // false
```

**State:**
- `sessionId`: Current session identifier
- `creditsRemaining`: Number of credits left (0-5)
- `creditsUsed`: Number of credits consumed
- `isBlocked`: Whether session is rate-limited
- `blockedUntil`: Date when block expires
- `loading`: API request in progress
- `error`: Last error message

**Computed:**
- `hasCredits`: User can send messages
- `isLowCredits`: Exactly 1 credit remaining
- `showLowCreditsBanner`: Should show warning banner
- `timeUntilUnblocked`: Human-readable unblock time

**Actions:**
- `initializeSession()`: Create or restore session
- `deductCredit()`: Use one credit
- `refreshSession()`: Sync with server
- `resetSession()`: Clear session data

### UI Components

**Component:** `CreditsBanner.vue`
- Shows when 1 credit remaining
- Dismissible for current session
- Includes upgrade CTA
- Persists dismissed state in sessionStorage

**Component:** `CopilotWidget.vue` (integration)
```vue
<template>
  <div class="copilot-panel">
    <!-- Low Credits Banner -->
    <CreditsBanner
      v-if="isDemoUser && demoCreditsStore.isLowCredits"
      @upgrade="goToPricing"
    />

    <!-- Messages -->
    <div class="messages">...</div>

    <!-- Input -->
    <div class="input">
      <button @click="handleSend" :disabled="!demoCreditsStore.hasCredits">
        Send
      </button>
    </div>
  </div>
</template>

<script setup>
import { useDemoCreditsStore } from 'src/stores/demoCredits'
import CreditsBanner from './CreditsBanner.vue'

const demoCreditsStore = useDemoCreditsStore()
const isDemoUser = computed(() => !featureStore.hasAICofounders)

async function handleSend(message) {
  // Check credits for demo users
  if (isDemoUser.value) {
    if (!demoCreditsStore.hasCredits) {
      demoCreditsStore.showDepletedModal()
      return
    }

    const success = await demoCreditsStore.deductCredit()
    if (!success) {
      return
    }
  }

  // Send message to AI
  await sendMessage(message)
}
</script>
```

## Configuration

### Environment Variables

```bash
# API Gateway
API_URL=http://localhost:3003/api/v1
PUBLIC_URL=https://synthstack.app

# Demo Settings
DEMO_CREDITS_INITIAL=5
DEMO_SESSION_DURATION_DAYS=7
DEMO_BLOCK_DURATION_HOURS=24
```

### Feature Flags

```sql
-- Disable demo credits system
UPDATE feature_flags
SET enabled = false
WHERE slug = 'demo_copilot_credits';

-- Adjust initial credits
UPDATE demo_limits
SET max_count = 10
WHERE feature = 'copilot_messages';
```

## Security Considerations

### Abuse Prevention

1. **IP-Based Tracking**: Sessions are tied to IP address
2. **Browser Fingerprinting**: Optional fingerprinting for better identification
3. **24-Hour Cooldown**: Prevents rapid session creation
4. **Session Expiration**: 7-day auto-cleanup
5. **Rate Limiting**: Server-side enforcement

### Data Privacy

- No personal information collected
- IP addresses hashed for privacy
- Sessions auto-deleted after expiration
- localStorage can be cleared by user

## Testing

### Unit Tests
- **File**: `apps/web/src/stores/demoCredits.spec.ts`
- **Coverage**: 27 tests covering all store functionality

### Component Tests
- **File**: `apps/web/src/components/copilot/CreditsBanner.spec.ts`
- **Coverage**: 10 tests for banner rendering and interactions

### Integration Tests
- **File**: `packages/api-gateway/src/routes/demo.spec.ts`
- **Coverage**: API endpoints and full credit lifecycle

### Manual Testing Checklist

- [ ] Create new session and verify 5 credits
- [ ] Send 4 messages and verify banner appears
- [ ] Send 5th message and verify modal appears
- [ ] Try to send 6th message and verify blocked
- [ ] Wait for block to expire and verify can send again
- [ ] Dismiss banner and verify it doesn't reappear
- [ ] Close modal and verify can dismiss without upgrading
- [ ] Refresh page and verify session persists
- [ ] Clear localStorage and verify new session created

## Metrics & Analytics

### Key Metrics to Track

1. **Conversion Metrics:**
   - Demo to paid conversion rate
   - Credits remaining at upgrade
   - Time between first message and upgrade

2. **Usage Metrics:**
   - Average credits used per session
   - Sessions that use all 5 credits
   - Sessions that stop after 1-2 credits

3. **UX Metrics:**
   - Banner dismiss rate
   - Modal dismiss vs upgrade rate
   - Time spent in blocked state

### Database Queries

**Sessions by credit usage:**
```sql
SELECT
  copilot_credits_used,
  COUNT(*) as session_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM demo_sessions
GROUP BY copilot_credits_used
ORDER BY copilot_credits_used;
```

**Conversion funnel:**
```sql
SELECT
  'Total Sessions' as stage,
  COUNT(*) as count
FROM demo_sessions
UNION ALL
SELECT
  'Used Any Credits' as stage,
  COUNT(*)
FROM demo_sessions
WHERE copilot_credits_used > 0
UNION ALL
SELECT
  'Used All Credits' as stage,
  COUNT(*)
FROM demo_sessions
WHERE copilot_credits_used >= 5;
```

## Troubleshooting

### User Can't Send Messages

**Symptoms:**
- Send button disabled
- No credits showing

**Solutions:**
1. Check localStorage for `synthstack_copilot_session_id`
2. Verify session exists in database and hasn't expired
3. Check if session is blocked (`copilot_blocked_until`)
4. Check browser console for API errors

### Credits Not Deducting

**Symptoms:**
- Messages sent but credits stay at 5

**Solutions:**
1. Check API endpoint is being called (`/demo/deduct-credit`)
2. Verify response shows success
3. Check database transaction completed
4. Check store state is updating after API call

### Banner Not Showing

**Symptoms:**
- User has 1 credit but banner doesn't appear

**Solutions:**
1. Check `isBlocked` is false
2. Check banner hasn't been dismissed (`sessionStorage`)
3. Verify component is rendered in CopilotWidget
4. Check computed `isLowCredits` is returning true

### Session Expired

**Symptoms:**
- 404 error when checking session status

**Solutions:**
1. Session has expired after 7 days
2. Create new session automatically
3. Notify user their demo has reset

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Send email when 1 credit remaining (if user has account)
   - Include referral code for earning more credits

2. **Referral System**
   - Share referral links
   - Earn 1 bonus credit per referral click
   - Earn 5 bonus credits per referral signup

3. **Progressive Disclosure**
   - Show feature highlights during depletion
   - Offer premium preview features

4. **A/B Testing**
   - Test different credit amounts (3 vs 5 vs 10)
   - Test modal vs inline upgrade prompts
   - Test upgrade messaging

### Potential Improvements

- Implement smart retry with exponential backoff
- Add webhook notifications for depleted sessions
- Create admin dashboard for credit management
- Allow manual credit top-ups for specific sessions
- Add credit purchase option for non-subscribers

## Related Documentation

- [API Gateway README](../packages/api-gateway/README.md)
- [Frontend README](../apps/web/README.md)
- [Client Portal Guide](./CLIENT_PORTAL_GUIDE.md)

## Support

For questions or issues:
- GitHub Issues: https://github.com/manicinc/synthstack/issues
- Email: support@synthstack.app
- Documentation: https://docs.synthstack.app
