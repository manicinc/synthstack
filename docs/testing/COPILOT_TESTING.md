# Copilot Testing Guide

Testing patterns and strategies for SynthStack copilot features including RAG Search, Code Changes, Roundtable Integration, and AI Settings.

## Test Philosophy

Tests should be **generic and flexible**, not locked to hard-coded values or specific implementations:

### DO: Use Flexible Assertions

```typescript
// Structure exists
expect(result).toHaveProperty('success', true);
expect(result).toHaveProperty('chunksIndexed');

// Values are reasonable
expect(result.chunksIndexed).toBeGreaterThan(0);
expect(result.totalFiles).toBeGreaterThanOrEqual(files.length);

// Arrays contain expected shapes
expect(result.fileChanges).toEqual(expect.arrayContaining([
  expect.objectContaining({
    path: expect.any(String),
    operation: expect.any(String),
  }),
]));

// Type checking
expect(typeof status.isIndexing).toBe('boolean');
expect(Array.isArray(results)).toBe(true);
```

### DON'T: Hard-code Values

```typescript
// BAD - Breaks when implementation changes
expect(result.chunks.length).toBe(5);
expect(result.chunks[0].content).toBe('export function hello()');
expect(result.message).toBe('Successfully indexed 3 files');

// BAD - Tests specific text
expect(error.message).toBe('Embeddings service unavailable');
```

## Test Structure

```
packages/api-gateway/
├── src/
│   ├── services/
│   │   └── __tests__/
│   │       ├── rag-indexer.test.ts
│   │       ├── vector-db-project.test.ts
│   │       └── chunking-code.test.ts
│   ├── routes/
│   │   └── __tests__/
│   │       └── users-ai-settings.test.ts
│   └── __tests__/
│       ├── fixtures/
│       │   ├── rag-indexing.ts
│       │   ├── code-changes.ts
│       │   └── ai-settings.ts
│       └── integration/
│           ├── rag-indexing.test.ts
│           └── code-changes.test.ts
├── test/
│   └── helpers.ts          # Mock factories

apps/web/
├── test/
│   └── stores/
│       ├── roundtable.spec.ts
│       └── copilot-ai-settings.spec.ts
└── e2e/
    ├── helpers/
    │   └── test-utils.ts   # E2E mock utilities
    ├── copilot-rag.spec.ts
    ├── copilot-code-changes.spec.ts
    ├── copilot-roundtable.spec.ts
    └── ai-settings.spec.ts
```

## Mock Factories

Located in `packages/api-gateway/src/test/helpers.ts`:

### Embeddings Mock

```typescript
import { createMockEmbeddings } from '../../test/helpers.js';

// Basic usage
const mockEmbeddings = createMockEmbeddings();

// With options
const mockEmbeddings = createMockEmbeddings({
  available: true,
  dimension: 1536,
});

// In tests
vi.mock('../embeddings.js', () => ({
  embeddingsService: createMockEmbeddings(),
}));
```

### Vector DB Mock

```typescript
import { createMockVectorDB } from '../../test/helpers.js';

const mockVectorDB = createMockVectorDB({
  searchResults: [
    { id: 'doc-1', score: 0.95, content: 'Test content' },
  ],
  projectSearchResults: {
    'project-123': [/* project-specific results */],
  },
});

// Verifying calls
expect(vectorDB.ensureProjectCollection).toHaveBeenCalledWith(projectId);
expect(vectorDB.upsertProjectDocuments).toHaveBeenCalled();
```

### Chunking Mock

```typescript
import { createMockChunking } from '../../test/helpers.js';

const mockChunking = createMockChunking();

// Returns predictable chunks based on input
// Each chunk has: id, content, metadata (filePath, startLine, endLine, hasCode)
```

### RAG Indexer Mock

```typescript
import { createMockRagIndexer } from '../../test/helpers.js';

const mockRagIndexer = createMockRagIndexer({
  available: true,
  indexingStatus: {
    exists: true,
    documentCount: 150,
    isIndexing: false,
  },
});
```

### LLM Router Mock

```typescript
import { createMockLLMRouter } from '../../test/helpers.js';

const mockLLMRouter = createMockLLMRouter({
  streamResponse: 'Generated code here...',
  model: 'claude-sonnet-4-20250514',
});
```

## Test Fixtures

### RAG Indexing Fixtures

`packages/api-gateway/src/__tests__/fixtures/rag-indexing.ts`:

```typescript
import {
  TEST_FILES,          // Sample files: typescript, javascript, markdown, empty
  TEST_PROJECTS,       // Project configs: local, github, internal
  TEST_EMBEDDINGS,     // Pre-computed embeddings
  TEST_SEARCH_RESULTS, // Sample search results
  TEST_INDEXING_STATUSES, // Status objects
  TEST_BATCH_FILES,    // Batch indexing scenarios
} from '../__tests__/fixtures/rag-indexing.js';

// Usage
const result = await ragIndexerService.indexFile(
  TEST_PROJECTS.local.id,
  TEST_FILES.typescript.path,
  TEST_FILES.typescript.content
);
```

