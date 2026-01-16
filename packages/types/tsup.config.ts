import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/api/index.ts',
    'src/auth/index.ts',
    'src/billing/index.ts',
    'src/agents/index.ts',
    'src/orchestration/index.ts',
    'src/workflows/index.ts',
    'src/projects/index.ts',
    'src/referral/index.ts',
    'src/common/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
