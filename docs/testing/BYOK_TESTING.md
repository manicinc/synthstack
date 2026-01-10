# BYOK Testing Guide

Comprehensive testing documentation for the BYOK (Bring Your Own Keys) feature.

---

## Overview

The BYOK system has three layers of testing:

1. **Unit Tests** - Test individual components and routing logic (8 scenarios)
2. **Integration Tests** - Test full system integration with database (30+ scenarios)
3. **E2E Tests** - Test complete user journeys through the UI (15+ scenarios)

**Total Test Coverage:** 50+ test scenarios across all layers

---

## Quick Start

```bash
# Run all tests
npm run test

# Run BYOK-specific tests only
npm run test:byok

# Run with coverage
npm run test:coverage
```

---

## Test Layers

### 1. Unit Tests

**Location:** `/packages/api-gateway/src/services/llm-router/__tests__/byok-router.test.ts`

**What they test:**
- BYOK router decision logic
- All 3 routing flows (Credit-First, BYOK-First, BYOK-Only)
- 8 core routing scenarios
- Feature flag precedence

**Run unit tests:**
```bash
cd packages/api-gateway
npm run test byok-router.test.ts
```

**Coverage:**
- ✅ Flow A: Credit-First Mode (3 scenarios)
- ✅ Flow B: BYOK-First Mode (3 scenarios)
- ✅ Flow C: BYOK-Only Mode (2 scenarios)
- ✅ Edge cases (BYOK disabled, flag precedence, multiple providers)

---

### 2. Integration Tests

**Location:** `/packages/api-gateway/src/__tests__/integration/byok-integration.test.ts`

**What they test:**
- Full system integration (middleware, router, services, API)
- Database interactions
- Usage tracking (BYOK vs internal)
- Rate limiting bypass
- Graceful fallback scenarios

**Run integration tests:**
```bash
cd packages/api-gateway
npm run test:integration byok-integration.test.ts
```

**Prerequisites:**
- Test database must be running
- BYOK feature flags must exist in database
- Encryption keys must be configured

**Test Groups:**
1. **ML Credits Middleware Integration** (4 tests)
   - Credit check skip for BYOK
   - Credit deduction for internal
   - 402 errors in various modes

2. **Rate Limiting Middleware Integration** (3 tests)
   - Rate limit bypass for BYOK users
   - Tier-based limits for internal users
   - Graceful handling when BYOK fails

3. **Copilot Service Integration** (4 tests)
   - BYOK router usage with userId
   - Fallback to legacy router
   - Chat and streaming endpoint routing

4. **Agents Service Integration** (3 tests)
   - Agent chat with BYOK
   - Agent streaming with BYOK
   - userId propagation

5. **Embeddings Service Integration** (4 tests)
   - Single embedding generation
   - Batch embeddings
   - Document embeddings with chunking
   - Fallback to internal

6. **API Endpoints Integration** (8 tests)
   - GET /api-keys/settings for all 3 modes
   - POST /copilot/chat with BYOK and internal
   - Usage logging verification

7. **End-to-End BYOK Flows** (8 tests)
   - Flow A: Credit-First (3 tests)
   - Flow B: BYOK-First (3 tests)
   - Flow C: BYOK-Only (2 tests)

8. **Graceful Fallback** (3 tests)
   - Fallback from BYOK to internal
   - No fallback in BYOK-only mode
   - Fallback event logging

9. **Usage Tracking** (4 tests)
   - BYOK usage to api_key_usage table
   - Internal usage to credit_transactions
   - No double-charging
   - Usage counter updates

10. **Feature Flag Changes** (3 tests)
    - Real-time flag changes
    - Cache refresh handling
    - Flag precedence validation

---

### 3. E2E Tests (Playwright)

**Location:** `/tests/admin/e2e/byok-user-journey.spec.ts`

**What they test:**
- Complete user journeys from UI to backend
- Frontend interactions and feedback
- Error states and user guidance
- Real browser automation

**Run E2E tests:**
```bash
cd tests/admin
npx playwright test byok-user-journey.spec.ts
```

**Run with UI mode (recommended for development):**
```bash
npx playwright test byok-user-journey.spec.ts --ui
```

