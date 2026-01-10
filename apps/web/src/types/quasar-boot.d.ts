/**
 * @file quasar-boot.d.ts
 * @description Type declarations for Quasar boot files to fix TS2742 errors
 *
 * This file provides explicit type exports that TypeScript needs to properly
 * type boot file default exports without referencing @quasar/app-vite internals.
 */

declare module 'quasar/wrappers' {
  import type { App } from 'vue'
  import type { Router } from 'vue-router'
  import type { Pinia } from 'pinia'

  export interface BootFileParams<TState = unknown> {
    app: App
    router: Router
    store: Pinia
    ssrContext?: unknown
    urlPath?: string
    publicPath?: string
    redirect?: (url: string) => void
  }

  export type BootCallback = (params: BootFileParams) => void | Promise<void>

  export function boot<TState = unknown>(
    callback: (params: BootFileParams<TState>) => void | Promise<void>
  ): BootCallback
}
