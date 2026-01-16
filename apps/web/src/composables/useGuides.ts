/**
 * @file useGuides.ts
 * @description Composable for fetching and managing tutorial guides from Directus
 */

import { ref } from 'vue'
import { api } from '@/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

export interface Guide {
  id: number
  status: string
  title: string
  slug: string
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  summary?: string
  content: string
  author?: string
  published_date?: string
  created_at: string
  updated_at: string
}

export function useGuides() {
  const guides = ref<Guide[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch a single guide by slug
   */
  async function fetchGuide(slug: string): Promise<Guide | null> {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/directus/items/guides`, {
        params: {
          filter: { slug: { _eq: slug } },
          limit: 1
        }
      })

      const guide = response.data.data?.[0] || null
      return guide
    } catch (err) {
      error.value = err as Error
      logError('Error fetching guide:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all published guides
   */
  async function fetchGuides(category?: string): Promise<Guide[]> {
    loading.value = true
    error.value = null

    try {
      const filter: any = { status: { _eq: 'published' } }
      if (category) {
        filter.category = { _eq: category }
      }

      const response = await api.get(`/directus/items/guides`, {
        params: {
          filter,
          sort: '-published_date'
        }
      })

      guides.value = response.data.data || []
      return guides.value
    } catch (err) {
      error.value = err as Error
      logError('Error fetching guides:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    guides,
    loading,
    error,
    fetchGuide,
    fetchGuides
  }
}
