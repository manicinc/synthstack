/**
 * @file gamification.ts
 * @description Pinia store for gamification system - points, levels, achievements, sprints, and celebrations.
 *
 * This store provides:
 * - User gamification stats (points, level, streak)
 * - Achievement tracking and unlock notifications
 * - Sprint management per project
 * - Celebration queue for animations (level ups, achievements)
 * - Leaderboard data
 *
 * @module stores/gamification
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import {
  gamification as gamificationApi,
  type GamificationStats,
  type GamificationResult,
  type Achievement,
  type Sprint,
  type Retrospective,
  type LeaderboardEntry,
  type PointEvent,
  type VelocityPoint,
  type SprintStatus,
} from '@/services/api';

// =========================================
// Types for Celebration Queue
// =========================================

export type CelebrationType = 'points' | 'level_up' | 'achievement' | 'streak' | 'sprint_complete';

export interface Celebration {
  id: string;
  type: CelebrationType;
  data: {
    points?: number;
    breakdown?: {
      base: number;
      earlyBonus: number;
      streakBonus: number;
    };
    newLevel?: number;
    achievement?: Achievement;
    streak?: number;
    sprintName?: string;
  };
  timestamp: number;
}

// =========================================
// Store Definition
// =========================================

/**
 * Gamification store for managing points, achievements, and celebrations
 */
