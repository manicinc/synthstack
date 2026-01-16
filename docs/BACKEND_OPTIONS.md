# Backend Options

SynthStack provides **two interchangeable Python backends** for Generative AI operations. Both backends offer the same API endpoints for LLM-powered features like embeddings, RAG, text analysis, and content generation.

Choose the framework that fits your team's expertise.

## Available Backends

| Backend | Framework | Best For |
|---------|-----------|----------|
| **FastAPI** (Default) | FastAPI + Pydantic | High-performance async APIs, AI inference, startups |
| **Django** | Django REST Framework | Enterprise teams, existing Django expertise, admin interface |

## Generative AI Features

Both backends provide identical AI-powered capabilities:

| Feature | Description |
|---------|-------------|
| **Embeddings** | OpenAI text embeddings for semantic search |
| **RAG Pipeline** | Retrieval-Augmented Generation with vector search |
| **Text Analysis** | Sentiment, summarization, keyword extraction |
| **Content Generation** | LLM-powered text generation |
| **Complexity Estimation** | AI-powered task complexity scoring |
| **Transcription** | Audio-to-text via Whisper API |

## Quick Start

### Using FastAPI (Default)

```bash
# Start all services with FastAPI ML backend
docker compose up

# Or explicitly
docker compose up ml-service
```

### Using Django

```bash
# Start with Django ML backend
docker compose --profile django up

# This starts ml-service-django instead of ml-service
```

## Feature Parity

Both backends provide identical API endpoints:

| Endpoint Category | Endpoints | FastAPI | Django |
|-------------------|-----------|---------|--------|
| **Health** | `/health`, `/ready` | Yes | Yes |
| **Embeddings** | `/api/v1/embeddings/*` | Yes | Yes |
| **RAG** | `/api/v1/rag/*` | Yes | Yes |
| **Analysis** | `/api/v1/analysis/*` | Yes | Yes |
| **Complexity** | `/api/v1/complexity/*` | Yes | Yes |
| **Transcription** | `/api/v1/transcription/*` | Yes | Yes |

### API Compatibility

- Same request/response schemas
- Same authentication patterns
- Same error response formats
- Interchangeable without frontend changes

## Comparison

### FastAPI

**Pros:**
- Native async/await support
- Automatic OpenAPI + Swagger UI generation
- Pydantic validation with detailed error messages
- Excellent for high-concurrency AI workloads
- Minimal boilerplate
- Lightweight (no heavy ML dependencies)

**Cons:**
- No built-in admin interface
- No ORM with migrations (uses raw SQL or SQLAlchemy)
- Smaller ecosystem compared to Django

### Django

**Pros:**
- Built-in admin interface
- Django ORM with migrations
- Extensive ecosystem and plugins
- Battle-tested in enterprise environments
- Familiar to large developer community

**Cons:**
- Async support requires `async_to_sync` wrappers
- More boilerplate code
- Heavier framework footprint

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (Vue 3 + Quasar)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                       (Fastify)                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Generative AI Service                         │
│              (FastAPI OR Django - Pick One)                 │
│                                                             │
│  ┌─────────────────┐    OR    ┌─────────────────┐          │
│  │     FastAPI     │          │      Django     │          │
│  │  Port: 8000     │          │   Port: 8000    │          │
│  └─────────────────┘          └─────────────────┘          │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ PostgreSQL│   │  Qdrant  │    │  Redis   │
    │ (pgvector)│   │ (Vectors)│    │ (Cache)  │
    └──────────┘    └──────────┘    └──────────┘
```

## Configuration

### Environment Variables

Both backends share the same environment variables:

```env
# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/synthstack

# Redis
REDIS_URL=redis://redis:6379

# Vector DB
QDRANT_URL=http://qdrant:6333
```

### Django-Specific

```env
DJANGO_ENV=development
DJANGO_DEBUG=true
DJANGO_SECRET_KEY=your-secret-key
```

## Switching Backends

Switching between backends is simple:

1. Stop the current stack:
   ```bash
   docker compose down
   ```

2. Start with the other backend:
   ```bash
   # For Django
   docker compose --profile django up

   # For FastAPI (default)
   docker compose up
   ```

The API Gateway automatically connects to whichever ML service is running on port 8001.

## Adding Custom Modules

Both backends support adding new modules. See:

- [FastAPI: Adding Modules](./ML_SERVICE_FASTAPI.md#adding-modules)
- [Django: Adding Modules](./ML_SERVICE_DJANGO.md#adding-modules)

## Documentation

- **FastAPI Backend**: [ML_SERVICE_FASTAPI.md](./ML_SERVICE_FASTAPI.md)
- **Django Backend**: [ML_SERVICE_DJANGO.md](./ML_SERVICE_DJANGO.md)

## OpenAPI Documentation

Both backends expose OpenAPI documentation:

| Backend | Swagger UI | ReDoc | OpenAPI JSON |
|---------|------------|-------|--------------|
| FastAPI | `/docs` | `/redoc` | `/openapi.json` |
| Django | `/api/v1/docs/` | `/api/v1/redoc/` | `/api/v1/schema/` |

## Which Should I Choose?

**Choose FastAPI if:**
- Your team has Python async experience
- You need maximum performance for AI inference
- You prefer minimal boilerplate
- You're building a new project from scratch

**Choose Django if:**
- Your team already knows Django
- You need a built-in admin interface
- You want ORM migrations for schema management
- You're integrating with existing Django projects
- You prefer a larger ecosystem of packages

Both are production-ready, fully supported, and provide **identical Generative AI capabilities**.
