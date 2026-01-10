#!/usr/bin/env node
/**
 * Convert SVG images to PNG
 * Run: node scripts/convert-images.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const conversions = [
  {
    input: 'assets/stripe-product-cover.svg',
    output: 'assets/stripe-product-cover.png',
    width: 1200,
    height: 600
  },
  {
    input: 'apps/web/public/og-social.svg',
    output: 'apps/web/public/og-social.png',
    width: 1200,
    height: 630
  }
];

async function convertSvgToPng() {
  console.log('🎨 Converting SVG images to PNG...\n');

  for (const { input, output, width, height } of conversions) {
    try {
      // Try using Chrome/Chromium headless
      console.log(`Converting ${input}...`);

      // Using macOS qlmanage for quick preview generation
      await execAsync(`qlmanage -t -s ${width} -o $(dirname ${output}) ${input}`);

      // Rename the output file
      const tempFile = `${input}.png`;
      await execAsync(`mv "${tempFile}" "${output}"`);

      console.log(`✅ Created ${output}\n`);
    } catch (error) {
      console.error(`❌ Failed to convert ${input}:`, error.message);
      console.log(`\n📝 Manual conversion options:`);
      console.log(`   1. Open ${input} in browser`);
      console.log(`   2. Take screenshot or use browser dev tools to export`);
      console.log(`   3. Or use online tool: https://cloudconvert.com/svg-to-png\n`);
    }
  }
}

// Alternative: Instructions for manual conversion
console.log(`
📋 SVG to PNG Conversion Options:

Option 1: Online Converter (Easiest)
  1. Go to: https://cloudconvert.com/svg-to-png
  2. Upload: assets/stripe-product-cover.svg
  3. Download PNG
  4. Repeat for apps/web/public/og-social.svg

Option 2: Figma/Design Tool
  1. Open SVG in Figma (free)
  2. Select all → Export as PNG
  3. Set dimensions: 1200x600 (Stripe) or 1200x630 (OG)

Option 3: Chrome DevTools
  1. Open SVG in Chrome
  2. Right-click → Inspect
  3. DevTools → More tools → Capture screenshot
  4. Or use Full page screenshot

Option 4: macOS Preview
  1. Open SVG in Preview app
  2. File → Export
  3. Format: PNG
  4. Resolution: 300 DPI

`);

convertSvgToPng().catch(console.error);
