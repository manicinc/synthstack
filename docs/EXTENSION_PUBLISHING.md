# Extension Publishing Guide

This guide covers how to publish SynthStack extensions (Directus and Node-RED) to npm and the respective extension marketplaces.

## Overview

SynthStack provides two types of publishable extensions:

1. **Directus Extensions** - Admin panel modules and hooks
2. **Node-RED Nodes** - Workflow automation nodes

Both can be published with free and premium tiers to attract organic traffic while monetizing advanced features.

## Directus Extension Publishing

### Package Structure

```
packages/directus-extension-synthstack/
├── package.json
├── README.md
├── LICENSE
├── dist/
│   └── index.js
├── src/
│   ├── index.ts
│   ├── modules/
│   │   ├── dashboard/           # Free
│   │   ├── content-manager/     # Free
│   │   ├── translations/        # Free
│   │   ├── workflows/           # Premium
│   │   ├── ai-agents/           # Premium
│   │   └── analytics/           # Premium
│   └── hooks/
│       ├── audit-log.ts         # Free
│       ├── webhooks.ts          # Free
│       └── ai-enhancement.ts    # Premium
└── types/
```

### Free vs Premium Features

#### Free Features (Community Edition)
- Basic dashboard with system status
- Content management interface
- Translation management UI
- Audit logging
- Webhook configuration
- Basic analytics

#### Premium Features (Pro/Agency)
- Workflow automation UI
- AI Co-Founders integration
- Advanced analytics & reporting
- Custom dashboard widgets
- White-label branding options
- Priority support integration

### package.json Configuration

```json
{
  "name": "@synthstack/directus-extension",
  "version": "1.0.0",
  "description": "SynthStack extension for Directus - Dashboard, Workflows, AI Agents",
  "keywords": [
    "directus",
    "directus-extension",
    "directus-extension-bundle",
    "synthstack",
    "cms",
    "workflow",
    "ai"
  ],
  "homepage": "https://synthstack.app",
  "repository": {
    "type": "git",
    "url": "https://github.com/synthstack/directus-extension"
  },
  "license": "MIT",
  "author": {
    "name": "SynthStack",
    "email": "support@synthstack.app",
    "url": "https://synthstack.app"
  },
  "directus:extension": {
    "type": "bundle",
    "path": "dist/index.js",
    "source": "src/index.ts",
    "host": "^10.0.0 || ^11.0.0"
  },
  "scripts": {
    "build": "directus-extension build",
    "dev": "directus-extension build -w --no-minify",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@directus/extensions-sdk": "^11.0.0"
  }
}
```

### License Gating Implementation

```typescript
// src/lib/license.ts
export interface LicenseConfig {
  key?: string;
  tier: 'community' | 'pro' | 'agency';
  features: string[];
}

export async function checkLicense(apiKey?: string): Promise<LicenseConfig> {
  if (!apiKey) {
    return {
      tier: 'community',
      features: ['dashboard', 'content', 'translations', 'audit', 'webhooks']
    };
  }

  try {
    const response = await fetch('https://api.synthstack.app/api/v1/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-License-Key': apiKey
      }
    });

    const data = await response.json();
    return {
      key: apiKey,
      tier: data.tier || 'community',
      features: data.features || []
    };
  } catch {
    return {
      tier: 'community',
      features: ['dashboard', 'content', 'translations', 'audit', 'webhooks']
    };
  }
}

export function requireFeature(feature: string, license: LicenseConfig): boolean {
  return license.features.includes(feature);
}
```

### Module Registration with License Check

```typescript
// src/modules/index.ts
import { defineModule } from '@directus/extensions-sdk';
import { checkLicense, requireFeature } from '../lib/license';

// Free modules - always available
import DashboardModule from './dashboard';
import ContentModule from './content-manager';
import TranslationsModule from './translations';

// Premium modules - license required
import WorkflowsModule from './workflows';
import AIAgentsModule from './ai-agents';
import AnalyticsModule from './analytics';

export default defineModule({
  id: 'synthstack',
  name: 'SynthStack',
  icon: 'auto_awesome',
  routes: [],

  async setup(options) {
    const license = await checkLicense(options.settings?.license_key);

    const modules = [
      // Always include free modules
      DashboardModule,
      ContentModule,
      TranslationsModule,
    ];

    // Add premium modules if licensed
    if (requireFeature('workflows', license)) {
      modules.push(WorkflowsModule);
    }

    if (requireFeature('ai_agents', license)) {
      modules.push(AIAgentsModule);
    }

    if (requireFeature('analytics', license)) {
      modules.push(AnalyticsModule);
    }

    return { modules };
  }
});
```

