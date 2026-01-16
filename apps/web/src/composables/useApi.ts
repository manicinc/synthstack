/**
 * useApi Composable
 * 
 * Centralized API client wrapper with authentication, error handling, and caching.
 * Provides a consistent interface for all API calls throughout the application.
 * 
 * @module composables/useApi
 * @example
 * ```ts
 * const { get, post, loading, error } = useApi()
 * const workflows = await get('/workflows')
 * ```
 */

import { ref, computed } from 'vue'
import axios, { AxiosError } from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

/** API response wrapper type */
export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

/** API error type */
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

/**
 * Base API URL - always targets the `/api/v1` REST API (not the Swagger UI at `/docs`).
 *
 * Examples:
 * - VITE_API_URL="http://localhost:3003"      -> "http://localhost:3003/api/v1"
 * - VITE_API_URL="http://localhost:3003/api"  -> "http://localhost:3003/api/v1" (still normalized)
 * - VITE_API_URL="/api/v1"                    -> "/api/v1"
 */
const API_BASE_URL = (() => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) || ''
  const trimmed = raw.replace(/\/+$/, '')

  if (!trimmed) return '/api/v1'
  if (trimmed.endsWith('/api/v1')) return trimmed

  // If someone provided "/api" or "http://host/api", normalize to "/api/v1"
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`

  return `${trimmed}/api/v1`
})()

/**
 * Creates an axios instance configured for the SynthStack API
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // Request interceptor for auth
  client.interceptors.request.use((config) => {
    const authStore = useAuthStore()
    const token = authStore.session?.accessToken
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  })

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
      }
      
      return Promise.reject(error)
    }
  )

  return client
}

/**
 * Main API composable
 * 
 * @returns API methods and state
 */
export function useApi() {
  const client = createApiClient()
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Clears the current error state
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Generic request handler with loading and error state management
   */
  const request = async <T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T | null> => {
    loading.value = true
    error.value = null

    try {
      const response = await client[method]<unknown>(url, method === 'get' ? config : data, config)

      // Support both API response styles:
      // - Wrapped: { data: T, ... }
      // - Direct: T
      const payload = (response as any)?.data
      if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data
      }
      return payload as T
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      error.value = axiosError.response?.data || {
        message: axiosError.message || 'An unexpected error occurred'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * GET request
   */
  const get = <T>(url: string, config?: AxiosRequestConfig) => 
    request<T>('get', url, undefined, config)

  /**
   * POST request
   */
  const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    request<T>('post', url, data, config)

  /**
   * PUT request
   */
  const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    request<T>('put', url, data, config)

  /**
   * PATCH request
   */
  const patch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => 
    request<T>('patch', url, data, config)

  /**
   * DELETE request
   */
  const del = <T>(url: string, config?: AxiosRequestConfig) => 
    request<T>('delete', url, undefined, config)

  /**
   * Upload file with progress tracking
   */
  const upload = async <T>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T | null> => {
    loading.value = true
    error.value = null

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await client.post<ApiResponse<T>>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total && onProgress) {
            onProgress(Math.round((event.loaded * 100) / event.total))
          }
        }
      })
      return response.data.data
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>
      error.value = axiosError.response?.data || { message: 'Upload failed' }
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    clearError,
    get,
    post,
    put,
    patch,
    del,
    upload
  }
}

export default useApi
