#!/usr/bin/env tsx
/**
 * @file generate-openapi.ts
 * @description Generates OpenAPI specification from the running server
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');

async function generateOpenAPI() {
  const apiUrl = process.env.API_URL || 'http://localhost:3030';

  console.log(`📚 Fetching OpenAPI spec from ${apiUrl}/openapi.json...`);

  try {
    const response = await fetch(`${apiUrl}/openapi.json`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const spec = await response.json();

    // Ensure docs directory exists
    mkdirSync(docsDir, { recursive: true });

    // Write JSON spec
    const jsonPath = join(docsDir, 'openapi.json');
    writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI JSON written to ${jsonPath}`);

    // Write YAML spec
    const yaml = await import('yaml');
    const yamlPath = join(docsDir, 'openapi.yaml');
    writeFileSync(yamlPath, yaml.stringify(spec));
    console.log(`✅ OpenAPI YAML written to ${yamlPath}`);

    // Generate summary
    const paths = Object.keys(spec.paths || {});
    const tags = spec.tags || [];

    console.log('\n📊 API Summary:');
    console.log(`   Version: ${spec.info?.version}`);
    console.log(`   Endpoints: ${paths.length}`);
    console.log(`   Tags: ${tags.map((t: { name: string }) => t.name).join(', ')}`);

    // Write summary markdown
    const summaryPath = join(docsDir, 'API_SUMMARY.md');
    const summary = generateSummaryMarkdown(spec);
    writeFileSync(summaryPath, summary);
    console.log(`✅ API Summary written to ${summaryPath}`);

    console.log('\n✨ OpenAPI generation complete!');
    console.log('   View docs: pnpm docs:serve');
    console.log('   Generate SDK: pnpm sdk:generate');

  } catch (error) {
    console.error('❌ Failed to generate OpenAPI spec:', error);
    console.error('\nMake sure the API server is running: pnpm dev');
    process.exit(1);
  }
}

function generateSummaryMarkdown(spec: any): string {
  const paths = spec.paths || {};
  const tags = spec.tags || [];

  let md = `# SynthStack API Documentation

**Version:** ${spec.info?.version || '1.0.0'}
**Base URL:** ${spec.servers?.[0]?.url || 'https://api.synthstack.app'}

## Overview

${spec.info?.description?.split('\n').slice(0, 10).join('\n') || 'AI-powered 3D print settings generation API.'}

## Endpoints

`;

  // Group endpoints by tag
  const byTag: Record<string, any[]> = {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      if (method === 'parameters') continue;

      const tag = details.tags?.[0] || 'Other';
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push({
        method: method.toUpperCase(),
        path,
        summary: details.summary || '',
        description: details.description || '',
      });
    }
  }

  for (const tag of tags) {
    const endpoints = byTag[tag.name] || [];
    if (endpoints.length === 0) continue;

    md += `### ${tag.name}\n\n`;
    md += `${tag.description || ''}\n\n`;
    md += '| Method | Endpoint | Description |\n';
    md += '|--------|----------|-------------|\n';

    for (const ep of endpoints) {
      md += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.summary} |\n`;
    }

    md += '\n';
  }

  md += `## Authentication

Most endpoints require a JWT token from Supabase Auth:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.synthstack.app/api/v1/...
\`\`\`

## Rate Limits

- Free: 10 requests/minute
- Maker: 30 requests/minute
- Pro: 60 requests/minute
- Unlimited: 100 requests/minute

## Links

- [Interactive Docs (Swagger UI)](https://api.synthstack.app/docs)
- [ReDoc](https://api.synthstack.app/redoc)
- [OpenAPI JSON](https://api.synthstack.app/openapi.json)
- [TypeScript SDK](./sdk/api.d.ts)
`;

  return md;
}

generateOpenAPI();

