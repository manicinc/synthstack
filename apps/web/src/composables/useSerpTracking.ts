/**
 * SERP Tracking Composable
 *
 * Provides reactive access to SerpAPI tracking data including:
 * - Keyword rankings
 * - Ranking history
 * - Competitor monitoring
 * - API quota status
 */

import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';

// ============================================
// Types
// ============================================

export interface QuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  yearMonth: string;
  canSearch: boolean;
}

export interface RankingResult {
  keywordId: string;
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  features: SerpFeature[];
  competitors: Array<{
    domain: string;
    position: number;
    url: string;
  }>;
  checkedAt: string;
}

export interface SerpFeature {
  type: string;
  position?: number;
  data: Record<string, unknown>;
}

export interface Competitor {
  id: string;
  domain: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RankingHistoryEntry {
  position: number | null;
  url: string | null;
  checkedAt: string;
  features: string[];
}

export interface DashboardData {
  quota: QuotaStatus;
  stats: {
    totalKeywords: number;
    trackedKeywords: number;
    avgPosition: number;
    topTenCount: number;
    topThreeCount: number;
    improvingCount: number;
    decliningCount: number;
  };
  dueForCheck: string[];
  recentChanges: Array<{
    keywordId: string;
    keyword: string;
    currentPosition: number;
    previousPosition: number;
    change: number;
  }>;
  competitorCount: number;
  keywords: Array<{
    id: string;
    keyword: string;
    current_position: number | null;
    best_position: number | null;
    last_serp_check_at: string | null;
    check_frequency: string;
    priority: string;
  }>;
}

// ============================================
// API Base
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3003';

// ============================================
// Composable
// ============================================

export function useSerpTracking() {
  const authStore = useAuthStore();

  // State
  const loading = ref(false);
  const error = ref<string | null>(null);
  const quota = ref<QuotaStatus | null>(null);
  const dashboard = ref<DashboardData | null>(null);
  const competitors = ref<Competitor[]>([]);
  const rankingHistory = ref<Record<string, RankingHistoryEntry[]>>({});

  // Computed
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const canCheck = computed(() => quota.value?.canSearch ?? false);
  const quotaUsagePercent = computed(() => {
    if (!quota.value) return 0;
    return Math.round((quota.value.used / quota.value.limit) * 100);
  });

  // ============================================
  // API Helpers
  // ============================================

  async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // Quota
  // ============================================

  async function fetchQuota(): Promise<QuotaStatus> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth('/api/v1/serp/quota');
      quota.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Dashboard
  // ============================================

  async function fetchDashboard(): Promise<DashboardData> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth('/api/v1/serp/dashboard');
      dashboard.value = data;
      quota.value = data.quota;
      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Ranking Check
  // ============================================

  async function checkKeywordRanking(
    keywordId: string,
    targetDomain?: string,
    competitorDomains?: string[]
  ): Promise<RankingResult> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth(`/api/v1/serp/check/${keywordId}`, {
        method: 'POST',
        body: JSON.stringify({ targetDomain, competitorDomains }),
      });

      // Refresh quota after check
      await fetchQuota();

      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function checkMultipleKeywords(
    keywordIds: string[],
    targetDomain?: string
  ): Promise<{ results: RankingResult[]; errors: Array<{ keywordId: string; error: string }> }> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth('/api/v1/serp/check-batch', {
        method: 'POST',
        body: JSON.stringify({ keywordIds, targetDomain }),
      });

      // Refresh quota after check
      await fetchQuota();

      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Ranking History
  // ============================================

  async function fetchRankingHistory(keywordId: string, limit = 30): Promise<RankingHistoryEntry[]> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth(`/api/v1/serp/history/${keywordId}?limit=${limit}`);
      rankingHistory.value[keywordId] = data.history;
      return data.history;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Competitors
  // ============================================

  async function fetchCompetitors(): Promise<Competitor[]> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth('/api/v1/serp/competitors');
      competitors.value = data.competitors;
      return data.competitors;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addCompetitor(domain: string, name?: string, description?: string): Promise<Competitor> {
    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithAuth('/api/v1/serp/competitors', {
        method: 'POST',
        body: JSON.stringify({ domain, name, description }),
      });

      // Refresh competitors list
      await fetchCompetitors();

      return data;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function removeCompetitor(id: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await fetchWithAuth(`/api/v1/serp/competitors/${id}`, {
        method: 'DELETE',
      });

      // Refresh competitors list
      await fetchCompetitors();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // Position Change Helpers
  // ============================================

  function getPositionChange(current: number | null, previous: number | null): {
    value: number;
    direction: 'up' | 'down' | 'same' | 'new' | 'lost';
    label: string;
  } {
    if (current === null && previous !== null) {
      return { value: 0, direction: 'lost', label: 'Lost' };
    }
    if (current !== null && previous === null) {
      return { value: current, direction: 'new', label: `New #${current}` };
    }
    if (current === null || previous === null) {
      return { value: 0, direction: 'same', label: '-' };
    }

    const change = previous - current; // Positive = improvement (lower position is better)
    if (change > 0) {
      return { value: change, direction: 'up', label: `+${change}` };
    }
    if (change < 0) {
      return { value: Math.abs(change), direction: 'down', label: `${change}` };
    }
    return { value: 0, direction: 'same', label: '=' };
  }

  function getPositionColor(position: number | null): string {
    if (position === null) return 'grey';
    if (position <= 3) return 'green';
    if (position <= 10) return 'teal';
    if (position <= 20) return 'blue';
    if (position <= 50) return 'orange';
    return 'red';
  }

  function getPositionLabel(position: number | null): string {
    if (position === null) return 'Not ranked';
    if (position <= 3) return 'Top 3';
    if (position <= 10) return 'Page 1';
    if (position <= 20) return 'Page 2';
    if (position <= 50) return 'Page 3-5';
    return 'Page 5+';
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    loading,
    error,
    quota,
    dashboard,
    competitors,
    rankingHistory,

    // Computed
    isAuthenticated,
    canCheck,
    quotaUsagePercent,

    // Actions
    fetchQuota,
    fetchDashboard,
    checkKeywordRanking,
    checkMultipleKeywords,
    fetchRankingHistory,
    fetchCompetitors,
    addCompetitor,
    removeCompetitor,

    // Helpers
    getPositionChange,
    getPositionColor,
    getPositionLabel,
  };
}