**Run specific test suite:**
```bash
npx playwright test -g "Initial Setup"
npx playwright test -g "Chat/Copilot Integration"
npx playwright test -g "BYOK-Only Mode"
```

**Test Suites:**
1. **Initial Setup** (5 tests)
   - Access API Keys page as Premium user
   - Add OpenAI and Anthropic keys
   - Validation error handling
   - Delete API keys

2. **Status and Indicators** (3 tests)
   - Routing mode banner display
   - Credit balance and BYOK status
   - Usage statistics viewing

3. **Chat/Copilot Integration** (3 tests)
   - Chat with BYOK key
   - Chat with internal credits
   - Error when no credits/BYOK

4. **BYOK-Only Mode** (2 tests)
   - Using services with BYOK in BYOK-only mode
   - Error without BYOK in BYOK-only mode

5. **Graceful Fallback** (2 tests)
   - Invalid key fallback to internal
   - Re-validate failed keys

6. **Settings and Preferences** (3 tests)
   - View BYOK settings and current mode
   - Helpful tooltips on all info icons
   - Access BYOK FAQ

7. **Edge Cases** (4 tests)
   - Multiple provider keys
   - Provider switching in copilot
   - Rate limit bypass notice
   - Usage data export

8. **Error Handling** (3 tests)
   - API key validation failure
   - Delete warning for keys in use
   - Network error handling

---

## Test Data and Fixtures

### Test Fixtures

**Location:** `/packages/api-gateway/src/test/byok-fixtures.ts`

Provides reusable test data:
- **Users:** Premium (with/without BYOK/credits), Free tier, Lifetime
- **API Keys:** Valid/invalid keys for OpenAI and Anthropic
- **Feature Flags:** All 3 routing modes
- **BYOK Contexts:** Pre-configured contexts for all scenarios
- **Mock Responses:** OpenAI and Anthropic API response mocks
- **Usage Logs:** Sample usage data for both BYOK and internal

### Database Helpers

**Location:** `/packages/api-gateway/src/test/db-helpers.ts`

Functions for test setup/teardown:
- `createTestUser()` - Create test users with specific attributes
- `addByokKey()` - Add BYOK keys for users
- `setByokFeatureFlags()` - Configure feature flags
- `getLatestApiKeyUsage()` - Verify BYOK usage logging
- `getLatestCreditTransaction()` - Verify internal usage logging
- `verifyByokUsed()` - Check if BYOK was used
- `verifyInternalUsed()` - Check if internal credits were used
- `cleanupByokTestData()` - Clean up all test data

---

## Test Environment Setup

### Prerequisites

1. **Database:**
   ```bash
   # Start test database
   docker-compose -f docker-compose.test.yml up -d postgres

   # Run migrations
   cd services/directus
   psql $TEST_DATABASE_URL -f migrations/123_byok_feature_flags.sql
   ```

2. **Environment Variables:**
   ```bash
   # .env.test
   TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5451/synthstack_test
   ENCRYPTION_KEY=test-encryption-key-32-chars-long
   TEST_MODE=true
   ```

3. **Encryption Setup:**
   ```bash
   # Generate test encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

## Running Tests in CI/CD

### GitHub Actions

```yaml
name: BYOK Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: synthstack_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5451:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: |
          psql $DATABASE_URL -f services/directus/migrations/123_byok_feature_flags.sql
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5451/synthstack_test

      - name: Run unit tests
        run: npm run test:unit -- byok-router.test.ts

      - name: Run integration tests
        run: npm run test:integration -- byok-integration.test.ts

      - name: Run E2E tests
        run: npx playwright test byok-user-journey.spec.ts
        working-directory: tests/admin

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/
            playwright-report/
```

---

## Test Coverage Goals

### Current Coverage

- **Unit Tests:** 100% of byok-router.ts (8/8 scenarios)
- **Integration Tests:** 100% of BYOK system (30/30 scenarios)
- **E2E Tests:** 100% of user journeys (15/15 scenarios)

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html
```

**Coverage Thresholds:**
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

---

## Debugging Tests

### Unit Tests

```bash
# Run single test
npm test -- byok-router.test.ts -t "should use BYOK when user has BYOK keys"

# Run with verbose output
npm test -- byok-router.test.ts --verbose

# Run in watch mode
npm test -- byok-router.test.ts --watch
```

