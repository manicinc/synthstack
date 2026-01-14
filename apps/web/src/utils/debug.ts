/**
 * Lightweight runtime debug helpers.
 *
 * Enabled via:
 * - Query params: `?debug=1`, `?debugTheme=1`, `?debugApi=1`
 * - LocalStorage: `synthstack_debug_theme=1`, `synthstack_debug_api=1`
 *
 * These are intentionally available in production (but off by default).
 */

export type DebugNamespace = 'theme' | 'api'

const STORAGE_PREFIX = 'synthstack_debug_'

function readFlagFromQuery(namespace: DebugNamespace): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)

  if (params.get('debug') === '1') return true

  const key = namespace === 'theme' ? 'debugTheme' : 'debugApi'
  if (params.get(key) === '1' || params.has(key)) return true

  return false
}

function readFlagFromStorage(namespace: DebugNamespace): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${namespace}`) === '1'
  } catch {
    return false
  }
}

export function isDebugEnabled(namespace: DebugNamespace): boolean {
  return readFlagFromQuery(namespace) || readFlagFromStorage(namespace)
}

function prefix(namespace: DebugNamespace): string {
  return `[debug:${namespace}]`
}

export function debugLog(namespace: DebugNamespace, ...args: unknown[]): void {
  if (!isDebugEnabled(namespace)) return
  console.log(prefix(namespace), ...args)
}

export function debugWarn(namespace: DebugNamespace, ...args: unknown[]): void {
  if (!isDebugEnabled(namespace)) return
  console.warn(prefix(namespace), ...args)
}

export function debugGroupCollapsed(namespace: DebugNamespace, label: string, ...args: unknown[]): void {
  if (!isDebugEnabled(namespace)) return
  console.groupCollapsed(prefix(namespace), label, ...args)
}

export function debugGroupEnd(namespace: DebugNamespace): void {
  if (!isDebugEnabled(namespace)) return
  console.groupEnd()
}

