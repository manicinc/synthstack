# Workflow Quick Start Guide

Get your first SynthStack workflow running in 5 minutes.

## Prerequisites

Before you begin, make sure you have:

- [ ] A SynthStack account with Pro, Agency, or Enterprise plan
- [ ] Access to the Workflows feature (check Dashboard > Workflows)
- [ ] (Optional) API keys for integrations you want to use

## Step 1: Access the Workflow Editor

1. Log in to your SynthStack dashboard
2. Click **Workflows** in the sidebar
3. Click **Open Editor** to launch the visual workflow builder

The editor opens in a new tab with your organization's workspace.

## Step 2: Create Your First Flow

Let's build a simple "Hello World" workflow:

### 2.1 Add an Inject Node

1. In the left palette, find the **Inject** node (under "common")
2. Drag it onto the canvas
3. Double-click to configure:
   - Set `msg.payload` to `string`
   - Enter: `Hello from SynthStack!`
   - Click **Done**

### 2.2 Add a Debug Node

1. Find the **Debug** node in the palette
2. Drag it to the right of your Inject node
3. Leave default settings (outputs `msg.payload`)

### 2.3 Connect the Nodes

1. Click the gray port on the right side of the Inject node
2. Drag to the gray port on the left side of the Debug node
3. A wire connects them

### 2.4 Deploy

1. Click the red **Deploy** button in the top right
2. Your workflow is now active!

### 2.5 Test It

1. Click the blue button on the left side of the Inject node
2. Open the Debug panel (bug icon in the sidebar)
3. You should see: `Hello from SynthStack!`

Congratulations! You've created your first workflow.

## Step 3: Add AI Capabilities

Now let's enhance it with a SynthStack AI Agent:

### 3.1 Add the SynthStack Agent Node

1. In the palette, find **synthstack-agent** (under "SynthStack")
2. Drag it between your Inject and Debug nodes
3. Delete the old wire (select and press Delete)
4. Connect: Inject → Agent → Debug

### 3.2 Configure the Agent

Double-click the Agent node:

| Setting | Value |
|---------|-------|
| Agent | Select an agent (e.g., "CEO", "CTO") |
| Model | `gpt-4o-mini` (or your preferred model) |
| Prompt | Leave empty to use `msg.payload` as the prompt |

Click **Done**.

### 3.3 Update the Inject Node

Double-click the Inject node and change the payload to:

```
What are the top 3 priorities for a SaaS startup this quarter?
```

### 3.4 Deploy and Test

1. Click **Deploy**
2. Click the Inject button
3. Watch the Debug panel for the AI response

## Step 4: Add External Integrations

Let's send the AI response to Slack:

### 4.1 Connect Slack (if not already done)

1. Go to **Settings > Integrations** in SynthStack
2. Find Slack and click **Connect**
3. Authorize the requested permissions

### 4.2 Add the Slack Node

1. Find **synthstack-slack** in the palette
2. Drag it after the Agent node
3. Connect: Agent → Slack

### 4.3 Configure Slack

Double-click the Slack node:

| Setting | Value |
|---------|-------|
| Operation | `postMessage` |
| Channel | `#general` (or your channel) |
| Message | `{{msg.payload}}` |

### 4.4 Deploy and Test

1. Click **Deploy**
2. Trigger the Inject node
3. Check your Slack channel for the AI response!

## Step 5: Make It Automatic

Instead of manual triggers, let's schedule it:

### 5.1 Configure the Inject Node for Scheduling

Double-click the Inject node:

1. Under **Repeat**, select `at a specific time`
2. Set to `9:00` (or your preferred time)
3. Select days of the week
4. Click **Done**

### 5.2 Deploy

Click **Deploy** - your workflow will now run automatically!

## Common Node Types

| Node | Purpose | Example Use |
|------|---------|-------------|
| **Inject** | Start a flow manually or on schedule | Trigger daily reports |
| **Debug** | View output in the debug panel | Test and troubleshoot |
| **Function** | Write custom JavaScript | Transform data |
| **HTTP Request** | Call external APIs | Fetch data |
| **synthstack-agent** | Invoke AI co-founders | Generate content, analyze data |
| **synthstack-directus** | CRUD operations on CMS | Create/update records |
| **synthstack-slack** | Send Slack messages | Notifications |
| **synthstack-email** | Send emails | Alerts, reports |

## Importing Templates

Speed up your workflow creation with templates:

1. Go to **Workflows** page in SynthStack
2. Browse the **Template Gallery**
3. Click a template to preview
4. Click **Install** to add it to your workspace
5. The template opens in the editor for customization

### Starter Templates

| Template | Description | Config Required |
|----------|-------------|-----------------|
| Hello World | Basic inject → debug | None |
| AI Chat Test | Test agent connection | OpenAI/Anthropic key |
| Webhook to Slack | HTTP → Slack notification | Slack channel |
| Daily Summary | Scheduled AI report | Email/Slack config |
| Form to CRM | Webhook → Directus | None |

## Troubleshooting

### Flow Not Triggering

- Ensure the flow is deployed (Deploy button)
- Check if the trigger is configured correctly
- Look for errors in the Debug panel

### Agent Not Responding

- Verify your OpenAI/Anthropic API key is set in Settings > Integrations
- Check the Debug panel for error messages
- Ensure you have credits remaining

### Slack Message Not Sending

- Verify Slack is connected in Settings > Integrations
- Check the channel name is correct (include `#`)
- Ensure the bot has permission to post in that channel

### "Quota Exceeded" Error

- Check your workflow usage in the Workflows dashboard
- Consider upgrading your plan for more executions
- Optimize workflows to reduce execution count

## Next Steps

- **[API Keys Setup](./WORKFLOW_API_KEYS_SETUP.md)** - Configure all your integrations
- **[Workflow Examples](../workflows/README.md)** - Browse complete example flows
- **[Integration Guides](../workflows/README.md#integration-guides)** - Detailed integration docs
- **[Best Practices](../workflows/README.md#best-practices)** - Tips for production workflows

## Getting Help

- **In-App Help**: Press `⌘K` to ask the AI Copilot
- **Documentation**: [docs.synthstack.app/workflows](https://docs.synthstack.app/workflows)
- **Community**: [community.synthstack.app](https://community.synthstack.app)
- **Support**: support@synthstack.app

---

**Time to complete**: ~5 minutes  
**Difficulty**: Beginner  
**Credits used**: Varies by agent usage


