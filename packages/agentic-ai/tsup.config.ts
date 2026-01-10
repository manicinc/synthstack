import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: [
    '@langchain/anthropic',
    '@langchain/core',
    '@langchain/langgraph',
    '@langchain/langgraph-checkpoint-postgres',
    '@langchain/openai',
    '@anthropic-ai/sdk',
    'openai',
    'pg',
    'uuid',
    'zod',
  ],
});
