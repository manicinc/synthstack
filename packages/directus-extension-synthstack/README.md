# @synthstack/directus-extension

> SynthStack extension bundle for Directus - Dashboard, Workflows, AI Agents, and integrations

[![npm version](https://badge.fury.io/js/%40synthstack%2Fdirectus-extension.svg)](https://www.npmjs.com/package/@synthstack/directus-extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Supercharge your Directus CMS with AI-powered workflows, automated content management, and seamless integrations. This extension provides a complete suite of tools for building intelligent, automated applications.

## Features

### Free (Community Edition)

- **Dashboard** - Overview of your SynthStack integration with system health, quick stats, and recent activity
- **Content Management** - Enhanced content management interface
- **Translations** - Multilingual content management UI
- **Audit Logging** - Automatic audit trails for all operations
- **Webhooks** - Configure webhooks for external integrations
- **Basic Analytics** - Simple usage statistics

### Pro License

Everything in Community, plus:

- **Workflows** - Visual workflow automation with Node-RED integration
- **AI Agents** - AI Co-Founders management and invocation
- **Advanced Analytics** - Detailed metrics and reporting
- **Custom Widgets** - Build custom dashboard widgets
- **API Integrations** - Connect to 20+ third-party services
- **Priority Support** - Faster response times

### Agency License

Everything in Pro, plus:

- **White Label** - Remove SynthStack branding
- **Multi-Tenant** - Manage multiple organizations
- **Custom Nodes** - Create custom Node-RED nodes
- **Dedicated Support** - Direct access to engineering team
- **SLA** - Guaranteed uptime and response times

## Installation

### Via npm

```bash
npm install @synthstack/directus-extension
```

### Via Directus Marketplace

1. Open Directus Admin Panel
2. Go to Settings → Extensions
3. Search for "SynthStack"
4. Click Install

### Manual Installation

1. Download the latest release from [GitHub](https://github.com/synthstack/directus-extension-synthstack/releases)
2. Extract to your Directus extensions folder:
   ```bash
   unzip synthstack-directus-extension.zip -d ./extensions/
   ```
3. Restart Directus

## Configuration

### Environment Variables

```env
# Optional: SynthStack License Key (for Pro/Agency features)
SYNTHSTACK_LICENSE_KEY=your-license-key

# Optional: Webhook URL for workflow events
SYNTHSTACK_WEBHOOK_URL=https://your-webhook-endpoint.com

# Optional: Enable demo mode (all features enabled for testing)
VITE_SYNTHSTACK_DEMO_MODE=true
```

### Directus Settings

After installation, configure SynthStack in the Directus Admin Panel:

1. Go to **Settings → Project Settings**
2. Find the **SynthStack** section
3. Enter your license key (if you have one)
4. Configure integration settings

## Usage

### Dashboard

Access the SynthStack dashboard from the main navigation:

1. Click the **SynthStack** icon in the sidebar
2. View system health, quick stats, and recent activity
3. Use quick actions to create workflows or access AI agents

### Workflows (Pro)

Create and manage automated workflows:

```javascript
// Example: Trigger a workflow via API
await directus.request(
  createItem('workflows', {
    name: 'My Workflow',
    description: 'Process incoming data',
    status: 'active',
    flow_data: { /* Node-RED flow JSON */ }
  })
);
```

### AI Agents (Pro)

Invoke AI Co-Founders programmatically:

```javascript
// Example: Invoke an AI agent
const response = await fetch('/synthstack/agents/ceo/invoke', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt: 'Analyze our Q4 strategy',
    context: { /* additional context */ }
  })
});
```

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/synthstack/stats` | GET | Get dashboard statistics |
| `/synthstack/activity` | GET | Get recent activity |
| `/synthstack/health` | GET | Get system health status |
| `/synthstack/workflows` | GET | List all workflows |
| `/synthstack/workflows/:id` | GET | Get workflow details |
| `/synthstack/workflows` | POST | Create a workflow |
| `/synthstack/workflows/:id` | PATCH | Update a workflow |
| `/synthstack/workflows/:id` | DELETE | Delete a workflow |
| `/synthstack/agents` | GET | List AI agents |
| `/synthstack/agents/:id/invoke` | POST | Invoke an AI agent |

## Screenshots

### Dashboard
![Dashboard](https://synthstack.app/images/directus-dashboard.png)

### Workflows
![Workflows](https://synthstack.app/images/directus-workflows.png)

### AI Agents
![AI Agents](https://synthstack.app/images/directus-agents.png)

## Compatibility

- **Directus**: 10.x, 11.x
- **Node.js**: 18.x, 20.x, 22.x
- **Browsers**: Chrome, Firefox, Safari, Edge (latest versions)

## Support

### Community Support

- [GitHub Issues](https://github.com/synthstack/directus-extension-synthstack/issues)
- [Discord Community](https://discord.gg/synthstack)
- [Documentation](https://docs.synthstack.app/directus)

### Pro/Agency Support

- Priority GitHub Issues
- Email: support@synthstack.app
- Dedicated Slack channel (Agency)

## License

MIT License - see [LICENSE](LICENSE) for details.

**Note:** Some features require a valid SynthStack Pro or Agency license. Visit [synthstack.app/pricing](https://synthstack.app/pricing) for licensing options.

## Links

- [SynthStack Website](https://synthstack.app)
- [Documentation](https://docs.synthstack.app)
- [GitHub Repository](https://github.com/synthstack/directus-extension-synthstack)
- [npm Package](https://www.npmjs.com/package/@synthstack/directus-extension)
- [Directus Marketplace](https://directus.io/extensions/synthstack)

---

Built with ❤️ by [SynthStack](https://synthstack.app)


