# GitHub Project Integration

Complete guide for linking GitHub repositories to SynthStack projects with automatic issue and PR syncing.

---

## Overview

SynthStack projects can be linked to GitHub repositories to automatically sync and cache:
- **GitHub Issues** - Track bugs, features, and tasks
- **Pull Requests** - Monitor code reviews and changes
- **Repository Status** - View activity at a glance

**Architecture:** Each project stores its own GitHub PAT, allowing:
- Different projects to use different GitHub accounts
- Fine-grained access control per project
- Secure, encrypted PAT storage per project

Data is synced automatically when you load a project (throttled to every 5 minutes) and cached locally for fast access.

---

## Quick Start

### 1. Create a GitHub Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full repository access (required)
   - `read:user` - Read user profile data
4. Copy the token (starts with `ghp_`, `github_pat_`, or `gho_`)

### 2. Link a Repository to Your Project

Each project has its own PAT. When linking a repository, you provide the PAT:

```bash
POST /api/v1/projects/:projectId/github/link
Authorization: Bearer <your-auth-token>
Content-Type: application/json

{
  "pat": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "repo": "owner/repository",
  "default_branch": "main",
  "sync_issues": true,
  "sync_prs": true,
  "sync_enabled": true
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pat` | string | ✅ Yes | - | GitHub Personal Access Token |
| `repo` | string | ✅ Yes | - | Repository in format `owner/repo` |
| `default_branch` | string | No | `main` | Default branch name |
| `sync_issues` | boolean | No | `true` | Sync GitHub issues |
| `sync_prs` | boolean | No | `true` | Sync pull requests |
| `sync_enabled` | boolean | No | `true` | Enable auto-sync |

**Security:**
- PAT is encrypted with AES-256-GCM before storage
- Never logged or exposed in API responses
- Stored encrypted in `projects.github_pat_encrypted` field
- Automatically cleared when unlinking

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Name",
    "github_repo": "owner/repository",
    "github_sync_enabled": true,
    "github_default_branch": "main",
    "github_username": "your-github-username",
    "github_pat_scopes": ["repo", "read:user"],
    "github_pat_verified_at": "2025-01-15T10:30:00Z"
  },
  "message": "Repository linked and sync started"
}
```

---

## API Reference

### Link Repository

```
POST /api/v1/projects/:id/github/link
```

Links a GitHub repository to a project using a project-specific PAT.

### Unlink Repository

```
DELETE /api/v1/projects/:id/github/unlink
```

Removes GitHub integration from a project. This:
- Clears the encrypted PAT
- Deletes cached issues and PRs
- Resets all GitHub settings

### Trigger Manual Sync

```
POST /api/v1/projects/:id/github/sync
```

Triggers a manual sync of issues and PRs.

### Get Cached Issues

```
GET /api/v1/projects/:id/github/issues
```

Returns cached GitHub issues.

Query Parameters:
- `state` - Filter by state: `open`, `closed`, `all` (default: `all`)
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

### Get Cached PRs

```
GET /api/v1/projects/:id/github/prs
```

Returns cached pull requests.

Query Parameters:
- `state` - Filter by state: `open`, `closed`, `merged`, `all` (default: `all`)
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

---

## Database Schema

### Projects Table (GitHub Fields)

| Column | Type | Description |
|--------|------|-------------|
| `github_repo` | VARCHAR(255) | Repository name (owner/repo) |
| `github_sync_enabled` | BOOLEAN | Auto-sync enabled |
| `github_last_synced_at` | TIMESTAMPTZ | Last sync timestamp |
| `github_default_branch` | VARCHAR(100) | Default branch (main/master) |
| `github_sync_issues` | BOOLEAN | Sync issues enabled |
| `github_sync_prs` | BOOLEAN | Sync PRs enabled |
| `github_pat_encrypted` | TEXT | Encrypted GitHub PAT |
| `github_username` | VARCHAR(100) | GitHub username for this PAT |
| `github_pat_scopes` | JSONB | PAT scopes array |
| `github_pat_verified_at` | TIMESTAMPTZ | Last PAT verification |
| `github_pat_verification_error` | TEXT | Verification error if any |

### GitHub Issues Cache

```sql
CREATE TABLE project_github_issues (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  github_issue_id INTEGER NOT NULL,
  title VARCHAR(500),
  state VARCHAR(20),
  created_by_github_user VARCHAR(100),
  labels JSONB,
  html_url VARCHAR(500),
  github_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  UNIQUE(project_id, github_issue_id)
);
```

### GitHub PRs Cache

```sql
CREATE TABLE project_github_prs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  github_pr_id INTEGER NOT NULL,
  title VARCHAR(500),
  state VARCHAR(20),
  merged BOOLEAN,
  head_branch VARCHAR(255),
  base_branch VARCHAR(255),
  additions INTEGER,
  deletions INTEGER,
  UNIQUE(project_id, github_pr_id)
);
```

---

## Frontend Usage

### Settings Tab

The project Settings tab includes GitHub integration:

1. **Enter PAT**: Paste your GitHub Personal Access Token
2. **Enter Repository**: Format `owner/repo` (e.g., `facebook/react`)
3. **Configure Options**: Branch, sync issues, sync PRs
4. **Link**: Click "Link Repository"

### Viewing Synced Data

Once linked:
- Issues appear in a list with state badges (open/closed)
- PRs show status, branch info, and merge state
- Manual sync button for immediate refresh
- Unlink button to remove integration

---

## Auto-Sync Behavior

When a project with GitHub integration is loaded:

1. System checks `github_last_synced_at`
2. If more than 5 minutes have passed:
   - Sync runs in background (non-blocking)
   - Issues and PRs are fetched from GitHub API
   - Cache is updated via upsert (insert or update)
   - `github_last_synced_at` is updated
3. User sees cached data immediately

This ensures:
- Fast project loading
- Fresh data within 5 minutes
- No redundant API calls

---

## Error Handling

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_PAT` | 400/401 | PAT format invalid or expired |
| `INVALID_REPO` | 400 | Repository format not `owner/repo` |
| `REPO_NOT_FOUND` | 404 | Repository doesn't exist or not accessible |
| `UNAUTHORIZED` | 401 | Authentication required |
| `LINK_FAILED` | 500 | General link failure |

---

## Security

- **Encryption**: PAT encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var
- **Access Control**: Only project owner can link/unlink
- **No PAT Exposure**: PAT never returned in API responses
- **Cascade Delete**: Unlinking clears all cached data
- **Verification**: PAT verified against GitHub API before storage

---

## Environment Variables

Ensure these are set in your API gateway:

```env
ENCRYPTION_KEY=your-32-byte-hex-key-for-encryption
```

Generate a secure key:
```bash
openssl rand -hex 32
```
