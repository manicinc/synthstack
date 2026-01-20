/**
 * Gamification Service
 *
 * Handles all gamification logic including:
 * - Points calculation and awards
 * - Streak tracking
 * - Level progression
 * - Achievement checking
 * - Sprint velocity tracking
 * - LLM-powered complexity estimation
 */

import type { FastifyInstance } from 'fastify';

// =============================================
// LLM Complexity Types
// =============================================

export interface PreEstimate {
  complexity_score: number;
  complexity_name: string;
  estimated_hours: number;
  estimated_points: number;
  factors: Record<string, any>;
  reasoning: string;
  confidence: number;
}

export interface PostAnalysis {
  actual_complexity: number;
  complexity_name: string;
  actual_points: number;
  metrics: Record<string, any>;
  accuracy_score: number | null;
  point_adjustment: number;
  adjustment_reason: string;
  analysis: string;
}

export interface LLMPointsResult extends PointsResult {
  preEstimate?: PreEstimate;
  postAnalysis?: PostAnalysis;
  adjustedPoints: number;
  adjustmentMultiplier: number;
  adjustmentReason: string;
}

// =============================================
// Types
// =============================================

export interface Todo {
  id: string;
  project_id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  sprint_id?: string;
  points?: number;
  assignee_id?: string;
}

export interface UserGamificationStats {
  id: string;
  userId: string;
  projectId?: string;
  totalPoints: number;
  pointsThisWeek: number;
  pointsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate?: string;
  level: number;
  xpCurrent: number;
  xpToNextLevel: number;
  tasksCompleted: number;
  tasksCompletedEarly: number;
  milestonesCompleted: number;
  sprintsCompleted: number;
  bestDailyPoints: number;
  bestWeeklyPoints: number;
  bestSprintPoints: number;
  bestStreak: number;
}

export interface PointsCalculation {
  base: number;
  priorityMultiplier: number;
  earlyBonus: number;
  streakBonus: number;
  total: number;
}

export interface PointsResult {
  pointsAwarded: number;
  breakdown: PointsCalculation;
  levelUp?: { newLevel: number; levelTitle: string };
  newAchievements: Achievement[];
  newStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  badgeColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirementType: string;
  requirementValue: number;
  pointsReward: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
  progress?: number;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  durationType: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;
  endDate: string;
  pointGoal: number;
  pointsCompleted: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  velocityActual: number;
  velocityPredicted?: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  totalPoints: number;
  currentStreak: number;
  rank: number;
  isCurrentUser?: boolean;
}

// =============================================
// Constants
// =============================================

const BASE_POINTS: Record<string, number> = {
  low: 5,
  medium: 10,
  high: 20,
  urgent: 30
};

const PRIORITY_MULTIPLIERS: Record<string, number> = {
  low: 1.0,
  medium: 1.0,
  high: 1.25,
  urgent: 1.5
};

const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  5: 'Apprentice',
  10: 'Contributor',
  15: 'Expert',
  20: 'Specialist',
  25: 'Master',
  30: 'Grandmaster',
  50: 'Champion',
  75: 'Legend',
  100: 'Mythic'
};

// =============================================
// Helper Functions
// =============================================

/**
 * Calculate XP required for a specific level
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= 5) return level * 100;
  if (level <= 10) return 500 + (level - 5) * 150;
  if (level <= 20) return 1250 + (level - 10) * 200;
  if (level <= 50) return 3250 + (level - 20) * 300;
  return 12250 + (level - 50) * 500;
}

/**
 * Get level title based on level number
 */
export function getLevelTitle(level: number): string {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (level >= threshold) {
      return LEVEL_TITLES[threshold];
    }
  }
  return 'Beginner';
}

/**
 * Calculate points for completing a task
 */
export function calculateTaskPoints(todo: Todo, streakDays: number): PointsCalculation {
  const priority = todo.priority || 'medium';
  const base = BASE_POINTS[priority] || 10;
  const priorityMultiplier = PRIORITY_MULTIPLIERS[priority] || 1.0;

  // Early completion bonus: +5% per day early, max 50%
  let earlyBonus = 0;
  if (todo.due_date) {
    const now = new Date();
    const due = new Date(todo.due_date);
    // Use calendar days (start-of-day) to avoid time-of-day flakiness.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (startOfDueDay > startOfToday) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffDays = (startOfDueDay.getTime() - startOfToday.getTime()) / msPerDay;
      const daysEarly = Math.max(0, Math.round(diffDays));
      earlyBonus = Math.min(0.5, daysEarly * 0.05) * base;
    }
  }

  // Streak bonus: +2% per consecutive day, max 20%
  const streakMultiplier = Math.min(0.2, streakDays * 0.02);
  const streakBonus = base * streakMultiplier;

  const total = Math.round((base * priorityMultiplier) + earlyBonus + streakBonus);

  return { base, priorityMultiplier, earlyBonus, streakBonus, total };
}

/**
 * Calculate base points for a task priority (for display before completion)
 */
export function getBasePointsForPriority(priority: string): number {
  return BASE_POINTS[priority] || 10;
}

// =============================================
// Gamification Service Class
// =============================================

export class GamificationService {
  private server: FastifyInstance;

  constructor(server: FastifyInstance) {
    this.server = server;
  }

