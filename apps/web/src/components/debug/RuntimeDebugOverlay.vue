<template>
  <div
    v-if="enabled && !dismissed"
    class="runtime-debug-overlay"
    role="status"
    aria-live="polite"
  >
    <div class="row">
      <strong>Debug</strong>
      <span class="pill">{{ pillText }}</span>
      <div class="actions">
        <button class="btn" type="button" @click="copyDiagnostics">Copy</button>
        <button class="btn" type="button" @click="dismissed = true">Hide</button>
      </div>
    </div>
    <div class="grid">
      <div><span class="label">Theme</span>{{ themeStore.themeSlug }} ({{ themeStore.resolvedMode }})</div>
      <div><span class="label">API</span>{{ apiBaseUrl }}</div>
      <div><span class="label">URL</span>{{ href }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { API_BASE_URL } from '@/utils/apiUrl'
import { isDebugEnabled } from '@/utils/debug'

const themeStore = useThemeStore()

const dismissed = ref(false)
const enabled = computed(() => isDebugEnabled('theme') || isDebugEnabled('api'))
const apiBaseUrl = API_BASE_URL

const href = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.href
})

const pillText = computed(() => {
  const parts: string[] = []
  if (isDebugEnabled('theme')) parts.push('theme')
  if (isDebugEnabled('api')) parts.push('api')
  return parts.length ? parts.join('+') : 'off'
})

async function copyDiagnostics() {
  const payload = {
    href: href.value,
    apiBaseUrl,
    theme: themeStore.themeSlug,
    colorMode: themeStore.colorMode,
    resolvedMode: themeStore.resolvedMode,
    bodyClass: typeof document === 'undefined' ? '' : document.body.className,
    htmlClass: typeof document === 'undefined' ? '' : document.documentElement.className,
  }
  const text = JSON.stringify(payload, null, 2)

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}
</script>

<style scoped lang="scss">
.runtime-debug-overlay {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 9999;
  max-width: min(560px, calc(100vw - 24px));
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: #111;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
  }

  .pill {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.22);
    color: #1f2937;
  }

  .actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .btn {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: rgba(255, 255, 255, 0.9);
    cursor: pointer;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    font-size: 12px;
    line-height: 1.3;
    word-break: break-word;
  }

  .label {
    display: inline-block;
    min-width: 78px;
    font-weight: 700;
    opacity: 0.75;
    margin-right: 8px;
  }
}

:global(.body--dark) .runtime-debug-overlay {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.62);
  color: rgba(255, 255, 255, 0.92);
}

:global(.body--dark) .runtime-debug-overlay .btn {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.9);
}

:global(.body--dark) .runtime-debug-overlay .pill {
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(99, 102, 241, 0.35);
  color: rgba(255, 255, 255, 0.92);
}
</style>
