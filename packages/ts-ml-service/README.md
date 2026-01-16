# @synthstack/ts-ml-service

![Tests](https://img.shields.io/badge/tests-257%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.4-red)

TypeScript ML Service - Full TypeScript alternative to Python ML services.

## Overview

This NestJS service provides ML/AI capabilities entirely in TypeScript, eliminating the need for Python dependencies. It's the recommended choice for teams that prefer a pure TypeScript stack.

## Features

- **Embeddings** - Generate text embeddings using OpenAI
- **RAG** - Retrieval-Augmented Generation with Qdrant vector store
- **Complexity** - Task complexity estimation (rule-based)
- **Transcription** - Audio transcription using OpenAI Whisper
- **Analysis** - Text summarization, sentiment analysis, keyword extraction

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
pnpm start:dev
```

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional - for RAG features
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Configuration
TS_ML_SERVICE_PORT=3001
TS_ML_SERVICE_HOST=0.0.0.0
EMBEDDING_MODEL=text-embedding-3-small
DEFAULT_LLM_MODEL=gpt-4o-mini
```

## API Endpoints

### Embeddings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/embeddings/generate` | POST | Generate embedding for single text |
| `/embeddings/batch` | POST | Generate embeddings for multiple texts |
| `/embeddings/similarity` | POST | Calculate similarity between two texts |
| `/embeddings/models` | GET | List available models |

### RAG (Retrieval-Augmented Generation)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rag/index` | POST | Index a document |
| `/rag/index-project-document` | POST | Index project document with chunking |
| `/rag/search` | POST | Semantic search |
| `/rag/query` | POST | RAG query (search + generate) |
| `/rag/collections` | GET | List collections |
| `/rag/collections/:name` | DELETE | Delete collection |
| `/rag/stats` | GET | Get statistics |

### Complexity Estimation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/complexity/estimate` | POST | Pre-estimate task complexity |
| `/complexity/analyze` | POST | Post-mortem analysis |
| `/complexity/scale` | GET | Get complexity scale definitions |
| `/complexity/adjustment` | POST | Calculate point adjustment |

### Transcription

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/transcription/audio` | POST | Transcribe audio file |
| `/transcription/audio/base64` | POST | Transcribe base64 audio |
| `/transcription/formats` | GET | List supported formats |
| `/transcription/languages` | GET | List supported languages |

### Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analysis/summarize` | POST | Summarize text |
| `/analysis/sentiment` | POST | Analyze sentiment |
| `/analysis/keywords` | POST | Extract keywords |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Full health status |
| `/health/ready` | GET | Readiness check |
| `/health/live` | GET | Liveness check |

## When to Use This vs Python Services

**Use ts-ml-service when:**
- Your team prefers TypeScript
- You want a simpler deployment (no Python runtime)
- You're using cloud LLM APIs (OpenAI, etc.)
- You need the same endpoints as Python but in TypeScript

**Use Python ml-service when:**
- You need custom model training/fine-tuning
- You're running local models (Ollama, vLLM)
- You need advanced ML features (scikit-learn, PyTorch)
- Your team has Python expertise

## Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["node", "dist/main"]
```

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## License

MIT
