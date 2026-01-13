# SynthStack AI Copilot

## Overview

The SynthStack AI Copilot is a context-aware AI assistant integrated throughout the application. It uses GPT-4o (with Claude 3.5 Sonnet fallback) and RAG (Retrieval Augmented Generation) with Qdrant vector database to provide intelligent assistance based on your documentation and codebase.

## Quick Access

| Method | How to Access | Availability |
|--------|--------------|--------------|
| **Floating Button** | Click 🤖 icon in bottom-right corner | All authenticated pages |
| **Keyboard Shortcut** | `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) | When logged in |
| **Mobile** | Tap floating button (full-screen) | All devices |

## Key Features

### Core Capabilities
- Real-time streaming responses (SSE)
- Markdown rendering with syntax highlighting
- Multiple conversation management
- Export chats to markdown
- RAG-powered context retrieval
- Dark/light theme support
- Mobile-optimized full-screen mode

### User Features
- **Suggested Prompts**: Quick-start questions displayed on empty state
- **Settings Panel**: Adjust temperature, max tokens, RAG context
- **Conversation History**: Switch between multiple chats
- **Keyboard Shortcuts**: `⌘K` to toggle, `Esc` to close, `Enter` to send
- **Auto-scroll**: Automatically scrolls to latest message during streaming
- **Code Highlighting**: Supports 10+ programming languages
- **XSS Protection**: All markdown sanitized with DOMPurify

## Architecture

### Component Structure
```
CopilotWidget.vue (Main Container)
├── Header
│   ├── Title ("SynthStack Copilot")
│   ├── History Button
│   ├── Export Button
│   ├── Clear Button
│   └── Close Button
├── Messages Area (Scrollable)
│   ├── Empty State (Suggested Prompts)
│   └── ChatMessage.vue (Repeated)
│       ├── Avatar (User/AI)
│       ├── Content (Markdown Rendered)
│       │   ├── Text
│       │   ├── Code Blocks (Highlighted)
│       │   └── Links/Lists/Tables
│       ├── Metadata
│       │   ├── Timestamp
│       │   ├── Model Badge
│       │   └── Token Count
│       └── Context Sources (RAG)
│           └── Expansion Panel
└── Input Area
    └── ChatInput.vue
        ├── Settings Button
        ├── Textarea (Auto-expand)
        ├── Send Button
        └── Settings Dialog
            ├── Temperature Slider
            ├── Max Tokens Slider
            ├── RAG Toggle
            └── Context Limit Slider
```

### Data Flow

**Sending a Message:**
```
User types message
    ↓
ChatInput emits 'send' event
    ↓
CopilotWidget calls useCopilot.sendStreamingMessage()
    ↓
Composable adds user message to store
    ↓
API Service calls /chat/stream via fetch
    ↓
Server-Sent Events (SSE) stream starts
    ↓
Tokens arrive chunk by chunk
    ↓
Store.updateLastMessage() appends each chunk
    ↓
ChatMessage.vue re-renders with new content
    ↓
Auto-scroll to bottom
    ↓
Stream ends, save to localStorage
```

**RAG Context Retrieval:**
```
User message → Generate embedding (OpenAI)
    ↓
Query Qdrant vector DB
    ↓
Retrieve top N similar documents
    ↓
Inject into AI prompt context
    ↓
AI generates response using docs
    ↓
Return response + context metadata
    ↓
Display sources in message
```

## API Endpoints

### Public (No Authentication)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/copilot/health` | GET | Check service status |

### Authenticated Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/copilot/chat` | POST | Standard chat response |
| `/api/v1/copilot/chat/stream` | POST | Streaming SSE response |

