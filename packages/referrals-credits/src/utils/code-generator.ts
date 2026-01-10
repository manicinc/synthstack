/**
 * Code generation utilities for referral codes and discount codes
 */

/**
 * Characters allowed in generated codes
 * Excludes confusing characters: 0, O, I, L, 1
 */
export const ALLOWED_CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique referral code
 * @param prefix - Code prefix (default: 'REF')
 * @param length - Length of random part (default: 8)
 * @returns Generated code string
 */
export function generateReferralCode(prefix: string = 'REF', length: number = 8): string {
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += ALLOWED_CHARACTERS.charAt(Math.floor(Math.random() * ALLOWED_CHARACTERS.length));
  }
  return code;
}

/**
 * Generate a unique discount code
 * @param prefix - Code prefix (default: 'SAVE')
 * @param length - Length of random part (default: 6)
 * @returns Generated code string
 */
export function generateDiscountCode(prefix: string = 'SAVE', length: number = 6): string {
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += ALLOWED_CHARACTERS.charAt(Math.floor(Math.random() * ALLOWED_CHARACTERS.length));
  }
  return code;
}

/**
 * Validate that a code uses only allowed characters
 * @param code - Code to validate
 * @returns true if code is valid
 */
export function isValidCodeFormat(code: string): boolean {
  if (!code || code.length < 3) {
    return false;
  }
  // Code can contain uppercase letters and numbers (minus confusing chars: 0, O, I, L, 1)
  // Allowed: A-H, J, K, M, N, P-Z, 2-9
  return /^[A-HJKMNP-Z2-9]+$/i.test(code);
}

/**
 * Normalize a code to uppercase
 * @param code - Code to normalize
 * @returns Uppercase code
 */
export function normalizeCode(code: string): string {
  return code.toUpperCase().trim();
}