### Code Changes Fixtures

`packages/api-gateway/src/__tests__/fixtures/code-changes.ts`:

```typescript
import {
  TEST_FILE_CHANGES,    // File change arrays
  TEST_PLANS,           // Plan objects by status
  TEST_DIFF_PREVIEWS,   // Diff preview data
  TEST_AI_PLAN_REQUESTS, // AI plan request objects
  TEST_EXECUTION_RESULTS, // Execution outcomes
} from '../__tests__/fixtures/code-changes.js';

// Usage
const plan = TEST_PLANS.pendingApproval;
expect(plan.status).toBe('pending_approval');
```

### AI Settings Fixtures

`packages/api-gateway/src/__tests__/fixtures/ai-settings.ts`:

```typescript
import {
  TEST_AI_SETTINGS,         // Settings configurations
  TEST_AI_SETTINGS_UPDATES, // Update payloads
  TEST_MODEL_OPTIONS,       // Available models
  TEST_EFFECTIVE_MODEL_CASES, // Model resolution test cases
} from '../__tests__/fixtures/ai-settings.js';
```

## Unit Test Examples

### Service Tests

```typescript
// packages/api-gateway/src/services/__tests__/rag-indexer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockEmbeddings, createMockVectorDB } from '../../test/helpers.js';
import { TEST_FILES, TEST_PROJECTS } from '../../../__tests__/fixtures/rag-indexing.js';

vi.mock('../embeddings.js', () => ({
  embeddingsService: createMockEmbeddings(),
}));

vi.mock('../vector-db.js', () => ({
  vectorDB: createMockVectorDB(),
}));

import { ragIndexerService } from '../rag-indexer.js';
import { embeddingsService } from '../embeddings.js';
import { vectorDB } from '../vector-db.js';

describe('RagIndexerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('indexFile()', () => {
    it('should successfully index a file with content', async () => {
      vi.mocked(embeddingsService.isAvailable).mockReturnValue(true);

      const result = await ragIndexerService.indexFile(
        TEST_PROJECTS.local.id,
        TEST_FILES.typescript.path,
        TEST_FILES.typescript.content
      );

      // Generic assertions
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('chunksIndexed');
      expect(result.chunksIndexed).toBeGreaterThan(0);
    });

    it('should handle unavailable embeddings service', async () => {
      vi.mocked(embeddingsService.isAvailable).mockReturnValue(false);

      const result = await ragIndexerService.indexFile(
        TEST_PROJECTS.local.id,
        TEST_FILES.typescript.path,
        TEST_FILES.typescript.content
      );

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });
});
```

### Route Tests

```typescript
// packages/api-gateway/src/routes/__tests__/users-ai-settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockFastify, createMockPg } from '../../test/helpers.js';
import { TEST_AI_SETTINGS } from '../../__tests__/fixtures/ai-settings.js';

describe('User AI Settings Routes', () => {
  let app: FastifyInstance;
  let mockPg: ReturnType<typeof createMockPg>;

  beforeEach(async () => {
    mockPg = createMockPg();
    app = await createMockFastify({ pg: mockPg });
  });

  describe('GET /api/v1/users/me/ai-settings', () => {
    it('should return user AI settings', async () => {
      mockPg.query.mockResolvedValueOnce({
        rows: [TEST_AI_SETTINGS.defaults],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/ai-settings',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', true);
      expect(body.data).toHaveProperty('globalModelTier');
    });
  });
});
```

## E2E Test Patterns

### API Mocking

`apps/web/e2e/helpers/test-utils.ts` provides mock utilities:

```typescript
import { mockRAGAPIs, mockCodeChangesAPIs, mockAllCopilotAPIs } from './helpers/test-utils';

test.beforeEach(async ({ page }) => {
  // Mock all copilot APIs
  await mockAllCopilotAPIs(page);
});

// Or mock specific APIs
test('RAG search', async ({ page }) => {
  await mockRAGAPIs(page);
  // Test code...
});
```

### Structure-Based Assertions

```typescript
// apps/web/e2e/copilot-rag.spec.ts
import { test, expect } from '@playwright/test';
import { mockRAGAPIs } from './helpers/test-utils';

test.describe('Copilot RAG Search', () => {
  test('should display indexing status', async ({ page }) => {
    await mockRAGAPIs(page);
    await page.goto('/app/projects/test-project');

    // Test structure exists, not specific content
    const statusPanel = page.locator('[data-testid="indexing-status"]');
    await expect(statusPanel).toBeAttached();

    // Verify elements exist
    await expect(statusPanel.locator('[data-testid="document-count"]')).toBeAttached();
    await expect(statusPanel.locator('[data-testid="indexing-indicator"]')).toBeAttached();
  });

  test('should handle search results', async ({ page }) => {
    await mockRAGAPIs(page);
    await page.goto('/app/copilot');

    // Trigger search
    await page.fill('[data-testid="search-input"]', 'authentication');
    await page.click('[data-testid="search-button"]');

    // Verify results structure
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeAttached();

    // Check result items exist without checking specific content
    const resultItems = results.locator('[data-testid="search-result-item"]');
    await expect(resultItems.first()).toBeAttached();
  });
});
```

