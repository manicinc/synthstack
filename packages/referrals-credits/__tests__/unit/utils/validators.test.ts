/**
 * Validators Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  isValidEmail,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidDateString,
  isExpired,
  isValidPurchaseAmount,
} from '../../../src/utils/validators.js';

describe('isValidUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  it('should return true for positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(0.5)).toBe(true);
    expect(isPositiveNumber(100)).toBe(true);
  });

  it('should return false for zero', () => {
    expect(isPositiveNumber(0)).toBe(false);
  });

  it('should return false for negative numbers', () => {
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(-0.5)).toBe(false);
  });

  it('should return false for NaN', () => {
    expect(isPositiveNumber(NaN)).toBe(false);
  });
});

describe('isNonNegativeNumber', () => {
  it('should return true for positive numbers', () => {
    expect(isNonNegativeNumber(1)).toBe(true);
    expect(isNonNegativeNumber(100)).toBe(true);
  });

  it('should return true for zero', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
  });

  it('should return false for negative numbers', () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
  });

  it('should return false for NaN', () => {
    expect(isNonNegativeNumber(NaN)).toBe(false);
  });
});

describe('isValidDateString', () => {
  it('should return true for valid ISO date strings', () => {
    expect(isValidDateString('2024-01-15T00:00:00Z')).toBe(true);
    expect(isValidDateString('2024-06-15T10:30:00.000Z')).toBe(true);
  });

  it('should return true for simple date strings', () => {
    expect(isValidDateString('2024-01-15')).toBe(true);
  });

  it('should return false for invalid date strings', () => {
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString('2024-13-01')).toBe(false); // Invalid month
  });
});

describe('isExpired', () => {
  it('should return true for past dates', () => {
    expect(isExpired('2020-01-01T00:00:00Z')).toBe(true);
    expect(isExpired('2023-06-15T00:00:00Z')).toBe(true);
  });

  it('should return false for future dates', () => {
    expect(isExpired('2030-01-01T00:00:00Z')).toBe(false);
    expect(isExpired('2099-12-31T23:59:59Z')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isExpired('')).toBe(false);
  });
});

describe('isValidPurchaseAmount', () => {
  it('should return true for valid amounts', () => {
    expect(isValidPurchaseAmount(10)).toBe(true);
    expect(isValidPurchaseAmount(99.99)).toBe(true);
    expect(isValidPurchaseAmount(0.01)).toBe(true);
  });

  it('should return false for zero', () => {
    expect(isValidPurchaseAmount(0)).toBe(false);
  });

  it('should return false for negative amounts', () => {
    expect(isValidPurchaseAmount(-10)).toBe(false);
  });

  it('should return false for amounts with more than 2 decimal places', () => {
    expect(isValidPurchaseAmount(10.999)).toBe(false);
    expect(isValidPurchaseAmount(1.001)).toBe(false);
  });

  it('should return true for amounts with exactly 2 decimal places', () => {
    expect(isValidPurchaseAmount(10.99)).toBe(true);
  });

  it('should return true for whole numbers', () => {
    expect(isValidPurchaseAmount(100)).toBe(true);
  });
});
