import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
  platform: 'node',
  // Mark optional integration dependencies as external
  // These are dynamically imported and may not be installed
  external: [
    '@slack/web-api',
    'twilio',
    '@notionhq/client',
    'googleapis',
    // Native modules that can't be bundled
    'argon2',
    'bcrypt',
    'sharp',
  ],
})
