# Workflow API Keys Setup Guide

Configure API keys and integrations for your SynthStack workflows.

## Overview

SynthStack workflows can connect to dozens of external services. This guide walks you through setting up API keys for the most common integrations.

## Where to Configure Keys

All API keys are managed in **Settings > Integrations** in your SynthStack dashboard.

1. Navigate to **Settings** (gear icon)
2. Click **Integrations**
3. Find the service you want to connect
4. Click **Connect** or **Configure**

## AI Providers

### OpenAI

Required for: `synthstack-agent`, `synthstack-copilot`, AI-powered nodes

**Getting Your Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key (you won't see it again!)

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > OpenAI**
2. Paste your API key
3. Click **Save**

**Supported Models:**
- `gpt-4o` - Most capable, best for complex tasks
- `gpt-4o-mini` - Fast and cost-effective
- `gpt-4-turbo` - Good balance of speed and capability
- `gpt-3.5-turbo` - Fastest, lowest cost

### Anthropic (Claude)

Required for: `synthstack-agent` with Claude models

**Getting Your Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Anthropic**
2. Paste your API key
3. Click **Save**

**Supported Models:**
- `claude-3-5-sonnet-20241022` - Best for most tasks
- `claude-3-opus-20240229` - Most capable
- `claude-3-haiku-20240307` - Fastest

## Messaging Integrations

### Slack

Required for: `synthstack-slack` node

**Setup:**
1. In SynthStack, go to **Settings > Integrations > Slack**
2. Click **Connect with Slack**
3. Select your workspace
4. Authorize the requested permissions:
   - `channels:read` - List channels
   - `chat:write` - Send messages
   - `files:write` - Upload files

**Permissions Needed:**
| Permission | Purpose |
|------------|---------|
| `channels:read` | List available channels |
| `chat:write` | Post messages |
| `files:write` | Upload files |
| `users:read` | Mention users |

**Testing:**
1. Create a simple workflow: Inject → Slack
2. Configure Slack node with a test channel
3. Deploy and trigger
4. Check your Slack channel

### Discord

Required for: `synthstack-discord` node

**Setup:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Go to **Bot** section
4. Click **Add Bot**
5. Under Token, click **Copy**

**Adding Bot to Server:**
1. Go to **OAuth2 > URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Send Messages`, `Embed Links`, `Attach Files`
4. Copy the generated URL
5. Open URL and select your server

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Discord**
2. Paste your bot token
3. Click **Save**

### Twilio (SMS/WhatsApp)

Required for: `synthstack-twilio` node

**Getting Credentials:**
1. Go to [twilio.com/console](https://www.twilio.com/console)
2. Find your **Account SID** and **Auth Token**
3. Get a Twilio phone number (for SMS)

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Twilio**
2. Enter:
   - Account SID
   - Auth Token
   - Default From Number
3. Click **Save**

## Google Integrations

### Google Workspace (Sheets, Drive, Gmail)

Required for: `synthstack-gsheets`, `synthstack-gdrive`, `synthstack-gmail`

**Setup (OAuth):**
1. In SynthStack, go to **Settings > Integrations > Google**
2. Click **Connect with Google**
3. Sign in with your Google account
4. Grant permissions for the services you need:
   - Google Sheets (read/write)
   - Google Drive (read/write)
   - Gmail (send, read)

**Permissions:**
| Service | Scope | Purpose |
|---------|-------|---------|
| Sheets | `spreadsheets` | Read/write spreadsheets |
| Drive | `drive.file` | Access files created by app |
| Gmail | `gmail.send` | Send emails |

**Testing Google Sheets:**
1. Create a test spreadsheet
2. Note the spreadsheet ID from the URL
3. Create workflow: Inject → Google Sheets (read)
4. Use the spreadsheet ID in the node config

## Project Management

### Notion

Required for: `synthstack-notion` node

**Setup:**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it (e.g., "SynthStack")
4. Select your workspace
5. Copy the **Internal Integration Token**

**Connecting to Pages:**
1. Open the Notion page you want to access
2. Click **...** menu > **Add connections**
3. Select your SynthStack integration

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Notion**
2. Paste your integration token
3. Click **Save**

### Jira

Required for: `synthstack-jira` node

**Getting API Token:**
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Name it and copy the token

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Jira**
2. Enter:
   - Jira Domain (e.g., `yourcompany.atlassian.net`)
   - Email (your Atlassian account email)
   - API Token
3. Click **Save**

### GitHub

Required for: `synthstack-github` node

**Getting Personal Access Token:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select scopes:
   - `repo` - Full repository access
   - `workflow` - Workflow actions
4. Copy the token

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > GitHub**
2. Paste your personal access token
3. Click **Save**

## Payments

### Stripe

Required for: `synthstack-stripe` node

**Getting API Keys:**
1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_`)

**Configuration:**
1. In SynthStack, go to **Settings > Integrations > Stripe**
2. Paste your secret key
3. Click **Save**

**Webhook Setup:**
1. Go to **Developers > Webhooks** in Stripe
2. Click **Add endpoint**
3. URL: `https://app.synthstack.app/api/v1/webhooks/stripe`
4. Select events to listen for
5. Copy the **Signing secret**
6. Add to SynthStack integration settings

## Environment Variables

For self-hosted deployments, you can also configure keys via environment variables:

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Messaging
SLACK_BOT_TOKEN=xoxb-...
DISCORD_BOT_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Google (Service Account)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Project Management
NOTION_API_KEY=secret_...
JIRA_API_TOKEN=...
GITHUB_TOKEN=ghp_...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing Your Connections

### Quick Connection Test

For each integration, create a simple test workflow:

```
[Inject] → [Integration Node] → [Debug]
```

1. Configure the integration node with a simple operation
2. Deploy the workflow
3. Trigger the Inject node
4. Check Debug output for success/errors

### Common Test Operations

| Integration | Test Operation | Expected Result |
|-------------|---------------|-----------------|
| OpenAI | Agent with "Say hello" | AI response |
| Slack | Post to test channel | Message appears |
| Discord | Send to test channel | Message appears |
| Google Sheets | Read first row | Row data |
| Notion | Query database | Page list |
| Jira | List projects | Project array |
| GitHub | Get user info | User object |
| Stripe | List customers | Customer array |

## Troubleshooting

### "Invalid API Key" Error

- Double-check the key is copied correctly (no extra spaces)
- Verify the key hasn't been revoked
- Ensure you're using the correct key type (secret vs. publishable)

### "Permission Denied" Error

- Check that OAuth scopes include required permissions
- For Notion: Ensure the integration is added to the page
- For Google: Re-authorize with additional scopes

### "Rate Limited" Error

- Reduce workflow execution frequency
- Add delays between API calls
- Consider upgrading your API plan

### "Connection Timeout" Error

- Check if the service is experiencing outages
- Verify network connectivity
- Try again in a few minutes

## Security Best Practices

1. **Never share API keys** - Each team member should use their own
2. **Use least privilege** - Only grant permissions you need
3. **Rotate keys regularly** - Update keys every 90 days
4. **Monitor usage** - Check API dashboards for unusual activity
5. **Use test mode** - Test with sandbox/test keys when available

## Next Steps

- **[Quick Start Guide](./WORKFLOW_QUICK_START.md)** - Build your first workflow
- **[Workflow Examples](../workflows/README.md)** - See integrations in action
- **[Unified Credit System](../UNIFIED_CREDIT_SYSTEM.md)** - Understand workflow costs

---

**Need help?** Contact support@synthstack.app or ask in the community forum.


