#!/usr/bin/env node
/**
 * @file update-test-counts.js
 * @description Updates test count badges in README files based on Vitest JSON output
 *
 * Usage:
 *   pnpm test -- --reporter=json --outputFile=test-results.json
 *   node scripts/update-test-counts.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES = [
  {
    name: 'API Gateway',
    dir: 'packages/api-gateway',
    testResultFile: 'packages/api-gateway/test-results.json',
    readme: 'packages/api-gateway/README.md'
  },
  {
    name: 'Web App',
    dir: 'apps/web',
    testResultFile: 'apps/web/test-results.json',
    readme: 'apps/web/README.md'
  },
  {
    name: 'Node-RED',
    dir: 'packages/node-red-contrib-synthstack',
    testResultFile: 'packages/node-red-contrib-synthstack/test-results.json',
    readme: 'packages/node-red-contrib-synthstack/README.md'
  }
];

/**
 * Parse Vitest JSON output
 */
function parseTestResults(filePath) {
  try {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`  No test results file: ${filePath}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // Vitest JSON format
    const numTotalTests = data.numTotalTests || 0;
    const numPassedTests = data.numPassedTests || 0;
    const numFailedTests = data.numFailedTests || 0;
    const numSkippedTests = (data.numPendingTests || 0) + (data.numTodoTests || 0);

    return {
      total: numTotalTests,
      passed: numPassedTests,
      failed: numFailedTests,
      skipped: numSkippedTests,
      testFiles: data.numTotalTestSuites || 0
    };
  } catch (error) {
    console.error(`  Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Generate shields.io badge URL
 */
function generateBadgeUrl(label, value, color) {
  const encodedLabel = encodeURIComponent(label);
  const encodedValue = encodeURIComponent(value);
  return `https://img.shields.io/badge/${encodedLabel}-${encodedValue}-${color}`;
}

/**
 * Update README with test section
 */
function updateReadme(readmePath, packageName, results, type = 'package') {
  const fullPath = path.join(ROOT_DIR, readmePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  README not found: ${readmePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Determine badge color
  let badgeColor = 'brightgreen';
  if (results.failed > 0) {
    badgeColor = 'red';
  } else if (results.skipped > results.passed * 0.2) {
    badgeColor = 'yellow';
  }

  // Create test section
  const testSection = `## Tests

![Tests](${generateBadgeUrl('tests', `${results.passed} passing`, badgeColor)})

| Metric | Count |
|--------|-------|
| Passing | ${results.passed} |
| Failing | ${results.failed} |
| Skipped | ${results.skipped} |
| Total | ${results.total} |

Run tests:
\`\`\`bash
pnpm test
\`\`\`

Run with coverage:
\`\`\`bash
pnpm test:coverage
\`\`\``;

  // Find and replace existing test section or add new one
  const testSectionRegex = /## Tests\n[\s\S]*?(?=\n## |\n# |$)/;

  if (testSectionRegex.test(content)) {
    content = content.replace(testSectionRegex, testSection);
  } else {
    // Add after first heading
    const firstHeadingEnd = content.indexOf('\n', content.indexOf('#'));
    if (firstHeadingEnd > 0) {
      const insertPoint = content.indexOf('\n\n', firstHeadingEnd);
      if (insertPoint > 0) {
        content = content.slice(0, insertPoint + 2) + testSection + '\n\n' + content.slice(insertPoint + 2);
      }
    }
  }

  fs.writeFileSync(fullPath, content);
  return true;
}

/**
 * Update root README with aggregate counts
 */
function updateRootReadme(allResults) {
  const readmePath = path.join(ROOT_DIR, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.log('Root README.md not found');
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf8');

  // Calculate totals
  const totals = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0
  };

  for (const pkg of allResults) {
    if (pkg.results) {
      totals.passed += pkg.results.passed;
      totals.failed += pkg.results.failed;
      totals.skipped += pkg.results.skipped;
      totals.total += pkg.results.total;
    }
  }

  // Determine badge color
  let badgeColor = 'brightgreen';
  if (totals.failed > 0) {
    badgeColor = 'red';
  } else if (totals.skipped > totals.passed * 0.2) {
    badgeColor = 'yellow';
  }

  // Create test coverage section
  const rows = allResults
    .filter(p => p.results)
    .map(p => `| ${p.name} | ${p.results.passed} | ${p.results.failed} | ${p.results.skipped} | ${p.results.total} |`)
    .join('\n');

  const testSection = `## Test Coverage

![Tests](${generateBadgeUrl('tests', `${totals.passed} passing`, badgeColor)})

| Package | Passing | Failing | Skipped | Total |
|---------|---------|---------|---------|-------|
${rows}
| **Total** | **${totals.passed}** | **${totals.failed}** | **${totals.skipped}** | **${totals.total}** |

Run all tests:
\`\`\`bash
pnpm test
\`\`\``;

  // Find and replace existing test section or add after first major section
  const testSectionRegex = /## Test Coverage\n[\s\S]*?(?=\n## |\n# |$)/;

  if (testSectionRegex.test(content)) {
    content = content.replace(testSectionRegex, testSection);
  } else {
    // Find a good place to insert - after Features or Overview section
    const insertPoints = ['## Features', '## Overview', '## Getting Started', '## Installation'];
    let inserted = false;

    for (const point of insertPoints) {
      const idx = content.indexOf(point);
      if (idx > 0) {
        // Find the next ## heading
        const nextHeading = content.indexOf('\n## ', idx + point.length);
        if (nextHeading > 0) {
          content = content.slice(0, nextHeading) + '\n' + testSection + '\n' + content.slice(nextHeading);
          inserted = true;
          break;
        }
      }
    }

    if (!inserted) {
      // Append to end
      content = content.trimEnd() + '\n\n' + testSection + '\n';
    }
  }

  fs.writeFileSync(readmePath, content);
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Updating test counts in READMEs...\n');

  const allResults = [];

  for (const pkg of PACKAGES) {
    console.log(`Processing ${pkg.name}...`);
    const results = parseTestResults(pkg.testResultFile);

    if (results) {
      console.log(`  ✓ ${results.passed} passing, ${results.failed} failing, ${results.skipped} skipped`);

      if (updateReadme(pkg.readme, pkg.name, results)) {
        console.log(`  ✓ Updated ${pkg.readme}`);
      }
    }

    allResults.push({ name: pkg.name, results });
  }

  // Update root README
  console.log('\nUpdating root README...');
  if (updateRootReadme(allResults)) {
    console.log('  ✓ Updated README.md');
  }

  console.log('\n✅ Test counts updated successfully!');
}

main().catch(console.error);
