/**
 * @file index.ts
 * @description Unified document parser that handles multiple file formats
 *
 * Supported formats:
 * - Plain text (.txt)
 * - Markdown (.md)
 * - HTML (.html, .htm)
 * - PDF (.pdf) - via pdf-parse
 * - DOCX (.docx) - via mammoth
 */

import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import type { ParsedDocument, ParserOptions } from '../ai/types'

// ============================================
// Parser Functions
// ============================================

/**
 * Parse plain text file
 */
export async function parseText(file: File, options: ParserOptions = {}): Promise<ParsedDocument> {
  const text = await file.text()

  return {
    content: text,
    metadata: {
      fileType: 'txt',
      source: file.name,
      size: file.size,
      lastModified: file.lastModified,
    },
  }
}

/**
 * Parse Markdown file
 */
export async function parseMarkdown(
  file: File,
  options: ParserOptions = {}
): Promise<ParsedDocument> {
  const text = await file.text()

  // Extract frontmatter if present
  const frontmatter: Record<string, any> = {}
  let content = text

  const frontmatterMatch = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)/)
  if (frontmatterMatch) {
    try {
      // Simple YAML parsing (just key: value pairs)
      const yamlLines = frontmatterMatch[1].split('\n')
      for (const line of yamlLines) {
        const [key, ...valueParts] = line.split(':')
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim()
          frontmatter[key.trim()] = value
        }
      }
      content = frontmatterMatch[2]
    } catch (error) {
      devWarn('Failed to parse YAML frontmatter:', error)
    }
  }

  // Extract headings
  const headings: string[] = []
  const headingRegex = /^#{1,6}\s+(.+)$/gm
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(match[1])
  }

  // Extract code blocks
  const codeBlocks: Array<{ language: string; code: string }> = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    })
  }

  // Remove code blocks and markdown syntax for clean content
  const cleanContent = content
    .replace(/```[\s\S]+?```/g, '') // Remove code blocks
    .replace(/^\s*#{1,6}\s+/gm, '') // Remove heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .trim()

  return {
    content: cleanContent,
    metadata: {
      fileType: 'md',
      source: file.name,
      size: file.size,
      lastModified: file.lastModified,
      frontmatter,
      headings,
      codeBlocks,
    },
  }
}

/**
 * Parse HTML file
 */
export async function parseHtml(file: File, options: ParserOptions = {}): Promise<ParsedDocument> {
  const html = await file.text()

  // Create temporary DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Extract title
  const title = doc.querySelector('title')?.textContent || file.name

  // Remove script and style tags
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove())

  // Get main content
  let mainContent =
    doc.querySelector('main')?.textContent ||
    doc.querySelector('article')?.textContent ||
    doc.body.textContent ||
    ''

  // Clean up whitespace
  mainContent = mainContent.replace(/\s+/g, ' ').trim()

  // Extract headings
  const headings: string[] = []
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    if (heading.textContent) {
      headings.push(heading.textContent.trim())
    }
  })

  // Extract links
  const links: Array<{ text: string; href: string }> = []
  doc.querySelectorAll('a[href]').forEach((link) => {
    const text = link.textContent?.trim()
    const href = link.getAttribute('href')
    if (text && href) {
      links.push({ text, href })
    }
  })

  return {
    content: mainContent,
    metadata: {
      fileType: 'html',
      source: file.name,
      size: file.size,
      lastModified: file.lastModified,
      title,
      headings,
      links,
    },
  }
}

/**
 * Parse PDF file (requires pdf-parse library)
 */
export async function parsePdf(file: File, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Dynamic import to avoid bundling if not used
    const pdfParse = await import('pdf-parse')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const data = await pdfParse.default(buffer)

    return {
      content: data.text,
      metadata: {
        fileType: 'pdf',
        source: file.name,
        size: file.size,
        lastModified: file.lastModified,
        pageCount: data.numpages,
        info: data.info,
      },
    }
  } catch (error) {
    logError('PDF parsing failed:', error)
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse DOCX file (requires mammoth library)
 */
export async function parseDocx(file: File, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Dynamic import to avoid bundling if not used
    const mammoth = await import('mammoth')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })

    return {
      content: result.value,
      metadata: {
        fileType: 'docx',
        source: file.name,
        size: file.size,
        lastModified: file.lastModified,
        messages: result.messages,
      },
    }
  } catch (error) {
    logError('DOCX parsing failed:', error)
    throw new Error(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// ============================================
// Main Parser Function
// ============================================

/**
 * Parse any supported document type
 */
export async function parseDocument(
  file: File,
  options: ParserOptions = {}
): Promise<ParsedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'txt':
      return parseText(file, options)

    case 'md':
    case 'markdown':
      return parseMarkdown(file, options)

    case 'html':
    case 'htm':
      return parseHtml(file, options)

    case 'pdf':
      return parsePdf(file, options)

    case 'docx':
      return parseDocx(file, options)

    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return ['txt', 'md', 'markdown', 'html', 'htm', 'pdf', 'docx'].includes(extension || '')
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['.txt', '.md', '.markdown', '.html', '.htm', '.pdf', '.docx']
}

/**
 * Get MIME types for supported formats
 */
export function getSupportedMimeTypes(): string[] {
  return [
    'text/plain',
    'text/markdown',
    'text/html',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
}

// ============================================
// Batch Processing
// ============================================

/**
 * Parse multiple files in parallel
 */
export async function parseDocuments(
  files: File[],
  options: ParserOptions = {},
  onProgress?: (current: number, total: number, file: File) => void
): Promise<Array<{ file: File; result?: ParsedDocument; error?: Error }>> {
  const results: Array<{ file: File; result?: ParsedDocument; error?: Error }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    try {
      onProgress?.(i + 1, files.length, file)
      const result = await parseDocument(file, options)
      results.push({ file, result })
    } catch (error) {
      logError(`Failed to parse ${file.name}:`, error)
      results.push({
        file,
        error: error instanceof Error ? error : new Error('Unknown error'),
      })
    }
  }

  return results
}

// ============================================
// Export
// ============================================

export default {
  parseDocument,
  parseDocuments,
  parseText,
  parseMarkdown,
  parseHtml,
  parsePdf,
  parseDocx,
  isSupportedFileType,
  getSupportedExtensions,
  getSupportedMimeTypes,
}