  /**
   * Get or create gamification stats for a user
   */
  async getUserStats(userId: string, projectId?: string): Promise<UserGamificationStats> {
    const result = await this.server.pg.query(
      `SELECT * FROM user_gamification_stats
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      [userId, projectId || null]
    );

    if (result.rows.length > 0) {
      return this.mapStatsRow(result.rows[0]);
    }

    // Create new stats record
    const insertResult = await this.server.pg.query(
      `INSERT INTO user_gamification_stats (user_id, project_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, projectId || null]
    );

    return this.mapStatsRow(insertResult.rows[0]);
  }

  /**
   * Award points for completing a task
   */
  async awardTaskPoints(userId: string, todoId: string, projectId: string): Promise<PointsResult> {
    // Get the todo
    const todoResult = await this.server.pg.query(
      'SELECT * FROM todos WHERE id = $1',
      [todoId]
    );

    if (todoResult.rows.length === 0) {
      throw new Error('Todo not found');
    }

    const todo = todoResult.rows[0] as Todo;

    // Get user stats
    const stats = await this.getUserStats(userId, projectId);

    // Calculate points
    const calculation = calculateTaskPoints(todo, stats.currentStreak);

    // Start transaction
    await this.server.pg.query('BEGIN');

    try {
      // Check if this is an early completion
      let isEarly = false;
      if (todo.due_date) {
        const now = new Date();
        const due = new Date(todo.due_date);
        isEarly = now < due;
      }

      // Record point event
      await this.server.pg.query(
        `INSERT INTO point_events (
          user_id, project_id, sprint_id, event_type,
          related_entity_type, related_entity_id,
          points, multiplier, points_final, description
        ) VALUES ($1, $2, $3, 'task_completed', 'todo', $4, $5, $6, $7, $8)`,
        [
          userId,
          projectId,
          todo.sprint_id || null,
          todoId,
          calculation.base,
          calculation.priorityMultiplier,
          calculation.total,
          `Completed: ${todo.title}`
        ]
      );

      // Update todo with points awarded
      await this.server.pg.query(
        `UPDATE todos SET points_awarded = $1, completed_at = NOW(), completed_by = $2 WHERE id = $3`,
        [calculation.total, userId, todoId]
      );

      // Update sprint points if applicable
      if (todo.sprint_id) {
        await this.server.pg.query(
          `UPDATE sprints SET points_completed = points_completed + $1 WHERE id = $2`,
          [calculation.total, todo.sprint_id]
        );
      }

      // Update user stats
      const newXp = stats.xpCurrent + calculation.total;
      await this.updateUserStats(userId, projectId, {
        total_points: stats.totalPoints + calculation.total,
        xp_current: newXp,
        tasks_completed: stats.tasksCompleted + 1,
        tasks_completed_early: stats.tasksCompletedEarly + (isEarly ? 1 : 0)
      });

      // Update streak
      const newStreak = await this.updateStreak(userId, projectId);

      // Check for level up
      const levelUp = await this.checkAndProcessLevelUp(userId, projectId);

      // Check for new achievements
      const newAchievements = await this.checkAchievements(userId, projectId);

      await this.server.pg.query('COMMIT');

      return {
        pointsAwarded: calculation.total,
        breakdown: calculation,
        levelUp,
        newAchievements,
        newStreak
      };
    } catch (error) {
      await this.server.pg.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Update streak based on completion date
   */
  async updateStreak(userId: string, projectId?: string): Promise<number> {
    const stats = await this.getUserStats(userId, projectId);
    const today = new Date().toISOString().split('T')[0];
    const lastCompletion = stats.lastCompletionDate;

    let newStreak = stats.currentStreak;

    if (!lastCompletion) {
      // First completion ever
      newStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastCompletion === today) {
        // Already completed today, no change
        return stats.currentStreak;
      } else if (lastCompletion === yesterdayStr) {
        // Continuing streak
        newStreak = stats.currentStreak + 1;

        // Award streak bonus for milestones
        if (newStreak % 7 === 0) {
          await this.awardStreakBonus(userId, projectId, newStreak);
        }
      } else {
        // Streak broken - reset
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(stats.longestStreak, newStreak);

    await this.updateUserStats(userId, projectId, {
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_completion_date: today,
      best_streak: Math.max(stats.bestStreak, newStreak)
    });

    return newStreak;
  }

  /**
   * Award bonus points for streak milestones
   */
  private async awardStreakBonus(userId: string, projectId: string | undefined, streakDays: number): Promise<void> {
    const bonus = Math.min(100, streakDays * 5); // 5 points per day, max 100

    await this.server.pg.query(
      `INSERT INTO point_events (
        user_id, project_id, event_type, points, multiplier, points_final, description
      ) VALUES ($1, $2, 'streak_bonus', $3, 1.0, $3, $4)`,
      [userId, projectId || null, bonus, `${streakDays}-day streak bonus!`]
    );

    const stats = await this.getUserStats(userId, projectId);
    await this.updateUserStats(userId, projectId, {
      total_points: stats.totalPoints + bonus,
      xp_current: stats.xpCurrent + bonus
    });
  }

  /**
   * Check and process level ups
   */
  async checkAndProcessLevelUp(userId: string, projectId?: string): Promise<{ newLevel: number; levelTitle: string } | undefined> {
    const stats = await this.getUserStats(userId, projectId);
    const xpNeeded = xpForLevel(stats.level + 1) - xpForLevel(stats.level);

    if (stats.xpCurrent >= xpNeeded) {
      const newLevel = stats.level + 1;
      const leftoverXp = stats.xpCurrent - xpNeeded;
      const nextLevelXp = xpForLevel(newLevel + 1) - xpForLevel(newLevel);

      await this.updateUserStats(userId, projectId, {
        level: newLevel,
        xp_current: leftoverXp,
        xp_to_next_level: nextLevelXp
      });

      // Record level up event
      await this.server.pg.query(
        `INSERT INTO point_events (user_id, project_id, event_type, points, points_final, description)
         VALUES ($1, $2, 'level_up', 0, 0, $3)`,
        [userId, projectId || null, `Reached Level ${newLevel}!`]
      );

      return {
        newLevel,
        levelTitle: getLevelTitle(newLevel)
      };
    }

    return undefined;
  }

  /**
   * Check for newly unlocked achievements
   */
  async checkAchievements(userId: string, projectId?: string): Promise<Achievement[]> {
    const stats = await this.getUserStats(userId, projectId);
    const earnedIds = await this.getUserAchievementIds(userId, projectId);

    // Get all active achievements
    const achievementsResult = await this.server.pg.query(
      `SELECT * FROM achievements WHERE is_active = true ORDER BY sort_order`
    );

    const newlyUnlocked: Achievement[] = [];

    for (const row of achievementsResult.rows) {
      if (earnedIds.includes(row.id)) continue;

      const unlocked = this.checkAchievementCriteria(row, stats);
      if (unlocked) {
        await this.unlockAchievement(userId, row.id, projectId, row.points_reward);
        newlyUnlocked.push(this.mapAchievementRow(row, true));
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get IDs of achievements already earned by user
   */
  private async getUserAchievementIds(userId: string, projectId?: string): Promise<string[]> {
    const result = await this.server.pg.query(
      `SELECT achievement_id FROM user_achievements
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      [userId, projectId || null]
    );
    return result.rows.map(r => r.achievement_id);
  }

  /**
   * Check if achievement criteria is met
   */
  private checkAchievementCriteria(achievement: any, stats: UserGamificationStats): boolean {
    const value = achievement.requirement_value;

    switch (achievement.requirement_type) {
      case 'tasks_completed':
        return stats.tasksCompleted >= value;
      case 'tasks_early':
        return stats.tasksCompletedEarly >= value;
      case 'streak':
        return stats.currentStreak >= value || stats.longestStreak >= value;
      case 'milestones':
        return stats.milestonesCompleted >= value;
      case 'sprint_goals':
        return stats.sprintsCompleted >= value;
      case 'level':
        return stats.level >= value;
      default:
        return false;
    }
  }

  /**
   * Unlock an achievement for a user
   */
  private async unlockAchievement(userId: string, achievementId: string, projectId: string | undefined, pointsReward: number): Promise<void> {
    await this.server.pg.query(
      `INSERT INTO user_achievements (user_id, achievement_id, project_id, points_awarded)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, achievement_id, project_id) DO NOTHING`,
      [userId, achievementId, projectId || null, pointsReward]
    );

    if (pointsReward > 0) {
      await this.server.pg.query(
        `INSERT INTO point_events (user_id, project_id, event_type, related_entity_type, related_entity_id, points, points_final, description)
         VALUES ($1, $2, 'achievement_unlocked', 'achievement', $3, $4, $4, 'Achievement bonus')`,
        [userId, projectId || null, achievementId, pointsReward]
      );

      const stats = await this.getUserStats(userId, projectId);
      await this.updateUserStats(userId, projectId, {
        total_points: stats.totalPoints + pointsReward,
        xp_current: stats.xpCurrent + pointsReward
      });
    }
  }

  /**
   * Get all achievements with unlock status for a user
   */
  async getAchievements(userId: string, projectId?: string): Promise<Achievement[]> {
    const earnedMap = new Map<string, string>();
    const earnedResult = await this.server.pg.query(
      `SELECT achievement_id, unlocked_at FROM user_achievements
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      [userId, projectId || null]
    );
    for (const row of earnedResult.rows) {
      earnedMap.set(row.achievement_id, row.unlocked_at);
    }

    const achievementsResult = await this.server.pg.query(
      `SELECT * FROM achievements WHERE is_active = true AND (is_hidden = false OR id = ANY($1))
       ORDER BY sort_order`,
      [Array.from(earnedMap.keys())]
    );

    const stats = await this.getUserStats(userId, projectId);

    return achievementsResult.rows.map(row => {
      const isUnlocked = earnedMap.has(row.id);
      const achievement = this.mapAchievementRow(row, isUnlocked);

      if (earnedMap.has(row.id)) {
        achievement.unlockedAt = earnedMap.get(row.id);
      }

      // Calculate progress for locked achievements
      if (!isUnlocked) {
        achievement.progress = this.calculateAchievementProgress(row, stats);
      }

      return achievement;
    });
  }

  /**
   * Calculate progress towards an achievement (0-100)
   */
  private calculateAchievementProgress(achievement: any, stats: UserGamificationStats): number {
    let current = 0;
    const target = achievement.requirement_value;

    switch (achievement.requirement_type) {
      case 'tasks_completed':
        current = stats.tasksCompleted;
        break;
      case 'tasks_early':
        current = stats.tasksCompletedEarly;
        break;
      case 'streak':
        current = Math.max(stats.currentStreak, stats.longestStreak);
        break;
      case 'milestones':
        current = stats.milestonesCompleted;
        break;
      case 'sprint_goals':
        current = stats.sprintsCompleted;
        break;
      case 'level':
        current = stats.level;
        break;
    }

    return Math.min(100, Math.round((current / target) * 100));
  }

  /**
   * Get project leaderboard
   */
  async getLeaderboard(projectId: string, userId: string, limit = 10): Promise<LeaderboardEntry[]> {
    const result = await this.server.pg.query(
      `SELECT
        ugs.user_id,
        ugs.level,
        ugs.total_points,
        ugs.current_streak,
        du.first_name,
        du.last_name,
        du.email,
        du.avatar
       FROM user_gamification_stats ugs
       JOIN directus_users du ON du.id = ugs.user_id
       WHERE ugs.project_id = $1
       ORDER BY ugs.total_points DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row, index) => ({
      userId: row.user_id,
      displayName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email?.split('@')[0] || 'User',
      avatarUrl: row.avatar ? `/assets/${row.avatar}` : undefined,
      level: row.level,
      totalPoints: row.total_points,
      currentStreak: row.current_streak,
      rank: index + 1,
      isCurrentUser: row.user_id === userId
    }));
  }

  /**
   * Get point history for a user
   */
  async getPointHistory(userId: string, projectId?: string, limit = 50, offset = 0): Promise<any[]> {
    const result = await this.server.pg.query(
      `SELECT * FROM point_events
       WHERE user_id = $1 AND ($2::uuid IS NULL OR project_id = $2)
       ORDER BY date_created DESC
       LIMIT $3 OFFSET $4`,
      [userId, projectId || null, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      points: row.points,
      multiplier: row.multiplier,
      pointsFinal: row.points_final,
      description: row.description,
      metadata: row.metadata,
      dateCreated: row.date_created
    }));
  }

  /**
   * Update user stats with partial data
   */
  private async updateUserStats(userId: string, projectId: string | undefined, updates: Record<string, any>): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [userId, projectId || null];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setClauses.push('date_updated = NOW()');

    await this.server.pg.query(
      `UPDATE user_gamification_stats
       SET ${setClauses.join(', ')}
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      values
    );
  }

  /**
   * Map database row to UserGamificationStats
   */
  private mapStatsRow(row: any): UserGamificationStats {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      totalPoints: row.total_points,
      pointsThisWeek: row.points_this_week,
      pointsThisMonth: row.points_this_month,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastCompletionDate: row.last_completion_date,
      level: row.level,
      xpCurrent: row.xp_current,
      xpToNextLevel: row.xp_to_next_level,
      tasksCompleted: row.tasks_completed,
      tasksCompletedEarly: row.tasks_completed_early,
      milestonesCompleted: row.milestones_completed,
      sprintsCompleted: row.sprints_completed,
      bestDailyPoints: row.best_daily_points,
      bestWeeklyPoints: row.best_weekly_points,
      bestSprintPoints: row.best_sprint_points,
      bestStreak: row.best_streak
    };
  }

  /**
   * Map database row to Achievement
   */
  private mapAchievementRow(row: any, isUnlocked: boolean): Achievement {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      icon: row.icon,
      badgeColor: row.badge_color,
      rarity: row.rarity,
      requirementType: row.requirement_type,
      requirementValue: row.requirement_value,
      pointsReward: row.points_reward,
      isUnlocked
    };
  }

  // =============================================
  // Sprint Management
  // =============================================

  /**
   * Create a new sprint
   */
  async createSprint(projectId: string, userId: string, data: {
    name: string;
    goal?: string;
    durationType: string;
    startDate: string;
    endDate: string;
    pointGoal?: number;
  }): Promise<Sprint> {
    const result = await this.server.pg.query(
      `INSERT INTO sprints (project_id, name, goal, duration_type, start_date, end_date, point_goal, user_created)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [projectId, data.name, data.goal, data.durationType, data.startDate, data.endDate, data.pointGoal || 0, userId]
    );

    return this.mapSprintRow(result.rows[0]);
  }

  /**
   * Get sprints for a project
   */
  async getSprints(projectId: string): Promise<Sprint[]> {
    const result = await this.server.pg.query(
      `SELECT * FROM sprints WHERE project_id = $1 ORDER BY start_date DESC`,
      [projectId]
    );

    return result.rows.map(row => this.mapSprintRow(row));
  }

  /**
   * Get a single sprint
   */
  async getSprint(sprintId: string): Promise<Sprint | null> {
    const result = await this.server.pg.query(
      `SELECT * FROM sprints WHERE id = $1`,
      [sprintId]
    );

    if (result.rows.length === 0) return null;
    return this.mapSprintRow(result.rows[0]);
  }

  /**
   * Update sprint
   */
  async updateSprint(sprintId: string, data: Partial<Sprint>): Promise<Sprint> {
    const updates: string[] = [];
    const values: any[] = [sprintId];
    let paramIndex = 2;

    const fieldMap: Record<string, string> = {
      name: 'name',
      goal: 'goal',
      durationType: 'duration_type',
      startDate: 'start_date',
      endDate: 'end_date',
      pointGoal: 'point_goal',
      status: 'status'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in data) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push((data as any)[key]);
        paramIndex++;
      }
    }

    updates.push('date_updated = NOW()');

    const result = await this.server.pg.query(
      `UPDATE sprints SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    return this.mapSprintRow(result.rows[0]);
  }

  /**
   * Start a sprint
   */
  async startSprint(sprintId: string): Promise<Sprint> {
    return this.updateSprint(sprintId, { status: 'active' } as any);
  }

  /**
   * Complete a sprint and calculate velocity
   */
  async completeSprint(sprintId: string, projectId: string): Promise<{ sprint: Sprint; velocity: number }> {
    const sprint = await this.getSprint(sprintId);
    if (!sprint) throw new Error('Sprint not found');

    // Calculate velocity (points per day)
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const velocity = sprint.pointsCompleted / days;

    // Update sprint
    await this.server.pg.query(
      `UPDATE sprints SET status = 'completed', velocity_actual = $1, date_updated = NOW() WHERE id = $2`,
      [velocity, sprintId]
    );

    // Check if sprint goal was achieved
    if (sprint.pointGoal > 0 && sprint.pointsCompleted >= sprint.pointGoal) {
      // Award sprint goal achievement points to all contributors
      const contributors = await this.server.pg.query(
        `SELECT DISTINCT completed_by FROM todos WHERE sprint_id = $1 AND completed_by IS NOT NULL`,
        [sprintId]
      );

      for (const row of contributors.rows) {
        await this.server.pg.query(
          `INSERT INTO point_events (user_id, project_id, sprint_id, event_type, points, points_final, description)
           VALUES ($1, $2, $3, 'sprint_goal_achieved', 50, 50, 'Sprint goal achieved!')`,
          [row.completed_by, projectId, sprintId]
        );

        const stats = await this.getUserStats(row.completed_by, projectId);
        await this.updateUserStats(row.completed_by, projectId, {
          total_points: stats.totalPoints + 50,
          xp_current: stats.xpCurrent + 50,
          sprints_completed: stats.sprintsCompleted + 1
        });
      }
    }

    const updatedSprint = await this.getSprint(sprintId);
    return { sprint: updatedSprint!, velocity };
  }

  /**
   * Get velocity data for a project
   */
  async getVelocityData(projectId: string, limit = 10): Promise<any[]> {
    const result = await this.server.pg.query(
      `SELECT name, point_goal, points_completed, velocity_actual, start_date, end_date
       FROM sprints
       WHERE project_id = $1 AND status = 'completed'
       ORDER BY end_date DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map(row => ({
      name: row.name,
      pointGoal: row.point_goal,
      pointsCompleted: row.points_completed,
      velocity: row.velocity_actual,
      startDate: row.start_date,
      endDate: row.end_date
    }));
  }

  /**
   * Map database row to Sprint
   */
  private mapSprintRow(row: any): Sprint {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      goal: row.goal,
      durationType: row.duration_type,
      startDate: row.start_date,
      endDate: row.end_date,
      pointGoal: row.point_goal,
      pointsCompleted: row.points_completed,
      status: row.status,
      velocityActual: parseFloat(row.velocity_actual) || 0,
      velocityPredicted: row.velocity_predicted ? parseFloat(row.velocity_predicted) : undefined
    };
  }

  // =============================================
  // LLM-Powered Complexity Estimation
  // =============================================

  /**
   * Calculate task points with LLM-powered complexity estimation
   *
   * Point adjustment formula based on estimation accuracy:
   * - diff >= 2 (underestimate) -> +25% bonus
   * - diff == 1 -> +15% bonus
   * - diff == 0 -> +10% accuracy bonus
   * - diff == -1 -> 0% (no adjustment)
   * - diff <= -2 (overestimate) -> -10% penalty
   */
  async calculateTaskPointsWithLLM(
    todo: Todo,
    preEstimate: PreEstimate | null,
    postAnalysis: PostAnalysis | null,
    streakDays: number
  ): Promise<LLMPointsResult> {
    // Calculate base points
    const baseCalculation = calculateTaskPoints(todo, streakDays);

    // If no LLM analysis available, return standard calculation
    if (!preEstimate || !postAnalysis) {
      return {
        ...({
          pointsAwarded: baseCalculation.total,
          breakdown: baseCalculation,
          newAchievements: [],
          newStreak: streakDays
        } as PointsResult),
        preEstimate: preEstimate || undefined,
        postAnalysis: postAnalysis || undefined,
        adjustedPoints: baseCalculation.total,
        adjustmentMultiplier: 1.0,
        adjustmentReason: 'No LLM analysis available'
      };
    }

    // Calculate adjustment based on estimation accuracy
    const preLevel = preEstimate.complexity_score;
    const actualLevel = postAnalysis.actual_complexity;
    const diff = actualLevel - preLevel;

    let adjustmentMultiplier = 1.0;
    let adjustmentReason = '';

    if (diff >= 2) {
      adjustmentMultiplier = 1.25;
      adjustmentReason = `Underestimated by ${diff} levels: +25% bonus for tackling harder work`;
    } else if (diff === 1) {
      adjustmentMultiplier = 1.15;
      adjustmentReason = 'Underestimated by 1 level: +15% bonus';
    } else if (diff === 0) {
      adjustmentMultiplier = 1.10;
      adjustmentReason = 'Perfect accuracy: +10% precision bonus';
    } else if (diff === -1) {
      adjustmentMultiplier = 1.0;
      adjustmentReason = 'Overestimated by 1 level: no adjustment';
    } else {
      adjustmentMultiplier = 0.90;
      adjustmentReason = `Overestimated by ${Math.abs(diff)} levels: -10% penalty`;
    }

    // Apply adjustment to base points
    const adjustedPoints = Math.round(baseCalculation.total * adjustmentMultiplier);

    return {
      pointsAwarded: adjustedPoints,
      breakdown: baseCalculation,
      newAchievements: [],
      newStreak: streakDays,
      preEstimate,
      postAnalysis,
      adjustedPoints,
      adjustmentMultiplier,
      adjustmentReason
    };
  }

  /**
   * Store pre-estimation for a task
   */
  async storePreEstimate(
    todoId: string,
    userId: string,
    estimate: PreEstimate
  ): Promise<void> {
    // Check if estimate already exists
    const existing = await this.server.pg.query(
      'SELECT id FROM task_complexity_estimates WHERE todo_id = $1',
      [todoId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await this.server.pg.query(
        `UPDATE task_complexity_estimates
         SET pre_estimated_at = NOW(),
             pre_complexity_score = $1,
             pre_estimated_hours = $2,
             pre_estimated_points = $3,
             pre_factors = $4,
             pre_llm_reasoning = $5,
             date_updated = NOW()
         WHERE todo_id = $6`,
        [
          estimate.complexity_score,
          estimate.estimated_hours,
          estimate.estimated_points,
          JSON.stringify(estimate.factors),
          estimate.reasoning,
          todoId
        ]
      );
    } else {
      // Create new
      const result = await this.server.pg.query(
        `INSERT INTO task_complexity_estimates (
          todo_id, pre_estimated_at, pre_complexity_score,
          pre_estimated_hours, pre_estimated_points, pre_factors,
          pre_llm_reasoning, user_created
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          todoId,
          estimate.complexity_score,
          estimate.estimated_hours,
          estimate.estimated_points,
          JSON.stringify(estimate.factors),
          estimate.reasoning,
          userId
        ]
      );

      // Link to todo
      await this.server.pg.query(
        'UPDATE todos SET complexity_estimate_id = $1 WHERE id = $2',
        [result.rows[0].id, todoId]
      );
    }
  }

  /**
   * Store post-mortem analysis for a task
   */
  async storePostAnalysis(
    todoId: string,
    analysis: PostAnalysis,
    githubPrId?: string,
    githubIssueId?: string
  ): Promise<void> {
    await this.server.pg.query(
      `UPDATE task_complexity_estimates
       SET post_analyzed_at = NOW(),
           post_actual_complexity = $1,
           post_actual_points = $2,
           post_metrics = $3,
           post_llm_analysis = $4,
           accuracy_score = $5,
           point_adjustment = $6,
           adjustment_reason = $7,
           github_pr_id = COALESCE($8, github_pr_id),
           github_issue_id = COALESCE($9, github_issue_id),
           date_updated = NOW()
       WHERE todo_id = $10`,
      [
        analysis.actual_complexity,
        analysis.actual_points,
        JSON.stringify(analysis.metrics),
        analysis.analysis,
        analysis.accuracy_score,
        analysis.point_adjustment,
        analysis.adjustment_reason,
        githubPrId || null,
        githubIssueId || null,
        todoId
      ]
    );
  }

  /**
   * Get pre-estimate for a task
   */
  async getPreEstimate(todoId: string): Promise<PreEstimate | null> {
    const result = await this.server.pg.query(
      `SELECT pre_complexity_score, pre_estimated_hours, pre_estimated_points,
              pre_factors, pre_llm_reasoning
       FROM task_complexity_estimates
       WHERE todo_id = $1 AND pre_estimated_at IS NOT NULL`,
      [todoId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      complexity_score: row.pre_complexity_score,
      complexity_name: this.getComplexityName(row.pre_complexity_score),
      estimated_hours: parseFloat(row.pre_estimated_hours),
      estimated_points: row.pre_estimated_points,
      factors: row.pre_factors || {},
      reasoning: row.pre_llm_reasoning || '',
      confidence: 0.7
    };
  }

  /**
   * Get user's estimation accuracy stats
   */
  async getUserEstimationAccuracy(userId: string, projectId?: string): Promise<any> {
    const result = await this.server.pg.query(
      `SELECT * FROM user_estimation_accuracy
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      [userId, projectId || null]
    );

    if (result.rows.length === 0) {
      return {
        totalEstimates: 0,
        accurateEstimates: 0,
        overestimates: 0,
        underestimates: 0,
        averageAccuracy: 0,
        accuracyByLevel: {},
        totalAccuracyBonus: 0
      };
    }

    const row = result.rows[0];
    return {
      totalEstimates: row.total_estimates,
      accurateEstimates: row.accurate_estimates,
      overestimates: row.overestimates,
      underestimates: row.underestimates,
      averageAccuracy: parseFloat(row.average_accuracy),
      accuracyByLevel: row.accuracy_by_level,
      totalAccuracyBonus: row.total_accuracy_bonus
    };
  }

  /**
   * Update user's estimation accuracy after post-analysis
   */
  async updateUserEstimationAccuracy(
    userId: string,
    projectId: string | undefined,
    preLevel: number,
    actualLevel: number,
    bonusPoints: number
  ): Promise<void> {
    const diff = actualLevel - preLevel;
    const isAccurate = Math.abs(diff) <= 1;
    const isOverestimate = diff < 0;
    const isUnderestimate = diff > 0;

    // Get or create accuracy record
    const existing = await this.server.pg.query(
      `SELECT id, accuracy_by_level FROM user_estimation_accuracy
       WHERE user_id = $1 AND ($2::uuid IS NULL AND project_id IS NULL OR project_id = $2)`,
      [userId, projectId || null]
    );

    if (existing.rows.length === 0) {
      // Create new record
      const accuracyByLevel: Record<string, { count: number; accurate: number }> = {
        '1': { count: 0, accurate: 0 },
        '2': { count: 0, accurate: 0 },
        '3': { count: 0, accurate: 0 },
        '4': { count: 0, accurate: 0 },
        '5': { count: 0, accurate: 0 }
      };
      accuracyByLevel[String(actualLevel)].count = 1;
      if (isAccurate) accuracyByLevel[String(actualLevel)].accurate = 1;

      await this.server.pg.query(
        `INSERT INTO user_estimation_accuracy (
          user_id, project_id, total_estimates, accurate_estimates,
          overestimates, underestimates, average_accuracy,
          accuracy_by_level, total_accuracy_bonus
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          projectId || null,
          isAccurate ? 1 : 0,
          isOverestimate ? 1 : 0,
          isUnderestimate ? 1 : 0,
          isAccurate ? 100 : 0,
          JSON.stringify(accuracyByLevel),
          bonusPoints
        ]
      );
    } else {
      // Update existing record
      const row = existing.rows[0];
      const accuracyByLevel = row.accuracy_by_level || {};

      if (!accuracyByLevel[String(actualLevel)]) {
        accuracyByLevel[String(actualLevel)] = { count: 0, accurate: 0 };
      }
      accuracyByLevel[String(actualLevel)].count++;
      if (isAccurate) accuracyByLevel[String(actualLevel)].accurate++;

      await this.server.pg.query(
        `UPDATE user_estimation_accuracy
         SET total_estimates = total_estimates + 1,
             accurate_estimates = accurate_estimates + $1,
             overestimates = overestimates + $2,
             underestimates = underestimates + $3,
             average_accuracy = (average_accuracy * total_estimates + $4) / (total_estimates + 1),
             accuracy_by_level = $5,
             total_accuracy_bonus = total_accuracy_bonus + $6,
             date_updated = NOW()
         WHERE id = $7`,
        [
          isAccurate ? 1 : 0,
          isOverestimate ? 1 : 0,
          isUnderestimate ? 1 : 0,
          isAccurate ? 100 : 0,
          JSON.stringify(accuracyByLevel),
          bonusPoints,
          row.id
        ]
      );
    }
  }

  /**
   * Get complexity name from score
   */
  private getComplexityName(score: number): string {
    const names: Record<number, string> = {
      1: 'Trivial',
      2: 'Simple',
      3: 'Moderate',
      4: 'Complex',
      5: 'Epic'
    };
    return names[score] || 'Unknown';
  }

  // =============================================
  // ML Service Integration Methods
  // =============================================

  /**
   * Estimate task complexity by calling the ML service
   *
   * @param todoId - The todo ID to estimate
   * @param taskContext - Context about the task (title, description, etc.)
   * @returns Pre-estimate result from ML service
   */
  async estimateTaskComplexity(
    todoId: string,
    taskContext: {
      title: string;
      description?: string;
      issueType?: string;
      labels?: string[];
      milestone?: string;
      projectContext?: string;
      relatedFiles?: string[];
    }
  ): Promise<PreEstimate> {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

    try {
      // Call ML service for pre-estimation
      const response = await fetch(`${mlServiceUrl}/complexity/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskContext.title,
          description: taskContext.description || '',
          issue_type: taskContext.issueType || 'task',
          labels: taskContext.labels || [],
          milestone: taskContext.milestone || null,
          project_context: taskContext.projectContext || null,
          related_files: taskContext.relatedFiles || []
        })
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const result = await response.json();

      const preEstimate: PreEstimate = {
        complexity_score: result.complexity_score,
        complexity_name: result.complexity_name,
        estimated_hours: result.estimated_hours,
        estimated_points: result.estimated_points,
        factors: result.factors || {},
        reasoning: result.reasoning || '',
        confidence: result.confidence || 0.7
      };

      // Store the pre-estimate in the database
      // Get user_id from the todo
      const todoResult = await this.server.pg.query(
        'SELECT user_created FROM todos WHERE id = $1',
        [todoId]
      );
      const userId = todoResult.rows[0]?.user_created;

      if (userId) {
        await this.storePreEstimate(todoId, userId, preEstimate);
      }

      return preEstimate;

    } catch (error) {
      this.server.log.error({ error }, 'Failed to estimate task complexity');

      // Return a fallback estimate based on basic heuristics
      const fallbackScore = 2; // Default to "Simple"
      return {
        complexity_score: fallbackScore,
        complexity_name: this.getComplexityName(fallbackScore),
        estimated_hours: 2,
        estimated_points: 10,
        factors: { error: 'ML service unavailable', fallback: true },
        reasoning: 'Fallback estimate - ML service unavailable',
        confidence: 0.3
      };
    }
  }

  /**
   * Analyze completed task by calling the ML service for post-mortem
   *
   * @param todoId - The todo ID to analyze
   * @param prMetrics - Metrics from the merged PR
   * @returns Post-analysis result from ML service
   */
  async analyzeCompletedTask(
    todoId: string,
    prMetrics: {
      linesAdded: number;
      linesRemoved: number;
      filesChanged: number;
      commits: number;
      timeToMergeHours?: number;
      reviewComments?: number;
      prDescription?: string;
      githubPrId?: string;
      githubIssueId?: string;
    }
  ): Promise<PostAnalysis> {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

    try {
      // Get pre-estimate for comparison
      const preEstimate = await this.getPreEstimate(todoId);

      // Call ML service for post-mortem analysis
      const response = await fetch(`${mlServiceUrl}/complexity/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines_added: prMetrics.linesAdded,
          lines_removed: prMetrics.linesRemoved,
          files_changed: prMetrics.filesChanged,
          commits: prMetrics.commits,
          time_to_merge_hours: prMetrics.timeToMergeHours || 0,
          review_comments: prMetrics.reviewComments || 0,
          pr_description: prMetrics.prDescription || '',
          pre_complexity_score: preEstimate?.complexity_score,
          pre_estimated_hours: preEstimate?.estimated_hours,
          pre_reasoning: preEstimate?.reasoning
        })
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const result = await response.json();

      const postAnalysis: PostAnalysis = {
        actual_complexity: result.actual_complexity,
        complexity_name: result.complexity_name,
        actual_points: result.actual_points,
        metrics: result.metrics || {},
        accuracy_score: result.accuracy_score,
        point_adjustment: result.point_adjustment,
        adjustment_reason: result.adjustment_reason || '',
        analysis: result.analysis || ''
      };

      // Store the post-analysis in the database
      await this.storePostAnalysis(
        todoId,
        postAnalysis,
        prMetrics.githubPrId,
        prMetrics.githubIssueId
      );

      // Update user estimation accuracy if we had a pre-estimate
      if (preEstimate) {
        const todoResult = await this.server.pg.query(
          'SELECT user_created, project_id FROM todos WHERE id = $1',
          [todoId]
        );
        const row = todoResult.rows[0];
        if (row?.user_created) {
          const bonusPoints = Math.round(
            (postAnalysis.point_adjustment - 1) * postAnalysis.actual_points
          );
          await this.updateUserEstimationAccuracy(
            row.user_created,
            row.project_id,
            preEstimate.complexity_score,
            postAnalysis.actual_complexity,
            bonusPoints
          );
        }
      }

      return postAnalysis;

    } catch (error) {
      this.server.log.error({ error }, 'Failed to analyze completed task');

      // Return a fallback analysis
      const fallbackLevel = 2;
      return {
        actual_complexity: fallbackLevel,
        complexity_name: this.getComplexityName(fallbackLevel),
        actual_points: 10,
        metrics: { error: 'ML service unavailable', fallback: true },
        accuracy_score: null,
        point_adjustment: 1.0,
        adjustment_reason: 'Fallback analysis - ML service unavailable',
        analysis: 'Unable to perform detailed analysis'
      };
    }
  }

  /**
   * Apply complexity adjustment to task points
   *
   * @param todoId - The todo ID
   * @param estimate - The complexity estimate with adjustment info
   * @returns Updated points result
   */
  async applyComplexityAdjustment(
    todoId: string,
    estimate: {
      preEstimate: PreEstimate | null;
      postAnalysis: PostAnalysis | null;
    }
  ): Promise<LLMPointsResult> {
    // Get the todo and user stats
    const todoResult = await this.server.pg.query(
      'SELECT * FROM todos WHERE id = $1',
      [todoId]
    );

    if (todoResult.rows.length === 0) {
      throw new Error('Todo not found');
    }

    const todo = todoResult.rows[0] as Todo;
    const userId = todo.assignee_id || (await this.server.pg.query(
      'SELECT user_created FROM todos WHERE id = $1', [todoId]
    )).rows[0]?.user_created;

    // Get current streak for bonus calculation
    const stats = await this.getUserStats(userId, todo.project_id);

    // Calculate points with LLM adjustment
    const pointsResult = await this.calculateTaskPointsWithLLM(
      todo,
      estimate.preEstimate,
      estimate.postAnalysis,
      stats.currentStreak
    );

    // Update the todo with adjusted points if we have a post-analysis
    if (estimate.postAnalysis) {
      await this.server.pg.query(
        `UPDATE todos
         SET points = $1, points_awarded = $2
         WHERE id = $3`,
        [
          estimate.postAnalysis.actual_points,
          pointsResult.adjustedPoints,
          todoId
        ]
      );

      // If the adjustment is different from base, create a point event
      if (pointsResult.adjustmentMultiplier !== 1.0) {
        const adjustmentPoints = pointsResult.adjustedPoints - pointsResult.breakdown.total;

        await this.server.pg.query(
          `INSERT INTO point_events (
            user_id, project_id, event_type,
            related_entity_type, related_entity_id,
            points, multiplier, points_final, description
          ) VALUES ($1, $2, 'adjustment', 'todo', $3, $4, $5, $6, $7)`,
          [
            userId,
            todo.project_id,
            todoId,
            adjustmentPoints,
            pointsResult.adjustmentMultiplier,
            adjustmentPoints,
            pointsResult.adjustmentReason
          ]
        );

        // Update user stats with the bonus/penalty
        if (adjustmentPoints !== 0) {
          await this.updateUserStats(userId, todo.project_id, {
            total_points: stats.totalPoints + adjustmentPoints,
            xp_current: stats.xpCurrent + adjustmentPoints
          });
        }
      }
    }

    return pointsResult;
  }
}

// Export singleton factory
export function createGamificationService(server: FastifyInstance): GamificationService {
  return new GamificationService(server);
}