### Admin Only
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/copilot/index` | POST | Index document for RAG |
| `/api/v1/copilot/index/:type/:id` | DELETE | Remove from index |
| `/api/v1/copilot/index/info` | GET | Collection statistics |

**Full API Documentation**: [http://localhost:3003/docs](http://localhost:3003/docs)

## File Structure

### Frontend Files
| File | Path | Purpose |
|------|------|---------|
| **Store** | `apps/web/src/stores/copilot.ts` | Pinia state management |
| **API Service** | `apps/web/src/services/copilot.ts` | HTTP client & SSE streaming |
| **Composable** | `apps/web/src/composables/useCopilot.ts` | Reusable chat logic |
| **Widget** | `apps/web/src/components/copilot/CopilotWidget.vue` | Main chat interface |
| **Message** | `apps/web/src/components/copilot/ChatMessage.vue` | Message display component |
| **Input** | `apps/web/src/components/copilot/ChatInput.vue` | Input with settings |

### Backend Files
| File | Path | Purpose |
|------|------|---------|
| **Routes** | `packages/api-gateway/src/routes/copilot.ts` | REST endpoints |
| **Copilot Service** | `packages/api-gateway/src/services/copilot.ts` | Chat orchestration |
| **Vector DB** | `packages/api-gateway/src/services/vector-db.ts` | Qdrant client |
| **Embeddings** | `packages/api-gateway/src/services/embeddings.ts` | OpenAI embeddings |

### Database Migration
| File | Path | Purpose |
|------|------|---------|
| **Schema** | `services/directus/migrations/007_copilot_chat.sql` | Tables for chat history |

## Usage Guide

### Suggested Prompts
When you first open the copilot, try these:
- "Explain the RAG architecture"
- "How do I customize themes?"
- "What are the API endpoints?"
- "Show me authentication flow"
- "How does the billing system work?"
- "Explain the Directus integration"

### Settings Panel
Click the ⚙️ settings icon in the input area to adjust:

| Setting | Range | Description |
|---------|-------|-------------|
| **Temperature** | 0.1 - 1.0 | Controls creativity (lower = focused, higher = creative) |
| **Max Tokens** | 500 - 4000 | Maximum length of AI response |
| **Enable RAG Context** | On/Off | Include relevant documentation in responses |
| **Context Sources** | 1 - 10 | Number of document chunks to retrieve (when RAG is enabled) |

### Use Cases

**Development Help:**
```
"How do I add a new API endpoint?"
"Explain the authentication flow"
"What's the difference between stores and composables?"
```

**Troubleshooting:**
```
"My build is failing, what should I check?"
"How do I debug Quasar components?"
"Stripe webhook not working, help?"
```

**Learning:**
```
"Explain the directory structure"
"What is RAG and how does it work here?"
"How does the subscription system work?"
```

**Code Examples:**
```
"Show me how to create a new Pinia store"
"Example of using the API service"
"How to add a new route with authentication?"
```

### Optimal Settings

- **Development Help**: Temperature 0.3, RAG enabled, 5 sources
- **Creative Solutions**: Temperature 0.7, RAG enabled, 3 sources
- **Code Examples**: Temperature 0.2, RAG enabled, 10 sources
- **General Chat**: Temperature 0.5, RAG disabled

## Configuration

### Environment Variables
```env
# In packages/api-gateway/.env
COPILOT_ENABLED=true
COPILOT_MODEL=gpt-4o
COPILOT_FALLBACK_MODEL=claude-3-5-sonnet-20241022
COPILOT_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
# Qdrant is open-source and can be self-hosted (default via Docker in local dev).
QDRANT_URL=http://qdrant:6333
# Optional: only needed for Qdrant Cloud (or secured self-hosted Qdrant).
QDRANT_API_KEY=
```

### Default Settings
```typescript
{
  temperature: 0.7,      // Balance between focused/creative
  maxTokens: 2000,       // ~1500 words
  includeContext: true,  // RAG enabled
  contextLimit: 5        // 5 document chunks
}
```

## Dependencies

| Package | Version | Purpose | Size (gzipped) |
|---------|---------|---------|----------------|
| `marked` | 17.0.1 | Markdown parser | ~50KB |
| `highlight.js` | 11.11.1 | Code syntax highlighting | ~80KB |
| `dompurify` | 3.3.1 | XSS protection | ~20KB |

**Total Bundle Impact**: +380KB (uncompressed), +120KB (gzipped)

## Testing

### Health Check
```bash
curl http://localhost:3003/api/v1/copilot/health | jq .
```

Expected Response:
```json
{
  "status": "ok",
  "copilot": {
    "enabled": true,
    "available": true,
    "model": "gpt-4o",
    "fallbackModel": "claude-3-5-sonnet-20241022",
    "embeddingModel": "text-embedding-3-small",
    "providers": {
      "openai": true,
      "anthropic": true
    }
  },
  "vectorDB": {
    "healthy": true
  },
  "embeddings": {
    "available": true,
    "model": "text-embedding-3-small",
    "dimension": 1536
  }
}
```

### Functional Testing Checklist

**Access & Interface:**
- [ ] FAB button appears when logged in
- [ ] FAB hidden when logged out
- [ ] Panel opens/closes correctly
- [ ] Keyboard shortcuts work (`⌘K`, `Esc`)
- [ ] Mobile full-screen works

**Messaging:**
- [ ] Messages send and display correctly
- [ ] Streaming shows token-by-token
- [ ] Markdown renders correctly
- [ ] Code highlighting works
- [ ] Auto-scroll works during streaming

**Conversation Management:**
- [ ] Multiple conversations can be created
- [ ] Switch between conversations preserves messages
- [ ] Export to markdown works
- [ ] Clear chat removes all messages
- [ ] Delete conversation removes from history

**Edge Cases:**
- [ ] Empty message blocked
- [ ] Network error handled with toast
- [ ] XSS attempts sanitized
- [ ] Long messages scroll correctly
- [ ] LocalStorage full handled

### Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Time to First Token | < 500ms | ✅ |
| Streaming Latency | < 100ms per chunk | ✅ |
| Widget Load Time | < 200ms | ✅ |
| Message Render Time | < 50ms | ✅ |
| API Response Time | < 1s | ✅ |

## Troubleshooting

### Copilot Not Appearing
1. **Check authentication**: Make sure you're logged in
2. **Refresh page**: Hard refresh with `⌘⇧R` / `Ctrl+Shift+R`
3. **Clear cache**: Clear browser cache and reload
4. **Check console**: Open DevTools console for errors

### Messages Not Sending
1. **Check API status**: Visit `/api/v1/copilot/health`
2. **Network tab**: Check for failed requests in DevTools
3. **Token expiration**: Try logging out and back in
4. **Rate limiting**: Wait a moment and retry

### Streaming Issues
1. **Browser support**: Ensure browser supports Server-Sent Events (SSE)
2. **Ad blockers**: Disable ad blockers that might block SSE
3. **Network**: Check stable internet connection
4. **Timeout**: Responses over 2 minutes may timeout

### Quick Fixes
```bash
# Restart API gateway
docker compose restart api-gateway

