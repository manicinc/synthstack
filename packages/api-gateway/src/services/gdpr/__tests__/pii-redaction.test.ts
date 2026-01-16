/**
 * PII Redaction Service Tests
 *
 * Unit tests for the PII detection and redaction functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  redactPII,
  redactPIIFromObject,
  containsPII,
  detectPIITypes,
  createPIIPattern,
  DEFAULT_PII_PATTERNS,
  type PIIPattern,
} from '../pii-redaction';

// NOTE: Build "real-looking" Stripe key formats at runtime to avoid triggering
// GitHub Push Protection / secret scanning in the public repo.
const STRIPE_SECRET_KEY_EXAMPLE = ['sk', 'TEST', 'EXAMPLE', 'fake_key_for_testing_only'].join('_');
const STRIPE_PUBLISHABLE_KEY_EXAMPLE = ['pk', 'TEST', 'EXAMPLE', 'fake_key_for_testing_only'].join('_');

describe('PII Redaction Service', () => {
  describe('redactPII', () => {
    describe('Email Redaction', () => {
      it('should redact email addresses', () => {
        const input = 'Contact me at john.doe@example.com for more info';
        const result = redactPII(input);

        expect(result.redacted).toBe('Contact me at [EMAIL_REDACTED] for more info');
        expect(result.totalRedactions).toBe(1);
        expect(result.piiFound).toContainEqual(
          expect.objectContaining({ type: 'email', category: 'contact', count: 1 })
        );
      });

      it('should redact multiple email addresses', () => {
        const input = 'Send to alice@test.com and bob@company.org';
        const result = redactPII(input);

        expect(result.redacted).toBe('Send to [EMAIL_REDACTED] and [EMAIL_REDACTED]');
        expect(result.totalRedactions).toBe(2);
      });

      it('should handle various email formats', () => {
        const emails = [
          'simple@example.com',
          'very.common@example.com',
          'disposable.style.email.with+symbol@example.com',
          'user.name+tag@example.co.uk',
          'user_name@example.org',
        ];

        emails.forEach((email) => {
          const result = redactPII(`Email: ${email}`);
          expect(result.redacted).toContain('[EMAIL_REDACTED]');
        });
      });
    });

    describe('Phone Number Redaction', () => {
      it('should redact US phone numbers', () => {
        const formats = [
          '(555) 123-4567',
          '555-123-4567',
          '555.123.4567',
          '5551234567',
          '+1 555 123 4567',
        ];

        formats.forEach((phone) => {
          const result = redactPII(`Call me at ${phone}`);
          expect(result.redacted).toContain('[PHONE_REDACTED]');
        });
      });

      it('should redact international phone numbers', () => {
        const input = 'International: +442071234567';
        const result = redactPII(input);

        expect(result.redacted).toContain('[PHONE_REDACTED]');
      });
    });

    describe('Credit Card Redaction', () => {
      it('should redact credit card numbers', () => {
        const cards = [
          '4111111111111111', // Visa
          '5500000000000004', // Mastercard
          '340000000000009', // Amex
          '6011000000000004', // Discover
        ];

        cards.forEach((card) => {
          const result = redactPII(`Card: ${card}`);
          expect(result.redacted).toContain('[CARD_REDACTED]');
        });
      });

      it('should redact formatted credit card numbers', () => {
        const input = 'Card number: 4111-1111-1111-1111';
        const result = redactPII(input);

        expect(result.redacted).toContain('[CARD_REDACTED]');
      });

      it('should redact credit cards with spaces', () => {
        const input = 'Payment with 4111 1111 1111 1111';
        const result = redactPII(input);

        expect(result.redacted).toContain('[CARD_REDACTED]');
      });
    });

    describe('SSN Redaction', () => {
      it('should redact Social Security Numbers', () => {
        const ssns = ['123-45-6789', '123 45 6789', '123456789'];

        ssns.forEach((ssn) => {
          const result = redactPII(`SSN: ${ssn}`);
          expect(result.redacted).toContain('[SSN_REDACTED]');
        });
      });

      it('should not redact invalid SSNs', () => {
        // SSNs starting with 000, 666, or 9xx are invalid
        const invalidSSNs = ['000-12-3456', '666-12-3456'];

        invalidSSNs.forEach((ssn) => {
          const result = redactPII(`SSN: ${ssn}`);
          expect(result.redacted).not.toContain('[SSN_REDACTED]');
        });
      });
    });

    describe('API Key & Token Redaction', () => {
      it('should redact API keys', () => {
        const keys = [
          STRIPE_SECRET_KEY_EXAMPLE,
          STRIPE_PUBLISHABLE_KEY_EXAMPLE,
          'api_key_12345678901234567890',
        ];

        keys.forEach((key) => {
          const result = redactPII(`Key: ${key}`);
          expect(result.redacted).toContain('[API_KEY_REDACTED]');
        });
      });

      it('should redact JWTs', () => {
        const jwt =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        const result = redactPII(`Token: ${jwt}`);

        expect(result.redacted).toContain('[JWT_REDACTED]');
      });

      it('should redact Bearer tokens', () => {
        const input = 'Authorization: Bearer abc123xyz456';
        const result = redactPII(input);

        expect(result.redacted).toContain('[BEARER_REDACTED]');
      });
    });

    describe('IP Address Redaction', () => {
      it('should redact IPv4 addresses', () => {
        const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '255.255.255.255'];

        ips.forEach((ip) => {
          const result = redactPII(`IP: ${ip}`);
          expect(result.redacted).toContain('[IP_REDACTED]');
        });
      });

      it('should redact IPv6 addresses', () => {
        const input = 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
        const result = redactPII(input);

        expect(result.redacted).toContain('[IP_REDACTED]');
      });
    });

    describe('IBAN Redaction', () => {
      it('should redact IBAN numbers', () => {
        const ibans = [
          'DE89370400440532013000',
          'GB82WEST12345698765432',
          'FR1420041010050500013M02606',
        ];

        ibans.forEach((iban) => {
          const result = redactPII(`IBAN: ${iban}`);
          expect(result.redacted).toContain('[IBAN_REDACTED]');
        });
      });
    });

    describe('Options', () => {
      it('should filter by category', () => {
        const input = 'Email: test@example.com, Card: 4111111111111111';

        const contactOnly = redactPII(input, { categories: ['contact'] });
        expect(contactOnly.redacted).toContain('[EMAIL_REDACTED]');
        expect(contactOnly.redacted).toContain('4111111111111111'); // Not redacted

        const financialOnly = redactPII(input, { categories: ['financial'] });
        expect(financialOnly.redacted).toContain('test@example.com'); // Not redacted
        expect(financialOnly.redacted).toContain('[CARD_REDACTED]');
      });

      it('should support custom patterns', () => {
        const customPattern: PIIPattern = {
          name: 'custom_id',
          pattern: /\bCUST-[0-9]{6}\b/g,
          replacement: '[CUSTOMER_ID_REDACTED]',
          category: 'identity',
        };

        const input = 'Customer ID: CUST-123456';
        const result = redactPII(input, { customPatterns: [customPattern] });

        expect(result.redacted).toContain('[CUSTOMER_ID_REDACTED]');
      });

      it('should preserve length when requested', () => {
        const input = 'Email: test@example.com';
        const result = redactPII(input, { preserveLength: true });

        // The redacted string should have similar length
        expect(result.redacted.length).toBeGreaterThan(0);
        expect(result.redacted).not.toContain('test@example.com');
      });

      it('should skip audit when disabled', () => {
        const input = 'Email: test@example.com';
        const result = redactPII(input, { audit: false });

        expect(result.redacted).toContain('[EMAIL_REDACTED]');
        expect(result.piiFound).toHaveLength(0);
        expect(result.totalRedactions).toBe(0);
      });
    });
  });

  describe('redactPIIFromObject', () => {
    it('should redact PII from flat objects', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const result = redactPIIFromObject(obj);

      expect(result.redacted.name).toBe('John Doe'); // No PII
      expect(result.redacted.email).toBe('[EMAIL_REDACTED]');
      expect(result.redacted.phone).toBe('[PHONE_REDACTED]');
    });

    it('should redact PII from nested objects', () => {
      const obj = {
        user: {
          profile: {
            email: 'nested@example.com',
            settings: {
              apiKey: STRIPE_SECRET_KEY_EXAMPLE,
            },
          },
        },
      };

      const result = redactPIIFromObject(obj);

      expect(result.redacted.user.profile.email).toBe('[EMAIL_REDACTED]');
      expect(result.redacted.user.profile.settings.apiKey).toBe('[API_KEY_REDACTED]');
    });

    it('should redact PII from arrays', () => {
      const obj = {
        contacts: ['alice@test.com', 'bob@test.com'],
        phones: ['555-111-2222', '555-333-4444'],
      };

      const result = redactPIIFromObject(obj);

      expect(result.redacted.contacts).toEqual(['[EMAIL_REDACTED]', '[EMAIL_REDACTED]']);
      expect(result.redacted.phones).toEqual(['[PHONE_REDACTED]', '[PHONE_REDACTED]']);
    });

    it('should handle mixed content', () => {
      const obj = {
        message: 'Contact john@example.com or call 555-123-4567',
        metadata: {
          source: 'API',
          ip: '192.168.1.1',
        },
        tags: ['user', 'premium'],
      };

      const result = redactPIIFromObject(obj);

      expect(result.redacted.message).toContain('[EMAIL_REDACTED]');
      expect(result.redacted.message).toContain('[PHONE_REDACTED]');
      expect(result.redacted.metadata.ip).toBe('[IP_REDACTED]');
      expect(result.redacted.tags).toEqual(['user', 'premium']); // No PII
    });

    it('should aggregate PII counts across object', () => {
      const obj = {
        email1: 'a@test.com',
        email2: 'b@test.com',
        nested: {
          email3: 'c@test.com',
        },
      };

      const result = redactPIIFromObject(obj);

      expect(result.totalRedactions).toBe(3);
      const emailPii = result.piiFound.find((p) => p.type === 'email');
      expect(emailPii?.count).toBe(3);
    });

    it('should handle null and undefined values', () => {
      const obj = {
        email: 'test@example.com',
        phone: null,
        address: undefined,
      };

      const result = redactPIIFromObject(obj);

      expect(result.redacted.email).toBe('[EMAIL_REDACTED]');
      expect(result.redacted.phone).toBeNull();
      expect(result.redacted.address).toBeUndefined();
    });
  });

  describe('containsPII', () => {
    it('should return true when PII is present', () => {
      expect(containsPII('Email: test@example.com')).toBe(true);
      expect(containsPII('Card: 4111111111111111')).toBe(true);
      expect(containsPII('SSN: 123-45-6789')).toBe(true);
    });

    it('should return false when no PII is present', () => {
      expect(containsPII('Hello, world!')).toBe(false);
      expect(containsPII('Order #12345')).toBe(false);
      expect(containsPII('Product SKU: ABC-123')).toBe(false);
    });

    it('should filter by category', () => {
      const input = 'Email: test@example.com';

      expect(containsPII(input, { categories: ['contact'] })).toBe(true);
      expect(containsPII(input, { categories: ['financial'] })).toBe(false);
    });
  });

  describe('detectPIITypes', () => {
    it('should detect all PII types in text', () => {
      const input = `
        Email: john@example.com
        Phone: 555-123-4567
        Card: 4111111111111111
        SSN: 123-45-6789
      `;

      const detected = detectPIITypes(input);

      expect(detected.length).toBeGreaterThanOrEqual(4);
      expect(detected.map((d) => d.type)).toContain('email');
      expect(detected.map((d) => d.type)).toContain('phone_us');
      expect(detected.map((d) => d.type)).toContain('ssn');
    });

    it('should return unique matches', () => {
      const input = 'Contact test@example.com or test@example.com';
      const detected = detectPIITypes(input);

      const emailDetection = detected.find((d) => d.type === 'email');
      expect(emailDetection?.matches).toHaveLength(1);
      expect(emailDetection?.matches[0]).toBe('test@example.com');
    });

    it('should return empty array when no PII found', () => {
      const detected = detectPIITypes('Hello, world!');
      expect(detected).toHaveLength(0);
    });
  });

  describe('createPIIPattern', () => {
    it('should create a valid PII pattern from string', () => {
      const pattern = createPIIPattern(
        'employee_id',
        'EMP-\\d{6}',
        '[EMPLOYEE_ID_REDACTED]',
        'identity'
      );

      expect(pattern.name).toBe('employee_id');
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.replacement).toBe('[EMPLOYEE_ID_REDACTED]');
      expect(pattern.category).toBe('identity');
    });

    it('should create a valid PII pattern from RegExp', () => {
      const pattern = createPIIPattern(
        'custom',
        /CUSTOM-[A-Z]{3}/g,
        '[CUSTOM_REDACTED]',
        'identity'
      );

      expect(pattern.pattern.test('CUSTOM-ABC')).toBe(true);
    });

    it('should work with redactPII', () => {
      const customPattern = createPIIPattern(
        'order_id',
        'ORD-\\d{8}',
        '[ORDER_REDACTED]',
        'identity'
      );

      const input = 'Order: ORD-12345678';
      const result = redactPII(input, { customPatterns: [customPattern] });

      expect(result.redacted).toContain('[ORDER_REDACTED]');
    });
  });

  describe('DEFAULT_PII_PATTERNS', () => {
    it('should export default patterns', () => {
      expect(DEFAULT_PII_PATTERNS).toBeDefined();
      expect(Array.isArray(DEFAULT_PII_PATTERNS)).toBe(true);
      expect(DEFAULT_PII_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have required properties for each pattern', () => {
      DEFAULT_PII_PATTERNS.forEach((pattern) => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('replacement');
        expect(pattern).toHaveProperty('category');
        expect(pattern.pattern).toBeInstanceOf(RegExp);
      });
    });

    it('should cover all categories', () => {
      const categories = new Set(DEFAULT_PII_PATTERNS.map((p) => p.category));

      expect(categories.has('contact')).toBe(true);
      expect(categories.has('financial')).toBe(true);
      expect(categories.has('identity')).toBe(true);
      expect(categories.has('credential')).toBe(true);
      expect(categories.has('location')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = redactPII('');
      expect(result.redacted).toBe('');
      expect(result.totalRedactions).toBe(0);
    });

    it('should handle string with only whitespace', () => {
      const result = redactPII('   \n\t  ');
      expect(result.redacted).toBe('   \n\t  ');
      expect(result.totalRedactions).toBe(0);
    });

    it('should handle very long strings', () => {
      const longString = 'test@example.com '.repeat(1000);
      const result = redactPII(longString);

      expect(result.totalRedactions).toBe(1000);
    });

    it('should handle special characters', () => {
      const input = 'Email: test+special@example.com (with parens)';
      const result = redactPII(input);

      expect(result.redacted).toContain('[EMAIL_REDACTED]');
      expect(result.redacted).toContain('(with parens)');
    });

    it('should handle unicode content', () => {
      const input = 'Email: 测试@example.com, Phone: 555-123-4567';
      const result = redactPII(input);

      expect(result.redacted).toContain('[PHONE_REDACTED]');
    });
  });
});
