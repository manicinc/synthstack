# SynthStack Testing Guide

**Complete testing strategy, setup, and best practices for SynthStack platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Environment Setup](#test-environment-setup)
4. [Running Tests](#running-tests)
5. [Writing Unit Tests](#writing-unit-tests)
6. [Writing Integration Tests](#writing-integration-tests)
7. [Writing E2E Tests](#writing-e2e-tests)
8. [Test Data Factories](#test-data-factories)
9. [Mocking Strategies](#mocking-strategies)
10. [Coverage Requirements](#coverage-requirements)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

SynthStack uses **Vitest** as the primary testing framework across all TypeScript/JavaScript packages, with pytest for Python ML services. This guide covers the complete testing strategy implemented across the platform.

### Test Suite Statistics

- **API Gateway:** 739+ tests (unit + integration + E2E)
- **Web Frontend:** 551+ tests
- **ML Services:** 46+ tests (Python)
- **Total Coverage:** 85%+ across critical paths

### Test Types

| Type | Count | Purpose | Runtime |
|------|-------|---------|---------|
| **Unit** | 500+ | Isolated component/function tests | < 5 min |
| **Integration** | 150+ | Cross-service integration | 5-10 min |
| **E2E** | 89+ | Full user journey validation | 10-20 min |

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring

2. **Fast Feedback Loop**
   - Unit tests < 10ms each
   - Integration tests < 100ms each
   - E2E tests < 5s each

3. **Minimal Mocking**
   - Use real services when possible (Docker)
   - Mock only external dependencies (Stripe, Sendgrid)

4. **Readable Test Names**
   - Use descriptive test names: `should return 402 when user has insufficient credits`
   - Avoid technical jargon: Not "test_credit_deduction_edge_case_3"

5. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should deduct credits after ML request', async () => {
     // Arrange
     const user = await createTestUser({ credits_remaining: 100 });

     // Act
     const response = await client.post('/api/v1/copilot/embeddings', {
       text: 'test'
     }, { headers: { Authorization: `Bearer ${user.token}` } });

     // Assert
     expect(response.status).toBe(200);
     expect(response.headers['x-credits-remaining']).toBe('96');
   });
   ```

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Docker (required for E2E tests)
brew install docker docker-compose  # macOS
# or
sudo apt-get install docker.io docker-compose  # Linux
```

### Environment Variables

Create `.env.test` in project root:

```bash
# Database (ephemeral Docker container)
DATABASE_URL=postgresql://test_user:test_pass@localhost:5451/synthstack_test

# Redis (ephemeral Docker container)
REDIS_URL=redis://localhost:6391

# ML Service (Docker container)
ML_SERVICE_BACKEND=fastapi
ML_SERVICE_URL=http://localhost:8031

# JWT Secret (test only)
JWT_SECRET=test-secret-key-for-testing-only

# Disable external services
STRIPE_SECRET_KEY=TEST_STRIPE_SECRET_KEY
SENDGRID_API_KEY=mock-key
OPENAI_API_KEY=mock-key
```

### Docker Test Environment

Start all test dependencies:

```bash
# Start test services
cd packages/api-gateway
docker compose -f docker-compose.test.yml up -d

# Verify services are healthy
docker compose -f docker-compose.test.yml ps

# View logs
docker compose -f docker-compose.test.yml logs -f

# Stop services
docker compose -f docker-compose.test.yml down -v
```

**Test Services:**
- PostgreSQL (port 5451) - Test database
- Redis (port 6391) - Test cache
- ML Service (port 8031) - FastAPI test instance

---

## Running Tests

### Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific package tests
pnpm --filter api-gateway test
pnpm --filter @synthstack/web test

# Run specific test file
pnpm test routes/__tests__/referral.test.ts

# Run tests matching pattern
pnpm test --grep "credit"
```

### Test Types

```bash
# Unit tests only (fast)
pnpm test:unit

# Integration tests (requires Docker)
pnpm test:integration

# E2E tests (requires Docker + ML service)
pnpm test:e2e

# All tests with coverage
pnpm test:coverage
```

### API Gateway Tests

```bash
cd packages/api-gateway

# All tests
pnpm test

# Unit tests (500+ tests, ~2-3 minutes)
pnpm test:unit

# Integration tests (150+ tests, ~5-8 minutes)
pnpm test:integration

# E2E tests (89+ tests, ~10-15 minutes)
pnpm test:e2e

# Coverage report
pnpm test:coverage
# Opens coverage/index.html in browser
```

### ML Service Tests

```bash
# FastAPI
cd packages/ml-service
pytest tests/ -v

# Django
cd packages/django-ml-service
python manage.py test

# NestJS
cd packages/ts-ml-service
pnpm test
```

---

## Writing Unit Tests

### File Structure

```
packages/api-gateway/src/
├── routes/
│   ├── referral.ts
│   └── __tests__/
│       └── referral.test.ts       # Route tests
├── services/
│   ├── referral-service.ts
│   └── __tests__/
│       └── referral-service.test.ts  # Service tests
└── middleware/
    ├── ml-credits.ts
    └── __tests__/
        └── ml-credits.test.ts     # Middleware tests
```

### Route Tests Example

**File:** `packages/api-gateway/src/routes/__tests__/referral.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import referralRoutes from '../referral.js';

// Mock the service layer
vi.mock('../../services/referral-service.js', () => ({
  referralService: {
    getUserStats: vi.fn(),
    getReferralCode: vi.fn(),
    trackClick: vi.fn(),
  },
}));

import { referralService } from '../../services/referral-service.js';

describe('Referral Routes', () => {
  let server;

  beforeEach(async () => {
    server = Fastify({ logger: false });

    // Mock authentication
    server.decorate('authenticate', async (request, reply) => {
      request.user = {
        id: 'user-123',
        email: 'test@example.com',
        subscription_tier: 'pro'
      };
    });

    await server.register(referralRoutes, { prefix: '/api/v1/referral' });
    await server.ready();

    vi.clearAllMocks();
  });

  describe('GET /stats', () => {
    it('should return user referral stats', async () => {
      // Arrange
      const mockStats = {
        total_referrals: 10,
        successful_referrals: 8,
        total_conversion_value: 1000,
      };
      vi.mocked(referralService.getUserStats).mockResolvedValue(mockStats);

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/referral/stats',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: mockStats,
      });
      expect(referralService.getUserStats).toHaveBeenCalledWith('user-123');
    });

    it('should return 500 when service fails', async () => {
      // Arrange
      vi.mocked(referralService.getUserStats).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/referral/stats',
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('POST /track', () => {
    it('should track referral click with UTM params', async () => {
      // Arrange
      vi.mocked(referralService.trackClick).mockResolvedValue({
        id: 'click-123',
        code: 'ABC123',
      });

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/referral/track',
        payload: {
          code: 'ABC123',
          utm_source: 'twitter',
          utm_campaign: 'launch',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(referralService.trackClick).toHaveBeenCalledWith(
        'ABC123',
        expect.objectContaining({
          utm_source: 'twitter',
          utm_campaign: 'launch',
        })
      );
    });

    it('should return 400 when code is missing', async () => {
      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/referral/track',
        payload: {},
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        error: expect.stringContaining('code'),
      });
    });
  });
});
```

### Service Tests Example

**File:** `packages/api-gateway/src/services/__tests__/ml-request-cost.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  estimateMLRequestCost,
  calculateMLRequestCost,
  canAffordMLRequest,
} from '../credits/ml-request-cost.js';

describe('ML Request Cost Calculation', () => {
  describe('estimateMLRequestCost', () => {
    it('should calculate base cost for embeddings endpoint', () => {
      const result = estimateMLRequestCost(
        '/embeddings/generate',
        'pro',
        null,
        100
      );

      expect(result).toEqual({
        estimatedCost: 2,  // base cost, no tier multiplier for pro
        baseCost: 2,
        tierMultiplier: 1.0,
        isPremium: true,
        canAfford: true,
        creditsRemaining: 100,
        breakdown: expect.stringContaining('Base: 2 credits'),
      });
    });

    it('should apply free tier multiplier (2x)', () => {
      const result = estimateMLRequestCost(
        '/embeddings/generate',
        'free',
        null,
        100
      );

      expect(result.estimatedCost).toBe(4);  // 2 * 2.0
      expect(result.tierMultiplier).toBe(2.0);
    });

    it('should cap cost at 100 credits', () => {
      const result = estimateMLRequestCost(
        '/transcription/batch',  // base: 20 credits
        'free',  // 2x multiplier
        { files: Array(10).fill('file.mp3') },  // 10 items
        100
      );

      expect(result.estimatedCost).toBe(100);  // capped
    });

    it('should indicate insufficient credits', () => {
      const result = estimateMLRequestCost(
        '/embeddings/generate',
        'free',
        null,
        3  // only 3 credits remaining, needs 4
      );

      expect(result.canAfford).toBe(false);
    });
  });

  describe('calculateMLRequestCost', () => {
    it('should add duration penalty for long requests', () => {
      const result = calculateMLRequestCost(
        '/rag/query',
        'pro',
        65000,  // 65 seconds (2x 30s threshold)
        200,
        null
      );

      expect(result.actualCost).toBe(5);  // 3 (base) + 2 (duration)
      expect(result.durationCost).toBe(2);
    });

    it('should charge nothing for failed requests', () => {
      const result = calculateMLRequestCost(
        '/embeddings/generate',
        'pro',
        1000,
        500,  // error status code
        null
      );

      expect(result.actualCost).toBe(0);
      expect(result.breakdown).toContain('Failed request');
    });
  });

  describe('canAffordMLRequest', () => {
    it('should return affordability check', () => {
      const result = canAffordMLRequest(
        '/embeddings/generate',
        'pro',
        10,
        null
      );

      expect(result).toEqual({
        canAfford: true,
        required: 2,
        remaining: 10,
        deficit: 0,
      });
    });

    it('should calculate deficit when insufficient', () => {
      const result = canAffordMLRequest(
        '/embeddings/generate',
        'free',  // 4 credits needed
        2,  // only 2 credits
        null
      );

      expect(result).toEqual({
        canAfford: false,
        required: 4,
        remaining: 2,
        deficit: 2,
      });
    });
  });
});
```

### Common Pitfalls

**❌ Don't:**
```typescript
// Tight coupling to implementation
it('should call getUserById with correct params', () => {
  service.getUser('123');
  expect(mockDb.getUserById).toHaveBeenCalledWith('123');
});
```

**✅ Do:**
```typescript
// Test behavior
it('should return user data when user exists', async () => {
  const user = await service.getUser('123');
  expect(user).toMatchObject({
    id: '123',
    email: expect.any(String),
  });
});
```

**❌ Don't:**
```typescript
// Fragile assertions
expect(result).toEqual({
  id: '123',
  email: 'test@example.com',
  created_at: '2024-01-15T12:00:00.000Z',
  updated_at: '2024-01-15T12:00:00.000Z',
  // ... 20 more fields
});
```

**✅ Do:**
```typescript
// Flexible assertions
expect(result).toMatchObject({
  id: '123',
  email: 'test@example.com',
});
expect(result.created_at).toBeDefined();
```

---

## Writing Integration Tests

Integration tests use real database and services (via Docker).

### Setup

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getTestPool, cleanDatabase, seedTestData } from '../test/db-helpers.js';

describe('Referral Integration Tests', () => {
  let pool;

  beforeAll(async () => {
    pool = getTestPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should complete referral lifecycle', async () => {
    // Arrange
    const referrerUser = await createTestUser({
      email: 'referrer@example.com',
      subscription_tier: 'pro',
    });

    const season = await seedReferralSeason({
      name: 'Summer 2024',
      tiers: [
        { name: 'Bronze', referrals_required: 1, reward_type: 'discount_code' },
      ],
    });

    // Act 1: Track click
    await trackReferralClick(referrerUser.referral_code);

    // Act 2: Register referred user
    const referredUser = await createTestUser({
      email: 'referred@example.com',
      referral_code: referrerUser.referral_code,
    });

    // Act 3: Convert referral
    await convertReferral(referredUser.id, 'subscription_purchase', 29.99);

    // Assert
    const stats = await getReferralStats(referrerUser.id);
    expect(stats).toMatchObject({
      total_referrals: 1,
      successful_referrals: 1,
      total_conversion_value: 29.99,
    });

    const rewards = await getReferralRewards(referrerUser.id);
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toMatchObject({
      tier_name: 'Bronze',
      is_unlocked: true,
      is_claimed: false,
    });
  });
});
```

---

## Writing E2E Tests

E2E tests validate complete user journeys with real API server and database.

### Test Server Setup

**File:** `packages/api-gateway/src/__tests__/helpers/test-server.ts`

```typescript
import Fastify from 'fastify';
import { getTestPool } from './db-helpers.js';
import apiRoutes from '../../index.js';

let testServer = null;
let testServerUrl = '';

export async function startTestServer(): Promise<void> {
  testServer = Fastify({ logger: false });

  const pool = getTestPool();
  testServer.decorate('pg', {
    query: pool.query.bind(pool),
    pool,
  });

  await testServer.register(apiRoutes);

  const address = await testServer.listen({ port: 0, host: '127.0.0.1' });
  testServerUrl = address;
}

export async function stopTestServer(): Promise<void> {
  if (testServer) {
    await testServer.close();
    testServer = null;
  }
}

export function getTestServerUrl(): string {
  return testServerUrl;
}
```

### E2E Test Example

**File:** `packages/api-gateway/src/__tests__/e2e/referral-lifecycle.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios from 'axios';
import { startTestServer, stopTestServer, getTestServerUrl } from '../helpers/test-server.js';
import { cleanDatabase, createTestUser, seedReferralSeason } from '../helpers/db-helpers.js';

describe('Referral Lifecycle E2E', () => {
  let client;
  let referrerToken;
  let referrerCode;

  beforeAll(async () => {
    await startTestServer();
    client = axios.create({
      baseURL: getTestServerUrl(),
      validateStatus: () => true,
    });
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create referrer user
    const referrer = await createTestUser({
      email: 'referrer@example.com',
      subscription_tier: 'pro',
      credits_remaining: 100,
    });
    referrerToken = referrer.token;
    referrerCode = referrer.referral_code;

    // Create season with tiers
    await seedReferralSeason({
      name: 'Q1 2024',
      tiers: [
        {
          name: 'Bronze',
          referrals_required: 1,
          reward_type: 'discount_code',
          reward_value: { type: 'percentage', value: 20, applies_to: 'subscription' },
        },
      ],
    });
  });

  it('should complete full referral lifecycle', async () => {
    // Step 1: Track referral click
    const clickResponse = await client.get('/api/v1/referral/track', {
      params: {
        code: referrerCode,
        utm_source: 'twitter',
        utm_campaign: 'launch',
      },
    });
    expect(clickResponse.status).toBe(200);

    // Step 2: Register referred user
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: 'referred@example.com',
      password: 'SecurePass123!',
      referral_code: referrerCode,
    });
    expect(signupResponse.status).toBe(201);
    const referredUserToken = signupResponse.data.data.token;

    // Step 3: Convert referral (purchase subscription)
    const purchaseResponse = await client.post(
      '/api/v1/billing/subscribe',
      {
        plan: 'pro',
        payment_method: 'pm_card_visa',
      },
      { headers: { Authorization: `Bearer ${referredUserToken}` } }
    );
    expect(purchaseResponse.status).toBe(200);

    // Step 4: Check referrer stats
    const statsResponse = await client.get('/api/v1/referral/stats', {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.data.data).toMatchObject({
      total_referrals: 1,
      successful_referrals: 1,
      total_conversions: 1,
    });

    // Step 5: Check rewards unlocked
    const rewardsResponse = await client.get('/api/v1/referral/rewards', {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    expect(rewardsResponse.status).toBe(200);
    const rewards = rewardsResponse.data.data;
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toMatchObject({
      tier_name: 'Bronze',
      is_unlocked: true,
      is_claimed: false,
      reward_type: 'discount_code',
    });

    // Step 6: Claim reward
    const claimResponse = await client.post(
      `/api/v1/referral/rewards/${rewards[0].id}/claim`,
      {},
      { headers: { Authorization: `Bearer ${referrerToken}` } }
    );
    expect(claimResponse.status).toBe(200);
    expect(claimResponse.data.data).toMatchObject({
      is_claimed: true,
      discount_code: expect.any(String),
    });

    // Step 7: Validate discount code
    const discountCode = claimResponse.data.data.discount_code;
    const validateResponse = await client.post('/api/v1/referral/discount/validate', {
      code: discountCode,
      purchase_type: 'subscription',
      purchase_amount: 29.99,
    });
    expect(validateResponse.status).toBe(200);
    expect(validateResponse.data.data).toMatchObject({
      valid: true,
      discount: {
        type: 'percentage',
        value: 20,
        applies_to: 'subscription',
      },
    });
  });
});
```

---

## Test Data Factories

### User Factory

**File:** `packages/api-gateway/src/__tests__/fixtures/users.ts`

```typescript
import { sign } from 'jsonwebtoken';
import { getTestPool } from '../helpers/db-helpers.js';
import crypto from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  subscription_tier: string;
  credits_remaining: number;
  token: string;
  referral_code: string;
}

export async function createTestUser(params: {
  email: string;
  subscription_tier?: string;
  credits_remaining?: number;
  password?: string;
}): Promise<TestUser> {
  const pool = getTestPool();
  const id = crypto.randomUUID();
  const tier = params.subscription_tier || 'free';
  const credits = params.credits_remaining ?? 50;

  await pool.query(
    `INSERT INTO app_users (
      id, email, display_name, subscription_tier, credits_remaining,
      password_hash, referral_code, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    [
      id,
      params.email,
      params.email.split('@')[0],
      tier,
      credits,
      'hashed_password',
      generateReferralCode(),
    ]
  );

  const user = await pool.query('SELECT * FROM app_users WHERE id = $1', [id]);
  const token = sign(
    {
      sub: id,
      email: params.email,
      subscription_tier: tier,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return {
    id,
    email: params.email,
    subscription_tier: tier,
    credits_remaining: credits,
    token,
    referral_code: user.rows[0].referral_code,
  };
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
```

---

## Mocking Strategies

### Mock Vitest

```typescript
// Mock entire service module
vi.mock('../../services/stripe.js', () => ({
  stripeService: {
    createCheckoutSession: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

// Import after mock
import { stripeService } from '../../services/stripe.js';

// Use in tests
vi.mocked(stripeService.createCheckoutSession).mockResolvedValue({
  id: 'cs_123',
  url: 'https://checkout.stripe.com/...',
});
```

### Mock Fastify Plugins

```typescript
beforeEach(async () => {
  server = Fastify({ logger: false });

  // Mock pg plugin
  server.decorate('pg', {
    query: vi.fn(),
    pool: { query: vi.fn() },
  });

  // Mock redis plugin
  server.decorate('redis', {
    get: vi.fn(),
    set: vi.fn(),
  });
});
```

---

## Coverage Requirements

### Target Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.js',
      ],
    },
  },
});
```

### Check Coverage

```bash
pnpm test:coverage

# View HTML report
open coverage/index.html
```

---

## CI/CD Integration

### GitHub Actions Example

**File:** `.github/workflows/test-api-gateway.yml`

```yaml
name: API Gateway Tests

on:
  pull_request:
    paths:
      - 'packages/api-gateway/**'
  push:
    branches: [master, main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter api-gateway test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./packages/api-gateway/coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: synthstack_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5451:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6391:6379

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter api-gateway test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: docker compose -f packages/api-gateway/docker-compose.test.yml up -d
      - run: pnpm --filter api-gateway test:e2e
      - run: docker compose -f packages/api-gateway/docker-compose.test.yml down -v
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Hanging

**Symptom:** Tests never complete, CI timeout

**Cause:** Async operations not properly awaited

**Fix:**
```typescript
// ❌ Don't
it('should save user', () => {
  saveUser(user); // Missing await
  expect(user.id).toBeDefined();
});

// ✅ Do
it('should save user', async () => {
  await saveUser(user);
  expect(user.id).toBeDefined();
});
```

#### 2. Flaky Tests

**Symptom:** Tests pass sometimes, fail other times

**Causes & Fixes:**

**Race Conditions:**
```typescript
// ❌ Don't rely on timing
await sendEmail();
await sleep(100); // Flaky!
expect(emailSent).toBe(true);

// ✅ Poll or use event-based assertions
await waitFor(() => expect(emailSent).toBe(true), { timeout: 5000 });
```

**Shared State:**
```typescript
// ❌ Don't share mutable state
let user; // Shared across tests!

it('test 1', () => { user = { id: 1 }; });
it('test 2', () => { expect(user.id).toBe(1); }); // Flaky!

// ✅ Use beforeEach
let user;
beforeEach(() => {
  user = { id: 1 };
});
```

#### 3. Database Connection Errors

**Symptom:** `ECONNREFUSED` or `Connection timeout`

**Fix:**
```bash
# Ensure Docker services are running
docker compose -f docker-compose.test.yml ps

# Restart services
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d

# Wait for health checks
docker compose -f docker-compose.test.yml logs postgres | grep "ready"
```

#### 4. Mock Not Working

**Symptom:** Mock function not called, real function executes

**Cause:** Mock definition after import

**Fix:**
```typescript
// ❌ Import before mock
import { myService } from './service.js';
vi.mock('./service.js');

// ✅ Mock before import
vi.mock('./service.js', () => ({
  myService: { method: vi.fn() },
}));
import { myService } from './service.js';
```

#### 5. ML Service Tests Failing in CI

**Symptom:** ML service integration tests fail with 500/503 errors

**Cause:** ML service requires OpenAI/Anthropic API keys which aren't available in CI

**Fix:** Tests should accept 500/503 status when ML service is unavailable:
```typescript
// Accept 500/503 when ML service is unavailable
expect([200, 500, 503]).toContain(response.status);
if (response.status === 200) {
  expect(response.data).toHaveProperty('success', true);
  // ... rest of assertions
}
```

#### 6. Frontend E2E Navigation Failures

**Symptom:** E2E tests fail with "URL does not contain expected route"

**Cause:** Vue i18n requires locale-prefixed routes. `/dashboard` redirects to `/en`.

**Fix:** Always use locale-prefixed routes in E2E tests:
```typescript
// ❌ Don't
await page.goto('/dashboard');

// ✅ Do
await page.goto('/en/app/dashboard');
```

#### 7. Playwright API Requests Hitting Wrong Server

**Symptom:** `request.get('/api/v1/health')` returns 404 or empty response in E2E tests

**Cause:** Playwright's `request` fixture goes to the frontend dev server, not the backend API

**Fix:** Skip API endpoint tests in frontend E2E, or use `test.describe.skip()`:
```typescript
// API endpoint tests are skipped because Playwright's request fixture
// goes to the frontend dev server, not the backend API server
test.describe.skip('API Endpoint Availability', () => {
  // ...
});
```

---

## CI/CD Workflows

### Version Testing Workflow

The `test-versions.yml` workflow tests both LITE and PRO versions:

```bash
# LITE version tests
ENABLE_COPILOT=false ENABLE_REFERRALS=false pnpm test
VITE_ENABLE_COPILOT=false VITE_ENABLE_REFERRALS=false pnpm test:e2e

# PRO version tests
ENABLE_COPILOT=true ENABLE_REFERRALS=true pnpm test
VITE_ENABLE_COPILOT=true VITE_ENABLE_REFERRALS=true pnpm test:e2e
```

E2E tests run only on Chromium in CI (`--project=chromium`) to reduce runtime.

See `.github/workflows/test-versions.yml` for the full workflow.

---

## Best Practices Summary

✅ **Do:**
- Write tests for new features (TDD when possible)
- Use descriptive test names
- Clean up test data in `afterEach`
- Mock external services (Stripe, email, etc.)
- Use real database for integration tests
- Aim for 85%+ coverage on critical paths
- Run tests before pushing

❌ **Don't:**
- Test implementation details
- Share state between tests
- Use hardcoded sleep/timeouts
- Mock everything (use real services when fast)
- Skip E2E tests for critical flows
- Commit failing tests
- Test library code (Fastify, Vitest, etc.)

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Questions or improvements?** Open an issue at [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack/issues)
