# Roundtable Chat Integration

Send copilot chat messages to strategic debate and receive synthesized answers.

## Overview

The Roundtable Integration connects the AI copilot with the Strategy Roundtable feature, allowing users to escalate complex questions from chat to multi-agent strategic debate. Results from the debate are automatically injected back into the conversation as a Decision Brief.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Copilot Chat    │────▶│  Message         │────▶│  Strategy        │
│  Messages        │     │  Selection       │     │  Session         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Chat Updated    │◀────│  Decision Brief  │◀────│  AI Agents       │
│  with Result     │     │  Generated       │     │  Debate          │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## Key Features

- **Message selection** - Choose which chat messages to include as context
- **Tier selection** - Choose debate complexity (quick, standard, premium)
- **Live streaming** - Watch debate progress in real-time via SSE
- **Auto-injection** - Results automatically appear in original chat
- **Bidirectional linking** - Navigate between chat and roundtable

## User Flow

### 1. Initiate from Chat

User clicks "Send to Roundtable" button on any chat message:

```
┌─────────────────────────────────────────┐
│ [User] How should we architect the      │
│ authentication system for mobile?       │
│                          [📤 Roundtable]│
└─────────────────────────────────────────┘
```

### 2. Select Context

Dialog opens to select messages and configure debate:

```
┌─────────────────────────────────────────┐
│ Send to Strategic Roundtable            │
├─────────────────────────────────────────┤
│ Include messages:                       │
│ ☑ How should we architect the auth...   │
│ ☑ [AI] You could use JWT tokens with... │
│ ☐ What about OAuth providers?           │
├─────────────────────────────────────────┤
│ Strategic question:                     │
│ ┌─────────────────────────────────────┐ │
│ │ What's the best authentication      │ │
│ │ architecture for a mobile-first app?│ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Debate tier: ○ Quick  ● Standard  ○ Pro │
├─────────────────────────────────────────┤
│           [Cancel]  [Start Debate]      │
└─────────────────────────────────────────┘
```

### 3. Watch Debate

Copilot switches to Roundtable tab showing live progress:

```
┌─────────────────────────────────────────┐
│ [Chat] [Roundtable]                     │
├─────────────────────────────────────────┤
│ Strategic Debate in Progress            │
│ ━━━━━━━━━━━━░░░░░░░░  65%              │
├─────────────────────────────────────────┤
│ 🎯 Strategist: We need to consider...   │
│ 🔧 Technical: From a security POV...    │
│ 💼 Business: User adoption requires...  │
├─────────────────────────────────────────┤
│ Synthesizing decision brief...          │
└─────────────────────────────────────────┘
```

### 4. Result Injection

Decision Brief automatically appears in original chat:

```
┌─────────────────────────────────────────┐
│ [User] How should we architect the      │
│ authentication system for mobile?       │
├─────────────────────────────────────────┤
│ [AI] You could use JWT tokens with...   │
├─────────────────────────────────────────┤
│ 📋 Strategic Decision Brief             │
│ ─────────────────────────────────────── │
│ Recommendation: Implement OAuth 2.0     │
│ with PKCE flow for mobile...            │
│                                         │
│ Key Considerations:                     │
│ • Security: Native app token storage    │
│ • UX: Social login reduces friction     │
│ • Scalability: Supports future needs    │
│                     [View Full Debate]  │
└─────────────────────────────────────────┘
```

## API Reference

### Create Session from Chat

```http
POST /api/v1/strategy/sessions/from-chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "chat-uuid",
  "messageIds": ["msg-uuid-1", "msg-uuid-2"],
  "question": "What's the best authentication architecture?",
  "tier": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "status": "active",
      "tier": "standard",
      "question": "What's the best authentication architecture?",
      "sourceContext": {
        "chatId": "chat-uuid",
        "messageIds": ["msg-uuid-1", "msg-uuid-2"]
      }
    },
    "sseUrl": "/api/v1/strategy/sessions/session-uuid/stream"
  }
}
```

### Inject Result to Chat

