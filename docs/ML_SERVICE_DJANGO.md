# Django ML Service

The Django ML service is SynthStack's alternative Python backend for AI/ML operations. It provides the same API endpoints as the FastAPI version but uses Django REST Framework, making it ideal for teams with Django experience.

## Quick Start

### Docker (Recommended)

```bash
# Start the full stack with Django ML service
docker compose --profile django up

# Start only the Django ML service
docker compose --profile django up ml-service-django
```

### Local Development

```bash
cd packages/django-ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations (optional, for admin)
python manage.py migrate

# Run the server
uvicorn mlservice.asgi:application --reload --port 8000
```

## Architecture

```
packages/django-ml-service/
├── mlservice/               # Django project settings
│   ├── settings/
│   │   ├── base.py         # Base settings
│   │   ├── development.py  # Dev settings
│   │   └── production.py   # Prod settings
│   ├── urls.py             # Root URL configuration
│   └── asgi.py             # ASGI application
├── services/               # Shared service layer
│   ├── llm_service.py
│   ├── embedding_service.py
│   ├── rag_service.py
│   ├── analysis_service.py
│   ├── complexity_service.py
│   └── transcription_service.py
├── health/                 # Health check app
├── embeddings/             # Embeddings app
├── rag/                    # RAG app
├── analysis/               # Text analysis app
├── complexity/             # Complexity estimation app
├── transcription/          # Audio transcription app
├── requirements.txt
├── Dockerfile
├── manage.py
└── pytest.ini
```

## API Endpoints

All endpoints match the FastAPI version exactly for drop-in compatibility.

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
# Django Settings
DJANGO_ENV=development
DJANGO_DEBUG=true
DJANGO_SECRET_KEY=your-secret-key

# Required AI APIs
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

### Step 1: Create Django App

```bash
python manage.py startapp my_feature
```

### Step 2: Create the Service

Create `services/my_service.py`:

```python
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class MyService:
    _instance: Optional['MyService'] = None
    _initialized: bool = False

    @classmethod
    def get_instance(cls) -> 'MyService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def initialize(self) -> None:
        if self._initialized:
            return
        logger.info("MyService initialized")
        self._initialized = True

    async def process(self, input_data: str) -> Dict[str, Any]:
        return {"result": input_data.upper()}
```

### Step 3: Create Serializers

Create `my_feature/serializers.py`:

```python
from rest_framework import serializers

class ProcessRequestSerializer(serializers.Serializer):
    input_data = serializers.CharField(max_length=10000)

class ProcessResponseSerializer(serializers.Serializer):
    result = serializers.CharField()
```

### Step 4: Create Views

Create `my_feature/views.py`:

```python
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from asgiref.sync import async_to_sync

from services.my_service import MyService
from .serializers import ProcessRequestSerializer, ProcessResponseSerializer

@extend_schema(
    tags=['My Feature'],
    request=ProcessRequestSerializer,
    responses={200: ProcessResponseSerializer}
)
@api_view(['POST'])
def process(request):
    serializer = ProcessRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    service = MyService.get_instance()
    result = async_to_sync(service.process)(
        input_data=serializer.validated_data['input_data']
    )
    return Response(result)

@extend_schema(tags=['My Feature'])
@api_view(['GET'])
def health_check(request):
    return Response({'status': 'healthy', 'service': 'my_feature'})
```

### Step 5: Create URLs

Create `my_feature/urls.py`:

```python
from django.urls import path
from . import views

app_name = 'my_feature'

urlpatterns = [
    path('process', views.process, name='process'),
    path('health', views.health_check, name='health'),
]
```

### Step 6: Register the App

Add to `mlservice/settings/base.py`:

```python
INSTALLED_APPS = [
    # ...
    'my_feature',
]
```

Add to `mlservice/urls.py`:

```python
urlpatterns = [
    # ...
    path('api/v1/my-feature/', include('my_feature.urls')),
]
```

### Step 7: Test

```bash
curl -X POST http://localhost:8000/api/v1/my-feature/process \
  -H "Content-Type: application/json" \
  -d '{"input_data": "hello world"}'
```

## OpenAPI Documentation

Django uses drf-spectacular for OpenAPI generation:

