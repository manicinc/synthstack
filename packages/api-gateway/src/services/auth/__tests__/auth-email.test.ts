/**
 * @file services/auth/__tests__/auth-email.test.ts
 * @description Unit tests for AuthEmailService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthEmailService, initAuthEmailService, getAuthEmailService } from '../auth-email.service.js';

// Mock email templates
vi.mock('../../email/templates/auth/password-reset.js', () => ({
  passwordResetTemplate: vi.fn().mockReturnValue({
    subject: 'Reset your password',
    html: '<p>Reset HTML</p>',
    text: 'Reset text',
  }),
}));

vi.mock('../../email/templates/auth/email-verification.js', () => ({
  emailVerificationTemplate: vi.fn().mockReturnValue({
    subject: 'Verify your email',
    html: '<p>Verify HTML</p>',
    text: 'Verify text',
  }),
}));

vi.mock('../../email/templates/auth/welcome.js', () => ({
  welcomeTemplate: vi.fn().mockReturnValue({
    subject: 'Welcome to SynthStack!',
    html: '<p>Welcome HTML</p>',
    text: 'Welcome text',
  }),
}));

describe('AuthEmailService', () => {
  let service: AuthEmailService;
  let mockEmailService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmailService = {
      sendEmail: vi.fn().mockResolvedValue({
        success: true,
        queueId: 'queue-123',
      }),
      isConfigured: vi.fn().mockReturnValue(true),
    };

    service = new AuthEmailService({
      emailService: mockEmailService,
      appName: 'TestApp',
      supportEmail: 'support@test.com',
    });
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('Constructor', () => {
    it('should create service with provided options', () => {
      expect(service).toBeInstanceOf(AuthEmailService);
    });

    it('should use default values when not provided', () => {
      const defaultService = new AuthEmailService({
        emailService: mockEmailService,
      });
      expect(defaultService).toBeInstanceOf(AuthEmailService);
    });
  });

  // ============================================
  // Password Reset Email Tests
  // ============================================

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'reset-token-123',
        'https://app.test.com/reset-password'
      );

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset your password',
          html: '<p>Reset HTML</p>',
          text: 'Reset text',
          referenceType: 'auth_password_reset',
          priority: 10,
        })
      );
    });

    it('should append token to reset URL without query params', async () => {
      const { passwordResetTemplate } = await import('../../email/templates/auth/password-reset.js');

      await service.sendPasswordResetEmail(
        'user@example.com',
        'token-xyz',
        'https://app.test.com/reset'
      );

      expect(passwordResetTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: 'https://app.test.com/reset?token=token-xyz',
        })
      );
    });

    it('should append token to reset URL with existing query params', async () => {
      const { passwordResetTemplate } = await import('../../email/templates/auth/password-reset.js');

      await service.sendPasswordResetEmail(
        'user@example.com',
        'token-xyz',
        'https://app.test.com/reset?locale=en'
      );

      expect(passwordResetTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: 'https://app.test.com/reset?locale=en&token=token-xyz',
        })
      );
    });

    it('should handle email send failure', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        success: false,
        errorCode: 'SMTP_ERROR',
        errorMessage: 'Connection failed',
      });

      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'token',
        'https://app.test.com/reset'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SMTP_ERROR');
    });
  });

  // ============================================
  // Verification Email Tests
  // ============================================

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const result = await service.sendVerificationEmail(
        'new@example.com',
        'verify-token-456',
        'https://app.test.com/verify-email'
      );

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          subject: 'Verify your email',
          referenceType: 'auth_email_verification',
          priority: 10,
        })
      );
    });

    it('should construct correct verification URL', async () => {
      const { emailVerificationTemplate } = await import('../../email/templates/auth/email-verification.js');

      await service.sendVerificationEmail(
        'new@example.com',
        'verify-abc',
        'https://app.test.com/verify'
      );

      expect(emailVerificationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          verifyUrl: 'https://app.test.com/verify?token=verify-abc',
          expiresIn: '24 hours',
        })
      );
    });
  });

  // ============================================
  // Welcome Email Tests
  // ============================================

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const result = await service.sendWelcomeEmail(
        'verified@example.com',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'verified@example.com',
          toName: 'John Doe',
          subject: 'Welcome to SynthStack!',
          referenceType: 'auth_welcome',
          priority: 5, // Lower priority than auth emails
        })
      );
    });

    it('should pass display name to template', async () => {
      const { welcomeTemplate } = await import('../../email/templates/auth/welcome.js');

      await service.sendWelcomeEmail('user@example.com', 'Jane Smith');

      expect(welcomeTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Jane Smith',
          appName: 'TestApp',
          supportEmail: 'support@test.com',
        })
      );
    });
  });

  // ============================================
  // Configuration Tests
  // ============================================

  describe('isConfigured', () => {
    it('should return true when email service is configured', () => {
      mockEmailService.isConfigured.mockReturnValue(true);
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when email service is not configured', () => {
      mockEmailService.isConfigured.mockReturnValue(false);
      expect(service.isConfigured()).toBe(false);
    });
  });
});

// ============================================
// Singleton Tests
// ============================================

describe('AuthEmailService Singleton', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should throw error when getting service before initialization', async () => {
    // Re-import to reset singleton state
    const { getAuthEmailService: getFreshService } = await import('../auth-email.service.js');

    // Note: This test may not work as expected due to module caching
    // In a real scenario, you'd need to reset the module properly
    expect(() => getFreshService()).toThrow('Auth email service not initialized');
  });

  it('should return same instance on multiple init calls', async () => {
    const { initAuthEmailService: initFresh, getAuthEmailService: getFresh } = await import('../auth-email.service.js');

    const mockEmailService = {
      sendEmail: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true),
    };

    const instance1 = initFresh({ emailService: mockEmailService as any });
    const instance2 = initFresh({ emailService: mockEmailService as any });
    const instance3 = getFresh();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
  });
});
