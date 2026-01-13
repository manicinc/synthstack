<template>
  <div
    :class="['chat-message', `chat-message--${message.role}`]"
    class="animate-fade-in"
  >
    <!-- Avatar -->
    <q-avatar
      :icon="message.role === 'user' ? 'person' : 'smart_toy'"
      :color="message.role === 'user' ? 'teal-7' : 'primary'"
      text-color="white"
      size="36px"
    />

    <!-- Content -->
    <div class="message-content">
      <!-- Markdown rendered HTML -->
      <div
        class="message-text"
        v-html="renderedContent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useQuasar } from 'quasar'
import hljs from 'highlight.js/lib/core'

// Import only the languages we need
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sql', sql)

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const props = defineProps<{
  message: ChatMessage
}>()

const $q = useQuasar()

// Handle copy button clicks via event delegation
function handleCopyClick(event: Event) {
  const target = event.target as HTMLElement
  const copyBtn = target.closest('.code-copy-btn') as HTMLButtonElement | null
  if (copyBtn) {
    const code = copyBtn.dataset.code
    if (code) {
      // Decode HTML entities
      const decoded = code.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      navigator.clipboard.writeText(decoded).then(() => {
        $q.notify({
          message: 'Code copied to clipboard',
          color: 'positive',
          position: 'bottom',
          timeout: 2000,
        })
        // Update button text temporarily
        const copyText = copyBtn.querySelector('.copy-text')
        if (copyText) {
          copyText.textContent = 'Copied!'
          setTimeout(() => {
            copyText.textContent = 'Copy'
          }, 2000)
        }
      }).catch(() => {
        $q.notify({
          message: 'Failed to copy code',
          color: 'negative',
          position: 'bottom',
          timeout: 2000,
        })
      })
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleCopyClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleCopyClick)
})

// Configure marked with highlight.js using renderer
const renderer = new marked.Renderer()
renderer.code = function ({ text, lang }: { text: string; lang?: string; escaped?: boolean }): string {
  let highlighted = text
  const language = lang || ''
  const displayLang = language || 'text'
  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(text, { language }).value
    } catch {
      // Fall back to original
    }
  } else if (text) {
    try {
      highlighted = hljs.highlightAuto(text).value
    } catch {
      // Fall back to original
    }
  }
  const langClass = language ? ` class="language-${language}"` : ''
  // Escape code for data attribute
  const escapedCode = text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span class="code-language-badge">${displayLang}</span>
      <button class="code-copy-btn" data-code="${escapedCode}" aria-label="Copy code to clipboard" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span class="copy-text">Copy</span>
      </button>
    </div>
    <pre><code${langClass}>${highlighted}</code></pre>
  </div>`
}

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
})

/**
 * Render markdown content to sanitized HTML
 */
const renderedContent = computed(() => {
  if (!props.message.content) return ''

  try {
    const html = marked.parse(props.message.content) as string
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'a', 'ul', 'ol', 'li',
        'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'span', 'div', 'button', 'svg', 'rect', 'path',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-code', 'aria-label', 'type', 'xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'x', 'y', 'rx', 'ry', 'd'],
    })
  } catch (error) {
    console.error('Failed to render markdown:', error)
    return props.message.content
  }
})
</script>

<style lang="scss" scoped>
.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-out;

  &--user {
    flex-direction: row-reverse;

    .message-content {
      background: rgba(13, 148, 136, 0.9); // Teal
      color: white;
      border-radius: 16px 16px 0 16px;
    }

    // Force white text for all user message content
    .message-text {
      color: white;

      :deep(p), :deep(li), :deep(span), :deep(div) {
        color: white;
      }

      :deep(code) {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      :deep(.code-block-wrapper) {
        background: rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
      }

      :deep(.code-block-header) {
        background: rgba(0, 0, 0, 0.15);
        border-color: rgba(255, 255, 255, 0.1);
      }

      :deep(.code-language-badge), :deep(.code-copy-btn) {
        color: rgba(255, 255, 255, 0.9);
      }

      :deep(a) {
        color: #a7f3d0;
      }
    }
  }

  &--assistant {
    .message-content {
      background: var(--surface-2);
      border: 1px solid var(--border-default);
      border-radius: 16px 16px 16px 0;
      color: var(--text-primary);
    }
  }
}

.message-content {
  padding: 12px 16px;
  max-width: 80%;
  min-width: 100px;
  position: relative;
}

.message-text {
  word-wrap: break-word;
  overflow-wrap: break-word;

  :deep(p) {
    margin: 8px 0;
    line-height: 1.6;
    &:first-child { margin-top: 0; }
    &:last-child { margin-bottom: 0; }
  }

  :deep(code) {
    background: var(--surface-active);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
  }

  :deep(.code-block-wrapper) {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-default);
    background: var(--surface-3);
  }

  :deep(.code-block-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: var(--surface-active);
    border-bottom: 1px solid var(--border-default);
  }

  :deep(.code-language-badge) {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  :deep(.code-copy-btn) {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
  }

  :deep(pre) {
    background: var(--surface-3);
    margin: 0;
    padding: 12px;
    overflow-x: auto;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

// Light mode support
body.body--light {
  .chat-message--user .message-content {
    background: rgba(13, 148, 136, 0.12);
    color: #18181b;
    border: 1px solid rgba(13, 148, 136, 0.2);
  }
  .chat-message--user .message-text {
     color: #18181b;
     :deep(p) { color: #18181b; }
     :deep(code) { background: rgba(13, 148, 136, 0.15); color: #115e59; }
     :deep(a) { color: #0d9488; }
  }
  .chat-message--assistant .message-content {
    background: #ffffff;
    border-color: #e4e4e7;
    color: #18181b;
  }
}
</style>
