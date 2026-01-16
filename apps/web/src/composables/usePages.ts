/**
 * @file usePages.ts
 * @description Composable for fetching and managing marketing/landing pages from Directus
 */

import { ref } from 'vue'
import { api, type ApiError } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { debugWarn } from '@/utils/debug'

export interface Page {
  id: number
  status: string
  title: string
  slug: string
  description?: string
  content: string
  meta_title?: string
  meta_description?: string
  created_at: string
  updated_at: string
}

export function usePages() {
  const pages = ref<Page[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch a single page by slug
   */
  async function fetchPage(slug: string): Promise<Page | null> {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/directus/items/pages`, {
        params: {
          filter: { slug: { _eq: slug } },
          limit: 1
        }
      })

      const page = response.data.data?.[0] || null
      return page
    } catch (err) {
      error.value = err as Error
      const apiError = err as Partial<ApiError>
      debugWarn('api', 'fetchPage failed', {
        slug,
        status: apiError.status,
        code: apiError.code,
        message: apiError.message || (err instanceof Error ? err.message : String(err)),
      })
      logError('Error fetching page:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all published pages
   */
  async function fetchPages(): Promise<Page[]> {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/directus/items/pages`, {
        params: {
          filter: { status: { _eq: 'published' } },
          sort: '-created_at'
        }
      })

      pages.value = response.data.data || []
      return pages.value
    } catch (err) {
      error.value = err as Error
      const apiError = err as Partial<ApiError>
      debugWarn('api', 'fetchPages failed', {
        status: apiError.status,
        code: apiError.code,
        message: apiError.message || (err instanceof Error ? err.message : String(err)),
      })
      logError('Error fetching pages:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    pages,
    loading,
    error,
    fetchPage,
    fetchPages
  }
}
