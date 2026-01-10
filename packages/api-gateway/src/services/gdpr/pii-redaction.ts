/**
 * PII Redaction Service
 * 
 * Detects and redacts Personally Identifiable Information (PII) from
 * logs, execution data, and other sensitive content.
 */

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  category: 'contact' | 'financial' | 'identity' | 'health' | 'location' | 'credential';
}

// Common PII patterns
const PII_PATTERNS: PIIPattern[] = [
  // Contact Information
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
    category: 'contact'
  },
  {
    name: 'phone_us',
    pattern: /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: '[PHONE_REDACTED]',
    category: 'contact'
  },
  {
    name: 'phone_intl',
    pattern: /(?<![A-Za-z0-9])\+[1-9]\d{1,14}(?!\d)/g,
    replacement: '[PHONE_REDACTED]',
    category: 'contact'
  },

  // Financial Information
  {
    name: 'credit_card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: '[CARD_REDACTED]',
    category: 'financial'
  },
  {
    name: 'credit_card_formatted',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CARD_REDACTED]',
    category: 'financial'
  },
  {
    name: 'bank_account',
    pattern: /\b[0-9]{8,17}\b(?=.*(?:account|routing|iban|swift))/gi,
    replacement: '[ACCOUNT_REDACTED]',
    category: 'financial'
  },
  {
    name: 'iban',
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
    replacement: '[IBAN_REDACTED]',
    category: 'financial'
  },

  // Identity Documents
  {
    name: 'ssn',
    pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
    category: 'identity'
  },
  {
    name: 'passport',
    pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
    replacement: '[PASSPORT_REDACTED]',
    category: 'identity'
  },
  {
    name: 'drivers_license',
    pattern: /\b[A-Z]{1,2}[0-9]{5,8}\b/g,
    replacement: '[DL_REDACTED]',
    category: 'identity'
  },

  // Credentials & Secrets
  {
    name: 'api_key',
    // Matches Stripe-style keys (sk_live_*, pk_test_*) and generic API keys (api_key_*, token_*)
    pattern: /\b(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,64}\b|\b(?:api_key|api-key|token|secret|auth)_[a-zA-Z0-9]{16,64}\b/gi,
    replacement: '[API_KEY_REDACTED]',
    category: 'credential'
  },
  {
    name: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,
    replacement: '[JWT_REDACTED]',
    category: 'credential'
  },
  {
    name: 'bearer_token',
    pattern: /\bBearer\s+[A-Za-z0-9_-]+\b/gi,
    replacement: '[BEARER_REDACTED]',
    category: 'credential'
  },

  // IP Addresses (optional - may want to keep for security logs)
  {
    name: 'ipv4',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[IP_REDACTED]',
    category: 'location'
  },
  {
    name: 'ipv6',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    replacement: '[IP_REDACTED]',
    category: 'location'
  }
];

export interface RedactionResult {
  redacted: string;
  piiFound: Array<{
    type: string;
    category: string;
    count: number;
  }>;
  totalRedactions: number;
}

export interface RedactionOptions {
  categories?: Array<PIIPattern['category']>;
  customPatterns?: PIIPattern[];
  preserveLength?: boolean;
  audit?: boolean;
}

/**
 * Redact PII from a string
 */
export function redactPII(
  input: string,
  options: RedactionOptions = {}
): RedactionResult {
  const { categories, customPatterns = [], preserveLength = false, audit = true } = options;

  // Combine default and custom patterns
  let patterns = [...PII_PATTERNS, ...customPatterns];

  // Filter by category if specified
  if (categories && categories.length > 0) {
    patterns = patterns.filter(p => categories.includes(p.category));
  }

  const piiFound: Map<string, { category: string; count: number }> = new Map();
  let redacted = input;

  for (const pattern of patterns) {
    const matches = redacted.match(pattern.pattern);
    if (matches && matches.length > 0) {
      if (audit) {
        const existing = piiFound.get(pattern.name);
        piiFound.set(pattern.name, {
          category: pattern.category,
          count: (existing?.count || 0) + matches.length
        });
      }

      if (preserveLength) {
        // Replace with same-length placeholder
        redacted = redacted.replace(pattern.pattern, (match) => {
          const prefix = pattern.replacement.slice(0, -1);
          const padding = 'X'.repeat(Math.max(0, match.length - prefix.length - 1));
          return `${prefix}${padding}]`;
        });
      } else {
        redacted = redacted.replace(pattern.pattern, pattern.replacement);
      }
    }
  }

  return {
    redacted,
    piiFound: Array.from(piiFound.entries()).map(([type, data]) => ({
      type,
      ...data
    })),
    totalRedactions: Array.from(piiFound.values()).reduce((sum, v) => sum + v.count, 0)
  };
}

/**
 * Redact PII from an object (deep)
 */
export function redactPIIFromObject<T>(
  obj: T,
  options: RedactionOptions = {}
): { redacted: T; piiFound: RedactionResult['piiFound']; totalRedactions: number } {
  const allPiiFound: Map<string, { category: string; count: number }> = new Map();

  function processValue(value: any): any {
    if (typeof value === 'string') {
      const result = redactPII(value, options);
      for (const pii of result.piiFound) {
        const existing = allPiiFound.get(pii.type);
        allPiiFound.set(pii.type, {
          category: pii.category,
          count: (existing?.count || 0) + pii.count
        });
      }
      return result.redacted;
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = processValue(val);
      }
      return result;
    }
    return value;
  }

  const redacted = processValue(obj);

  return {
    redacted,
    piiFound: Array.from(allPiiFound.entries()).map(([type, data]) => ({
      type,
      ...data
    })),
    totalRedactions: Array.from(allPiiFound.values()).reduce((sum, v) => sum + v.count, 0)
  };
}

/**
 * Check if a string contains PII
 */
export function containsPII(
  input: string,
  options: Pick<RedactionOptions, 'categories' | 'customPatterns'> = {}
): boolean {
  const { categories, customPatterns = [] } = options;
  let patterns = [...PII_PATTERNS, ...customPatterns];

  if (categories && categories.length > 0) {
    patterns = patterns.filter(p => categories.includes(p.category));
  }

  for (const pattern of patterns) {
    if (pattern.pattern.test(input)) {
      // Reset lastIndex for global patterns
      pattern.pattern.lastIndex = 0;
      return true;
    }
    pattern.pattern.lastIndex = 0;
  }

  return false;
}

/**
 * Get a list of all PII types detected in a string
 */
export function detectPIITypes(
  input: string,
  options: Pick<RedactionOptions, 'categories' | 'customPatterns'> = {}
): Array<{ type: string; category: string; matches: string[] }> {
  const { categories, customPatterns = [] } = options;
  let patterns = [...PII_PATTERNS, ...customPatterns];

  if (categories && categories.length > 0) {
    patterns = patterns.filter(p => categories.includes(p.category));
  }

  const detected: Array<{ type: string; category: string; matches: string[] }> = [];

  for (const pattern of patterns) {
    const matches = input.match(pattern.pattern);
    if (matches && matches.length > 0) {
      detected.push({
        type: pattern.name,
        category: pattern.category,
        matches: [...new Set(matches)] // Unique matches only
      });
    }
    pattern.pattern.lastIndex = 0;
  }

  return detected;
}

/**
 * Create a custom PII pattern
 */
export function createPIIPattern(
  name: string,
  pattern: RegExp | string,
  replacement: string,
  category: PIIPattern['category']
): PIIPattern {
  return {
    name,
    pattern: typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern,
    replacement,
    category
  };
}

// Export default patterns for customization
export const DEFAULT_PII_PATTERNS = PII_PATTERNS;


