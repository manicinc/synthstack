# Full AI Stack Quick Start

Get SynthStack running with TypeScript + Python ML services for advanced AI capabilities.

## When You Need the Full Stack

Add Python services when you need:
- Custom model training or fine-tuning
- Local models (Ollama, vLLM, Hugging Face)
- Advanced RAG with custom chunking strategies
- ML pipelines (scikit-learn, PyTorch, TensorFlow)
- Image/video processing
- Complex NLP tasks

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Python 3.11+
- Poetry (Python package manager)

## 1. Clone & Install

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
pnpm install
```

## 2. Choose Your Python Backend

### Option A: FastAPI (Recommended)

High-performance async Python service. Best for production.

```bash
cd packages/ml-service
poetry install
```

### Option B: Django

Batteries-included Python service. Best for teams familiar with Django.

```bash
cd packages/django-ml-service
poetry install
```

## 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# TypeScript services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Python ML service
ML_SERVICE_URL=http://localhost:8001
QDRANT_URL=http://localhost:6333

# For local models (optional)
OLLAMA_BASE_URL=http://localhost:11434
```

### LITE vs PRO Configuration

SynthStack offers two editions controlled by environment variables:

**LITE (Community Edition)** - Free, open-source:
```env
ENABLE_COPILOT=false
ENABLE_REFERRALS=false
VITE_ENABLE_COPILOT=false
VITE_ENABLE_REFERRALS=false
```

**PRO (Commercial Edition)** - All features including AI agents and referrals:
```env
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
VITE_ENABLE_COPILOT=true
VITE_ENABLE_REFERRALS=true
```

**Quick setup:**
```bash
cp .env.lite.example .env  # For LITE (community edition)
cp .env.pro.example .env   # For PRO (full features)
```

Note: AI Copilot/Agents and Referral features are PRO-only. All ML services, RAG, embeddings, and other features work in both editions.

For full comparison, see [VERSIONS.md](./VERSIONS.md).

## 4. Start All Services

### Using Docker (Recommended)

```bash
# Start all services including Python ML
docker compose -f docker-compose.full.yml up -d
```

### Manual Start

```bash
# Terminal 1: Docker services
docker compose up -d

# Terminal 2: API Gateway
pnpm dev:api

# Terminal 3: Python ML service (FastAPI)
cd packages/ml-service
poetry run uvicorn app.main:app --reload --port 8001

# Terminal 4: Frontend
pnpm dev:web
```

## 5. Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3050 |
| API Gateway | http://localhost:3003 |
| ML Service (FastAPI) | http://localhost:8001 |
| ML Service Docs | http://localhost:8001/docs |
| Directus CMS | http://localhost:8099/admin |
| Qdrant Dashboard | http://localhost:6333/dashboard |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                   Vue 3 + Quasar                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│                    Fastify + TypeScript                     │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────┐       ┌──────────────────────────────┐
│    Direct LLM Calls  │       │      Python ML Service       │
│  (OpenAI, Anthropic) │       │    (FastAPI or Django)       │
│                      │       │  ┌────────────────────────┐  │
│  Simple chat, basic  │       │  │ RAG, embeddings,       │  │
│  completions         │       │  │ custom models, ML      │  │
└──────────────────────┘       │  │ pipelines              │  │
                               │  └────────────────────────┘  │
                               └──────────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │          Qdrant              │
                               │     (Vector Database)        │
                               └──────────────────────────────┘
```

## Python ML Service Endpoints

### FastAPI Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/embeddings/generate` | POST | Generate text embedding |
| `/embeddings/batch` | POST | Batch embeddings |
| `/embeddings/similarity` | POST | Calculate similarity |
| `/rag/index` | POST | Index document |
| `/rag/search` | POST | Semantic search |
| `/rag/query` | POST | RAG query (search + generate) |
| `/complexity/estimate` | POST | Estimate task complexity |
| `/complexity/analyze` | POST | Post-mortem analysis |
| `/transcription/audio` | POST | Transcribe audio |
| `/analysis/summarize` | POST | Summarize text |
| `/analysis/sentiment` | POST | Sentiment analysis |

### Adding Custom Models

```python
# packages/ml-service/app/services/custom_model.py
from transformers import pipeline

class CustomModelService:
    def __init__(self):
        self.classifier = pipeline("sentiment-analysis")

    async def analyze(self, text: str):
        return self.classifier(text)
```

### Using Local Models (Ollama)

```python
# packages/ml-service/app/services/local_llm.py
import httpx

async def query_ollama(prompt: str, model: str = "llama2"):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt}
        )
        return response.json()
```

## Communication Patterns

### Fire-and-Forget (Default)

API Gateway calls ML service without blocking:

```typescript
// packages/api-gateway/src/services/ml-client.ts
async function indexDocument(content: string) {
  // Non-blocking call to ML service
  fetch(`${ML_SERVICE_URL}/rag/index`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }).catch(console.error);

  return { status: 'queued' };
}
```

### Synchronous (When Needed)

```typescript
async function getEmbedding(text: string) {
  const response = await fetch(`${ML_SERVICE_URL}/embeddings/generate`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return response.json();
}
```

## Development Workflow

### Running Tests

```bash
# TypeScript tests
pnpm test

# Python tests (FastAPI)
cd packages/ml-service
poetry run pytest

# Python tests (Django)
cd packages/django-ml-service
poetry run pytest
```

### Adding ML Dependencies

```bash
# FastAPI service
cd packages/ml-service
poetry add transformers torch

# Django service
cd packages/django-ml-service
poetry add transformers torch
```

## Troubleshooting

### ML Service not connecting

1. Check if Qdrant is running:
```bash
curl http://localhost:6333/health
```

2. Verify ML service is up:
```bash
curl http://localhost:8001/health
```

3. Check API Gateway can reach ML service:
```bash
curl http://localhost:3003/api/v1/ml/health
```

### GPU not detected (for local models)

Install CUDA-enabled PyTorch:
```bash
poetry add torch --extra-index-url https://download.pytorch.org/whl/cu118
```

### Memory issues with large models

Reduce batch size or use smaller models:
```env
EMBEDDING_BATCH_SIZE=10
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

## Next Steps

- [Architecture Decision Guide](./ARCHITECTURE_DECISION.md) - Detailed comparison
- [TypeScript-Only Guide](./QUICKSTART_TYPESCRIPT.md) - Simpler setup
- [Mobile Guide](./MOBILE_GUIDE.md) - Build mobile apps
- [RAG Guide](./features/RAG.md) - Advanced RAG configuration
