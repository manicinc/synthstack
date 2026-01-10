# SynthStack Workflows Documentation

SynthStack Workflows is a powerful visual automation engine built on Node-RED, enabling you to create sophisticated business automations without writing code.

> **New to Workflows?** Start with our [5-Minute Quick Start Guide](../guides/WORKFLOW_QUICK_START.md)!

## Quick Links

- [Quick Start Guide](../guides/WORKFLOW_QUICK_START.md) - Build your first workflow in 5 minutes
- [API Keys Setup](../guides/WORKFLOW_API_KEYS_SETUP.md) - Configure integrations
- [Template Gallery](./examples/templates.json) - Browse ready-to-use templates
- [LangGraph User Guide](../LANGGRAPH_USER_GUIDE.md) - AI features and approvals

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Custom Nodes](#custom-nodes)
4. [Integration Guides](#integration-guides)
5. [Example Flows](#example-flows)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Workflow Editor

1. Navigate to **Workflows** in the SynthStack app
2. Click **Open Editor** to launch the visual workflow builder
3. The editor opens in a new tab with your organization's workspace

### Your First Workflow

1. Drag an **Inject** node from the palette to the canvas
2. Drag a **Debug** node next to it
3. Connect them by dragging from the output port to the input port
4. Click **Deploy** to save and activate your workflow
5. Click the button on the Inject node to trigger it
6. Check the Debug panel to see the output

---

## Core Concepts

### Flows
A flow is a collection of connected nodes that work together. Each tab in the editor represents a separate flow.

### Nodes
Nodes are the building blocks of workflows. Each node performs a specific function:
- **Input nodes** - Start a flow (triggers, webhooks)
- **Processing nodes** - Transform or route data
- **Output nodes** - Send data somewhere (email, API, database)

### Messages
Data flows between nodes as messages (`msg` objects). The primary data is in `msg.payload`.

### Context
Store data that persists across executions:
- **Node context** - Private to a single node
- **Flow context** - Shared within a flow
- **Global context** - Shared across all flows

---

## Custom Nodes

SynthStack provides custom nodes designed for your business needs:

### SynthStack Agent
Invoke AI co-founders (CEO, CTO, CMO, etc.) to analyze, plan, or generate content.

```
Input: msg.payload = "Analyze our Q4 sales performance"
Output: msg.payload = { analysis: "...", recommendations: [...] }
```

### SynthStack Directus
Perform CRUD operations on your Directus CMS collections.

```
Operations: create, read, update, delete, query
Input: msg.payload = { collection: "projects", data: {...} }
```

### SynthStack Copilot
RAG-augmented Q&A using your knowledge base.

```
Input: msg.payload = "How do I configure PETG settings?"
Output: msg.payload = { answer: "...", sources: [...] }
```

### SynthStack Trigger
Receive webhooks and events from external services.

```
Triggers: webhook, schedule, directus_event, stripe_event
Output: msg.payload = <event data>
```

### KB Ingest
Ingest documents into the knowledge base for RAG.

```
Sources: url, text, gdrive, notion, file
Input: msg.payload = "https://docs.example.com/guide"
Output: msg.payload = { chunksCreated: 42, collectionName: "..." }
```

### KB Search
Search the knowledge base using semantic similarity.

```
Input: msg.payload = "retraction settings for PETG"
Output: msg.payload = { results: [...], context: "..." }
```

---

## Integration Guides

### Slack Integration

**Setup:**
1. Go to **Settings > Integrations** and click **Connect** on Slack
2. Authorize the requested permissions (channels:read, chat:write, files:write)
3. Use the **Slack** node in your workflows

**Operations:**
- `postMessage` - Send a message to a channel
- `postThread` - Reply to a thread
- `uploadFile` - Upload a file to a channel
- `updateMessage` - Edit an existing message

**Example: Post rich message with blocks**
```json
{
  "channel": "#sales",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🎉 New Order!" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Order:* {{msg.order.id}}" },
        { "type": "mrkdwn", "text": "*Amount:* ${{msg.order.total}}" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View Order" },
          "url": "https://app.synthstack.app/orders/{{msg.order.id}}"
        }
      ]
    }
  ]
}
```

### Discord Integration

**Setup:**
1. Create a Discord bot at https://discord.com/developers
2. Add bot token in **Settings > Integrations**
3. Invite bot to your server with appropriate permissions
4. Use the **Discord** node in your workflows

**Operations:**
- `sendMessage` - Send a text message
- `sendEmbed` - Send a rich embed message
- `sendFile` - Upload a file

**Example: Send embed**
```json
{
  "channelId": "123456789",
  "embed": {
    "title": "New Lead Alert",
    "color": 0x00ff00,
    "fields": [
      { "name": "Name", "value": "{{msg.lead.name}}", "inline": true },
      { "name": "Company", "value": "{{msg.lead.company}}", "inline": true }
    ],
    "timestamp": "{{msg.timestamp}}"
  }
}
```

### Google Sheets Integration

**Setup:**
1. Connect Google in **Settings > Integrations**
2. Grant access to Google Sheets and Drive
3. Use the **Google Sheets** node

**Operations:**
- `readRows` - Read rows from a range
- `appendRow` - Add a new row
- `updateRow` - Update existing row
- `deleteRow` - Delete a row
- `createSheet` - Create a new sheet

**Example: Append row**
```json
{
  "operation": "appendRow",
  "spreadsheetId": "1abc...",
  "range": "Orders!A:E",
  "values": [
    "{{msg.order.id}}",
    "{{msg.order.customer}}",
    "{{msg.order.total}}",
    "{{msg.order.status}}",
    "{{msg.timestamp}}"
  ]
}
```

### Google Drive Integration

**Setup:**
1. Connect Google in **Settings > Integrations**
2. Grant access to Google Drive
3. Use the **Google Drive** node

**Operations:**
- `listFiles` - List files in a folder
- `readFile` - Download file content
- `createFile` - Upload a new file
- `updateFile` - Update existing file
- `deleteFile` - Delete a file

**Example: List files for KB ingestion**
```json
{
  "operation": "listFiles",
  "folderId": "{{env.KB_FOLDER_ID}}",
  "mimeTypes": ["application/pdf", "text/plain"],
  "orderBy": "modifiedTime desc"
}
```

### Notion Integration

**Setup:**
1. Connect Notion in **Settings > Integrations**
2. Select the pages/databases to share with the integration
3. Use the **Notion** node

**Operations:**
- `queryDatabase` - Query a database with filters
- `createPage` - Create a new page
- `updatePage` - Update page properties
- `getPage` - Get page content
- `appendBlocks` - Add content blocks to a page

**Example: Create page with properties**
```json
{
  "operation": "createPage",
  "databaseId": "abc123...",
  "properties": {
    "Name": { "title": [{ "text": { "content": "{{msg.title}}" } }] },
    "Status": { "select": { "name": "To Do" } },
    "Priority": { "select": { "name": "High" } },
    "Due Date": { "date": { "start": "{{msg.dueDate}}" } }
  },
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{ "text": { "content": "{{msg.description}}" } }]
      }
    }
  ]
}
```

### Twilio Integration

**Setup:**
1. Add your Twilio credentials in **Settings > Integrations**
2. Enter your Account SID and Auth Token
3. Configure your Twilio phone number
4. Use the **Twilio** node

**Operations:**
- `sendSms` - Send an SMS message
- `makeCall` - Initiate a voice call
- `sendWhatsApp` - Send WhatsApp message

**Example: Send SMS with status callback**
```json
{
  "operation": "sendSms",
  "to": "+1234567890",
  "body": "🚨 ALERT: {{msg.alert.title}}\n\n{{msg.alert.message}}\n\nRespond within 15 minutes.",
  "statusCallback": "https://app.synthstack.app/webhooks/twilio/status"
}
```

### Gmail Integration

**Setup:**
1. Connect Google in **Settings > Integrations**
2. Grant access to Gmail (send, read, modify)
3. Use the **Gmail** node

**Operations:**
- `send` - Send a new email
- `reply` - Reply to an email
- `search` - Search emails
- `getThread` - Get email thread

**Example: Send email with template**
```json
{
  "operation": "send",
  "to": "{{msg.customer.email}}",
  "subject": "Your order #{{msg.order.id}} has shipped!",
  "html": "<h1>Thanks for your order!</h1><p>Track your package: {{msg.tracking.url}}</p>",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "{{msg.invoice.base64}}"
    }
  ]
}
```

### Jira Integration

**Setup:**
1. Add your Jira credentials in **Settings > Integrations**
2. Enter your Jira domain, email, and API token
3. Use the **Jira** node

**Operations:**
- `createIssue` - Create a new issue
- `updateIssue` - Update issue fields
- `transitionIssue` - Change issue status
- `addComment` - Add a comment
- `searchIssues` - Search with JQL

**Example: Create issue**
```json
{
  "operation": "createIssue",
  "projectKey": "BUG",
  "issueType": "Bug",
  "summary": "{{msg.bug.title}}",
  "description": "{{msg.bug.description}}",
  "priority": "High",
  "labels": ["user-reported", "{{msg.bug.category}}"]
}
```

### GitHub Integration

**Setup:**
1. Create a GitHub personal access token or OAuth app
2. Add credentials in **Settings > Integrations**
3. Use the **GitHub** node

**Operations:**
- `createIssue` - Create an issue
- `createPR` - Create a pull request
- `addComment` - Comment on issue/PR
- `getRepo` - Get repository info
- `listCommits` - List recent commits

**Example: Create issue from bug report**
```json
{
  "operation": "createIssue",
  "owner": "{{env.GITHUB_ORG}}",
  "repo": "{{env.GITHUB_REPO}}",
  "title": "[Bug] {{msg.bug.title}}",
  "body": "## Description\n{{msg.bug.description}}\n\n## Steps to Reproduce\n{{msg.bug.steps}}\n\n---\nReported via SynthStack",
  "labels": ["bug", "triage"]
}
```

### Stripe Integration

**Setup:**
1. Add your Stripe API keys in **Settings > Integrations**
2. Configure webhook endpoint in Stripe dashboard
3. Use the **Stripe** node

**Operations:**
- `createCustomer` - Create a customer
- `createSubscription` - Create a subscription
- `createInvoice` - Create an invoice
- `getPaymentIntent` - Get payment details

**Example: Handle successful payment**
```json
{
  "operation": "getPaymentIntent",
  "paymentIntentId": "{{msg.payload.data.object.id}}"
}
```

---

## Example Flows

Complete example flows are available in the `examples/` directory. Import them directly into your workflow editor.

### Available Examples

| Flow | Description | File |
|------|-------------|------|
| Lead Notification | Multi-channel notifications (Slack, Discord, Email) | [lead-notification.json](examples/lead-notification.json) |
| AI Content Generation | Generate blog posts with AI agents | [ai-content-generation.json](examples/ai-content-generation.json) |
| Customer Support RAG | RAG-powered support bot with escalation | [customer-support-rag.json](examples/customer-support-rag.json) |
| Slack Notifications | Rich Slack messages with blocks | [slack-notifications.json](examples/slack-notifications.json) |
| Google Sheets Sync | Bi-directional CRM sync | [google-sheets-sync.json](examples/google-sheets-sync.json) |
| Jira Automation | Issue creation and status sync | [jira-automation.json](examples/jira-automation.json) |
| KB Ingestion | Ingest from Drive/Notion to KB | [knowledge-base-ingestion.json](examples/knowledge-base-ingestion.json) |

### Quick Start Examples

#### 1. Lead Notification Flow

When a new lead is captured, notify the sales team via Slack and create a task in Notion.

```
[Trigger: Lead Created] → [Format Lead] → [Slack: #sales]
                                       → [Discord: sales-leads]
                                       → [Email: sales@company.com]
```

#### 2. AI Content Generation Pipeline

Generate blog content using AI agents, optimize for SEO, and publish.

```
[HTTP Request] → [Validate] → [KB Search] → [AI: Outline] → [AI: Draft] → [AI: SEO] → [Save to CMS] → [Notion Sync]
```

#### 3. Customer Support RAG Flow

Answer customer questions using the knowledge base with human escalation.

```
[Webhook] → [KB Search] → [Check Results?]
                              ├─ Yes → [Generate Answer] → [Confidence Check]
                              │                                ├─ High → [Return Answer]
                              │                                └─ Low → [Create Ticket] → [Notify Support]
                              └─ No → [Escalate to Human]
```

#### 4. Stripe Payment Handler

Process Stripe webhooks for subscription management.

```
[Stripe Webhook] → [Event Type?]
                      ├─ checkout.session.completed → [Activate Sub] → [Welcome Email]
                      ├─ customer.subscription.updated → [Update Sub]
                      └─ invoice.payment_failed → [Mark Failed] → [Dunning Email]
```

#### 5. Daily Report Flow

Generate and send daily business reports using AI.

```
[Schedule: 8 AM] → [Query Activities] → [AI: Summarize] → [Slack: #leadership]
                                                        → [Email: executives]
```

#### 6. Knowledge Base Ingestion

Automatically ingest documents from multiple sources.

```
[Schedule: Hourly] → [Scan Drive] → [Filter New] → [Ingest to KB]
                   → [Scan Notion] → [Filter New] → [Ingest to KB]
                                                        ↓
                                                 [Log + Notify]
```

### Importing Examples

1. Download the example JSON file
2. Open the Workflow Editor
3. Click the hamburger menu (☰) → Import → Clipboard
4. Paste the JSON content
5. Click Import
6. Configure environment variables and credentials
7. Deploy

---

## Best Practices

### 1. Error Handling
Always add error outputs and handle failures gracefully.

```
[Node] ──┬── [Success Path]
         └── [Error Handler] → [Alert/Log]
```

### 2. Use Environment Variables
Store sensitive data in environment variables, not in node configs.

```
{{env.API_KEY}}
{{env.WEBHOOK_SECRET}}
```

### 3. Add Status Nodes
Use status updates to track flow progress.

```javascript
node.status({ fill: "green", shape: "dot", text: "processing" });
```

### 4. Limit Execution Frequency
Use rate limiting for webhook-triggered flows to prevent abuse.

### 5. Test Before Deploying
Use the **Debug** node to inspect data at each step before deploying to production.

### 6. Document Your Flows
Add comments and descriptions to flows for future reference.

---

## Troubleshooting

### Flow Not Triggering
- Check that the flow is deployed (Deploy button)
- Verify the trigger configuration
- Check the execution logs for errors

### Integration Not Working
- Verify the integration is connected in Settings
- Check that required scopes are granted
- Test the credential in Settings > Integrations

### Quota Exceeded
- Check your usage in the Workflows dashboard
- Consider upgrading your plan
- Optimize flows to reduce executions

### Slow Executions
- Check for external API timeouts
- Optimize database queries
- Use caching where appropriate

---

## Support

- **Documentation**: https://docs.synthstack.app/workflows
- **Community**: https://community.synthstack.app
- **Support**: support@synthstack.app

