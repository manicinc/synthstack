# RAG Search System

Per-project semantic search using Qdrant vector database with code-aware chunking and hybrid retrieval.

## Overview

The RAG (Retrieval-Augmented Generation) Search system enables AI copilot to provide context-aware responses by indexing your project's codebase and documentation. Each project gets its own isolated vector collection for privacy and relevance.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  File Content    │────▶│  Chunking        │────▶│  Embeddings      │
│  (Source, Docs)  │     │  Service         │     │  Service         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Copilot Chat    │◀────│  RAG Indexer     │◀────│  Qdrant          │
│  Response        │     │  Service         │     │  Vector DB       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## Key Features

- **Per-project vector collections** - Isolated context for each project
- **Code-aware chunking** - Preserves function/class boundaries
- **Hybrid search** - Combines project-specific and global knowledge
- **Incremental updates** - Add/update/remove individual files
- **Language detection** - Optimized chunking by file type

## Configuration

### Environment Variables

```bash
# Enable RAG features
ENABLE_COPILOT_RAG=true

# OpenAI API for embeddings (text-embedding-3-small)
OPENAI_API_KEY=sk-...

# Qdrant vector database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional, for Qdrant Cloud
```

### Feature Flag

The RAG system is controlled by the `ENABLE_COPILOT_RAG` feature flag. When disabled, copilot will function without project context.

## API Reference

### Index Single File

```http
POST /api/v1/projects/:projectId/index/file
Authorization: Bearer <token>
Content-Type: application/json

{
  "filePath": "src/services/user.ts",
  "content": "export class UserService { ... }",
  "options": {
    "strategy": "code-aware",
    "includeMetadata": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chunksIndexed": 3,
    "filePath": "src/services/user.ts"
  }
}
```

### Batch Index Files

```http
POST /api/v1/projects/:projectId/index/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "files": [
    { "path": "src/services/user.ts", "content": "..." },
    { "path": "src/services/auth.ts", "content": "..." }
  ],
  "options": {
    "strategy": "code-aware"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 2,
    "totalChunks": 8,
    "errors": []
  }
}
```

### Reindex Project

Clears existing index and re-indexes all provided files.

```http
POST /api/v1/projects/:projectId/index/reindex
Authorization: Bearer <token>
Content-Type: application/json

{
  "files": [
    { "path": "src/index.ts", "content": "..." }
  ]
}
```

### Get Indexing Status

```http
GET /api/v1/projects/:projectId/index/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "documentCount": 150,
    "isIndexing": false,
    "lastIndexedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Search Project Documents

```http
POST /api/v1/projects/:projectId/index/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "user authentication flow",
  "limit": 10,
  "includeGlobal": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc-abc123",
        "score": 0.95,
        "content": "export class AuthService { ... }",
        "metadata": {
          "filePath": "src/services/auth.ts",
          "startLine": 15,
          "endLine": 45,
          "hasCode": true
        }
      }
    ]
  }
}
```

### Remove File from Index

```http
DELETE /api/v1/projects/:projectId/index/file
Authorization: Bearer <token>
Content-Type: application/json

{
  "filePath": "src/deprecated/old-helper.ts"
}
```

## Data Flow

```
1. File Change Detected
        │
        ▼
2. Content → Chunking Service
   - Detects language (TypeScript, Python, Markdown, etc.)
   - Applies code-aware strategy
   - Preserves function/class boundaries
   - Adds metadata (file path, line numbers)
        │
        ▼
3. Chunks → Embeddings Service
   - Generates vector embeddings (1536 dimensions)
   - Uses OpenAI text-embedding-3-small
        │
        ▼
4. Embeddings → Qdrant Vector DB
   - Stored in project-specific collection
   - Collection name: project_{projectId}_docs
        │
        ▼
5. User Query → Semantic Search
   - Query embedded using same model
   - Vector similarity search
   - Returns ranked results with metadata
        │
        ▼
6. Results → Copilot Context
   - Injected into AI prompt
   - AI provides context-aware response
