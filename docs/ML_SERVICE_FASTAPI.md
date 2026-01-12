# FastAPI ML Service

> 🔒 **Pro Edition Only**: Python ML services (FastAPI/Django) are available in SynthStack Pro. Community Edition uses the TypeScript-only `ts-ml-service`. [Upgrade to Pro →](https://synthstack.app/pricing)

The FastAPI ML service is SynthStack's default Python backend for AI/ML operations. It provides high-performance async APIs for embeddings, RAG, text analysis, complexity estimation, and audio transcription.

## Quick Start

### Docker (Recommended)

```bash
# Start the full stack with FastAPI ML service
docker compose up

# Start only the ML service
docker compose up ml-service
```

### Local Development

```bash
cd packages/ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

## Architecture

```
packages/ml-service/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── routers/             # API endpoints
│   │   ├── health.py
│   │   ├── embeddings.py
│   │   ├── rag.py
│   │   ├── analysis.py
│   │   ├── complexity.py
│   │   └── transcription.py
│   └── services/            # Business logic
│       ├── llm_service.py
│       ├── embedding_service.py
│       ├── rag_service.py
│       ├── analysis_service.py
│       ├── complexity_estimation_service.py
│       └── transcription_service.py
├── requirements.txt
├── Dockerfile
└── pytest.ini
```

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/ready` | Readiness probe with dependency checks |

### Embeddings (`/api/v1/embeddings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate embeddings for text |
| POST | `/batch` | Generate embeddings for multiple texts |
| GET | `/models` | List available embedding models |

### RAG (`/api/v1/rag`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/index` | Index documents into vector store |
| POST | `/search` | Semantic search across indexed documents |
| POST | `/query` | RAG query with LLM response generation |
| DELETE | `/collection/{name}` | Delete a collection |
| GET | `/collections` | List all collections |
| GET | `/stats` | Get RAG statistics |

### Analysis (`/api/v1/analysis`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Full text analysis (sentiment, summary, keywords) |
| POST | `/generate` | Generate content from prompt |
| POST | `/classify` | Classify text into categories |
| POST | `/summarize` | Summarize text |
| POST | `/sentiment` | Analyze sentiment |
| POST | `/keywords` | Extract keywords |

### Complexity (`/api/v1/complexity`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pre-estimate` | Estimate task complexity before starting |
| POST | `/post-analyze` | Analyze actual complexity after completion |
| GET | `/scale` | Get complexity scale definitions |
| POST | `/calculate-adjustment` | Calculate estimation accuracy |
| GET | `/health` | Complexity service health |

### Transcription (`/api/v1/transcription`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe` | Transcribe audio file |
| POST | `/convert` | Convert audio format |
| POST | `/estimate-cost` | Estimate transcription cost |
| GET | `/health` | Transcription service health |

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=sk-...

# Database (for RAG with pgvector)
DATABASE_URL=postgresql://user:pass@localhost:5432/synthstack

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Qdrant (alternative vector DB)
QDRANT_URL=http://localhost:6333

# Embedding Model
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# LLM Settings
DEFAULT_LLM_MODEL=gpt-4
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=2000
```

## Adding Modules

### Step 1: Create the Service

Create `app/services/my_service.py`:

```python
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class MyService:
    _instance: Optional['MyService'] = None

    @classmethod
    def get_instance(cls) -> 'MyService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def initialize(self) -> None:
        """Initialize service resources."""
        logger.info("MyService initialized")

    async def process(self, input_data: str) -> Dict[str, Any]:
        """Main processing method."""
        return {"result": input_data.upper()}
```

### Step 2: Create the Router

Create `app/routers/my_feature.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.my_service import MyService

router = APIRouter(prefix="/api/v1/my-feature", tags=["My Feature"])

class ProcessRequest(BaseModel):
    input_data: str

class ProcessResponse(BaseModel):
    result: str

@router.post("/process", response_model=ProcessResponse)
async def process(request: ProcessRequest):
    """Process input data."""
    service = MyService.get_instance()
    result = await service.process(request.input_data)
    return result

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "my_feature"}
```

### Step 3: Register the Router

Update `app/main.py`:

```python
from app.routers import my_feature

app.include_router(my_feature.router)
```

### Step 4: Test

```bash
curl -X POST http://localhost:8000/api/v1/my-feature/process \
  -H "Content-Type: application/json" \
  -d '{"input_data": "hello world"}'
```

## OpenAPI Documentation

FastAPI automatically generates OpenAPI documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Testing

The FastAPI ML service includes comprehensive test coverage using pytest.

### Quick Start

```bash
cd packages/ml-service

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_embeddings.py -v

# Run with verbose output
pytest -v --tb=long
```

### Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Shared fixtures
├── test_health.py        # Health endpoint tests
├── test_embeddings.py    # Embedding endpoint tests
├── test_analysis.py      # Analysis endpoint tests
├── test_rag_service.py   # RAG service tests
├── test_complexity.py    # Complexity estimation tests
└── test_few_shot_examples.py
```

### Coverage Reports

Coverage is automatically generated in multiple formats:

```bash
# Terminal output with line-by-line missing coverage
pytest --cov=app --cov-report=term-missing

# HTML report (opens in browser)
pytest --cov=app --cov-report=html
open htmlcov/index.html

# XML for CI/CD integration
pytest --cov=app --cov-report=xml
```

### Writing Tests

Example test using fixtures:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_embedding_service():
    from app.services.embedding_service import EmbeddingService
    service = EmbeddingService.get_instance()
    # Test with mocked API
```

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run ML Service Tests
  working-directory: packages/ml-service
  run: |
    pip install -r requirements.txt
    pytest --cov=app --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: packages/ml-service/coverage.xml
```

## Docker

### Build

```bash
docker build -t synthstack-ml-service ./packages/ml-service
```

### Run

```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  synthstack-ml-service
```

## Performance

FastAPI is designed for high-performance async operations:

- **Native async/await** for I/O-bound operations
- **Pydantic validation** with Rust-powered core
- **uvicorn + uvloop** for maximum throughput
- **Connection pooling** for database and external APIs

### Benchmarks

| Operation | Latency (p50) | Latency (p99) |
|-----------|---------------|---------------|
| Health check | 1ms | 3ms |
| Embedding (single) | 150ms | 300ms |
| RAG search | 80ms | 200ms |
| Text analysis | 500ms | 1500ms |

*Benchmarks on M1 MacBook Pro with local database*

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check if port is in use
lsof -i :8000

# Check logs
docker logs synthstack-ml-service
```

**OpenAI API errors:**
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Database connection issues:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

## Related Documentation

- [Backend Options](./BACKEND_OPTIONS.md)
- [Django ML Service](./ML_SERVICE_DJANGO.md)
- [AI Co-Founders](./AI_COFOUNDERS.md)
