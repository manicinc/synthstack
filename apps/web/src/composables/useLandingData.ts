/**
 * Landing Page Data Composable
 *
 * Fetches live data from Directus CMS for the landing page.
 * Data includes blog posts, FAQ items, subscription plans, and analytics.
 */
import { ref, onMounted } from 'vue'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3003'
const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8099'

export interface BlogPost {
  id: string
  title: string
  slug: string
  summary?: string
  status: string
  featured: boolean
  created_at: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category?: string
  sort?: number
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description?: string
  price_monthly?: number
  price_yearly?: number
  features?: string[]
  is_popular?: boolean
  status: string
}

export interface AnalyticsStat {
  label: string
  value: string | number
  change?: number
}

export function useLandingData() {
  // State
  const blogPosts = ref<BlogPost[]>([])
  const faqItems = ref<FaqItem[]>([])
  const subscriptionPlans = ref<SubscriptionPlan[]>([])
  const stats = ref<AnalyticsStat[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch featured blog posts
   */
  async function fetchBlogPosts() {
    try {
      const response = await fetch(
        `${DIRECTUS_URL}/items/blog_posts?filter[status][_eq]=published&limit=6&sort=-created_at&fields=id,title,slug,summary,status,featured,created_at`
      )
      if (!response.ok) throw new Error('Failed to fetch blog posts')
      const data = await response.json()
      blogPosts.value = data.data || []
    } catch (e) {
      devWarn('Could not fetch blog posts:', e)
    }
  }

  /**
   * Fetch FAQ items
   */
  async function fetchFaqItems() {
    try {
      const response = await fetch(
        `${DIRECTUS_URL}/items/faq_items?limit=10&sort=sort&fields=id,question,answer,category,sort`
      )
      if (!response.ok) throw new Error('Failed to fetch FAQ items')
      const data = await response.json()
      faqItems.value = data.data || []
    } catch (e) {
      devWarn('Could not fetch FAQ items:', e)
    }
  }

  /**
   * Fetch subscription plans
   */
  async function fetchSubscriptionPlans() {
    try {
      const response = await fetch(
        `${DIRECTUS_URL}/items/subscription_plans?filter[status][_eq]=active&sort=sort&fields=id,name,slug,description,price_monthly,price_yearly,features,is_popular,status`
      )
      if (!response.ok) throw new Error('Failed to fetch subscription plans')
      const data = await response.json()
      subscriptionPlans.value = data.data || []
    } catch (e) {
      devWarn('Could not fetch subscription plans:', e)
    }
  }

  /**
   * Fetch analytics stats for display
   */
  async function fetchStats() {
    try {
      const response = await fetch(
        `${DIRECTUS_URL}/items/analytics_reports?filter[status][_eq]=active&limit=4&fields=id,name,cached_data`
      )
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()

      // Transform analytics reports into display stats
      const reports = data.data || []
      stats.value = reports.slice(0, 4).map((report: any) => {
        const cached = report.cached_data || {}
        return {
          label: report.name,
          value: cached.current_week || cached.mrr || cached.avg_latency_ms || '—',
          change: cached.growth_percent,
        }
      })
    } catch (e) {
      devWarn('Could not fetch stats:', e)
    }
  }

  /**
   * Fetch all landing page data
   */
  async function fetchAll() {
    isLoading.value = true
    error.value = null

    try {
      await Promise.all([
        fetchBlogPosts(),
        fetchFaqItems(),
        fetchSubscriptionPlans(),
        fetchStats(),
      ])
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load data'
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    blogPosts,
    faqItems,
    subscriptionPlans,
    stats,
    isLoading,
    error,

    // Actions
    fetchAll,
    fetchBlogPosts,
    fetchFaqItems,
    fetchSubscriptionPlans,
    fetchStats,
  }
}

export default useLandingData