```

## Code-Aware Chunking

The chunking service uses different strategies based on file type:

### TypeScript/JavaScript

- Preserves complete function definitions
- Keeps class methods together
- Maintains interface/type declarations
- Respects import block boundaries

```typescript
// Example: This function stays as one chunk
export async function processUser(userId: string): Promise<User> {
  const user = await findUser(userId);
  const profile = await fetchProfile(user.id);
  return { ...user, profile };
}
```

### Markdown

- Splits by heading boundaries
- Preserves code blocks
- Maintains list structures

### Python

- Preserves function/class definitions
- Keeps docstrings with their functions
- Respects decorator groupings

## Per-Project Collections

Each project gets an isolated vector collection:

```
synthstack_global_docs       # Shared documentation
project_abc123_docs          # Project ABC's codebase
project_def456_docs          # Project DEF's codebase
```

Benefits:
- **Privacy**: Project data is isolated
- **Relevance**: Search returns project-specific results
- **Performance**: Smaller collections = faster search
- **Cleanup**: Easy to delete project data

## Integration with Copilot

When a user sends a message to the copilot:

1. The message is embedded as a query vector
2. Semantic search retrieves relevant documents from:
   - Project-specific collection (primary)
   - Global documentation (secondary)
3. Retrieved context is formatted and injected into the AI prompt
4. AI generates response with awareness of codebase

### Example Copilot Interaction

**User:** "How does the authentication flow work in this project?"

**System Process:**
1. Search project collection for "authentication flow"
2. Retrieve top 5 relevant code chunks
3. Include in AI prompt context

**AI Response:**
> Based on your codebase, authentication works as follows:
>
> 1. User submits credentials to `/api/v1/auth/login`
> 2. `AuthService.validateCredentials()` in `src/services/auth.ts:45` verifies the password
> 3. JWT token is generated with user ID and roles
> 4. Token is returned and stored in localStorage
>
> Here's the relevant code from your auth service:
> ```typescript
> async validateCredentials(email, password) { ... }
> ```

## Indexing Triggers

| Trigger | When | Action |
|---------|------|--------|
| Manual | User clicks "Reindex" | Full reindex of project |
| GitHub Webhook | Push to repo | Incremental update of changed files |
| File Upload | User uploads files | Index uploaded content |
| Project Link | GitHub repo connected | Initial full index |

## Performance Considerations

### Batch vs Single File

- **Single file**: Use for incremental updates (< 100ms)
- **Batch**: Use for initial indexing (parallel processing)

### Embedding Rate Limits

OpenAI embeddings have rate limits. The service implements:
- Automatic batching (up to 100 texts per request)
- Exponential backoff on rate limit errors
- Progress tracking for large repositories

### Vector Search Optimization

- Default limit: 10 results
- Score threshold: 0.5 (configurable)
- Metadata filtering for file type

## Troubleshooting

### Collection Not Found

**Error:** "Project collection does not exist"

**Solution:** Run batch index first to create the collection:
```bash
curl -X POST /api/v1/projects/{id}/index/batch \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"files": [...]}'
```

### Embeddings Unavailable

**Error:** "Embeddings service unavailable"

**Solution:** Check OpenAI API key:
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test embedding generation
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "text-embedding-3-small", "input": "test"}'
```

### Slow Indexing

**Symptom:** Batch indexing takes > 5 minutes

**Solutions:**
1. Reduce chunk size (faster embedding generation)
2. Increase batch size (fewer API calls)
3. Check network latency to OpenAI API
4. Consider excluding large generated files

### Stale Results

**Symptom:** Search returns outdated code

**Solution:** Trigger reindex:
```bash
curl -X POST /api/v1/projects/{id}/index/reindex \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"files": [...]}'
```

## Security Considerations

- **Project Isolation**: Each project's vectors are stored in a separate collection
- **Access Control**: All endpoints require valid JWT authentication
- **Content Filtering**: Sensitive files (.env, credentials) should be excluded from indexing
- **Data Retention**: Collections are deleted when projects are deleted

## Related Documentation

- [COPILOT.md](./COPILOT.md) - Main copilot feature documentation
- [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md) - Environment configuration
- [Vector Database](../reference/ARCHITECTURE_OVERVIEW.md#vector-store) - Qdrant setup
