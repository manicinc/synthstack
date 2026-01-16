# BYOK (Bring Your Own Keys) - Frequently Asked Questions

Complete guide to using your own API keys with SynthStack.

---

## Table of Contents

- [General](#general)
- [Getting Started](#getting-started)
- [Supported Providers](#supported-providers)
- [Pricing & Credits](#pricing--credits)
- [Security & Privacy](#security--privacy)
- [Routing Modes](#routing-modes)
- [Rate Limits](#rate-limits)
- [Usage Tracking](#usage-tracking)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

---

## General

### What is BYOK?

**BYOK (Bring Your Own Keys)** is a feature that allows you to use your own API keys from providers like OpenAI and Anthropic with SynthStack, instead of using our internal API keys and credit system.

When you configure BYOK:
- You use your own API quota from OpenAI/Anthropic
- You're billed directly by the provider
- You bypass SynthStack rate limits
- You can use AI features without consuming SynthStack credits

### Who can use BYOK?

BYOK is available to **Premium** and **Lifetime** subscribers only. Free tier users cannot access this feature.

### Why would I use BYOK?

Use BYOK if you:
- Already have API credits with OpenAI or Anthropic
- Want unlimited AI usage without worrying about SynthStack credits
- Need to bypass SynthStack rate limits
- Prefer to be billed directly by AI providers
- Have negotiated custom pricing with providers
- Need guaranteed access even if SynthStack's quota runs low

### What's the difference between BYOK and using credits?

| Feature | BYOK | Credits |
|---------|------|---------|
| **Cost** | Pay provider directly | Pay SynthStack |
| **Quota** | Your provider quota | SynthStack credit balance |
| **Rate Limits** | Provider limits only | SynthStack tier-based limits |
| **Billing** | Provider invoices you | SynthStack subscription/credits |
| **Availability** | Premium+ only | All users |
| **Setup** | Requires API key setup | No setup needed |

---

## Getting Started

### How do I set up BYOK?

1. **Upgrade to Premium** (if not already subscribed)
2. Navigate to **Settings → API Keys**
3. Click on a provider card (OpenAI or Anthropic)
4. Enter your API key from the provider
5. Click **Save Key**
6. The key will be validated automatically

Your API key is encrypted and stored securely in our database.

### Where do I get API keys?

**OpenAI:**
- Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Sign in or create an account
- Click "Create new secret key"
- Copy the key (you won't see it again!)
- Add billing information if not already configured

**Anthropic (Claude):**
- Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- Sign in or create an account
- Click "Create Key"
- Copy the API key
- Ensure you have credits or billing configured

### How do I know my BYOK key is working?

After saving your key, you'll see:
- ✅ **Valid** status chip (green) if the key works
- ❌ **Invalid** status chip (red) if there's an issue

You can also:
1. Click the **Test** button to re-validate the key
2. Check the **Usage (Last 30 Days)** section to see BYOK requests
3. Look for the **"Using BYOK"** chip on the Copilot Dashboard

### Can I use BYOK for some providers and credits for others?

Yes! You can mix and match:
- Add an OpenAI key and use BYOK for GPT models
- Keep using SynthStack credits for Anthropic (Claude) models
- The system automatically routes to BYOK when available

---

## Supported Providers

### Which AI providers are supported?

Currently supported:
- ✅ **OpenAI** (GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o, etc.)
- ✅ **Anthropic** (Claude 3 Opus, Claude 3.5 Sonnet, Claude 3 Haiku)

Coming soon:
- Google (Gemini)
- Cohere
- Mistral AI

### Do all SynthStack features work with BYOK?

Yes! BYOK works with:
- ✅ AI Copilot (chat interface)
- ✅ AI Agents (all agent types)
- ✅ Embeddings generation
- ✅ Text transcription
- ✅ Streaming responses
- ✅ Memory and context retention
- ✅ Document processing
- ✅ Workflow automation

### Can I use multiple API keys from the same provider?

Not yet. Currently, you can only have one active key per provider. If you add a new key for a provider, it replaces the existing one.

### What happens if a provider I configured goes down?

SynthStack will automatically fall back to internal credits (if you have any) for that provider. You'll see a notification about the failover.

The system will retry your BYOK key periodically and switch back when it's available again.

---

## Pricing & Credits

### Do I still need SynthStack credits if I use BYOK?

It depends on the routing mode:

- **BYOK-First (default):** No, you don't need credits if you have BYOK configured
- **Credit-First mode:** Yes, credits are used first, BYOK is fallback
- **BYOK-Only mode:** No credits accepted, BYOK required

For most users, you can use BYOK without any SynthStack credits.

### Will I save money with BYOK?

**It depends** on your usage:

**BYOK may be cheaper if:**
- You have heavy AI usage (>$100/month)
- You use GPT-4 or Claude Opus frequently
- You've negotiated custom pricing with providers

**SynthStack credits may be cheaper if:**
- You have light usage (<$20/month)
- You only use GPT-3.5 or Claude Haiku
- You don't want to manage multiple API accounts

**Example:**
- SynthStack: $50/month for 500,000 credits (~$0.10 per 1K tokens)
- OpenAI GPT-4: $0.03-0.06 per 1K tokens (direct pricing)
- At high volume, BYOK with OpenAI can save ~40-60%

### What happens to my unused SynthStack credits if I switch to BYOK?

Your credits remain in your account. You can:
- Use them for providers you haven't configured BYOK for
- Use them as a fallback if your BYOK key fails
- Keep them for future use (credits don't expire for Premium users)
- Get a refund (contact support for refund policy)

### Does BYOK affect my SynthStack subscription price?

No. Your Premium or Lifetime subscription price remains the same whether you use BYOK or credits.

However, using BYOK means you won't need to purchase additional credit packs, potentially reducing your total AI costs.

---

## Security & Privacy

### How are my API keys stored?

Your API keys are stored with **AES-256 encryption**:
1. Keys are encrypted before being saved to the database
2. Encryption keys are stored separately from the database
3. Keys are only decrypted in-memory when needed for API calls
4. We never log or expose your full API key

What you see in the UI (e.g., `sk-...abc123`) is a hint showing only the last 7 characters.

### What is ENCRYPTION_KEY and how do I set it up? (Self-Hosters)

If you're self-hosting SynthStack, you need to configure the `ENCRYPTION_KEY` environment variable for BYOK to work. This is a 32-byte (256-bit) key used to encrypt all stored API keys using AES-256-GCM.

**To generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to your `.env`:**
```
ENCRYPTION_KEY=<your-64-char-hex-key>
```

Without this key, users cannot save their API keys and BYOK will not function.

**Important:**
- Keep this key secure - if lost, users must re-enter their API keys
- Use different keys for development and production
- Never commit this key to version control

### Can SynthStack employees see my API keys?

**No.** API keys are encrypted in our database and cannot be viewed by anyone, including SynthStack employees.

Only the backend service can decrypt keys to make API calls on your behalf.

### What happens if there's a data breach?

In the unlikely event of a database breach:
- Your API keys are encrypted and cannot be read without the encryption key
- The encryption key is stored in a separate, secured location
- We follow industry best practices (SOC 2 compliance)
- You can revoke and rotate your API keys at any time from the provider's dashboard

**Best practice:** Rotate your API keys periodically (every 90 days).

### Can I delete my API keys?

Yes! You can remove your API keys at any time:
1. Go to **Settings → API Keys**
2. Click **Remove** on any provider card
3. Confirm deletion

The key is immediately deleted from our database and can no longer be used.

### Does SynthStack track what I send to AI models?

**Request logging:** We log metadata (timestamps, model used, token counts) for analytics and billing, but we do **not** log the actual content of your prompts or responses when using BYOK.

**For security and abuse prevention**, we may log:
- API request failures
- Rate limit violations
- Anomalous usage patterns

---

## Routing Modes

### What are the three BYOK routing modes?

SynthStack supports three routing modes (configured by admins):

#### 1. BYOK-First (Default)
- **Use BYOK if you have it configured**
- Fall back to internal credits if BYOK fails or not configured
- Recommended for most users

#### 2. Credit-First
- **Use internal credits first**
- Fall back to BYOK only when credits run out
- Good for users who want to use up credits before BYOK

#### 3. BYOK-Only
- **Only accept BYOK, never use internal keys**
- Fails if BYOK not configured
- Used in enterprise setups where internal keys are disabled

### How do I know which routing mode is active?

Check your **API Keys** page. You'll see a banner at the top showing the current routing mode:

- 🔵 **"Using Your API Keys (BYOK)"** - BYOK is being used
- 🟢 **"Using Internal Credits"** - SynthStack credits are being used
- 🔴 **"Action Required"** - You need to configure BYOK or add credits

### Can I change the routing mode?

Routing modes are set by system administrators and cannot be changed by individual users. Contact your admin or SynthStack support if you need a different routing mode.

### What happens in BYOK-First mode if my key fails?

The system automatically falls back to internal credits (if you have any):
1. BYOK request fails (invalid key, quota exceeded, etc.)
2. System checks if you have SynthStack credits
3. If yes: Retries the request using internal credits
4. If no: Returns a 402 error asking you to fix your BYOK key or add credits

You'll receive a notification about the failover.

---

## Rate Limits

### Are rate limits different with BYOK?

Yes! **BYOK bypasses SynthStack rate limits entirely.**

| Limit Type | Credits | BYOK |
|------------|---------|------|
| **Requests per minute** | Tier-based (10-100) | Unlimited* |
| **Tokens per day** | Tier-based | Unlimited* |
| **Concurrent requests** | 3-10 | Unlimited* |

*Unlimited from SynthStack's perspective, but you're still subject to your provider's rate limits.

### What are the provider rate limits?

Each provider has their own limits:

**OpenAI (as of 2024):**
- Free tier: 3 RPM, 40K TPM
- Pay-as-you-go: 3,500 RPM, 90K TPM (GPT-3.5)
- Usage tier 5: 10,000 RPM, 2M TPM

**Anthropic (Claude):**
- Starter tier: 5 RPM
- Build tier 1: 50 RPM
- Build tier 4: 4,000 RPM

Check your provider's dashboard for current limits.

### What happens if I hit my provider's rate limit?

You'll receive a 429 error from the provider. SynthStack will:
1. Return the error to you with an explanation
2. Not fall back to internal credits (rate limits are expected with BYOK)
3. Suggest waiting and retrying

### Can I use BYOK to get around my SynthStack tier rate limit?

Yes! If you're on the Free or Starter tier with low rate limits, BYOK allows you to bypass those limits entirely (you still need a Premium subscription to enable BYOK).

---

## Usage Tracking

### How is BYOK usage tracked?

BYOK usage is logged separately from internal credit usage:

**BYOK requests** → `api_key_usage` table
**Internal requests** → `credit_transactions` table

You can view your BYOK usage on the **API Keys** page under "Usage (Last 30 Days)".

### Will I be double-charged for BYOK usage?

**No.** When you use BYOK:
- SynthStack does NOT deduct credits
- You're only billed by the AI provider
- We track usage for analytics but don't charge you

### Can I export my BYOK usage data?

Yes! (Feature coming soon)

You'll be able to export usage data as CSV or JSON for:
- Billing reconciliation
- Cost analysis
- Internal chargeback reporting

### How accurate is the cost estimation?

The estimated cost shown on the API Keys page is based on:
- Public provider pricing (may not reflect your custom pricing)
- Token counts from API responses
- Model used for each request

**Accuracy:** ~95% for standard pricing. Check your provider's invoice for exact costs.

---

## Troubleshooting

### Why is my API key showing as "Invalid"?

Common reasons:

1. **Incorrect key format**
   - OpenAI keys start with `sk-`
   - Anthropic keys start with `sk-ant-`

2. **Key has been revoked**
   - Check your provider's dashboard
   - The key may have been deleted or rotated

3. **No billing configured**
   - OpenAI/Anthropic requires billing info
   - Add a payment method to your provider account

4. **Insufficient credits/quota**
   - Your provider account may be out of credits
   - Add funds or upgrade your provider tier

**Fix:** Click **Test** to re-validate or delete and re-add the key.

### Why am I still being charged SynthStack credits?

Check the following:

1. **Is BYOK configured?**
   - Go to API Keys page
   - Verify you see a "Valid" green chip

2. **Which routing mode is active?**
   - Check the banner on API Keys page
   - In "Credit-First" mode, credits are used before BYOK

3. **Is the provider supported?**
   - You may be using a model we don't support yet
   - Check the provider compatibility table above

4. **Did your BYOK key fail?**
   - System falls back to credits if BYOK fails
   - Check usage logs for error messages

### I'm getting "BYOK Required" errors

This happens in **BYOK-Only mode** when you haven't configured BYOK:

**Fix:**
1. Go to **Settings → API Keys**
2. Add your API key for at least one provider
3. Wait for validation to complete
4. Retry your request

If you need to use credits instead, contact your admin to change the routing mode.

### My BYOK key works in the provider's dashboard but not in SynthStack

Potential causes:

1. **API key permissions**
   - Ensure the key has the required scopes (usually default is fine)

2. **IP allowlisting**
   - If you've restricted your API key to specific IPs, add SynthStack's IPs
   - Contact support for our IP ranges

3. **Organization mismatch**
   - Ensure the API key is from the correct organization
   - Anthropic and OpenAI support multiple orgs per account

4. **Caching issue**
   - Try deleting and re-adding the key
   - Clear your browser cache

**Still stuck?** Contact support with:
- Last 7 characters of your API key
- Error message you're seeing
- Provider (OpenAI/Anthropic)

### How often are BYOK keys validated?

- **On save:** Immediate validation when you add a key
- **On use:** Validation happens with every API request
- **Scheduled:** Keys are re-validated every 24 hours
- **Manual:** Click "Test" button anytime to re-validate

If a key becomes invalid, you'll receive an email notification.

---

## Advanced Topics

### Can I use BYOK in API/programmatic access?

Yes! BYOK works transparently with SynthStack's API:

```bash
# No changes needed - BYOK is automatic
curl -X POST https://api.synthstack.ai/v1/copilot/chat \
  -H "Authorization: Bearer YOUR_SYNTHSTACK_TOKEN" \
  -d '{ "message": "Hello!" }'
```

The system automatically uses your BYOK key if configured.

### Can I set different keys for different projects/teams?

Not yet. BYOK keys are per-user, not per-project. All your projects will use the same BYOK key.

**Workaround:** Create separate SynthStack accounts for different teams.

**Coming soon:** Organization-level BYOK with project-specific keys.

### Do BYOK keys work with fine-tuned models?

Yes! If you've fine-tuned a model with OpenAI or Anthropic:
1. Add your API key to SynthStack BYOK
2. Specify the fine-tuned model name in your request
3. BYOK will use your custom model

### Can I use BYOK with Azure OpenAI?

Not yet. We currently only support direct OpenAI API keys.

**Coming soon:** Azure OpenAI integration with custom endpoint support.

### How does BYOK affect streaming responses?

BYOK works identically with streaming:
- Same latency as provider direct API
- No additional buffering or delays
- Tokens still counted for usage tracking

### Can admins disable BYOK for my account?

Yes. System administrators can:
- Disable BYOK globally (affects all users)
- Change routing modes
- Set BYOK-Only mode (force BYOK usage)

If BYOK is disabled, you'll see a message on the API Keys page and automatically fall back to credits.

### What happens to BYOK if I downgrade from Premium?

If you downgrade to Free tier:
1. BYOK keys remain in the database (encrypted)
2. BYOK functionality is disabled
3. All requests use internal credits (subject to Free tier limits)
4. If you re-upgrade to Premium, your keys are re-enabled automatically

### Can I use the same API key on SynthStack and other platforms?

**Yes**, but be aware:
- Usage from SynthStack counts toward your provider quota
- Rate limits are shared across all platforms using the key
- You may hit limits faster if using the key in multiple places

**Best practice:** Create separate API keys for different platforms for better usage tracking.

### Is there a BYOK webhook/event system?

Not yet, but coming soon:

- **`byok.key_invalid`** - Fires when a key fails validation
- **`byok.quota_warning`** - Fires when approaching provider quota
- **`byok.fallback`** - Fires when falling back to credits

Subscribe to events via webhooks for automated alerting.

---

## Need More Help?

**Documentation:**
- [BYOK Admin Guide](./admin/byok-feature-flags.md)
- [BYOK Testing Guide](./testing/BYOK_TESTING.md)
- [Pricing & Features](./PRICING_AND_FEATURES.md)

**Support:**
- Email: support@synthstack.ai
- In-app chat: Click the help icon (bottom right)
- Community: [community.synthstack.ai](https://community.synthstack.ai)

**Provider Documentation:**
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