export const useGamificationStore = defineStore('gamification', () => {
  const authStore = useAuthStore();

  // =========================================
  // State
  // =========================================

  /** Current user's gamification stats */
  const stats = ref<GamificationStats | null>(null);

  /** All achievements (with unlock status) */
  const achievements = ref<Achievement[]>([]);

  /** Sprints for current project */
  const sprints = ref<Sprint[]>([]);

  /** Current/active sprint */
  const currentSprint = ref<Sprint | null>(null);

  /** Current project leaderboard */
  const leaderboard = ref<LeaderboardEntry[]>([]);

  /** Point history for current user */
  const pointHistory = ref<PointEvent[]>([]);

  /** Velocity data for current project */
  const velocityData = ref<VelocityPoint[]>([]);

  /** Retrospective for current sprint */
  const currentRetrospective = ref<Retrospective | null>(null);

  /** Queue of celebrations to display */
  const celebrationQueue = ref<Celebration[]>([]);

  /** Loading states */
  const loading = ref({
    stats: false,
    achievements: false,
    sprints: false,
    leaderboard: false,
    pointHistory: false,
    velocity: false,
    retrospective: false,
  });

  /** Error state */
  const error = ref<string | null>(null);

  /** Current project ID for context */
  const currentProjectId = ref<string | null>(null);

  // =========================================
  // Computed / Getters
  // =========================================

  /** User's current level */
  const level = computed(() => stats.value?.level ?? 1);

  /** User's total points */
  const totalPoints = computed(() => stats.value?.totalPoints ?? 0);

  /** XP progress in current level (0-100) */
  const levelProgress = computed(() => {
    if (!stats.value) return 0;
    const { xpCurrent, xpToNextLevel } = stats.value;
    if (!xpToNextLevel || xpToNextLevel <= 0) return 100;
    return Math.min(100, Math.round((xpCurrent / xpToNextLevel) * 100));
  });

  /** Current streak days */
  const currentStreak = computed(() => stats.value?.currentStreak ?? 0);

  /** Best streak days */
  const bestStreak = computed(() => stats.value?.longestStreak ?? 0);

  /** Unlocked achievements */
  const unlockedAchievements = computed(() =>
    achievements.value.filter(a => a.isUnlocked)
  );

  /** Locked achievements */
  const lockedAchievements = computed(() =>
    achievements.value.filter(a => !a.isUnlocked)
  );

  /** Achievements close to unlocking (>50% progress) */
  const nearAchievements = computed(() =>
    achievements.value.filter(a => !a.isUnlocked && (a.progress ?? 0) >= 50)
  );

  /** Active sprints */
  const activeSprints = computed(() =>
    sprints.value.filter(s => s.status === 'active')
  );

  /** Completed sprints */
  const completedSprints = computed(() =>
    sprints.value.filter(s => s.status === 'completed')
  );

  /** Whether there are pending celebrations */
  const hasCelebrations = computed(() => celebrationQueue.value.length > 0);

  /** Whether any data is currently loading */
  const isLoading = computed(() =>
    loading.value.stats ||
    loading.value.achievements ||
    loading.value.sprints ||
    loading.value.leaderboard
  );

  /** Next celebration to display */
  const nextCelebration = computed(() => celebrationQueue.value[0] ?? null);

  /** Sprint progress percentage */
  const sprintProgress = computed(() => {
    if (!currentSprint.value) return 0;
    const { pointsCompleted, pointGoal } = currentSprint.value;
    if (!pointGoal || pointGoal <= 0) return 0;
    return Math.min(100, Math.round(((pointsCompleted ?? 0) / pointGoal) * 100));
  });

  /** Days remaining in current sprint */
  const sprintDaysRemaining = computed(() => {
    if (!currentSprint.value?.endDate) return null;
    const end = new Date(currentSprint.value.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  // =========================================
  // Actions - Stats
  // =========================================

  /**
   * Fetch gamification stats for a project
   * @param projectId - Project UUID
   */
  async function fetchStats(projectId: string): Promise<void> {
    if (!authStore.isAuthenticated) return;

    loading.value.stats = true;
    error.value = null;
    currentProjectId.value = projectId;

    try {
      stats.value = await gamificationApi.stats(projectId);
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch gamification stats';
      throw e;
    } finally {
      loading.value.stats = false;
    }
  }

  /**
   * Refresh stats for current project
   */
  async function refreshStats(): Promise<void> {
    if (currentProjectId.value) {
      await fetchStats(currentProjectId.value);
    }
  }

  // =========================================
  // Actions - Achievements
  // =========================================

  /**
   * Fetch all achievements with unlock status
   * @param projectId - Optional project ID for project-specific achievements
   */
  async function fetchAchievements(projectId?: string): Promise<void> {
    if (!authStore.isAuthenticated) return;

    loading.value.achievements = true;
    error.value = null;

    try {
      achievements.value = await gamificationApi.achievements({ projectId });
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch achievements';
      throw e;
    } finally {
      loading.value.achievements = false;
    }
  }

  // =========================================
  // Actions - Leaderboard
  // =========================================

  /**
   * Fetch project leaderboard
   * @param projectId - Project UUID
   * @param options - Optional filters (period, limit)
   */
  async function fetchLeaderboard(
    projectId: string,
    options?: { period?: 'week' | 'month' | 'sprint' | 'all'; limit?: number }
  ): Promise<void> {
    loading.value.leaderboard = true;
    error.value = null;

    try {
      leaderboard.value = await gamificationApi.leaderboard(projectId, options);
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch leaderboard';
      throw e;
    } finally {
      loading.value.leaderboard = false;
    }
  }

  // =========================================
  // Actions - Point History
  // =========================================

  /**
   * Fetch user's point history
   * @param options - Optional filters (projectId, limit, offset)
   */
  async function fetchPointHistory(options?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<void> {
    if (!authStore.isAuthenticated) return;

    loading.value.pointHistory = true;
    error.value = null;

    try {
      pointHistory.value = await gamificationApi.pointHistory(options);
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch point history';
      throw e;
    } finally {
      loading.value.pointHistory = false;
    }
  }

  // =========================================
  // Actions - Sprints
  // =========================================

  /**
   * Fetch sprints for a project
   * @param projectId - Project UUID
   * @param status - Optional status filter
   */
  async function fetchSprints(projectId: string, status?: SprintStatus): Promise<void> {
    loading.value.sprints = true;
    error.value = null;

    try {
      sprints.value = await gamificationApi.sprints.list(projectId, { status });

      // Set current sprint (active one, or most recent)
      const active = sprints.value.find(s => s.status === 'active');
      currentSprint.value = active || sprints.value[0] || null;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch sprints';
      throw e;
    } finally {
      loading.value.sprints = false;
    }
  }

  /**
   * Create a new sprint
   * @param projectId - Project UUID
   * @param data - Sprint creation data
   */
  async function createSprint(
    projectId: string,
    data: {
      name: string;
      goal?: string;
      pointGoal?: number;
      durationType: Sprint['durationType'];
      startDate: string;
      endDate: string;
    }
  ): Promise<Sprint> {
    error.value = null;

    try {
      const sprint = await gamificationApi.sprints.create(projectId, {
        name: data.name,
        goal: data.goal,
        point_goal: data.pointGoal,
        duration_type: data.durationType,
        start_date: data.startDate,
        end_date: data.endDate,
      });
      sprints.value.unshift(sprint);
      return sprint;
    } catch (e: any) {
      error.value = e.message || 'Failed to create sprint';
      throw e;
    }
  }

  /**
   * Update a sprint
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   * @param data - Update data
   */
  async function updateSprint(
    projectId: string,
    sprintId: string,
    data: Partial<Sprint>
  ): Promise<Sprint> {
    error.value = null;

    try {
      const updated = await gamificationApi.sprints.update(projectId, sprintId, data);

      const index = sprints.value.findIndex(s => s.id === sprintId);
      if (index !== -1) {
        sprints.value[index] = updated;
      }

      if (currentSprint.value?.id === sprintId) {
        currentSprint.value = updated;
      }

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to update sprint';
      throw e;
    }
  }

  /**
   * Start a sprint
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   */
  async function startSprint(projectId: string, sprintId: string): Promise<Sprint> {
    error.value = null;

    try {
      const updated = await gamificationApi.sprints.start(projectId, sprintId);

      const index = sprints.value.findIndex(s => s.id === sprintId);
      if (index !== -1) {
        sprints.value[index] = updated;
      }

      currentSprint.value = updated;
      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to start sprint';
      throw e;
    }
  }

  /**
   * Complete a sprint
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   */
  async function completeSprint(projectId: string, sprintId: string): Promise<Sprint> {
    error.value = null;

    try {
      const response = await gamificationApi.sprints.complete(projectId, sprintId);
      const updated = response.sprint;

      const index = sprints.value.findIndex(s => s.id === sprintId);
      if (index !== -1) {
        sprints.value[index] = updated;
      }

      if (currentSprint.value?.id === sprintId) {
        currentSprint.value = updated;
      }

      // Queue celebration
      queueCelebration({
        type: 'sprint_complete',
        data: { sprintName: updated.name },
      });

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to complete sprint';
      throw e;
    }
  }

  // =========================================
  // Actions - Velocity
  // =========================================

  /**
   * Fetch velocity data for a project
   * @param projectId - Project UUID
   * @param options - Optional filters (limit, sprintId)
   */
  async function fetchVelocity(
    projectId: string,
    options?: { limit?: number; sprintId?: string }
  ): Promise<void> {
    loading.value.velocity = true;
    error.value = null;

    try {
      velocityData.value = await gamificationApi.velocity(projectId, options);
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch velocity data';
      throw e;
    } finally {
      loading.value.velocity = false;
    }
  }

  // =========================================
  // Actions - Retrospectives
  // =========================================

  /**
   * Fetch retrospective for a sprint
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   */
  async function fetchRetrospective(projectId: string, sprintId: string): Promise<void> {
    loading.value.retrospective = true;
    error.value = null;

    try {
      const retros = await gamificationApi.retrospectives.get(projectId, sprintId);
      currentRetrospective.value = retros.length > 0 ? retros[0] : null;
    } catch (e: any) {
      // 404 is expected if no retro exists yet
      if (e.response?.status === 404) {
        currentRetrospective.value = null;
      } else {
        error.value = e.message || 'Failed to fetch retrospective';
        throw e;
      }
    } finally {
      loading.value.retrospective = false;
    }
  }

  /**
   * Add or update retrospective for a sprint
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   * @param data - Retrospective data
   */
  async function saveRetrospective(
    projectId: string,
    sprintId: string,
    data: {
      wentWell?: string[];
      needsImprovement?: string[];
      actionItems?: string[];
      teamMorale?: number;
      productivityRating?: number;
    }
  ): Promise<Retrospective> {
    error.value = null;

    try {
      const retro = await gamificationApi.retrospectives.add(projectId, sprintId, {
        went_well: data.wentWell,
        needs_improvement: data.needsImprovement,
        action_items: data.actionItems,
        sentiment_rating: data.teamMorale,
        notes: data.productivityRating?.toString(),
      });
      currentRetrospective.value = retro;
      return retro;
    } catch (e: any) {
      error.value = e.message || 'Failed to save retrospective';
      throw e;
    }
  }

  /**
   * Complete a retrospective
   * @param projectId - Project UUID
   * @param sprintId - Sprint UUID
   */
  async function completeRetrospective(projectId: string, sprintId: string): Promise<Retrospective | null> {
    error.value = null;

    try {
      await gamificationApi.retrospectives.complete(projectId, sprintId);
      // Mark current retrospective as completed
      if (currentRetrospective.value) {
        currentRetrospective.value = { ...currentRetrospective.value, isCompleted: true };
      }
      return currentRetrospective.value;
    } catch (e: any) {
      error.value = e.message || 'Failed to complete retrospective';
      throw e;
    }
  }

  // =========================================
  // Actions - Celebrations
  // =========================================

  /**
   * Queue a celebration for display
   * @param celebration - Celebration data (without id/timestamp)
   */
  function queueCelebration(celebration: Omit<Celebration, 'id' | 'timestamp'>): void {
    const id = `celebration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    celebrationQueue.value.push({
      ...celebration,
      id,
      timestamp: Date.now(),
    });
  }

  /**
   * Process gamification result from task completion
   * Queues appropriate celebrations
   * @param result - Gamification result from API
   */
  function processGamificationResult(result: GamificationResult): void {
    if (!result) return;

    // Queue points celebration
    if (result.pointsAwarded > 0) {
      queueCelebration({
        type: 'points',
        data: {
          points: result.pointsAwarded,
          breakdown: result.breakdown,
        },
      });
    }

    // Queue level up celebration
    if (result.levelUp) {
      queueCelebration({
        type: 'level_up',
        data: { newLevel: result.levelUp.newLevel },
      });
    }

    // Queue achievement celebrations
    if (result.newAchievements && result.newAchievements.length > 0) {
      for (const achievement of result.newAchievements) {
        queueCelebration({
          type: 'achievement',
          data: { achievement },
        });
      }
    }

    // Queue streak celebration (for milestone streaks)
    if (result.streak && [3, 7, 14, 30, 60, 100].includes(result.streak)) {
      queueCelebration({
        type: 'streak',
        data: { streak: result.streak },
      });
    }

    // Update local stats if we have them
    if (stats.value) {
      stats.value.totalPoints += result.pointsAwarded;
      if (result.levelUp) {
        stats.value.level = result.levelUp.newLevel;
        stats.value.xpCurrent = 0;
      } else {
        stats.value.xpCurrent += result.pointsAwarded;
      }
      if (result.streak) {
        stats.value.currentStreak = result.streak;
        if (result.streak > (stats.value.longestStreak ?? 0)) {
          stats.value.longestStreak = result.streak;
        }
      }
    }
  }

  /**
   * Dismiss the current celebration (remove from queue)
   */
  function dismissCelebration(): void {
    celebrationQueue.value.shift();
  }

  /**
   * Clear all pending celebrations
   */
  function clearCelebrations(): void {
    celebrationQueue.value = [];
  }

  // =========================================
  // Utility Actions
  // =========================================

  /**
   * Clear any error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Reset the entire store
   */
  function $reset(): void {
    stats.value = null;
    achievements.value = [];
    sprints.value = [];
    currentSprint.value = null;
    leaderboard.value = [];
    pointHistory.value = [];
    velocityData.value = [];
    currentRetrospective.value = null;
    celebrationQueue.value = [];
    error.value = null;
    currentProjectId.value = null;
  }

  /**
   * Set current sprint manually
   * @param sprint - Sprint to set as current
   */
  function setCurrentSprint(sprint: Sprint | null): void {
    currentSprint.value = sprint;
  }

  return {
    // State
    stats,
    achievements,
    sprints,
    currentSprint,
    leaderboard,
    pointHistory,
    velocityData,
    currentRetrospective,
    celebrationQueue,
    loading,
    error,
    currentProjectId,

    // Computed
    level,
    totalPoints,
    levelProgress,
    currentStreak,
    bestStreak,
    unlockedAchievements,
    lockedAchievements,
    nearAchievements,
    activeSprints,
    completedSprints,
    hasCelebrations,
    isLoading,
    nextCelebration,
    sprintProgress,
    sprintDaysRemaining,

    // Actions - Stats
    fetchStats,
    refreshStats,

    // Actions - Achievements
    fetchAchievements,

    // Actions - Leaderboard
    fetchLeaderboard,

    // Actions - Point History
    fetchPointHistory,

    // Actions - Sprints
    fetchSprints,
    createSprint,
    updateSprint,
    startSprint,
    completeSprint,
    setCurrentSprint,

    // Actions - Velocity
    fetchVelocity,

    // Actions - Retrospectives
    fetchRetrospective,
    saveRetrospective,
    completeRetrospective,

    // Actions - Celebrations
    queueCelebration,
    processGamificationResult,
    dismissCelebration,
    clearCelebrations,

    // Utility
    clearError,
    $reset,
  };
});