### Custom Mock Responses

```typescript
test('should handle custom indexing status', async ({ page }) => {
  // Override default mock with custom response
  await page.route('**/api/v1/projects/*/index/status', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        success: true,
        data: {
          exists: true,
          documentCount: 500,
          isIndexing: true, // Custom: indexing in progress
        },
      }),
    });
  });

  await page.goto('/app/projects/test-project');

  // Verify loading state is shown
  const loadingIndicator = page.locator('[data-testid="indexing-progress"]');
  await expect(loadingIndicator).toBeVisible();
});
```

## Running Tests

### Unit Tests

```bash
# All unit tests
pnpm test

# Specific service tests
pnpm --filter @synthstack/api-gateway test rag-indexer
pnpm --filter @synthstack/api-gateway test vector-db-project
pnpm --filter @synthstack/api-gateway test chunking

# Route tests
pnpm --filter @synthstack/api-gateway test users-ai-settings

# Frontend store tests
pnpm --filter @synthstack/web test roundtable
pnpm --filter @synthstack/web test copilot-ai-settings

# Watch mode
pnpm --filter @synthstack/api-gateway test:watch
```

### Integration Tests

```bash
# Requires test database
RUN_INTEGRATION_TESTS=true pnpm --filter @synthstack/api-gateway test:integration

# Specific integration test
RUN_INTEGRATION_TESTS=true pnpm --filter @synthstack/api-gateway test rag-indexing.test
```

### E2E Tests

```bash
# All E2E tests
pnpm --filter @synthstack/web test:e2e

# Specific feature
pnpm --filter @synthstack/web test:e2e copilot-rag
pnpm --filter @synthstack/web test:e2e copilot-code-changes
pnpm --filter @synthstack/web test:e2e copilot-roundtable
pnpm --filter @synthstack/web test:e2e ai-settings

# Headed mode (see browser)
pnpm --filter @synthstack/web test:e2e --headed

# Debug mode
pnpm --filter @synthstack/web test:e2e --debug
```

## Coverage Requirements

Target coverage: **85%+** for new copilot features

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

## Writing New Tests

### Checklist

1. [ ] Use existing mock factories from `test/helpers.ts`
2. [ ] Use existing fixtures or add to fixture files
3. [ ] Write generic assertions (not hard-coded values)
4. [ ] Test success and error paths
5. [ ] Test edge cases (empty input, missing data)
6. [ ] Use `data-testid` attributes for E2E selectors
7. [ ] Mock external services (embeddings, vector DB, LLM)

### Adding New Mock Factory

```typescript
// packages/api-gateway/src/test/helpers.ts

export interface MockNewServiceOptions {
  available?: boolean;
  customOption?: string;
}

export function createMockNewService(options: MockNewServiceOptions = {}) {
  return {
    isAvailable: vi.fn().mockReturnValue(options.available ?? true),
    doSomething: vi.fn().mockResolvedValue({ success: true }),
    // Add methods as needed
  };
}
```

### Adding New Fixtures

```typescript
// packages/api-gateway/src/__tests__/fixtures/new-feature.ts

export interface TestNewFeatureData {
  id: string;
  name: string;
  // Define shape
}

export const TEST_NEW_FEATURE: Record<string, TestNewFeatureData> = {
  default: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Default Test',
  },
  withCustomOption: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Custom Test',
  },
  // Add scenarios
};
```

## Troubleshooting

### Mock Not Working

```typescript
// Ensure mocks are defined BEFORE importing the module under test
vi.mock('../embeddings.js', () => ({
  embeddingsService: createMockEmbeddings(),
}));

// THEN import
import { ragIndexerService } from '../rag-indexer.js';
```

### E2E Route Not Mocked

```typescript
// Check the route pattern matches
await page.route('**/api/v1/projects/*/index/status', ...);
//                ^^^ Use ** for protocol+host

// Verify mock is set before navigation
await mockRAGAPIs(page);
await page.goto('/app/projects/test'); // Navigate AFTER mocking
```

### Flaky E2E Tests

```typescript
// Use explicit waits instead of implicit
await expect(element).toBeAttached({ timeout: 5000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific response
await page.waitForResponse('**/api/v1/projects/*/index/status');
```

## Related Documentation

- [RAG_SEARCH.md](../features/RAG_SEARCH.md) - RAG feature documentation
- [CODE_CHANGES.md](../features/CODE_CHANGES.md) - Code changes feature documentation
- [COPILOT.md](../features/COPILOT.md) - Main copilot documentation
