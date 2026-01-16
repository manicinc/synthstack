# Directus Advanced Features

This document describes the advanced Directus features configured in SynthStack AI, including Visual Editor, Collaborative Editing, Content Versioning, and Live Preview.

## Table of Contents

- [Overview](#overview)
- [Visual Editor](#visual-editor)
- [Collaborative Editing](#collaborative-editing)
- [Content Versioning](#content-versioning)
- [Live Preview](#live-preview)
- [Configuration](#configuration)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

## Overview

SynthStack AI integrates Directus with enterprise-level content management features:

- **Visual In-Place Editing** - Edit content directly on the website
- **Real-Time Collaboration** - Multiple users editing simultaneously with field locking
- **Content Versioning** - Track all changes with automatic versioning
- **Live Preview** - See changes before publishing

These features are powered by:
- `@directus/visual-editing` (frontend library)
- `@directus-labs/collaborative-editing` (Directus extension)
- WebSocket support for real-time communication
- Y.js CRDT technology for conflict-free collaboration

## Visual Editor

### What is Visual Editor?

Visual Editor allows content editors to make changes directly on the website instead of switching between the admin panel and preview. Changes are made in-context with a true WYSIWYG experience.

### Architecture

```
┌─────────────────┐        ┌──────────────────┐
│  Directus CMS   │◄──────►│  Frontend (Vue)  │
│  (Admin Panel)  │  API   │  with Visual     │
│                 │        │  Editing Plugin  │
└─────────────────┘        └──────────────────┘
        │                           │
        │     Visual Editor         │
        │     Module (iframe)       │
        └───────────┬───────────────┘
                    │
            ┌───────▼────────┐
            │   data-directus│
            │   attributes   │
            └────────────────┘
```

### Implementation

#### 1. Frontend Plugin

Location: `apps/web/src/plugins/directus-visual-editing.ts`

```typescript
import { apply, setAttr } from '@directus/visual-editing'

export function initVisualEditing() {
  const isVisualEditingMode = new URLSearchParams(window.location.search)
    .has('visual-editing')

  if (!isVisualEditingMode) {
    return
  }

  const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8099'

  apply({
    directusUrl,
    onSaved: ({ collection, item, payload }) => {
      // Refresh data or reload page
      console.log('Content saved:', { collection, item, payload })
    }
  })
}

export { setAttr }
```

#### 2. Boot File

Location: `apps/web/src/boot/directus-visual-editing.ts`

```typescript
import { boot } from 'quasar/wrappers'
import { initVisualEditing } from '@/plugins/directus-visual-editing'

export default boot(() => {
  if (typeof window !== 'undefined') {
    initVisualEditing()
  }
})
```

#### 3. Component Usage

```vue
<template>
  <h1 :data-directus="setAttr({
    collection: 'pages',
    item: page.id,
    fields: 'title',
    mode: 'popover'
  })">
    {{ page.title }}
  </h1>

  <div :data-directus="setAttr({
    collection: 'pages',
    item: page.id,
    fields: ['content', 'excerpt'],
    mode: 'drawer'
  })">
    <p>{{ page.excerpt }}</p>
    <div v-html="page.content" />
  </div>
</template>

<script setup lang="ts">
import { setAttr } from '@/plugins/directus-visual-editing'
import { ref, onMounted } from 'vue'

const page = ref({ id: '', title: '', excerpt: '', content: '' })

onMounted(async () => {
  // Fetch page data from Directus API
})
</script>
```

### Edit Modes

- **Drawer Mode** - Side drawer with full form (best for multi-field editing)
- **Modal Mode** - Centered modal (best for focused editing)
- **Popover Mode** - Inline popover (best for single field edits)

### Enabling Visual Editor

1. Add `?visual-editing=true` to any page URL
2. Or use Directus admin: Settings → Visual Editor → Add site URL → Click edit icon on any item

### Security

- Only activates with `?visual-editing=true` query parameter
- Requires active Directus session (logged in)
- CSP configured to allow iframe embedding from localhost and production domains

## Collaborative Editing

### What is Collaborative Editing?

Real-time multi-user editing with smart field locking to prevent conflicts. Multiple team members can work on the same content simultaneously.

### Technology Stack

- **Y.js** - CRDT (Conflict-free Replicated Data Type) library
- **y-websocket** - WebSocket provider for Y.js
- **WebSockets** - Real-time bidirectional communication
- **Awareness Protocol** - User presence and cursor tracking

### Architecture

```
┌───────────────┐     WebSocket     ┌───────────────┐
│   Client A    │◄─────────────────►│  Directus     │
│   (Browser)   │     Y.js Sync     │  WebSocket    │
└───────────────┘                   │  Server       │
                                    │               │
┌───────────────┐     WebSocket     │               │
│   Client B    │◄─────────────────►│               │
│   (Browser)   │     Y.js Sync     │               │
└───────────────┘                   └───────────────┘
```

### Features

#### Field Locking
- Automatic lock when user clicks into a field
- Visual indicators showing who has the lock
- Auto-unlock after 2 seconds of inactivity
- Force unlock after 30 seconds if connection lost
- Admin can manually force-unlock fields

#### User Awareness
- See avatars of all active users
- Real-time presence indicators:
  - **Green**: Actively viewing
  - **Blue**: Editing a field
  - **Gray**: Idle (5+ minutes)
- Field highlights showing who's editing what

#### Conflict-Free Editing
- Y.js CRDT ensures no "save conflict" errors
- Changes merge automatically
- Each user sees updates in real-time
- Works even with poor network conditions

### Installation

The collaborative editing extension is installed via custom Dockerfile:

Location: `services/directus/Dockerfile.custom`

```dockerfile
FROM directus/directus:latest

USER root
RUN corepack enable
USER node

RUN pnpm install @directus-labs/collaborative-editing
```

### Configuration

Environment variables in `docker-compose.yml`:

```yaml
services:
  directus:
    environment:
      # WebSockets (required for collaborative editing)
      WEBSOCKETS_ENABLED: "true"
      REALTIME_LOGS_ENABLED: "true"  # for debugging
```

### Directus Admin Setup

1. Go to **Settings → Extensions**
2. Verify `@directus-labs/collaborative-editing` is enabled
3. Navigate to **Settings → Collaborative Editing**
4. Click "Create Collaborative Editing Settings"
5. Enable globally or per collection

## Content Versioning

### What is Content Versioning?

Automatic tracking of all content changes with the ability to restore previous versions.

### Features

- Automatic snapshot on every save
- View version history
- Compare versions side-by-side
- Restore to any previous version
- Optional version naming/labeling

### Configuration

Enable per collection in Directus:

1. Go to **Settings → Data Model → [Collection]**
2. Enable "Content Versioning" option
3. Or add M2A relationship to `directus_revisions` collection

### Usage

```typescript
// Fetch version history
const versions = await directus.items('directus_revisions').readByQuery({
  filter: {
    collection: { _eq: 'pages' },
    item: { _eq: pageId }
  },
  sort: ['-date_created'],
  limit: 50
})

// Restore a version
await directus.items('pages').updateOne(pageId, versionData)
```

## Live Preview

### What is Live Preview?

See how content will look before publishing, with real-time updates as you edit.

### Features

- Preview unpublished changes
- Multiple preview URLs (desktop, mobile, tablet)
- Real-time updates as you edit
- Works with draft/published workflow

### Configuration

In Directus Settings → Visual Editor:

```
Preview URLs:
- http://localhost:5173?preview=true&draft={item_id}
- http://localhost:5173?preview=true&device=mobile&draft={item_id}
```

## Configuration

### Environment Variables

Required environment variables in `docker-compose.yml`:

```yaml
services:
  directus:
    environment:
      # WebSockets (Collaborative Editing)
      WEBSOCKETS_ENABLED: "true"
      REALTIME_LOGS_ENABLED: "true"

      # Visual Editor CSP
      CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC: "http://localhost:3050,http://localhost:5173"

      # Cache Auto-Purge (Visual Editor)
      CACHE_AUTO_PURGE: "true"

      # Extension Installation
      MARKETPLACE_TRUST: "sandbox"
```

### Frontend Dependencies

```json
{
  "dependencies": {
    "@directus/visual-editing": "^1.1.0"
  }
}
```

### Quasar Boot Files

Register in `apps/web/quasar.config.js`:

```javascript
boot: [
  'pinia',
  'i18n',
  'supabase',
  'theme',
  'analytics',
  'feature-flags',
  'directus-visual-editing'  // Add this
]
```

## Development Guide

### Adding Visual Editing to a Page

1. **Import the helper**:
```typescript
import { setAttr } from '@/plugins/directus-visual-editing'
```

2. **Add data-directus attributes**:
```vue
<div :data-directus="setAttr({
  collection: 'collection_name',
  item: itemId,
  fields: 'field_name', // or ['field1', 'field2']
  mode: 'drawer' // or 'modal', 'popover'
})">
  {{ content }}
</div>
```

3. **Test with query parameter**:
```
http://localhost:5173/your-page?visual-editing=true
```

### Best Practices

#### Visual Editing
- Use `popover` mode for single field edits
- Use `drawer` mode for multi-field content
- Use `modal` mode for focused tasks
- Group related fields together
- Make editable regions visually distinct

#### Collaborative Editing
- Enable only on collections that need it
- Communicate with team about major edits
- Let team members work on different fields
- Save regularly (Cmd/Ctrl+S)
- Watch for lock indicators
- Use versioning as a safety net

#### Performance
- Limit number of data-directus attributes per page
- Use field grouping to reduce attributes
- Enable caching with `CACHE_AUTO_PURGE: true`
- Monitor WebSocket connection count

## Troubleshooting

### Visual Editor Issues

#### Visual editing not activating
```bash
# Check query parameter
?visual-editing=true

# Check browser console for errors
# Common issues:
- Not logged into Directus
- CSP blocking iframe
- Incorrect Directus URL
```

#### Edit icons not appearing
```bash
# Verify data-directus attributes
console.log(element.getAttribute('data-directus'))

# Check that fields exist in collection
# Check user has edit permissions
```

### Collaborative Editing Issues

#### WebSocket connection failed
```bash
# Check environment variables
WEBSOCKETS_ENABLED=true

# Check firewall/proxy allows WebSocket
# In nginx:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Check browser console
# Should see: WebSocket connection established
```

#### Fields stuck locked
```bash
# Wait 30 seconds for auto-timeout
# Or admin can force-unlock:
# Settings → Collaborative Editing → Force Unlock

# Check lock owner hasn't lost connection
```

#### Changes not syncing
```bash
# Check WebSocket connection (green indicator)
# Verify both users on same item
# Check browser console for errors
# Check server logs for WebSocket errors
```

### General Debugging

```bash
# Enable Directus debug logs
LOG_LEVEL=debug

# Enable real-time logs
REALTIME_LOGS_ENABLED=true

# Check browser console
# Check network tab for WebSocket frames
# Check Directus server logs
```

## Resources

### Official Documentation
- [Directus Visual Editor](https://docs.directus.io/guides/visual-editing.html)
- [Directus Labs Collaborative Editing](https://github.com/directus-labs/collaborative-editing)
- [Y.js Documentation](https://docs.yjs.dev/)
- [Directus WebSocket Documentation](https://docs.directus.io/guides/real-time/)

### SynthStack Documentation
- [Visual Editing Guide](http://localhost:5173/docs/visual-editing)
- [Collaborative Editing Guide](http://localhost:5173/docs/collaborative-editing)
- [Directus Setup Guide](./ADMIN_SETUP.md)

### Support
- Email: support@synthstack.app
- GitHub Issues: https://github.com/manicinc/synthstack/issues

## License

This implementation is part of SynthStack AI and follows the project's license terms.
