# Code Changes System

AI-driven code modifications via GitHub API or local workspace with approval workflows.

## Overview

The Code Changes system enables the AI copilot to propose, preview, and execute code modifications. It supports multiple targets (GitHub repositories, local workspaces, internal codebase) with configurable approval workflows and security controls.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User Request    │────▶│  Developer Agent │────▶│  CodeChange      │
│  (via Copilot)   │     │  (LangGraph)     │     │  Planner         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Execute Plan    │◀────│  Approval        │◀────│  Plan Preview    │
│  (Adapter)       │     │  Workflow        │     │  (Diff View)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │
         ▼
┌────────┴────────┐
│                 │
▼                 ▼
┌──────────┐  ┌──────────┐
│  GitHub  │  │  Local   │
│  Adapter │  │  Adapter │
└──────────┘  └──────────┘
```

## Key Features

- **Multi-target support** - GitHub repos, local workspaces, internal projects
- **Approval workflows** - Auto-apply, with-approval, or PR workflow
- **Diff preview** - Review changes before execution
- **AI reasoning** - Understand why changes were proposed
- **Path security** - Configurable allowed/blocked paths
- **Audit logging** - Full history of all changes

## Configuration

### Environment Variables

```bash
# Enable code changes feature
ENABLE_CODE_CHANGES=true

# GitHub integration (for GitHub adapter)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=...
# Or use personal access token
GITHUB_TOKEN=ghp_...
```

### Project Settings

Each project can configure its code change behavior:

```typescript
interface ProjectCodeSettings {
  projectType: 'external' | 'internal';
  changeWorkflow: 'auto_apply' | 'with_approval' | 'pr_workflow';
  allowedPaths: string[];      // Glob patterns
  blockedPaths: string[];      // Glob patterns
  workspacePath?: string;      // For local projects
}
```

## API Reference

### Generate Change Plan

```http
POST /api/v1/code-changes/plan
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "request": "Add null safety to the findById method",
  "targetFiles": ["src/services/user.ts"],
  "contextFiles": ["src/types/user.ts"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-uuid",
      "title": "Add null safety to findById",
      "description": "Add proper null checks to user service methods",
      "status": "pending_approval",
      "fileChanges": [
        {
          "path": "src/services/user.ts",
          "operation": "modify",
          "reason": "Add null check and fallback"
        }
      ],
      "aiModel": "claude-sonnet-4-20250514",
      "aiReasoning": "The findById method currently returns undefined..."
    },
    "diffPreview": [
      {
        "path": "src/services/user.ts",
        "operation": "modify",
        "diff": "@@ -5,6 +5,8 @@\n...",
        "additions": 4,
        "deletions": 2
      }
    ]
  }
}
```

### List Plans

```http
GET /api/v1/code-changes/plans?projectId=<uuid>&status=pending_approval
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan-uuid",
        "title": "Add null safety",
        "status": "pending_approval",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### Get Plan Details

```http
GET /api/v1/code-changes/plans/:planId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-uuid",
      "title": "Add null safety",
      "description": "...",
      "status": "pending_approval",
      "fileChanges": [...],
      "aiModel": "claude-sonnet-4-20250514",
      "aiReasoning": "...",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    "diffPreview": [...]
  }
}
```

### Approve Plan

```http
POST /api/v1/code-changes/plans/:planId/approve
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-uuid",
      "status": "approved",
      "approvedBy": "user-uuid",
      "approvedAt": "2025-01-15T10:35:00Z"
    }
  }
}
```

### Reject Plan

```http
POST /api/v1/code-changes/plans/:planId/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Need to handle edge case for empty arrays"
}
```

### Execute Plan

```http
POST /api/v1/code-changes/plans/:planId/execute
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "path": "src/services/user.ts",
        "success": true
      }
    ],
    "commitSha": "abc123def456",
    "prUrl": "https://github.com/user/repo/pull/42"
  }
}
```

### Read Project File

```http
GET /api/v1/projects/:projectId/files/src/services/user.ts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "src/services/user.ts",
    "content": "import { Injectable } from...",
    "language": "typescript",
    "size": 1234
  }
}
```

### List Project Files

```http
GET /api/v1/projects/:projectId/files?path=src/services
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      { "path": "src/services/user.ts", "type": "file", "size": 1234 },
      { "path": "src/services/auth.ts", "type": "file", "size": 2345 }
    ]
  }
}
```

## File Operations

### Operation Types

| Operation | Description |
|-----------|-------------|
| `create` | Create a new file |
| `modify` | Modify existing file content |
| `delete` | Delete a file |

### File Change Schema

```typescript
interface FileChange {
  path: string;           // Relative file path
  operation: 'create' | 'modify' | 'delete';
  content?: string;       // New content (for create/modify)
  reason: string;         // Why this change is needed
}
```

## Adapters

### GitHub Adapter

Uses GitHub REST API (via Octokit) for repository operations:

- Create/update files via Contents API
- Create branches and pull requests
- Read file contents and directory listings
- Supports GitHub App or personal access token auth

```typescript
// Internal usage
const adapter = new GitHubAdapter({
  owner: 'username',
  repo: 'repository',
  auth: process.env.GITHUB_TOKEN,
});

await adapter.createFile('src/new.ts', content, 'Add new file');
await adapter.updateFile('src/existing.ts', newContent, 'Update file');
await adapter.deleteFile('src/old.ts', 'Remove deprecated file');
```

