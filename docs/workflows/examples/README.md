# SynthStack Workflow Examples

This directory contains ready-to-import workflow examples for common automation scenarios.

## Available Examples

### Notifications & Messaging

| Example | Description | Integrations |
|---------|-------------|--------------|
| [lead-notification.json](lead-notification.json) | Multi-channel lead notifications | Slack, Discord, Email |
| [slack-notifications.json](slack-notifications.json) | Rich Slack messages with blocks | Slack |

### AI & Content

| Example | Description | Integrations |
|---------|-------------|--------------|
| [ai-content-generation.json](ai-content-generation.json) | AI-powered blog post generation | AI Agents, KB, Notion |
| [customer-support-rag.json](customer-support-rag.json) | RAG-powered support bot | KB Search, Copilot, Slack |

### Integrations & Sync

| Example | Description | Integrations |
|---------|-------------|--------------|
| [google-sheets-sync.json](google-sheets-sync.json) | Bi-directional CRM sync | Google Sheets, Directus |
| [jira-automation.json](jira-automation.json) | Issue management automation | Jira, Directus, Slack |

### Knowledge Base

| Example | Description | Integrations |
|---------|-------------|--------------|
| [knowledge-base-ingestion.json](knowledge-base-ingestion.json) | Multi-source KB ingestion | Drive, Notion, KB Ingest |

## How to Import

### Method 1: Direct Import

1. Open the SynthStack Workflow Editor
2. Click the menu (☰) → **Import** → **Clipboard**
3. Copy the contents of an example JSON file
4. Paste and click **Import**

### Method 2: From Template Library

1. Go to **Workflows** in SynthStack
2. Click **Browse Templates**
3. Find the example you want
4. Click **Install**

## Configuration

After importing, you'll need to configure:

### 1. Environment Variables

Set these in Flow Properties (double-click the flow tab):

```
SLACK_CHANNEL=#your-channel
NOTION_DATABASE_ID=abc123...
JIRA_PROJECT_KEY=PROJ
KB_DRIVE_FOLDER=folder-id
```

### 2. Credentials

Connect integrations in **Settings > Integrations**:
- Slack: OAuth connection
- Google: OAuth connection (Sheets, Drive, Gmail)
- Notion: OAuth connection
- Jira: API token
- Twilio: Account SID + Auth Token
- Discord: Bot token

### 3. Triggers

Configure trigger nodes with your specific:
- Webhook paths
- Directus collections
- Schedule times

## Customization Tips

### Adding Error Handling

Always add error outputs to catch failures:

```
[Node] ──┬── [Success Path]
         └── [Catch] → [Log Error] → [Alert Team]
```

### Using Function Nodes

Transform data between nodes:

```javascript
// Format for Slack
msg.slackMessage = {
  channel: '#alerts',
  text: `New ${msg.payload.type}: ${msg.payload.name}`
};
return msg;
```

### Rate Limiting

For webhook-triggered flows, add delay nodes to prevent overwhelming external APIs:

```
[Webhook] → [Delay 100ms] → [Process] → [Response]
```

## Contributing

Have a useful workflow? Submit it:

1. Export your flow (☰ → Export → Clipboard)
2. Save as `your-flow-name.json`
3. Add description to this README
4. Submit a PR

## Support

- **Docs**: https://docs.synthstack.app/workflows
- **Community**: https://community.synthstack.app
- **Issues**: https://github.com/manicinc/synthstack/issues