```http
POST /api/v1/strategy/sessions/:sessionId/inject-to-chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "chat-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "new-msg-uuid",
      "chatId": "chat-uuid",
      "role": "assistant",
      "content": "## Strategic Decision Brief\n\n...",
      "metadata": {
        "type": "roundtable_result",
        "sessionId": "session-uuid"
      }
    }
  }
}
```

### Get Chat Roundtables

```http
GET /api/v1/copilot/chats/:chatId/roundtables
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roundtables": [
      {
        "id": "session-uuid",
        "status": "completed",
        "question": "Authentication architecture",
        "createdAt": "2025-01-15T10:30:00Z",
        "resultMessageId": "msg-uuid"
      }
    ]
  }
}
```

## Database Schema

### Roundtable Chat Links

```sql
CREATE TABLE roundtable_chat_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_session_id UUID NOT NULL REFERENCES strategy_sessions(id) ON DELETE CASCADE,
    source_chat_id UUID REFERENCES copilot_chats(id) ON DELETE SET NULL,
    source_message_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    result_message_id UUID REFERENCES copilot_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_roundtable_links_chat ON roundtable_chat_links(source_chat_id);
CREATE INDEX idx_roundtable_links_session ON roundtable_chat_links(strategy_session_id);
```

### Strategy Sessions Extension

```sql
-- Add source context to strategy_sessions
ALTER TABLE strategy_sessions ADD COLUMN source_context JSONB DEFAULT NULL;
```

## Frontend Components

### RoundtableContextDialog

Modal for selecting messages and configuring debate:

```vue
<template>
  <q-dialog v-model="isOpen">
    <q-card class="roundtable-dialog">
      <q-card-section>
        <div class="text-h6">Send to Strategic Roundtable</div>
      </q-card-section>

      <q-card-section>
        <div class="message-selection">
          <q-checkbox
            v-for="msg in recentMessages"
            :key="msg.id"
            v-model="selectedMessages"
            :val="msg.id"
            :label="truncate(msg.content)"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="question"
          label="Strategic question"
          type="textarea"
        />
      </q-card-section>

      <q-card-section>
        <q-btn-toggle
          v-model="tier"
          :options="tierOptions"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="close" />
        <q-btn color="primary" label="Start Debate" @click="start" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
```

### RoundtableMiniPanel

Compact debate progress view:

```vue
<template>
  <div class="roundtable-mini-panel">
    <div class="header">
      <span class="title">Strategic Debate</span>
      <q-badge :color="statusColor">{{ session.status }}</q-badge>
    </div>

    <q-linear-progress
      :value="progress"
      color="primary"
      class="progress-bar"
    />

    <div class="contributions">
      <div
        v-for="contribution in recentContributions"
        :key="contribution.id"
        class="contribution"
      >
        <q-icon :name="agentIcon(contribution.agent)" />
        <span class="agent">{{ contribution.agent }}:</span>
        <span class="content">{{ truncate(contribution.content) }}</span>
      </div>
    </div>

    <div v-if="session.status === 'completed'" class="actions">
      <q-btn flat label="View Full Debate" @click="viewFull" />
      <q-btn color="primary" label="Inject to Chat" @click="inject" />
    </div>
  </div>
</template>
```

## State Management

### Roundtable Store

```typescript
// apps/web/src/stores/roundtable.ts
export const useRoundtableStore = defineStore('roundtable', () => {
  // State
  const activeSessionId = ref<string | null>(null)
  const sessionsByChatId = ref<Record<string, RoundtableSession[]>>({})
  const liveContributions = ref<Contribution[]>([])
  const sseConnection = ref<EventSource | null>(null)

  // Actions
  async function createFromChat(params: CreateFromChatParams) {
    const response = await api.post('/strategy/sessions/from-chat', params)
    activeSessionId.value = response.session.id
    connectSSE(response.session.id)
    return response.session
  }

  function connectSSE(sessionId: string) {
    if (sseConnection.value) {
      sseConnection.value.close()
    }

    sseConnection.value = new EventSource(
      `/api/v1/strategy/sessions/${sessionId}/stream`
    )

    sseConnection.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleSSEEvent(data)
    }
  }

  function handleSSEEvent(event: SSEEvent) {
    switch (event.type) {
      case 'contribution':
        liveContributions.value.push(event.contribution)
        break
      case 'phase_change':
        // Update session phase
        break
      case 'completed':
        // Session finished
        break
    }
  }

  async function injectResultToChat(sessionId: string, chatId: string) {
    await api.post(`/strategy/sessions/${sessionId}/inject-to-chat`, { chatId })
    // Chat store will receive the new message via its own mechanisms
  }

  async function fetchChatRoundtables(chatId: string) {
    const response = await api.get(`/copilot/chats/${chatId}/roundtables`)
    sessionsByChatId.value[chatId] = response.roundtables
  }

  return {
    activeSessionId,
    sessionsByChatId,
    liveContributions,
    createFromChat,
    connectSSE,
    injectResultToChat,
    fetchChatRoundtables,
  }
})
```

