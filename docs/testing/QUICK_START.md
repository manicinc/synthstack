# Feature Flags Testing - Quick Start

## Run Tests Immediately

### Backend Tests

```bash
cd packages/api-gateway

# Run all tests
pnpm test

# Run only feature flag tests
pnpm test conditional-features

# Watch mode
pnpm test:watch
```

### Frontend Tests

```bash
cd apps/web

# Run all tests
pnpm test

# Run only feature config tests
pnpm test features

# Watch mode
pnpm test:watch
```

## Test Both Versions

### Test LITE Version

```bash
# Backend
cd packages/api-gateway
ENABLE_COPILOT=false ENABLE_REFERRALS=false pnpm test

# Frontend
cd apps/web
VITE_ENABLE_COPILOT=false VITE_ENABLE_REFERRALS=false pnpm test
```

### Test PRO Version

```bash
# Backend
cd packages/api-gateway
ENABLE_COPILOT=true ENABLE_REFERRALS=true pnpm test

# Frontend
cd apps/web
VITE_ENABLE_COPILOT=true VITE_ENABLE_REFERRALS=true pnpm test
```

## Check Test Coverage

```bash
# Backend
cd packages/api-gateway
pnpm test:coverage

# Frontend
cd apps/web
pnpm test:coverage
```

## Test Status

✅ **Created (ready to run):**
- `packages/api-gateway/src/plugins/__tests__/conditional-features.test.ts`
- `apps/web/src/config/__tests__/features.test.ts`

⚠️ **TODO (see FEATURE_FLAGS_TESTING.md):**
- Integration tests for route availability
- E2E tests for component visibility
- Build verification tests
- CI/CD workflow

## Expected Results

### Backend Tests (conditional-features.test.ts)

```
✓ Feature Flag Detection (4 tests)
✓ Fastify Instance Decoration (2 tests)
✓ Service Initialization (2 tests)
✓ Plugin Dependencies (1 test)
✓ Environment Variable Parsing (2 tests)
✓ Version Detection (3 tests)

Total: 14 tests passing
```

### Frontend Tests (features.test.ts)

```
✓ FEATURES object (6 tests)
✓ isPro (4 tests)
✓ isLite (3 tests)
✓ versionName (4 tests)
✓ Version consistency (2 tests)
✓ Development logging (2 tests)

Total: 21 tests passing
```

## Troubleshooting

### Tests failing with "Cannot find module"

Make sure you're in the correct directory and dependencies are installed:

```bash
pnpm install
```

### Environment variables not working

Vitest reads from `.env.test` if it exists. Make sure you're passing env vars on the command line or in the test file itself.

### Mock issues

If you see errors about mocks not working:

```bash
# Clear cache and try again
pnpm test --no-cache
```

## Next Steps

1. Run the existing tests to make sure they pass
2. Review the full test plan in `FEATURE_FLAGS_TESTING.md`
3. Implement integration tests for route availability
4. Add E2E tests for component visibility
5. Set up CI/CD to test both versions on every commit