### Publishing to npm

```bash
# Build the extension
npm run build

# Login to npm
npm login

# Publish (scoped package)
npm publish --access public

# Or publish with tag
npm publish --access public --tag beta
```

### Directus Marketplace Submission

1. Create a public GitHub repository
2. Add comprehensive README with screenshots
3. Submit to [Directus Marketplace](https://directus.io/extensions)
4. Include demo video/GIF

## Node-RED Extension Publishing

### Package Structure

```
packages/node-red-contrib-synthstack/
├── package.json
├── README.md
├── LICENSE
├── lib/
│   └── license-check.js
├── nodes/
│   ├── synthstack-trigger.js      # Free
│   ├── synthstack-trigger.html
│   ├── synthstack-directus.js     # Free
│   ├── synthstack-directus.html
│   ├── synthstack-agent.js        # Premium
│   ├── synthstack-agent.html
│   ├── synthstack-github.js       # Premium
│   ├── synthstack-github.html
│   └── ... (more nodes)
└── examples/
    ├── basic-automation.json
    └── ai-workflow.json
```

### Free vs Premium Nodes

#### Free Nodes (Community)
- `synthstack-trigger` - Basic trigger node
- `synthstack-directus` - CMS CRUD operations

#### Premium Nodes (Pro/Agency)
- `synthstack-agent` - AI Co-Founders
- `synthstack-copilot` - Copilot integration
- `synthstack-github` - GitHub automation
- `synthstack-approval` - Approval workflows
- `synthstack-email` - Email automation
- `synthstack-stripe` - Payment integration
- `synthstack-slack` - Slack integration
- `synthstack-discord` - Discord integration
- All integration nodes

### package.json Configuration

```json
{
  "name": "node-red-contrib-synthstack",
  "version": "1.0.0",
  "description": "SynthStack nodes for Node-RED - AI Agents, Directus CMS, and integrations",
  "keywords": [
    "node-red",
    "synthstack",
    "ai",
    "agents",
    "directus",
    "workflow",
    "automation",
    "chatgpt",
    "openai"
  ],
  "homepage": "https://synthstack.app",
  "repository": {
    "type": "git",
    "url": "https://github.com/synthstack/node-red-contrib-synthstack"
  },
  "license": "MIT",
  "author": {
    "name": "SynthStack",
    "email": "support@synthstack.app"
  },
  "node-red": {
    "version": ">=3.0.0",
    "nodes": {
      "synthstack-trigger": "nodes/synthstack-trigger.js",
      "synthstack-directus": "nodes/synthstack-directus.js",
      "synthstack-agent": "nodes/synthstack-agent.js",
      "synthstack-copilot": "nodes/synthstack-copilot.js",
      "synthstack-github": "nodes/synthstack-github.js",
      "synthstack-approval": "nodes/synthstack-approval.js",
      "synthstack-email": "nodes/synthstack-email.js",
      "synthstack-stripe": "nodes/synthstack-stripe.js",
      "synthstack-slack": "nodes/synthstack-slack.js",
      "synthstack-discord": "nodes/synthstack-discord.js"
    }
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### License-Gated Node Implementation

```javascript
// nodes/synthstack-agent.js
const { createLicensedNode, addDemoWatermark } = require('../lib/license-check');

module.exports = function(RED) {
  // Use licensed node wrapper
  const SynthStackAgent = createLicensedNode(
    RED,
    'synthstack-agent',
    function(config, license) {
      const node = this;

      // Check if AI agents feature is available
      if (!license.canUseFeature('ai_agents')) {
        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: 'Upgrade required'
        });
        
        node.on('input', function(msg) {
          node.warn('AI Agents require Pro or Agency license. Visit synthstack.app/pricing');
          msg.payload = {
            error: 'License required',
            upgrade_url: 'https://synthstack.app/pricing'
          };
          node.send([null, msg]);
        });
        return;
      }

      // Full functionality for licensed users
      node.on('input', async function(msg, send, done) {
        try {
          node.status({ fill: 'blue', shape: 'dot', text: 'invoking...' });

          const response = await invokeAgent(config.agent, msg.payload);
          
          // Add demo watermark if in demo mode
          const output = addDemoWatermark(response, license);

          msg.payload = output;
          node.status({ fill: 'green', shape: 'dot', text: 'success' });
          send([msg, null]);
        } catch (error) {
          node.status({ fill: 'red', shape: 'dot', text: 'error' });
          msg.payload = { error: error.message };
          send([null, msg]);
        }
        done();
      });
    },
    ['ai_agents'] // Required features
  );

  RED.nodes.registerType('synthstack-agent', SynthStackAgent);
};
```

### Publishing to npm

```bash
# Build and test
npm test