## SSE Events

### Event Types

| Event | Description |
|-------|-------------|
| `contribution` | New agent contribution |
| `phase_change` | Debate phase changed |
| `synthesis_started` | Decision brief generation started |
| `completed` | Session completed |
| `error` | Error occurred |

### Event Payloads

```typescript
// Contribution event
{
  type: 'contribution',
  contribution: {
    id: 'contrib-uuid',
    agent: 'strategist',
    content: 'We need to consider...',
    timestamp: '2025-01-15T10:30:00Z'
  }
}

// Phase change event
{
  type: 'phase_change',
  phase: 'synthesis',
  progress: 0.85
}

// Completed event
{
  type: 'completed',
  result: {
    briefId: 'brief-uuid',
    summary: '...'
  }
}
```

## Debate Tiers

| Tier | Duration | Agents | Use Case |
|------|----------|--------|----------|
| Quick | ~30 sec | 3 | Simple questions, quick opinions |
| Standard | ~2 min | 5 | Most decisions, balanced analysis |
| Premium | ~5 min | 7 | Complex strategy, thorough exploration |

## Configuration

### Environment Variables

```bash
# Enable roundtable chat integration
ENABLE_ROUNDTABLE_CHAT_INTEGRATION=true

# SSE connection timeout (milliseconds)
ROUNDTABLE_SSE_TIMEOUT=300000

# Max messages to include as context
ROUNDTABLE_MAX_CONTEXT_MESSAGES=10
```

## Error Handling

### Connection Errors

```typescript
sseConnection.value.onerror = (error) => {
  console.error('SSE connection error:', error)

  // Attempt reconnection
  if (activeSessionId.value) {
    setTimeout(() => {
      connectSSE(activeSessionId.value!)
    }, 3000)
  }
}
```

### Session Failures

If a debate session fails:

1. Error event is sent via SSE
2. Session status updated to `failed`
3. User is notified in the mini panel
4. Option to retry with same context

## Integration Points

### Chat Message Component

Add roundtable action button:

```vue
<!-- ChatMessage.vue -->
<template>
  <div class="chat-message">
    <div class="content">{{ message.content }}</div>

    <div class="actions">
      <q-btn
        flat
        dense
        icon="send"
        label="Roundtable"
        @click="sendToRoundtable"
      />
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['sendToRoundtable'])

function sendToRoundtable() {
  emit('sendToRoundtable', props.message)
}
</script>
```

### Copilot Widget

Add roundtable tab:

```vue
<!-- CopilotWidget.vue -->
<template>
  <q-tabs v-model="activeTab">
    <q-tab name="chat" label="Chat" />
    <q-tab
      v-if="hasActiveRoundtable"
      name="roundtable"
      label="Roundtable"
    />
  </q-tabs>

  <q-tab-panels v-model="activeTab">
    <q-tab-panel name="chat">
      <ChatPanel @sendToRoundtable="openRoundtableDialog" />
    </q-tab-panel>

    <q-tab-panel name="roundtable">
      <RoundtableMiniPanel :session-id="activeSessionId" />
    </q-tab-panel>
  </q-tab-panels>
</template>
```

## Related Documentation

- [COPILOT.md](./COPILOT.md) - Main copilot feature documentation
- [STRATEGY_ROUNDTABLE.md](./STRATEGY_ROUNDTABLE.md) - Full roundtable documentation
- [COPILOT_TESTING.md](../testing/COPILOT_TESTING.md) - Testing guide
