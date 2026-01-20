# LangGraph User Guide

This guide explains how to use the LangGraph-powered features in SynthStack, including AI chat, approvals, memories, workflows, and RAG search.

## Overview

SynthStack uses LangGraph to power intelligent, stateful AI interactions. LangGraph provides:

- **Persistent Memory**: Conversations maintain context across sessions
- **Human-in-the-Loop**: Dangerous actions require your approval
- **Workflow Integration**: AI agents can execute Node-RED workflows
- **RAG Search**: AI answers are grounded in your knowledge base

## Getting Started

### Accessing AI Features

1. **Chat Panel**: Click the chat icon in the sidebar or press `⌘K`
2. **Approvals**: View pending actions in the Approvals panel
3. **Memories**: Browse extracted insights in the Memories panel
4. **Workflows**: Manage automations in the Workflows section

## Chat

### Starting a Conversation

1. Select an agent from the dropdown (CEO, CTO, CMO, etc.)
2. Type your message and press Enter
3. Watch the response stream in real-time

### Agent Specializations

| Agent | Expertise | Best For |
|-------|-----------|----------|
| **CEO** | Strategy, planning, decisions | Business direction, priorities |
| **CTO** | Architecture, technical decisions | Tech stack, implementation |
| **CMO** | Marketing, growth, content | Campaigns, positioning |
| **CFO** | Finance, metrics, budgets | Revenue, costs, forecasting |
| **CPO** | Product, features, roadmap | Feature planning, UX |
| **COO** | Operations, processes | Efficiency, workflows |

### Chat Features

- **Streaming Responses**: See tokens appear in real-time
- **Context Awareness**: Agents remember previous conversations
- **Knowledge Grounding**: Answers reference your docs and data
- **Code Highlighting**: Technical responses include syntax highlighting
- **Retry**: Click the retry button to regenerate a response
- **Copy**: Copy any response to clipboard

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open chat |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Close chat |
| `⌘↑` | Previous message |

## Approvals

### What Requires Approval

Certain actions are gated to protect your business:

| Action Type | Examples | Risk Level |
|-------------|----------|------------|
| **Workflow Execution** | Running automations | Medium |
| **External API Calls** | Posting to Slack, sending emails | Medium |
| **Data Modifications** | Creating/updating CMS records | Medium |
| **Financial Actions** | Creating invoices, charges | High |
| **Code Changes** | Creating PRs, commits | High |

### Reviewing Approvals

1. Open the **Approvals** panel (bell icon)
2. Click a pending request to see details
3. Review:
   - What action will be taken
   - What data will be used
   - Potential impact
4. Click **Approve** or **Reject**

### Approval Workflow

```
User Request → AI Plans Action → Approval Required?
                                        ↓ Yes
                                  Pause & Notify
                                        ↓
                                  User Reviews
                                        ↓
                              Approve ←→ Reject
                                 ↓          ↓
                            Execute      Cancel
                                 ↓
                            Return Result
```

### Auto-Approval Settings

Configure automatic approval for low-risk actions:

1. Go to **Settings > AI > Approvals**
2. Toggle auto-approval for specific action types
3. Set conditions (e.g., only for test environments)

## Memories

### What Gets Remembered

The AI automatically extracts and stores:

- **Decisions**: Choices you've made
- **Preferences**: Your stated preferences
- **Facts**: Information about your business
- **Action Items**: Tasks mentioned in conversations
- **Insights**: Patterns and observations

### Viewing Memories

1. Open the **Memories** panel
2. Browse by category or search
3. Click a memory to see context

### Memory Types

| Type | Icon | Description |
|------|------|-------------|
| Decision | ⚖️ | A choice or direction set |
| Preference | ❤️ | Stated likes/dislikes |
| Fact | 📋 | Business information |
| Action | ✅ | Task or to-do item |
| Insight | 💡 | Pattern or observation |

### Managing Memories

- **Delete**: Remove memories that are outdated or incorrect
- **Search**: Find specific memories by keyword
- **Filter**: View by type or date range

### Privacy

- Memories are scoped to your organization
- Only you and your team can access them
- Delete anytime from the Memories panel

## Workflows

### AI + Workflows Integration

AI agents can:

1. **Suggest Workflows**: Recommend automations for your needs
2. **Create Workflows**: Generate Node-RED flows from descriptions
3. **Execute Workflows**: Run existing workflows on your behalf
4. **Monitor Results**: Report on workflow outcomes

### Requesting Workflow Actions

Example prompts:

```
"Run the daily report workflow"

"Create a workflow that sends Slack notifications when new leads come in"

"Execute the customer onboarding automation for user@example.com"
```

### Workflow Execution Flow