# Login to npm
npm login

# Publish
npm publish

# Verify on npm
npm info node-red-contrib-synthstack
```

### Node-RED Library Submission

1. Ensure package follows [Node-RED packaging guidelines](https://nodered.org/docs/creating-nodes/packaging)
2. Add to [Node-RED Flow Library](https://flows.nodered.org/)
3. Include example flows in `/examples`
4. Add screenshots and documentation

## Marketing & Organic Traffic

### README Best Practices

Include in your README:

1. **Clear Value Proposition**
   ```markdown
   ## 🚀 SynthStack for Directus
   
   Supercharge your Directus CMS with AI-powered workflows, 
   automated content management, and seamless integrations.
   
   **Free Community Edition** | **Pro** | **Agency**
   ```

2. **Feature Comparison Table**
   ```markdown
   | Feature | Community | Pro | Agency |
   |---------|-----------|-----|--------|
   | Dashboard | ✅ | ✅ | ✅ |
   | AI Agents | ❌ | ✅ | ✅ |
   | Custom Nodes | ❌ | ❌ | ✅ |
   ```

3. **Quick Start Guide**
   ```markdown
   ## Quick Start
   
   1. Install: `npm install @synthstack/directus-extension`
   2. Restart Directus
   3. Access SynthStack module in admin panel
   ```

4. **Screenshots/GIFs**
5. **Links to Documentation**
6. **Support Channels**

### SEO Keywords

Target these keywords in your package description:

**Directus:**
- directus extension
- directus workflow
- directus ai
- directus automation
- headless cms workflow

**Node-RED:**
- node-red ai
- node-red chatgpt
- node-red automation
- node-red cms
- node-red directus

### Community Engagement

1. **GitHub Discussions** - Answer questions, share updates
2. **Discord/Slack** - Join Directus/Node-RED communities
3. **Blog Posts** - Write tutorials using your extensions
4. **YouTube** - Create demo videos
5. **Twitter/X** - Share updates and tips

## Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.0.0 - Initial release
1.1.0 - New feature (backward compatible)
1.1.1 - Bug fix
2.0.0 - Breaking change
```

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run all tests
- [ ] Build production bundle
- [ ] Tag release in Git
- [ ] Publish to npm
- [ ] Update documentation
- [ ] Announce release

## Support & Licensing

### License File

```
MIT License

Copyright (c) 2024 SynthStack

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...

---

PREMIUM FEATURES NOTICE:
Some features require a valid SynthStack Pro or Agency license.
Visit https://synthstack.app/pricing for licensing options.
```

### Support Tiers

| Tier | Support Level |
|------|---------------|
| Community | GitHub Issues, Community Discord |
| Pro | Priority GitHub Issues, Email Support |
| Agency | Dedicated Support, SLA, Custom Development |

## Troubleshooting

### Common Publishing Issues

1. **npm ERR! 403** - Check npm login and package name
2. **Missing files** - Verify `files` field in package.json
3. **Build errors** - Check TypeScript/build configuration
4. **License check fails** - Verify API endpoint and network

### Testing Before Publish

```bash
# Pack locally to test
npm pack

# Install locally to test
npm install ./synthstack-directus-extension-1.0.0.tgz

# Test in development
npm link
```

## Related Resources

- [Directus Extensions SDK](https://docs.directus.io/extensions/introduction.html)
- [Node-RED Creating Nodes](https://nodered.org/docs/creating-nodes/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [SynthStack Documentation](https://docs.synthstack.app)