- **Swagger UI**: http://localhost:8000/api/v1/docs/
- **ReDoc**: http://localhost:8000/api/v1/redoc/
- **OpenAPI JSON**: http://localhost:8000/api/v1/schema/

## Testing

The Django ML service includes comprehensive test coverage using pytest with pytest-django.

### Quick Start

```bash
cd packages/django-ml-service

# Run all tests
pytest

# Run with coverage (automatically configured in pytest.ini)
pytest

# Run specific test file
pytest tests/test_health.py -v

# Run with verbose output
pytest -v --tb=long

# Run Django's built-in test runner
python manage.py test
```

### Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Shared fixtures (API client, mocks)
├── test_health.py        # Health endpoint tests
├── test_embeddings.py    # Embedding endpoint tests
├── test_analysis.py      # Analysis endpoint tests
├── test_rag.py           # RAG endpoint tests
└── test_complexity.py    # Complexity estimation tests
```

### Coverage Reports

Coverage is automatically generated via pytest.ini settings:

```bash
# Terminal output with line-by-line missing coverage
pytest --cov=. --cov-report=term-missing

# HTML report (opens in browser)
pytest --cov=. --cov-report=html
open htmlcov/index.html

# XML for CI/CD integration
pytest --cov=. --cov-report=xml
```

### Coverage Configuration

The `.coveragerc` file configures what to include/exclude:

```ini
[run]
source = .
omit =
    */migrations/*
    */tests/*
    manage.py
    */settings/*

[report]
exclude_lines =
    pragma: no cover
    raise NotImplementedError
```

### Writing Tests

Example test using DRF APIClient:

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_health_check(api_client):
    response = api_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"

@pytest.mark.django_db
def test_embeddings_with_mock(api_client):
    with patch("embeddings.views.EmbeddingService") as MockService:
        mock_instance = MagicMock()
        mock_instance.generate_embedding = AsyncMock(return_value=[0.1] * 1536)
        MockService.get_instance.return_value = mock_instance

        response = api_client.post("/api/v1/embeddings/generate", {
            "text": "Hello world"
        }, format="json")

        assert response.status_code == status.HTTP_200_OK
```

### Factory Boy (Optional)

For complex test data, use Factory Boy:

```python
import factory

class DocumentFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.Sequence(lambda n: f"doc_{n}")
    content = factory.Faker("paragraph")
    metadata = {"source": "test"}
```

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Django ML Service Tests
  working-directory: packages/django-ml-service
  run: |
    pip install -r requirements.txt
    pytest --cov=. --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: packages/django-ml-service/coverage.xml
```

## Django Admin

The Django version includes a built-in admin interface:

```bash
# Create superuser
python manage.py createsuperuser

# Access admin at
http://localhost:8000/admin/
```

## Docker

### Build

```bash
docker build -t synthstack-ml-django ./packages/django-ml-service
```

### Run

```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  -e DJANGO_SECRET_KEY=your-secret-key \
  synthstack-ml-django
```

## Key Differences from FastAPI

| Aspect | FastAPI | Django |
|--------|---------|--------|
| Async Support | Native | Uses `async_to_sync` wrapper |
| Validation | Pydantic | DRF Serializers |
| OpenAPI | Automatic | drf-spectacular |
| Admin Interface | None | Built-in |
| ORM | SQLAlchemy (optional) | Django ORM |
| Request Handling | Function-based | View classes or functions |

## Service Pattern

Django views call async services using the `async_to_sync` wrapper:

```python
from asgiref.sync import async_to_sync

@api_view(['POST'])
def my_view(request):
    service = MyService.get_instance()
    # Wrap async call
    result = async_to_sync(service.async_method)(arg1, arg2)
    return Response(result)
```

## Migrations

If you add database models:

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

## Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
# Ensure you're in the right directory
cd packages/django-ml-service

# Verify PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)
```

**Async errors:**
```python
# Always use async_to_sync for async service methods
from asgiref.sync import async_to_sync

result = async_to_sync(service.async_method)(args)
```

**Database connection issues:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
python manage.py dbshell
```

## Related Documentation

- [Backend Options](./BACKEND_OPTIONS.md)
- [FastAPI ML Service](./ML_SERVICE_FASTAPI.md)
- [Adding Modules Guide](../packages/django-ml-service/docs/ADDING_MODULES.md)
- [AI Co-Founders](./AI_COFOUNDERS.md)
