#!/usr/bin/env node
/**
 * Coverage Badge Generator
 *
 * Reads coverage summary and generates a shields.io badge URL
 * Usage: node scripts/generate-coverage-badge.js
 */

const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('❌ Coverage summary not found. Run tests with coverage first:');
  console.error('   pnpm test:coverage');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const totalCoverage = coverage.total.lines.pct;

// Determine badge color based on coverage
let color = 'red';
if (totalCoverage >= 85) color = 'brightgreen';
else if (totalCoverage >= 70) color = 'yellow';
else if (totalCoverage >= 50) color = 'orange';

// Generate shields.io badge URL
const badgeUrl = `https://img.shields.io/badge/coverage-${totalCoverage.toFixed(1)}%25-${color}`;

console.log(`\n📊 Coverage Report:`);
console.log(`   Lines:       ${coverage.total.lines.pct.toFixed(2)}%`);
console.log(`   Statements:  ${coverage.total.statements.pct.toFixed(2)}%`);
console.log(`   Functions:   ${coverage.total.functions.pct.toFixed(2)}%`);
console.log(`   Branches:    ${coverage.total.branches.pct.toFixed(2)}%`);
console.log(`\n🎯 Overall Coverage: ${totalCoverage.toFixed(1)}%`);
console.log(`\n🏷️  Badge URL: ${badgeUrl}`);

// Write badge markdown to file
const badgeMd = `![Coverage](${badgeUrl})`;
const badgePath = path.join(process.cwd(), 'COVERAGE_BADGE.md');
fs.writeFileSync(badgePath, badgeMd);
console.log(`\n✅ Badge saved to: ${badgePath}`);

// Check if coverage meets threshold
const threshold = 85;
if (totalCoverage < threshold) {
  console.log(`\n⚠️  Coverage ${totalCoverage.toFixed(1)}% is below ${threshold}% threshold`);
  process.exit(1);
} else {
  console.log(`\n✅ Coverage ${totalCoverage.toFixed(1)}% meets ${threshold}% threshold`);
  process.exit(0);
}