### Integration Tests

```bash
# Run with debug logging
DEBUG=byok:* npm run test:integration -- byok-integration.test.ts

# Run single test suite
npm run test:integration -- byok-integration.test.ts -t "ML Credits"

# Run with database logging
PGDEBUG=1 npm run test:integration -- byok-integration.test.ts
```

### E2E Tests

```bash
# Run in headed mode (see browser)
npx playwright test byok-user-journey.spec.ts --headed

# Run in debug mode (step through)
npx playwright test byok-user-journey.spec.ts --debug

# Run specific test
npx playwright test -g "User can add OpenAI API key"

# Record new tests
npx playwright codegen http://localhost:8056
```

---

## Common Issues

### Issue: "Encryption key not configured"

**Solution:**
```bash
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Issue: "Feature flags not found in database"

**Solution:**
```bash
cd services/directus
psql $TEST_DATABASE_URL -f migrations/123_byok_feature_flags.sql
```

### Issue: "Test database connection failed"

**Solution:**
```bash
# Verify database is running
docker ps | grep postgres

# Check connection
psql $TEST_DATABASE_URL -c "SELECT 1"

# Restart database
docker-compose -f docker-compose.test.yml restart postgres
```

### Issue: "E2E tests timeout"

**Solution:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000, // 60 seconds

# Or set timeout per test
test.setTimeout(120000); // 2 minutes
```

---

## Test Maintenance

### Adding New Tests

1. **Unit Test:**
   ```typescript
   it('should handle new scenario', () => {
     const context: ByokContext = { /* ... */ };
     const result = router.determineKeySource(context);
     expect(result.source).toBe('expected');
   });
   ```

2. **Integration Test:**
   ```typescript
   it('should test new integration', async () => {
     const user = await createTestUser({ /* ... */ });
     await addByokKey(user.id, 'openai', apiKey);

     const context = await byokRouter.getByokContext(user.id);
     expect(context.byokProviders).toContain('openai');
   });
   ```

3. **E2E Test:**
   ```typescript
   test('should test new user journey', async ({ page }) => {
     await login(page);
     await navigateToApiKeys(page);
     // ... test steps
   });
   ```

### Updating Test Fixtures

When adding new test scenarios, update fixtures in `byok-fixtures.ts`:
```typescript
export const users = {
  // Add new user type
  newUserType: {
    id: 'user-new-type',
    email: 'newtype@test.com',
    subscriptionTier: 'premium',
    credits: 1000,
    byokKeys: ['openai'],
  },
};
```

---

## Performance Benchmarks

### Test Execution Times

- **Unit Tests:** ~2 seconds (8 tests)
- **Integration Tests:** ~45 seconds (30+ tests with database)
- **E2E Tests:** ~8 minutes (15+ tests with browser automation)

**Total:** ~10 minutes for full BYOK test suite

### Optimization Tips

1. **Run tests in parallel:**
   ```bash
   npm test -- --maxWorkers=4
   ```

2. **Run only changed tests:**
   ```bash
   npm test -- --onlyChanged
   ```

3. **Use test sharding for E2E:**
   ```bash
   npx playwright test --shard=1/4
   npx playwright test --shard=2/4
   npx playwright test --shard=3/4
   npx playwright test --shard=4/4
   ```

---

## Continuous Improvement

### Test Metrics to Track

1. **Coverage:**
   - Monitor coverage trends over time
   - Aim for 90%+ coverage on BYOK code

2. **Flakiness:**
   - Track flaky test failures
   - Investigate tests failing >5% of runs

3. **Performance:**
   - Monitor test execution time
   - Optimize slow tests (>10s)

4. **Maintenance:**
   - Update tests when features change
   - Keep test data fixtures current

---

## Support

**Documentation:**
- [BYOK Admin Guide](../admin/byok-feature-flags.md)
- [BYOK Integration Guide](../integration/byok-api.md)
- [BYOK FAQ](../FAQ_BYOK.md)

**Issues:**
- Report test failures: [GitHub Issues](https://github.com/yourorg/synthstack/issues)
- Slack: #engineering-testing

**Maintainers:**
- BYOK Feature Team: @byok-team
- QA Team: @qa-team
