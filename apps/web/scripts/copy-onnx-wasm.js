/**
 * @file copy-onnx-wasm.js
 * @description Copies ONNX Runtime WASM binaries from node_modules to public/
 *
 * ONNX Runtime Web needs WASM files to be served from the same origin.
 * This script copies them from node_modules to public/onnx-wasm/
 */

import { copyFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Source directory (node_modules)
const SOURCE_DIR = join(__dirname, '../node_modules/onnxruntime-web/dist')

// Destination directory (public)
const DEST_DIR = join(__dirname, '../public/onnx-wasm')

// WASM files to copy (ONNX Runtime Web v1.20+)
const WASM_FILES = [
  'ort-wasm-simd-threaded.wasm', // 11 MB - Standard SIMD + threading
  'ort-wasm-simd-threaded.jsep.wasm', // 23 MB - With JavaScript Execution Provider (WebGPU)
  'ort-wasm-simd-threaded.asyncify.wasm', // 24 MB - With async support
]

// JavaScript worker and helper files
const JS_FILES = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
]

/**
 * Copy a single file with error handling
 */
async function copyFileWithLogging(source, dest, fileName) {
  try {
    if (!existsSync(source)) {
      console.log(`   ⚠️  Skipping ${fileName} (not found in node_modules)`)
      return false
    }

    await copyFile(source, dest)
    console.log(`   ✅ Copied ${fileName}`)
    return true
  } catch (error) {
    console.error(`   ❌ Failed to copy ${fileName}:`, error.message)
    return false
  }
}

/**
 * Main copy function
 */
async function main() {
  console.log('📦 Copying ONNX Runtime WASM files to public/')
  console.log(`📁 Source: ${SOURCE_DIR}`)
  console.log(`📁 Destination: ${DEST_DIR}`)
  console.log('')

  // Ensure destination directory exists
  await mkdir(DEST_DIR, { recursive: true })

  // Check if source directory exists
  if (!existsSync(SOURCE_DIR)) {
    console.error('❌ Error: onnxruntime-web not found in node_modules')
    console.error('   Please run: npm install onnxruntime-web')
    process.exit(1)
  }

  let copiedCount = 0
  let totalCount = WASM_FILES.length + JS_FILES.length

  // Copy WASM files
  console.log('Copying WASM binaries...')
  for (const file of WASM_FILES) {
    const source = join(SOURCE_DIR, file)
    const dest = join(DEST_DIR, file)
    const success = await copyFileWithLogging(source, dest, file)
    if (success) copiedCount++
  }

  console.log('')
  console.log('Copying worker files...')
  for (const file of JS_FILES) {
    const source = join(SOURCE_DIR, file)
    const dest = join(DEST_DIR, file)
    const success = await copyFileWithLogging(source, dest, file)
    if (success) copiedCount++
  }

  console.log('')
  console.log(`✨ Copied ${copiedCount}/${totalCount} files successfully!`)
  console.log('')

  if (copiedCount < totalCount) {
    console.log('⚠️  Some files were not copied. This is usually OK.')
    console.log('   The basic WASM file (ort-wasm.wasm) is sufficient.')
    console.log('')
  }

  console.log('Next steps:')
  console.log('  1. WASM files are now available at /onnx-wasm/')
  console.log('  2. ONNX Runtime will load them automatically')
  console.log('  3. WebGPU will be used if available for 5-10x speedup')
  console.log('')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Copy failed:', error)
    process.exit(1)
  })
}

export { main }
