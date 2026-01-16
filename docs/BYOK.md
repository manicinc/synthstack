# Bring Your Own Keys (BYOK)

BYOK allows Premium and Lifetime subscribers to use their own AI provider API keys, enabling unlimited usage without platform rate limits.

## Overview

With BYOK, you can:
- Use your own OpenAI or Anthropic API keys
- Bypass platform rate limits (you pay the AI provider directly)
- Keep full control over your AI costs
- Access all 6 AI Cofounder agents

## Server Setup (Required for Self-Hosting)

Before BYOK can work, you must configure the encryption key on your server:

### 1. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a 64-character hex string (32 bytes for AES-256).

### 2. Add to Environment

Add to your `.env` file:

```
ENCRYPTION_KEY=<your-64-char-hex-key>
```

### 3. Security Notes

- This key encrypts all stored user API keys using AES-256-GCM
- **Keep it secure** - if lost, users must re-enter their API keys
- Use different keys for development and production
- Never commit the key to version control

## Supported Providers

| Provider | Models | Key Format |
|----------|--------|------------|
| OpenAI | GPT-4, GPT-4 Turbo, GPT-3.5 | `sk-...` |
| Anthropic | Claude 3 Opus, Sonnet, Haiku | `sk-ant-...` |

## Getting API Keys

### OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Navigate to API Keys
4. Click "Create new secret key"
5. Copy the key (it won't be shown again)

### Anthropic

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to API Keys
4. Click "Create Key"
5. Copy the key

## Adding Keys to SynthStack

1. Navigate to **Settings > API Keys** in your account
2. Select the provider (OpenAI or Anthropic)
3. Paste your API key
4. Click "Save Key"

The key will be:
- Encrypted with AES-256-GCM before storage
- Validated against the provider's API
- Never visible in full again (only last 4 characters shown)

## Security

### Encryption

All API keys are encrypted using AES-256-GCM with a server-side encryption key. The key never leaves the server in plaintext.

```
Your key: sk-abc123...xyz789
Stored as: encrypted_blob + nonce
Displayed: ****...789
```

### Key Validation

When you add a key, SynthStack validates it:

- **OpenAI**: Makes a request to `/v1/models`
- **Anthropic**: Makes a minimal request to `/v1/messages`

If validation fails, the key is still saved but marked as invalid.

### Automatic Key Selection

When making AI requests, SynthStack:

1. Checks if you have a valid BYOK key for the provider
2. If yes, uses your key (no platform rate limits)
3. If no, falls back to platform keys (with rate limits)

## Rate Limits

### With BYOK

When using your own keys, there are no platform rate limits. You're only limited by:
- Your provider's rate limits
- Your provider's spending limits

### Without BYOK

Standard platform rate limits apply:

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Community | 10 | 100 |
| Subscriber | 30 | 500 |
| Premium | 100 | 2,000 |
| Lifetime | 100 | 2,000 |

## Usage Tracking

SynthStack tracks your BYOK usage for your reference:

- Total requests
- Total tokens used
- Estimated cost (based on public pricing)

View your usage at **Settings > API Keys > Usage**.

Note: This is an estimate. Actual costs depend on your provider agreement.

## Cost Comparison

Approximate costs per 1M tokens:

| Model | Input | Output |
|-------|-------|--------|
| GPT-4 Turbo | $10 | $30 |
| GPT-4 | $30 | $60 |
| GPT-3.5 Turbo | $0.50 | $1.50 |
| Claude 3 Opus | $15 | $75 |
| Claude 3 Sonnet | $3 | $15 |
| Claude 3 Haiku | $0.25 | $1.25 |

## Troubleshooting

### Key Shows Invalid

1. Verify the key is correct and hasn't expired
2. Check your provider account for any issues
3. Ensure you have API access enabled
4. Try the "Test Key" button

### Requests Failing

1. Check your provider's usage dashboard
2. Verify you haven't hit spending limits
3. Ensure the key has necessary permissions

### Key Not Being Used

1. Confirm the key is marked as "Active"
2. Ensure you're using a supported provider
3. Check that the key status is "Valid"

## API Reference

### Add API Key

```bash
POST /api/v1/api-keys
Authorization: Bearer <jwt>

{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

### List API Keys

```bash
GET /api/v1/api-keys
Authorization: Bearer <jwt>
```

Response:
```json
{
  "keys": [
    {
      "id": "uuid",
      "provider": "openai",
      "keyHint": "****...abc1",
      "isValid": true,
      "isActive": true,
      "totalRequests": 150,
      "totalTokens": 50000
    }
  ]
}
```

### Test API Key

```bash
POST /api/v1/api-keys/:id/test
Authorization: Bearer <jwt>
```

### Delete API Key

```bash
DELETE /api/v1/api-keys/:id
Authorization: Bearer <jwt>
```

## FAQ

**Q: Can I use multiple keys for the same provider?**
A: No, one key per provider. Adding a new key replaces the old one.

**Q: Are my keys shared with anyone?**
A: No. Keys are encrypted and used only for your requests.

**Q: What happens if my key expires?**
A: Requests fall back to platform keys (with rate limits). Update your key in settings.

**Q: Can I see my full API key after adding it?**
A: No. For security, only the last 4 characters are ever displayed.

**Q: Will my key work if my subscription expires?**
A: BYOK is a Premium/Lifetime feature. If your subscription expires, your keys remain stored but won't be used until you resubscribe.
