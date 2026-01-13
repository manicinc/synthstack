/**
 * @file apiUrl.ts
 * @description Smart API URL configuration utility.
 *
 * Determines the correct API URL based on:
 * 1. VITE_API_URL environment variable (if set and not localhost)
 * 2. Current hostname (derives api.{domain} for production)
 * 3. Fallback to localhost for development
 *
 * This ensures the app works correctly whether:
 * - Running locally (uses localhost:3003)
 * - Deployed to synthstack.app (uses api.synthstack.app)
 * - Deployed to any other domain (derives api.{domain})
 */

/**
 * Get the base API URL, smartly derived from environment or hostname.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL

  // If env URL is set and not localhost, use it
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }

  // Check if we're on production domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    // Production domain patterns - synthstack.app
    if (hostname.endsWith('synthstack.app')) {
      return 'https://api.synthstack.app'
    }

    // Any non-localhost domain, derive API URL
    if (!hostname.includes('localhost') && hostname !== '127.0.0.1') {
      // Use api. subdomain with same base domain
      const protocol = window.location.protocol
      const baseDomain = hostname.split('.').slice(-2).join('.')
      return `${protocol}//api.${baseDomain}`
    }
  }

  // Development fallback
  return envUrl || 'http://localhost:3003'
}

/**
 * Cached API base URL (computed once).
 */
export const API_BASE_URL = getApiBaseUrl()

/**
 * Check if we're running in production (non-localhost).
 */
export function isProduction(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return !hostname.includes('localhost') && hostname !== '127.0.0.1'
}

/**
 * Get the app's base URL (for absolute links, og:url, etc.).
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }
  // Default for SSR
  return 'https://synthstack.app'
}

