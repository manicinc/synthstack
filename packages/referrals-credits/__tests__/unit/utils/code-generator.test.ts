/**
 * Code Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CHARACTERS,
  generateReferralCode,
  generateDiscountCode,
  isValidCodeFormat,
  normalizeCode,
} from '../../../src/utils/code-generator.js';

describe('ALLOWED_CHARACTERS', () => {
  it('should not contain confusing characters (0, O, I, L, 1)', () => {
    expect(ALLOWED_CHARACTERS).not.toContain('0');
    expect(ALLOWED_CHARACTERS).not.toContain('O');
    expect(ALLOWED_CHARACTERS).not.toContain('I');
    expect(ALLOWED_CHARACTERS).not.toContain('L');
    expect(ALLOWED_CHARACTERS).not.toContain('1');
  });

  it('should contain uppercase letters and numbers', () => {
    expect(ALLOWED_CHARACTERS).toContain('A');
    expect(ALLOWED_CHARACTERS).toContain('B');
    expect(ALLOWED_CHARACTERS).toContain('2');
    expect(ALLOWED_CHARACTERS).toContain('9');
  });
});

describe('generateReferralCode', () => {
  it('should generate code with default prefix REF', () => {
    const code = generateReferralCode();
    expect(code.startsWith('REF')).toBe(true);
  });

  it('should generate code with custom prefix', () => {
    const code = generateReferralCode('SYNTH');
    expect(code.startsWith('SYNTH')).toBe(true);
  });

  it('should generate code with default length of 8', () => {
    const code = generateReferralCode();
    expect(code.length).toBe(3 + 8); // REF + 8 chars
  });

  it('should generate code with custom length', () => {
    const code = generateReferralCode('REF', 12);
    expect(code.length).toBe(3 + 12); // REF + 12 chars
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    expect(codes.size).toBe(100);
  });

  it('should only contain allowed characters', () => {
    const code = generateReferralCode();
    const randomPart = code.substring(3);
    for (const char of randomPart) {
      expect(ALLOWED_CHARACTERS).toContain(char);
    }
  });
});

describe('generateDiscountCode', () => {
  it('should generate code with default prefix SAVE', () => {
    const code = generateDiscountCode();
    expect(code.startsWith('SAVE')).toBe(true);
  });

  it('should generate code with custom prefix', () => {
    const code = generateDiscountCode('PROMO');
    expect(code.startsWith('PROMO')).toBe(true);
  });

  it('should generate code with default length of 6', () => {
    const code = generateDiscountCode();
    expect(code.length).toBe(4 + 6); // SAVE + 6 chars
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateDiscountCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('isValidCodeFormat', () => {
  it('should return true for valid codes', () => {
    expect(isValidCodeFormat('REFABC234')).toBe(true);
    expect(isValidCodeFormat('SAVE29')).toBe(true);
    expect(isValidCodeFormat('SYNTH')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidCodeFormat('')).toBe(false);
  });

  it('should return false for short codes (< 3 chars)', () => {
    expect(isValidCodeFormat('AB')).toBe(false);
  });

  it('should accept lowercase (case insensitive)', () => {
    // Our validator is case-insensitive
    expect(isValidCodeFormat('refabc234')).toBe(true);
  });

  it('should return false for codes with invalid characters', () => {
    expect(isValidCodeFormat('REF-ABC')).toBe(false); // hyphen
    expect(isValidCodeFormat('REF ABC')).toBe(false); // space
    expect(isValidCodeFormat('REF@234')).toBe(false); // special char
  });

  it('should reject confusing characters (0, O, I, L, 1)', () => {
    expect(isValidCodeFormat('REF0ABC')).toBe(false); // contains 0
    expect(isValidCodeFormat('REFIABC')).toBe(false); // contains I
    expect(isValidCodeFormat('REFLABC')).toBe(false); // contains L
    expect(isValidCodeFormat('REFOABC')).toBe(false); // contains O
    expect(isValidCodeFormat('REF1ABC')).toBe(false); // contains 1
  });
});

describe('normalizeCode', () => {
  it('should convert to uppercase', () => {
    expect(normalizeCode('refabc')).toBe('REFABC');
    expect(normalizeCode('save20')).toBe('SAVE20');
  });

  it('should trim whitespace', () => {
    expect(normalizeCode('  REFABC  ')).toBe('REFABC');
    expect(normalizeCode('\tSAVE20\n')).toBe('SAVE20');
  });

  it('should handle already uppercase codes', () => {
    expect(normalizeCode('REFABC123')).toBe('REFABC123');
  });
});
