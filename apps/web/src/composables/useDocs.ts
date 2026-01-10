/**
 * Documentation Composable
 *
 * Handles fetching and rendering documentation from multiple sources:
 * - Markdown files from /docs/ folder (via API)
 * - Tutorial posts from Directus CMS
 */
import { ref, computed } from 'vue'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'

// Import languages for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)

import { useApi } from './useApi'
import type { BlogPost } from './useBlog'

export interface DocContent {
  title: string
  slug: string
  content: string
  html: string
  source: 'markdown' | 'directus'
  headings: DocHeading[]
  lastModified?: string
}

export interface DocHeading {
  id: string
  text: string
  level: number
}

/**
 * Configure marked with syntax highlighting
 */
function configureMarked() {
  const renderer = new marked.Renderer()

  // Custom code block renderer with copy button support
  renderer.code = function ({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string {
    let highlighted = text
    const language = lang || ''

    if (language && hljs.getLanguage(language)) {
      try {
        highlighted = hljs.highlight(text, { language }).value
      } catch {
        // Fall back to auto-detection
        try {
          highlighted = hljs.highlightAuto(text).value
        } catch {
          // Use original
        }
      }
    } else if (text.length < 5000) {
      // Only auto-detect for reasonably sized blocks
      try {
        highlighted = hljs.highlightAuto(text).value
      } catch {
        // Use original
      }
    }

    return `<div class="code-block">
      <div class="code-header">
        <span class="code-lang">${language || 'code'}</span>
        <button class="code-copy" data-code="${encodeURIComponent(text)}" title="Copy code">
          <span class="copy-icon">content_copy</span>
        </button>
      </div>
      <pre><code class="hljs ${language ? `language-${language}` : ''}">${highlighted}</code></pre>
    </div>`
  }

  // Custom heading renderer with anchor IDs
  renderer.heading = function ({ tokens, depth }: { tokens: unknown[]; depth: number }): string {
    // Extract text from tokens (simplified - just join raw text)
    const text = tokens.map((t: unknown) => (t as { raw?: string }).raw || '').join('')
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    return `<h${depth} id="${id}" class="doc-heading">
      <a href="#${id}" class="heading-anchor">#</a>
      ${text}
    </h${depth}>`
  }

  // Custom link renderer to open external links in new tab
  renderer.link = function ({ href, title, tokens }: { href: string; title?: string | null; tokens: unknown[] }): string {
    const text = tokens.map((t: unknown) => (t as { raw?: string }).raw || '').join('')
    const isExternal = href.startsWith('http') || href.startsWith('//')
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}"${titleAttr}${attrs}>${text}</a>`
  }

  marked.setOptions({
    breaks: true,
    gfm: true,
    renderer,
  })
}

// Initialize marked configuration
configureMarked()

/**
 * Extract headings from markdown for table of contents
 */
function extractHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      headings.push({ id, text, level })
    }
  }

  return headings
}

/**
 * Extract title from markdown (first H1)
 */
function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

/**
 * Render markdown to sanitized HTML
 */
function renderMarkdown(content: string): string {
  try {
    const html = marked.parse(content) as string
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'a',
        'ul', 'ol', 'li', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'hr', 'div', 'span', 'button',
        'dl', 'dt', 'dd', 'sup', 'sub'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'id',
        'src', 'alt', 'title', 'width', 'height',
        'data-code', 'colspan', 'rowspan'
      ],
    })
  } catch {
    return '<p class="error">Failed to render content</p>'
  }
}