# Rebuild everything
docker compose down
docker compose up -d --build

# Clear frontend cache
rm -rf apps/web/.quasar
pnpm dev:web
```

## Privacy & Security

### Authentication
- Copilot only appears when logged in
- All requests include authentication token
- Session expires follow standard auth rules

### Message Security
- **XSS Protection**: All markdown sanitized with DOMPurify
- **Local Storage**: Conversations stored in browser localStorage only
- **HTTPS Only**: All API requests encrypted in production

### RAG Context
When RAG is enabled, the AI has access to:
- ✅ Public documentation
- ✅ Code examples
- ✅ API reference
- ❌ Your private data (unless explicitly shared in conversation)

## Production Deployment

### Checklist
- [ ] Set production API keys in environment
- [ ] Configure CORS for production domain
- [ ] Set up Qdrant authentication
- [ ] Enable rate limiting
- [ ] Add monitoring/analytics
- [ ] Set up error tracking ([Sentry Setup Guide](../guides/SENTRY_SETUP.md))
- [ ] Configure CDN for static assets
- [ ] Enable gzip compression
- [ ] Add caching headers
- [ ] Set up SSL/TLS

### Security Considerations
- ✅ XSS protection (DOMPurify)
- ✅ Authentication required
- ✅ HTTPS only in production
- ✅ Rate limiting on API
- ✅ Input sanitization
- ⚠️ Add CSRF protection
- ⚠️ Implement content filtering
- ⚠️ Add request signing

## Related Documentation

- [Portal Copilot Architecture](../ai/PORTAL_COPILOT_ARCHITECTURE.md) - Detailed technical architecture
- [API Documentation](http://localhost:3003/docs) - Swagger REST endpoints
- [Quick Start Guide](../../QUICK_START.md) - Get started in 5 minutes

## Resources

### External Documentation
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Quasar Components](https://quasar.dev/vue-components/)
- [Pinia Store](https://pinia.vuejs.org/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Qdrant Vector DB](https://qdrant.tech/documentation/)

### Quick Links
| Resource | URL |
|----------|-----|
| **Web App** | [http://localhost:3050](http://localhost:3050) |
| **API Docs** | [http://localhost:3003/docs](http://localhost:3003/docs) |
| **Copilot Health** | [http://localhost:3003/api/v1/copilot/health](http://localhost:3003/api/v1/copilot/health) |
| **Qdrant Dashboard** | [http://localhost:6333/dashboard](http://localhost:6333/dashboard) |

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Status**: ✅ Production Ready
