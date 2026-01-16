# Contributing to SynthStack

Thank you for your interest in contributing to SynthStack! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker (for local services)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/manicinc/synthstack.git
cd synthstack

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development services (PostgreSQL, Redis, Directus)
docker compose up -d

# Start the frontend
pnpm dev:web

# Start the API
pnpm dev:api
```

### Development URLs

- Frontend: http://localhost:3050
- API Gateway: http://localhost:3003
- Directus Admin: http://localhost:8099/admin
- ML Service: http://localhost:8001

## Code Style

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over type aliases for object shapes
- Export types alongside their implementations
- Use `unknown` over `any` when type is truly unknown

### Vue Components

- Use `<script setup>` syntax
- Props should be typed with `defineProps<T>()`
- Emits should be typed with `defineEmits<T>()`
- Add JSDoc comments to component files

### CSS/SCSS

- Use CSS custom properties (variables) from the design system
- Use scoped styles in components
- Follow BEM-like naming for custom classes
- Leverage Quasar's built-in utility classes

### File Naming

- Components: `PascalCase.vue`
- Composables: `useCamelCase.ts`
- Stores: `camelCase.ts`
- Tests: `*.spec.ts`

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(onboarding): add env template export
fix(auth): handle refresh token rotation
docs(readme): update installation instructions
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure all tests pass: `pnpm test`
4. Ensure linting passes: `pnpm lint`
5. Update documentation if needed
6. Submit a pull request with a clear description

## Testing

### Writing Tests

```typescript
// Place tests next to the source file
// my-component.spec.ts

import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Test implementation
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Documentation

### Component Documentation

Add JSDoc comments to all components:

```vue
<script setup lang="ts">
/**
 * PresetSelector.vue
 * 
 * A searchable dropdown for selecting presets from the CMS.
 * Automatically syncs selection with the presets store.
 * 
 * @example
 * <PresetSelector v-model="selectedId" />
 * 
 * @component
 */
</script>
```

### API Documentation

Document all public functions:

```typescript
/**
 * Fetches preset data from the API
 * 
 * @param id - The preset ID to fetch
 * @returns The preset data or null if not found
 * @throws {ApiError} If the request fails
 */
async function fetchPreset(id: string): Promise<Preset | null> {
  // Implementation
}
```

## Architecture Decisions

Major architectural decisions should be documented in `docs/adr/` (Architecture Decision Records).

## Getting Help

- Check existing issues and discussions
- Join our Discord community
- Email: dev@synthstack.app

## License

By contributing, you agree that your contributions will be licensed under the project's dual-license terms (Community License / Commercial License). See `LICENSE` and `COMMERCIAL-LICENSE.md` in the repository root.


