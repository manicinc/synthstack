import { existsSync } from 'fs';
import path from 'path';

/**
 * Resolve the docs directory across common run modes:
 * - Docker Compose mounts docs at `/docs`
 * - Local dev runs from `packages/api-gateway`, so docs are `../../docs`
 */
export function resolveDocsDir(): string {
  const envDocsDir = process.env.SYNTHSTACK_DOCS_DIR || process.env.DOCS_DIR;

  const candidates = [
    envDocsDir,
    '/docs',
    path.resolve(process.cwd(), '..', '..', 'docs'),
    path.resolve(process.cwd(), '..', 'docs'),
    path.resolve(process.cwd(), 'docs'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Fallback to monorepo default even if it doesn't exist yet.
  return path.resolve(process.cwd(), '..', '..', 'docs');
}