### Local Adapter

Uses Node.js `fs` operations for local workspace:

- Direct file system read/write
- Path validation against allowed/blocked patterns
- Backup creation before modifications

```typescript
const adapter = new LocalAdapter({
  workspacePath: '/path/to/project',
  allowedPaths: ['src/**', 'tests/**'],
  blockedPaths: ['.env*', 'node_modules/**'],
});

await adapter.writeFile('src/new.ts', content);
await adapter.readFile('src/existing.ts');
await adapter.deleteFile('src/old.ts');
```

## Approval Workflows

### Auto Apply

Changes are applied immediately after AI generates the plan.

```typescript
// Project setting
changeWorkflow: 'auto_apply'
```

**Best for:** Personal projects, development environments

### With Approval

Changes require explicit user approval before execution.

```typescript
// Project setting
changeWorkflow: 'with_approval'
```

**Best for:** Team projects, production code

### PR Workflow

Changes create a pull request instead of direct commits.

```typescript
// Project setting
changeWorkflow: 'pr_workflow'
```

**Best for:** GitHub projects, collaborative development

## Security

### Path Controls

Projects can configure allowed and blocked paths:

```typescript
// Allow only source directories
allowedPaths: ['src/**', 'lib/**', 'tests/**']

// Block sensitive files
blockedPaths: [
  '.env*',           // Environment files
  '*.key',           // Key files
  '*.pem',           // Certificates
  'credentials.json', // Credentials
  'node_modules/**', // Dependencies
  '.git/**',         // Git internals
]
```

### Internal Project Restrictions

For `projectType: 'internal'` (SynthStack's own codebase):

1. **Always requires approval** regardless of workflow setting
2. **Stricter blocked paths** including config files
3. **Full audit logging** with complete diffs
4. **Admin-only execution** for certain paths

### Audit Logging

All code changes are logged with:

- User who initiated the change
- AI model used for planning
- Full diff of all modifications
- Approval/rejection history
- Execution results

## LangGraph Integration

The `request_code_change` tool is available to the Developer agent:

```typescript
{
  name: 'request_code_change',
  description: 'Create a code change plan to modify files in the project',
  category: 'generation',
  requiresApproval: true,
  schema: {
    properties: {
      request: {
        type: 'string',
        description: 'Description of changes needed'
      },
      targetFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Files to modify'
      },
      contextFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional context files'
      },
    },
    required: ['request'],
  },
}
```

## Plan States

```
draft ──────▶ pending_approval ──────▶ approved ──────▶ executing ──────▶ completed
                     │                     │                │
                     ▼                     ▼                ▼
                 rejected              cancelled         failed
```

| State | Description |
|-------|-------------|
| `draft` | Plan created, not yet submitted for approval |
| `pending_approval` | Awaiting user approval |
| `approved` | Approved, ready to execute |
| `rejected` | Rejected by user |
| `executing` | Currently applying changes |
| `completed` | Successfully executed |
| `failed` | Execution failed |
| `cancelled` | Cancelled before execution |

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Path not allowed` | File path blocked by security rules | Check `allowedPaths` and `blockedPaths` settings |
| `File not found` | Target file doesn't exist for modify/delete | Verify file path or use `create` operation |
| `Authentication failed` | Invalid GitHub token or permissions | Check GitHub token and repository access |
| `Plan not found` | Invalid plan ID | Verify plan exists and user has access |
| `Plan already executed` | Attempting to execute completed plan | Plans can only be executed once |

### Partial Failures

When executing a plan with multiple file changes:

```json
{
  "success": false,
  "data": {
    "results": [
      { "path": "src/a.ts", "success": true },
      { "path": "src/b.ts", "success": false, "error": "Permission denied" }
    ]
  }
}
```

- Successfully applied changes are not rolled back
- Failed files are reported with error details
- Plan status is set to `failed`

## Example Flow

### 1. User Request

User asks copilot: "Add input validation to the createUser function"

### 2. AI Planning

Developer agent uses `request_code_change` tool:

```typescript
{
  request: "Add input validation to createUser function",
  targetFiles: ["src/services/user.ts"],
  contextFiles: ["src/types/user.ts"]
}
```

### 3. Plan Generation

AI analyzes code and generates plan:

```json
{
  "title": "Add input validation to createUser",
  "fileChanges": [
    {
      "path": "src/services/user.ts",
      "operation": "modify",
      "content": "...(code with validation)...",
      "reason": "Add Zod schema validation for user input"
    }
  ],
  "aiReasoning": "Added validation using Zod to ensure email format..."
}
```

### 4. User Review

User sees diff preview in copilot interface:

```diff
 async createUser(data: CreateUserInput): Promise<User> {
+  // Validate input
+  const validated = createUserSchema.parse(data);
+
   const user = await this.repository.create({
-    email: data.email,
+    email: validated.email,
     ...
   });
 }
```

### 5. Approval & Execution

User clicks "Approve" → System executes changes → Confirmation shown

## Related Documentation

- [COPILOT.md](./COPILOT.md) - Main copilot feature documentation
- [RAG_SEARCH.md](./RAG_SEARCH.md) - RAG search system
- [COPILOT_TESTING.md](../testing/COPILOT_TESTING.md) - Testing guide