```
User: "Run the weekly report"
         ↓
AI: Identifies workflow
         ↓
AI: Requests approval (if required)
         ↓
User: Approves
         ↓
AI: Executes workflow via Node-RED
         ↓
AI: Returns results summary
```

### Workflow Credits

Workflow executions consume credits based on:
- Execution duration
- Number of nodes
- Premium node usage (AI, external APIs)

See [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md) for details.

## RAG Search

### How RAG Works

RAG (Retrieval-Augmented Generation) grounds AI responses in your data:

1. Your question is analyzed
2. Relevant documents are retrieved from your knowledge base
3. AI generates an answer using retrieved context
4. Sources are cited in the response

### Knowledge Sources

The knowledge base can include:

- **Documentation**: Product docs, guides, SOPs
- **Blog Posts**: Your published content
- **Files**: PDFs, Word docs, spreadsheets
- **URLs**: Web pages and external docs
- **Notion**: Pages and databases
- **Google Drive**: Docs, sheets, slides

### Ingesting Content

#### Via UI
1. Go to **Settings > Knowledge Base**
2. Click **Add Source**
3. Select source type and configure
4. Click **Ingest**

#### Via Workflow
Use the `synthstack-kb-ingest` node:

```
[Trigger] → [KB Ingest] → [Notify]
```

### Searching the Knowledge Base

#### Direct Search
1. Go to **Knowledge** in the sidebar
2. Enter your search query
3. Browse results with relevance scores

#### Via Chat
Just ask a question - the AI automatically searches:

```
"What's our refund policy?"
"How do I configure SMTP settings?"
"What were Q3 revenue numbers?"
```

### Search Quality Tips

1. **Be specific**: "SMTP configuration for SendGrid" > "email setup"
2. **Use keywords**: Include relevant terms from your docs
3. **Ask follow-ups**: Refine based on initial results

## Threads and Sessions

### Understanding Threads

Each conversation is a "thread" with:
- Unique ID
- Message history
- Associated memories
- Execution logs

### Thread Persistence

- Threads persist across browser sessions
- Resume any conversation from History
- Threads are archived after 30 days of inactivity

### Starting Fresh

To start a new conversation without context:
1. Click **New Chat** in the chat panel
2. Or use keyboard shortcut `⌘N`

## Advanced Features

### Custom System Prompts

Customize AI behavior per agent:

1. Go to **Settings > AI > Agents**
2. Select an agent
3. Edit the system prompt
4. Save changes

### Temperature and Parameters

Adjust response creativity:

| Parameter | Low Value | High Value |
|-----------|-----------|------------|
| Temperature | More focused, deterministic | More creative, varied |
| Max Tokens | Shorter responses | Longer responses |

### Model Selection

Choose the AI model per conversation:

1. Click the model selector in chat
2. Choose from available models
3. Model persists for the thread

## Troubleshooting

### AI Not Responding

1. Check your internet connection
2. Verify API keys are configured (Settings > Integrations)
3. Check credit balance
4. Try refreshing the page

### Slow Responses

1. Try a faster model (gpt-4o-mini, claude-3-haiku)
2. Reduce max tokens setting
3. Check for complex workflow executions

### Incorrect Answers

1. Check if relevant docs are in knowledge base
2. Re-ingest outdated content
3. Provide more context in your question
4. Delete incorrect memories that might be influencing responses

### Approval Stuck

1. Check the Approvals panel for pending items
2. Approve or reject the pending action
3. If no pending items, the action may have timed out

## Best Practices

### Effective Prompting

1. **Be specific**: Include relevant details
2. **Provide context**: Reference previous decisions
3. **State constraints**: Mention limitations or requirements
4. **Ask for format**: Request lists, tables, or specific structures

### Knowledge Base Maintenance

1. **Regular updates**: Re-ingest changed documents
2. **Remove outdated**: Delete obsolete content
3. **Organize**: Use clear naming and categorization
4. **Test**: Periodically verify search results

### Security

1. **Review approvals**: Don't auto-approve high-risk actions
2. **Audit logs**: Check execution history regularly
3. **Limit access**: Use role-based permissions
4. **Protect keys**: Never share API keys in chat

## Getting Help

- **In-App**: Press `⌘K` and ask for help
- **Documentation**: [docs.synthstack.app](https://docs.synthstack.app)
- **Community**: [community.synthstack.app](https://community.synthstack.app)
- **Support**: support@synthstack.app

---

**Related Guides:**
- [Workflow Quick Start](./guides/WORKFLOW_QUICK_START.md)
- [API Keys Setup](./guides/WORKFLOW_API_KEYS_SETUP.md)
- [Node-RED Operator Guide](./NODERED_OPERATOR_GUIDE.md)
- [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md)
