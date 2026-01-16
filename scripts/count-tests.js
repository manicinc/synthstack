#!/usr/bin/env node

/**
 * Test Counter Script
 *
 * Counts all tests across the monorepo and outputs stats.
 * Can be run manually or in CI to update test badges.
 *
 * Usage:
 *   node scripts/count-tests.js          # Print stats
 *   node scripts/count-tests.js --json   # Output JSON
 *   node scripts/count-tests.js --update # Update README badge
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Run tests and parse output for test counts
 */
function countTests() {
  const packages = [
    { name: 'api-gateway', path: 'packages/api-gateway' },
    { name: 'web', path: 'apps/web' },
    { name: 'types', path: 'packages/types' },
  ];

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    packages: {},
    timestamp: new Date().toISOString(),
  };

  for (const pkg of packages) {
    const pkgPath = path.join(ROOT, pkg.path);
    if (!fs.existsSync(path.join(pkgPath, 'package.json'))) continue;

    try {
      // Run vitest with JSON reporter to get accurate counts
      const output = execSync(
        'pnpm vitest run --reporter=json 2>/dev/null || true',
        {
          cwd: pkgPath,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB
        }
      );

      // Try to parse JSON output
      try {
        // Find JSON in output
        const jsonMatch = output.match(/\{[\s\S]*"numPassedTests"[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          const pkgResults = {
            passed: json.numPassedTests || 0,
            failed: json.numFailedTests || 0,
            skipped: json.numPendingTests || 0,
            total:
              (json.numPassedTests || 0) +
              (json.numFailedTests || 0) +
              (json.numPendingTests || 0),
          };
          results.packages[pkg.name] = pkgResults;
          results.total += pkgResults.total;
          results.passed += pkgResults.passed;
          results.failed += pkgResults.failed;
          results.skipped += pkgResults.skipped;
        }
      } catch (e) {
        // Fallback: parse text output
        const passedMatch = output.match(/(\d+)\s*passed/i);
        const failedMatch = output.match(/(\d+)\s*failed/i);
        const skippedMatch = output.match(/(\d+)\s*skipped/i);

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        const total = passed + failed + skipped;

        if (total > 0) {
          results.packages[pkg.name] = { passed, failed, skipped, total };
          results.total += total;
          results.passed += passed;
          results.failed += failed;
          results.skipped += skipped;
        }
      }
    } catch (error) {
      console.error(`Error counting tests in ${pkg.name}:`, error.message);
    }
  }

  return results;
}

/**
 * Count test files without running them (faster)
 */
function countTestFiles() {
  const testPatterns = [
    'packages/api-gateway/src/**/*.test.ts',
    'packages/api-gateway/src/**/*.spec.ts',
    'apps/web/e2e/**/*.spec.ts',
    'tests/**/*.spec.ts',
    'tests/**/*.test.ts',
  ];

  let totalFiles = 0;
  let estimatedTests = 0;

  for (const pattern of testPatterns) {
    try {
      const output = execSync(`find ${ROOT} -path "*/node_modules" -prune -o -name "*.test.ts" -o -name "*.spec.ts" -print 2>/dev/null | grep -E "\\.(test|spec)\\.ts$" | wc -l`, {
        encoding: 'utf-8',
      });
      totalFiles = parseInt(output.trim()) || 0;
    } catch (e) {
      // Ignore errors
    }
  }

  // Rough estimate: ~20 tests per file on average
  estimatedTests = totalFiles * 20;

  return { totalFiles, estimatedTests };
}

/**
 * Update README with test badge
 */
function updateReadme(results) {
  const readmePath = path.join(ROOT, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    return false;
  }

  let readme = fs.readFileSync(readmePath, 'utf-8');

  // Create badge markdown
  const badgeColor = results.failed > 0 ? 'red' : 'brightgreen';
  const badge = `![Tests](https://img.shields.io/badge/tests-${results.total}%20total-${badgeColor})`;

  // Check if badge section exists
  const badgeRegex = /!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-.*?\)/;

  if (badgeRegex.test(readme)) {
    // Update existing badge
    readme = readme.replace(badgeRegex, badge);
  } else {
    // Add badge after first heading
    const headingMatch = readme.match(/^#\s+.+$/m);
    if (headingMatch) {
      const insertPos = headingMatch.index + headingMatch[0].length;
      readme =
        readme.slice(0, insertPos) +
        '\n\n' +
        badge +
        readme.slice(insertPos);
    }
  }

  fs.writeFileSync(readmePath, readme);
  console.log('Updated README.md with test badge');
  return true;
}

/**
 * Save stats to JSON file for landing page
 */
function saveStats(results) {
  const statsPath = path.join(ROOT, 'public', 'test-stats.json');

  // Ensure public directory exists
  const publicDir = path.dirname(statsPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(statsPath, JSON.stringify(results, null, 2));
  console.log(`Saved test stats to ${statsPath}`);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--quick')) {
  // Quick estimate without running tests
  const fileStats = countTestFiles();
  console.log(`\nTest Files: ${fileStats.totalFiles}`);
  console.log(`Estimated Tests: ~${fileStats.estimatedTests}`);
} else if (args.includes('--json')) {
  const results = countTests();
  console.log(JSON.stringify(results, null, 2));
} else if (args.includes('--update')) {
  const results = countTests();
  updateReadme(results);
  saveStats(results);
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
} else {
  // Default: print stats
  console.log('Counting tests across monorepo...\n');
  const results = countTests();

  console.log('Test Results by Package:');
  console.log('========================');
  for (const [pkg, stats] of Object.entries(results.packages)) {
    console.log(`${pkg}: ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped (${stats.total} total)`);
  }

  console.log('\n========================');
  console.log(`TOTAL: ${results.total} tests`);
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`\nTimestamp: ${results.timestamp}`);
}
