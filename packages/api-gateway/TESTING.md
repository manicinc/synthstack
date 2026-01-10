# API Gateway Testing Guide

This document explains the testing infrastructure for the SynthStack API Gateway.

## Overview

The test suite consists of three levels:
- **Unit Tests**: Fast, isolated tests with mocked dependencies
- **Integration Tests**: Tests with real database and Redis
- **E2E Tests**: Full end-to-end tests with Docker Compose

## Test Coverage Target

**85% code coverage** is enforced across all metrics:
- Lines: 85%
- Statements: 85%
- Functions: 85%
- Branches: 85%

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16+ (for integration tests)
- Redis 7+ (for integration tests)

### Installation

```bash
cd packages/api-gateway
pnpm install
```

### Running Tests

```bash
# Unit tests only (fast)
pnpm test:unit

# Integration tests (requires database)
pnpm test:integration

# E2E tests (requires Docker Compose)
pnpm test:e2e

# All tests
pnpm test:all

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

## Test Infrastructure

### Docker Compose Test Environment

**File**: `docker-compose.test.yml`

Provides isolated test services:
- PostgreSQL on port 5451
- Redis on port 6391
- ML Service (FastAPI) on port 8031
- Qdrant vector DB on port 6334

```bash
# Start test environment
pnpm docker:test:up

# Stop test environment
pnpm docker:test:down

# View logs
pnpm docker:test:logs
```

### Database Setup

**Script**: `scripts/setup-test-db.ts`

Initializes the test database with:
- Schema from migrations
- Seed data for testing
- Test users with different tiers
- Referral system test data

```bash
pnpm test:setup
```

### Test Helpers

#### Database Helpers (`src/test/db-helpers.ts`)

```typescript
import {
  getTestPool,
  cleanupTestData,
  seedTestUsers,
  seedReferralTestData,
  resetTestDatabase,
  createTestUser,
  getUserById,
  updateUserCredits,
} from '../test/db-helpers';

// Example usage
await resetTestDatabase();
const user = await createTestUser({ email: 'test@example.com', tier: 'pro' });
```

#### Docker Helpers (`src/test/docker-helpers.ts`)

```typescript
import {
  startTestContainers,
  stopTestContainers,
  waitForServiceHealthy,
  getServiceLogs,
} from '../test/docker-helpers';

// Example usage
await startTestContainers();
await waitForServiceHealthy('postgres-test');
```

### Test Fixtures

Pre-defined test data in `src/__tests__/fixtures/`:

- **users.ts**: Test users with different subscription tiers
- **referrals.ts**: Referral seasons, tiers, codes, discounts
- **credits.ts**: Credit costs, tier multipliers, ML endpoint costs

```typescript
import { TEST_USERS } from '../__tests__/fixtures/users';
import { TEST_REFERRAL_SEASON } from '../__tests__/fixtures/referrals';
import { estimateMLRequestCost } from '../__tests__/fixtures/credits';

// Example usage
const proUser = TEST_USERS.pro;
const cost = estimateMLRequestCost('/embeddings/generate', 'pro');
```

## Writing Tests

### Unit Tests

Create test files next to the source files:

```
src/routes/
├── referral.ts
└── __tests__/
    └── referral.test.ts
```

Example unit test:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockFastify } from '../../test/helpers';

describe('Referral Routes', () => {
  let server: MockFastify;

  beforeEach(() => {
    server = createMockFastify();
    server.referralService = {
      trackClick: vi.fn(),
      generateReferralCode: vi.fn(),
    };
  });

  it('should track referral click', async () => {
    server.referralService.trackClick.mockResolvedValue({ success: true });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/referral/track',
      payload: { code: 'TESTREF123' },
    });

    expect(response.statusCode).toBe(200);
    expect(server.referralService.trackClick).toHaveBeenCalledWith('TESTREF123');
  });
});
```

### Integration Tests

Place integration tests in `src/__tests__/integration/`:

```typescript
import { describe, it, expect } from 'vitest';
import { query, createTestUser } from '../../test/db-helpers';

describe('Auth + Database Integration', () => {
  it('should create and retrieve user', async () => {
    const user = await createTestUser({
      email: 'integration@test.com',
      tier: 'pro',
    });

    const result = await query(
      'SELECT * FROM app_users WHERE id = $1',
      [user.id]
    );

    expect(result[0].email).toBe('integration@test.com');
  });
});
```

### E2E Tests

Place E2E tests in `src/__tests__/e2e/`:

```typescript
import { describe, it, expect } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../index';

describe('Referral System E2E', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('complete referral flow', async () => {
    // 1. Track click
    const trackResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/referral/track',
      payload: { code: 'TESTREF123' },
    });
    expect(trackResponse.statusCode).toBe(200);

    // 2. Register signup
    const signupResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/referral/register',
      headers: { authorization: 'Bearer <token>' },
      payload: { code: 'TESTREF123' },
    });
    expect(signupResponse.statusCode).toBe(200);

    // 3. Convert referral
    // ... additional steps
  });
});
```

## CI/CD Integration

GitHub Actions workflow runs all tests on every PR:

```yaml
# .github/workflows/test-api-gateway.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:unit --coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
      redis:
        image: redis:7-alpine
    steps:
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: docker compose -f docker-compose.test.yml up -d
      - run: pnpm test:e2e
```

## Coverage Badge

Generate coverage badge after running tests:

```bash
pnpm test:coverage
pnpm test:badge
```

The badge URL is saved to `COVERAGE_BADGE.md` and can be added to README.

## Troubleshooting

### Docker Issues

```bash
# Check Docker is running
docker --version
docker compose version

# View service logs
pnpm docker:test:logs

# Restart services
docker compose -f docker-compose.test.yml restart

# Clean up everything
docker compose -f docker-compose.test.yml down -v
docker system prune -f
```

### Database Issues

```bash
# Check database connection
psql postgresql://test_user:test_pass@localhost:5451/synthstack_test

# Reset database
pnpm test:setup

# Check migrations
ls ../../services/directus/migrations/
```

### Test Failures

```bash
# Run specific test file
pnpm test:unit src/routes/__tests__/referral.test.ts

# Run with verbose output
pnpm test:unit --reporter=verbose

# Debug with Node inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Fixtures**: Leverage pre-defined test data
3. **Mock External Services**: Don't call real APIs in tests
4. **Clean Up**: Reset database state between tests
5. **Descriptive Names**: Test names should explain what they verify
6. **Arrange-Act-Assert**: Structure tests clearly
7. **Test Edge Cases**: Don't just test happy paths
8. **Keep Tests Fast**: Unit tests should run in milliseconds

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Docker Compose](https://docs.docker.com/compose/)