export function useDocs() {
  const { get } = useApi()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentDoc = ref<DocContent | null>(null)
  const tutorials = ref<BlogPost[]>([])

  /**
   * Fetch markdown document from /docs/ folder
   */
  async function fetchMarkdownDoc(filename: string): Promise<DocContent | null> {
    loading.value = true
    error.value = null

    try {
      const response = await get<{ filename: string; content: string; lastModified?: string }>(
        `/docs/${encodeURIComponent(filename)}`
      )

      if (!response) {
        throw new Error('Document not found')
      }

      const content = response.content
      const html = renderMarkdown(content)
      const headings = extractHeadings(content)
      const title = extractTitle(content)
      const slug = filename.replace('.md', '').toLowerCase().replace(/_/g, '-')

      const doc: DocContent = {
        title,
        slug,
        content,
        html,
        source: 'markdown',
        headings,
        lastModified: response.lastModified
      }

      currentDoc.value = doc
      return doc
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch document'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all tutorials from Directus (blog posts with tutorial category)
   */
  async function fetchTutorials(): Promise<BlogPost[]> {
    loading.value = true
    error.value = null

    try {
      const response = await get<BlogPost[]>('/blog?category=tutorial')
      tutorials.value = response || []
      return tutorials.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch tutorials'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single tutorial/blog post by slug
   */
  async function fetchTutorial(slug: string): Promise<DocContent | null> {
    loading.value = true
    error.value = null

    try {
      const response = await get<BlogPost>(`/blog/${slug}`)

      if (!response) {
        throw new Error('Tutorial not found')
      }

      const post = response
      const content = post.body || ''
      const html = renderMarkdown(content)
      const headings = extractHeadings(content)

      const doc: DocContent = {
        title: post.title,
        slug: post.slug,
        content,
        html,
        source: 'directus',
        headings
      }

      currentDoc.value = doc
      return doc
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch tutorial'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Search docs content (client-side)
   */
  function searchDocs(query: string, docs: DocContent[]): DocContent[] {
    if (!query.trim()) return docs

    const q = query.toLowerCase()
    return docs.filter(doc =>
      doc.title.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q)
    )
  }

  /**
   * RAG-powered semantic search
   */
  async function ragSearch(
    query: string,
    options: { limit?: number; type?: 'documentation' | 'blog' | 'all' } = {}
  ): Promise<{
    results: Array<{
      id: string
      score: number
      title: string
      section: string
      content: string
      filename: string
      type: string
    }>
    available: boolean
  }> {
    const { limit = 5, type = 'all' } = options

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        type
      })

      const response = await get<{
        results: Array<{
          id: string
          score: number
          title: string
          section: string
          content: string
          filename: string
          type: string
        }>
        query: string
        available: boolean
      }>(`/docs/rag/search?${params}`)

      return {
        results: response?.results || [],
        available: response?.available ?? false
      }
    } catch (err) {
      logError('RAG search failed:', err)
      return { results: [], available: false }
    }
  }

  /**
   * Get RAG system status
   */
  async function getRagStatus(): Promise<{
    available: boolean
    docsPath?: string
    indexedFiles?: number
    embeddingModel?: string
    vectorDimensions?: number
  }> {
    try {
      const response = await get<{
        available: boolean
        docsPath: string
        indexedFiles: number
        embeddingModel: string
        vectorDimensions: number
      }>('/docs/rag/status')

      return response || { available: false }
    } catch {
      return { available: false }
    }
  }

  /**
   * Handle copy code button clicks
   */
  function setupCodeCopyHandlers(container: HTMLElement) {
    const buttons = container.querySelectorAll('.code-copy')
    buttons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const btn = e.currentTarget as HTMLButtonElement
        const code = decodeURIComponent(btn.dataset.code || '')

        try {
          await navigator.clipboard.writeText(code)
          const icon = btn.querySelector('.copy-icon')
          if (icon) {
            icon.textContent = 'check'
            setTimeout(() => {
              icon.textContent = 'content_copy'
            }, 2000)
          }
        } catch {
          devError('Failed to copy code')
        }
      })
    })
  }

  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentDoc: computed(() => currentDoc.value),
    tutorials: computed(() => tutorials.value),

    // Methods
    fetchMarkdownDoc,
    fetchTutorials,
    fetchTutorial,
    searchDocs,
    renderMarkdown,
    extractHeadings,
    setupCodeCopyHandlers,

    // RAG Methods
    ragSearch,
    getRagStatus
  }
}
