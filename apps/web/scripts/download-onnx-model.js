/**
 * @file download-onnx-model.js
 * @description Downloads all-MiniLM-L6-v2 ONNX model from HuggingFace
 *
 * This script downloads the following files:
 * - model.onnx (22MB) - The ONNX model weights
 * - tokenizer.json (460KB) - Tokenizer configuration
 * - config.json (2KB) - Model configuration
 */

import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const __dirname = dirname(fileURLToPath(import.meta.url))

// HuggingFace model repository
const MODEL_REPO = 'Xenova/all-MiniLM-L6-v2'
const BASE_URL = `https://huggingface.co/${MODEL_REPO}/resolve/main`

// Output directory
const OUTPUT_DIR = `${__dirname}/../public/models/minilm-l6-v2`

// Files to download
const FILES = [
  {
    name: 'model.onnx',
    url: `${BASE_URL}/onnx/model.onnx`,
    size: '22 MB',
  },
  {
    name: 'tokenizer.json',
    url: `${BASE_URL}/tokenizer.json`,
    size: '460 KB',
  },
  {
    name: 'config.json',
    url: `${BASE_URL}/config.json`,
    size: '2 KB',
  },
]

/**
 * Download a file with progress tracking
 */
async function downloadFile(url, outputPath, fileName, expectedSize) {
  console.log(`📥 Downloading ${fileName} (${expectedSize})...`)
  console.log(`   URL: ${url}`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true })

    // Get content length for progress
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    let downloadedBytes = 0
    let lastPercent = 0

    // Get reader from response body
    const reader = response.body.getReader()
    const chunks = []

    // Read all chunks
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      chunks.push(value)
      downloadedBytes += value.length

      // Show progress every 10%
      if (contentLength > 0) {
        const percent = Math.floor((downloadedBytes / contentLength) * 100)
        if (percent >= lastPercent + 10) {
          lastPercent = percent
          const mb = (downloadedBytes / (1024 * 1024)).toFixed(1)
          const totalMb = (contentLength / (1024 * 1024)).toFixed(1)
          process.stdout.write(`   Progress: ${percent}% (${mb}/${totalMb} MB)\r`)
        }
      }
    }

    // Combine all chunks
    const buffer = Buffer.concat(chunks)

    // Write to file
    const fileStream = createWriteStream(outputPath)
    await new Promise((resolve, reject) => {
      fileStream.write(buffer, (err) => {
        if (err) reject(err)
        else fileStream.end(resolve)
      })
    })

    const finalMb = (downloadedBytes / (1024 * 1024)).toFixed(1)
    console.log(`   ✅ Downloaded ${finalMb} MB                    `)
  } catch (error) {
    console.error(`   ❌ Failed to download ${fileName}:`, error.message)
    throw error
  }
}

/**
 * Main download function
 */
async function main() {
  console.log('🤖 Downloading all-MiniLM-L6-v2 ONNX model from HuggingFace')
  console.log(`📁 Output directory: ${OUTPUT_DIR}`)
  console.log('')

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Download each file
  for (const file of FILES) {
    const outputPath = `${OUTPUT_DIR}/${file.name}`
    await downloadFile(file.url, outputPath, file.name, file.size)
  }

  console.log('')
  console.log('✨ All files downloaded successfully!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Run: npm run copy:wasm')
  console.log('  2. The model will be used for offline AI search')
  console.log('')
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Download failed:', error)
    process.exit(1)
  })
}

export { downloadFile, main }
