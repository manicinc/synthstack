/**
 * @file services/__tests__/gamification.test.ts
 * @description Tests for gamification service pure functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  xpForLevel,
  getLevelTitle,
  calculateTaskPoints,
  getBasePointsForPriority,
} from '../gamification.js';
import type { Todo } from '../gamification.js';

describe('xpForLevel', () => {
  describe('Edge cases', () => {
    it('should return 0 for level 0 or below', () => {
      expect(xpForLevel(0)).toBe(0);
      expect(xpForLevel(-1)).toBe(0);
      expect(xpForLevel(-100)).toBe(0);
    });
  });

  describe('Levels 1-5 (100 XP per level)', () => {
    it('should require 100 XP per level', () => {
      expect(xpForLevel(1)).toBe(100);
      expect(xpForLevel(2)).toBe(200);
      expect(xpForLevel(3)).toBe(300);
      expect(xpForLevel(4)).toBe(400);
      expect(xpForLevel(5)).toBe(500);
    });
  });

  describe('Levels 6-10 (150 XP per level)', () => {
    it('should require 150 XP per level above 5', () => {
      expect(xpForLevel(6)).toBe(500 + 150);  // 650
      expect(xpForLevel(7)).toBe(500 + 300);  // 800
      expect(xpForLevel(10)).toBe(500 + 750); // 1250
    });
  });

  describe('Levels 11-20 (200 XP per level)', () => {
    it('should require 200 XP per level above 10', () => {
      expect(xpForLevel(11)).toBe(1250 + 200);  // 1450
      expect(xpForLevel(15)).toBe(1250 + 1000); // 2250
      expect(xpForLevel(20)).toBe(1250 + 2000); // 3250
    });
  });

  describe('Levels 21-50 (300 XP per level)', () => {
    it('should require 300 XP per level above 20', () => {
      expect(xpForLevel(21)).toBe(3250 + 300);  // 3550
      expect(xpForLevel(30)).toBe(3250 + 3000); // 6250
      expect(xpForLevel(50)).toBe(3250 + 9000); // 12250
    });
  });

  describe('Levels 51+ (500 XP per level)', () => {
    it('should require 500 XP per level above 50', () => {
      expect(xpForLevel(51)).toBe(12250 + 500);  // 12750
      expect(xpForLevel(60)).toBe(12250 + 5000); // 17250
      expect(xpForLevel(100)).toBe(12250 + 25000); // 37250
    });
  });

  describe('Progression consistency', () => {
    it('should always increase with level', () => {
      let prevXp = 0;
      for (let level = 1; level <= 100; level++) {
        const xp = xpForLevel(level);
        expect(xp).toBeGreaterThan(prevXp);
        prevXp = xp;
      }
    });
  });
});

describe('getLevelTitle', () => {
  describe('Title thresholds', () => {
    it('should return Beginner for levels 1-4', () => {
      expect(getLevelTitle(1)).toBe('Beginner');
      expect(getLevelTitle(4)).toBe('Beginner');
    });

    it('should return Apprentice for levels 5-9', () => {
      expect(getLevelTitle(5)).toBe('Apprentice');
      expect(getLevelTitle(9)).toBe('Apprentice');
    });

    it('should return Contributor for levels 10-14', () => {
      expect(getLevelTitle(10)).toBe('Contributor');
      expect(getLevelTitle(14)).toBe('Contributor');
    });

    it('should return Expert for levels 15-19', () => {
      expect(getLevelTitle(15)).toBe('Expert');
      expect(getLevelTitle(19)).toBe('Expert');
    });

    it('should return Specialist for levels 20-24', () => {
      expect(getLevelTitle(20)).toBe('Specialist');
      expect(getLevelTitle(24)).toBe('Specialist');
    });

    it('should return Master for levels 25-29', () => {
      expect(getLevelTitle(25)).toBe('Master');
      expect(getLevelTitle(29)).toBe('Master');
    });

    it('should return Grandmaster for levels 30-49', () => {
      expect(getLevelTitle(30)).toBe('Grandmaster');
      expect(getLevelTitle(49)).toBe('Grandmaster');
    });

    it('should return Champion for levels 50-74', () => {
      expect(getLevelTitle(50)).toBe('Champion');
      expect(getLevelTitle(74)).toBe('Champion');
    });

    it('should return Legend for levels 75-99', () => {
      expect(getLevelTitle(75)).toBe('Legend');
      expect(getLevelTitle(99)).toBe('Legend');
    });

    it('should return Mythic for level 100+', () => {
      expect(getLevelTitle(100)).toBe('Mythic');
      expect(getLevelTitle(150)).toBe('Mythic');
    });
  });

  describe('Edge cases', () => {
    it('should return Beginner for level 0 or below', () => {
      expect(getLevelTitle(0)).toBe('Beginner');
      expect(getLevelTitle(-1)).toBe('Beginner');
    });
  });
});

describe('calculateTaskPoints', () => {
  describe('Base points by priority', () => {
    it('should award 5 points for low priority', () => {
      const todo: Todo = createTodo({ priority: 'low' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.base).toBe(5);
    });

    it('should award 10 points for medium priority', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.base).toBe(10);
    });

    it('should award 20 points for high priority', () => {
      const todo: Todo = createTodo({ priority: 'high' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.base).toBe(20);
    });

    it('should award 30 points for urgent priority', () => {
      const todo: Todo = createTodo({ priority: 'urgent' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.base).toBe(30);
    });

    it('should default to 10 points for undefined priority', () => {
      const todo: Todo = createTodo({ priority: undefined as any });
      const result = calculateTaskPoints(todo, 0);
      expect(result.base).toBe(10);
    });
  });

  describe('Priority multipliers', () => {
    it('should apply 1.0x multiplier for low priority', () => {
      const todo: Todo = createTodo({ priority: 'low' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.priorityMultiplier).toBe(1.0);
    });

    it('should apply 1.0x multiplier for medium priority', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.priorityMultiplier).toBe(1.0);
    });

    it('should apply 1.25x multiplier for high priority', () => {
      const todo: Todo = createTodo({ priority: 'high' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.priorityMultiplier).toBe(1.25);
    });

    it('should apply 1.5x multiplier for urgent priority', () => {
      const todo: Todo = createTodo({ priority: 'urgent' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.priorityMultiplier).toBe(1.5);
    });
  });

  describe('Early completion bonus', () => {
    it('should award no bonus for tasks without due date', () => {
      const todo: Todo = createTodo({ due_date: undefined });
      const result = calculateTaskPoints(todo, 0);
      expect(result.earlyBonus).toBe(0);
    });

    it('should award no bonus for past due tasks', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const todo: Todo = createTodo({ due_date: yesterday.toISOString() });
      const result = calculateTaskPoints(todo, 0);
      expect(result.earlyBonus).toBe(0);
    });

    it('should award 5% bonus per day early', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todo: Todo = createTodo({ priority: 'medium', due_date: tomorrow.toISOString() });
      const result = calculateTaskPoints(todo, 0);
      // 1 day early = 5% of base (10) = 0.5
      expect(result.earlyBonus).toBeCloseTo(0.5, 1);
    });

    it('should cap early bonus at 50%', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30); // 30 days in future
      const todo: Todo = createTodo({ priority: 'medium', due_date: farFuture.toISOString() });
      const result = calculateTaskPoints(todo, 0);
      // Max 50% of base (10) = 5
      expect(result.earlyBonus).toBe(5);
    });
  });

  describe('Streak bonus', () => {
    it('should award no streak bonus for 0 days', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 0);
      expect(result.streakBonus).toBe(0);
    });

    it('should award 2% per streak day', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 5);
      // 5 days * 2% = 10% of base (10) = 1
      expect(result.streakBonus).toBe(1);
    });

    it('should cap streak bonus at 20%', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 20);
      // Max 20% of base (10) = 2
      expect(result.streakBonus).toBe(2);
    });
  });

  describe('Total calculation', () => {
    it('should round total to nearest integer', () => {
      const todo: Todo = createTodo({ priority: 'medium' });
      const result = calculateTaskPoints(todo, 3);
      expect(Number.isInteger(result.total)).toBe(true);
    });

    it('should combine all bonuses correctly', () => {
      // Set to exactly 2 full days ahead at end of day to ensure Math.floor gives 2
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      twoDaysFromNow.setHours(23, 59, 59, 999);

      const todo: Todo = createTodo({
        priority: 'high',
        due_date: twoDaysFromNow.toISOString()
      });
      const result = calculateTaskPoints(todo, 5);

      // base: 20
      // multiplier: 1.25
      // early: 2 days * 5% * 20 = 2
      // streak: 5 * 2% * 20 = 2
      // total: (20 * 1.25) + 2 + 2 = 29
      expect(result.base).toBe(20);
      expect(result.priorityMultiplier).toBe(1.25);
      expect(result.earlyBonus).toBeCloseTo(2, 0);
      expect(result.streakBonus).toBe(2);
      expect(result.total).toBe(29);
    });
  });
});

describe('getBasePointsForPriority', () => {
  it('should return 5 for low priority', () => {
    expect(getBasePointsForPriority('low')).toBe(5);
  });

  it('should return 10 for medium priority', () => {
    expect(getBasePointsForPriority('medium')).toBe(10);
  });

  it('should return 20 for high priority', () => {
    expect(getBasePointsForPriority('high')).toBe(20);
  });

  it('should return 30 for urgent priority', () => {
    expect(getBasePointsForPriority('urgent')).toBe(30);
  });

  it('should return 10 for unknown priority', () => {
    expect(getBasePointsForPriority('unknown')).toBe(10);
  });
});

// Helper function to create test todos
function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-todo-id',
    project_id: 'test-project-id',
    title: 'Test Todo',
    status: 'completed',
    priority: 'medium',
    ...overrides,
  };
}
