/**
 * Auth Service Auto-Detection Tests
 *
 * Tests for automatic auth provider detection based on environment configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config before importing AuthService
const mockConfig = {
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    jwtSecret: 'test-jwt-secret',
    frontendUrl: 'http://localhost:3000',
    oauth: {
        google: { clientId: '', clientSecret: '' },
        github: { clientId: '', clientSecret: '' },
        discord: { clientId: '', clientSecret: '' },
    },
};

vi.mock('../../../config/index.js', () => ({
    config: mockConfig,
}));

// Mock database pool
const mockPool = {
    query: vi.fn(),
    connect: vi.fn(),
};

// Mock Fastify instance
const mockFastify = {
    log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
    pg: { pool: mockPool },
};

describe('AuthService Auto-Detection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset config for each test
        mockConfig.supabaseUrl = '';
        mockConfig.supabaseServiceRoleKey = '';
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('loadProviderConfig defaults', () => {
        it('should default to local auth when Supabase is not configured', async () => {
            // No Supabase env vars
            mockConfig.supabaseUrl = '';
            mockConfig.supabaseServiceRoleKey = '';

            // Mock no DB config table
            mockPool.query.mockRejectedValueOnce(new Error('relation "auth_provider_config" does not exist'));

            const { AuthService } = await import('../index.js');
            const authService = new (AuthService as any)(mockFastify);
            await authService.initialize();

            const config = authService.getConfig();
            expect(config.activeProvider).toBe('local');
            expect(config.supabaseEnabled).toBe(false);
            expect(config.localEnabled).toBe(true);
        }, 15000); // Extended timeout for initial module import

        it('should default to Supabase auth when Supabase is configured', async () => {
            // Set Supabase env vars
            mockConfig.supabaseUrl = 'https://test.supabase.co';
            mockConfig.supabaseServiceRoleKey = 'test-service-role-key';

            // Mock no DB config table
            mockPool.query.mockRejectedValueOnce(new Error('relation "auth_provider_config" does not exist'));

            const { AuthService } = await import('../index.js');
            const authService = new (AuthService as any)(mockFastify);
            await authService.initialize();

            const config = authService.getConfig();
            expect(config.activeProvider).toBe('supabase');
            expect(config.supabaseEnabled).toBe(true);
            expect(config.localEnabled).toBe(true); // Always enabled as fallback
        });

        it('should log appropriate message when using local auth', async () => {
            mockConfig.supabaseUrl = '';
            mockConfig.supabaseServiceRoleKey = '';

            // Mock empty DB config result
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const { AuthService } = await import('../index.js');
            const authService = new (AuthService as any)(mockFastify);
            await authService.initialize();

            expect(mockFastify.log.info).toHaveBeenCalledWith(
                '📦 Supabase not configured - using local PostgreSQL auth'
            );
        });

        it('should use DB config when available', async () => {
            // Mock DB config with local enabled
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    active_provider: 'local',
                    supabase_enabled: false,
                    local_enabled: true,
                    directus_enabled: false,
                    local_require_email_verification: true,
                    local_session_duration_hours: 72,
                    local_max_failed_login_attempts: 3,
                    local_lockout_duration_minutes: 15,
                }],
            });

            const { AuthService } = await import('../index.js');
            const authService = new (AuthService as any)(mockFastify);
            await authService.initialize();

            const config = authService.getConfig();
            expect(config.activeProvider).toBe('local');
            expect(config.localEnabled).toBe(true);
            expect(config.requireEmailVerification).toBe(true);
            expect(config.maxFailedAttempts).toBe(3);
        });

        it('should detect partial Supabase config as not configured', async () => {
            // Only URL set, no key
            mockConfig.supabaseUrl = 'https://test.supabase.co';
            mockConfig.supabaseServiceRoleKey = '';

            mockPool.query.mockRejectedValueOnce(new Error('table not found'));

            const { AuthService } = await import('../index.js');
            const authService = new (AuthService as any)(mockFastify);
            await authService.initialize();

            const config = authService.getConfig();
            expect(config.activeProvider).toBe('local');
            expect(config.supabaseEnabled).toBe(false);
        });
    });
});
