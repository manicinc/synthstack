/**
 * Webhook Validation Middleware Unit Tests
 *
 * Comprehensive tests for webhook signature validation including:
 * - Signature validation (valid/invalid/missing)
 * - Secret retrieval (environment, database, provider-specific)
 * - Organization ID extraction
 * - Event logging
 * - Pre-built provider middleware (Stripe, Slack, GitHub)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  createWebhookValidationMiddleware,
  stripeWebhookValidation,
  slackWebhookValidation,
  githubWebhookValidation,
  genericWebhookValidation,
} from '../webhookValidation.js';

// Import actual functions for mocking
import {
  validateWebhookSignature,
  extractWebhookMetadata,
} from '../../services/webhooks/signature.js';

// Mock the webhook signature service
vi.mock('../../services/webhooks/signature.js');

// Create type-safe mock references
const mockValidateWebhookSignature = vi.mocked(validateWebhookSignature);
const mockExtractWebhookMetadata = vi.mocked(extractWebhookMetadata);

describe('Webhook Validation Middleware', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify({
      logger: false,
    });

    mockPgQuery = vi.fn();
    server.decorate('pg', { query: mockPgQuery } as any);

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.close();
  });

  // =====================================================
  // CREATE WEBHOOK VALIDATION MIDDLEWARE
  // =====================================================

  describe('createWebhookValidationMiddleware()', () => {
    it('should reject when signature is missing and requireSignature=true', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: undefined,
        eventType: 'charge.succeeded',
        deliveryId: 'evt_123',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('MISSING_SIGNATURE');
    });

    it('should allow through when signature is missing and requireSignature=false', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'test',
        requireSignature: false,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'test',
        signature: undefined,
        eventType: 'test.event',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.meta.signatureValid).toBe(true);
    });

    it('should use secretEnvVar when provided', async () => {
      process.env.CUSTOM_WEBHOOK_SECRET = 'test-secret-123';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'custom',
        secretEnvVar: 'CUSTOM_WEBHOOK_SECRET',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'custom',
        signature: 'valid-signature',
        eventType: 'custom.event',
        deliveryId: 'evt_123',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockValidateWebhookSignature).toHaveBeenCalledWith({
        provider: 'custom',
        payload: expect.any(String),
        signature: 'valid-signature',
        secret: 'test-secret-123',
        timestamp: undefined,
      });

      delete process.env.CUSTOM_WEBHOOK_SECRET;
    });

    it('should retrieve secret from database when secretFromDb=true', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook/:orgId', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'stripe-signature',
        eventType: 'charge.succeeded',
      });

      // Mock database query for webhook secret
      mockPgQuery.mockResolvedValue({
        rows: [{ signing_secret: 'db-secret-456' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook/org-123',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT signing_secret FROM integration_webhooks'),
        ['org-123', 'stripe']
      );
    });

    it('should use default provider-based env var when no other secret source', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'stripe-env-secret';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'stripe-sig',
        eventType: 'charge.succeeded',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockValidateWebhookSignature).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: 'stripe-env-secret',
        })
      );

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should return 500 when secret is not configured', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'unconfigured',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'unconfigured',
        signature: 'some-signature',
        eventType: 'test.event',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(500);
      const result = response.json();
      expect(result.error.code).toBe('SECRET_NOT_CONFIGURED');
    });

    it('should validate signature and pass valid webhooks', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'valid-signature',
        eventType: 'charge.succeeded',
        deliveryId: 'evt_123',
        timestamp: '1234567890',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { id: 'ch_123', amount: 1000 },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.meta.signatureValid).toBe(true);
      expect(result.meta.provider).toBe('stripe');
      expect(result.meta.eventType).toBe('charge.succeeded');

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should reject invalid signatures', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'invalid-signature',
        eventType: 'charge.succeeded',
        deliveryId: 'evt_123',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        error: 'Signature verification failed',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.error.code).toBe('INVALID_SIGNATURE');
      expect(result.error.message).toContain('Signature verification failed');

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should log failed webhook events when logEvents=true', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
        secretFromDb: true,
        logEvents: true,
      });

      server.post('/webhook/:orgId', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      // Mock secret retrieval
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ signing_secret: 'test-secret' }],
      });

      // Mock event logging
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'invalid-sig',
        eventType: 'charge.succeeded',
        deliveryId: 'evt_123',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        error: 'Invalid signature',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook/org-456',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(401);

      // Check that event logging was called
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_events'),
        expect.arrayContaining(['org-456', 'stripe'])
      );
    });

    it('should log successful webhook events when logEvents=true', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test-secret';

      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        requireSignature: true,
        secretFromDb: true,
        logEvents: true,
      });

      server.post('/webhook/:orgId', { preHandler: middleware }, async (request: any) => ({
        success: true,
      }));

      await server.ready();

      // Mock secret retrieval
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ signing_secret: 'test-secret' }],
      });

      // Mock event logging
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'valid-sig',
        eventType: 'charge.succeeded',
        deliveryId: 'evt_123',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook/org-456',
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(200);

      // Check that event logging was called with signature_valid=true
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_events'),
        expect.arrayContaining(['org-456', 'stripe'])
      );

      const logCall = mockPgQuery.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO webhook_events')
      );
      expect(logCall![1][7]).toBe(true); // signature_valid parameter

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should extract organization ID from URL params', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'test',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook/:orgId', { preHandler: middleware }, async (request: any) => ({
        orgId: request.webhookMeta?.organizationId,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'test',
        signature: 'test-signature',
      });

      mockPgQuery.mockResolvedValue({
        rows: [{ signing_secret: 'test-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook/org-789',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.orgId).toBe('org-789');
    });

    it('should extract organization ID from query string', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'test',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        orgId: request.webhookMeta?.organizationId,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'test',
        signature: 'test-signature',
      });

      mockPgQuery.mockResolvedValue({
        rows: [{ signing_secret: 'test-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook?org=org-999',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.orgId).toBe('org-999');
    });

    it('should extract organization ID from Stripe account', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'stripe',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        orgId: request.webhookMeta?.organizationId,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'stripe-signature',
      });

      // Mock organization lookup
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ organization_id: 'org-stripe-123' }],
      });

      // Mock secret retrieval
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ signing_secret: 'test-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {
          account: 'acct_stripe_123',
          type: 'charge.succeeded',
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify organization lookup was called
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('integration_credentials'),
        ['acct_stripe_123']
      );
    });

    it('should extract organization ID from Slack team_id', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'slack',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        orgId: request.webhookMeta?.organizationId,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'slack',
        signature: 'slack-signature',
      });

      // Mock organization lookup
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ organization_id: 'org-slack-456' }],
      });

      // Mock secret retrieval
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ signing_secret: 'test-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {
          team_id: 'T0123456',
          event: { type: 'message' },
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify organization lookup was called
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('slack_team_id'),
        ['T0123456']
      );
    });

    it('should extract organization ID from GitHub installation_id', async () => {
      const middleware = createWebhookValidationMiddleware(server, {
        provider: 'github',
        secretFromDb: true,
        requireSignature: true,
      });

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        orgId: request.webhookMeta?.organizationId,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'github',
        signature: 'github-signature',
      });

      // Mock organization lookup
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ organization_id: 'org-github-789' }],
      });

      // Mock secret retrieval
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ signing_secret: 'test-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {
          installation: { id: 12345678 },
          action: 'opened',
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify organization lookup was called
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('github_installation_id'),
        ['12345678']
      );
    });
  });

  // =====================================================
  // PRE-BUILT PROVIDER MIDDLEWARE
  // =====================================================

  describe('Pre-built provider middleware', () => {
    it('stripeWebhookValidation() should configure Stripe middleware', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'stripe-secret';

      const middleware = stripeWebhookValidation(server);

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'stripe',
        signature: 'stripe-sig',
        eventType: 'charge.succeeded',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.meta.provider).toBe('stripe');

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('slackWebhookValidation() should configure Slack middleware', async () => {
      process.env.SLACK_SIGNING_SECRET = 'slack-secret';

      const middleware = slackWebhookValidation(server);

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'slack',
        signature: 'slack-sig',
        eventType: 'message',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.meta.provider).toBe('slack');

      delete process.env.SLACK_SIGNING_SECRET;
    });

    it('githubWebhookValidation() should configure GitHub middleware', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'github-secret';

      const middleware = githubWebhookValidation(server);

      server.post('/webhook', { preHandler: middleware }, async (request: any) => ({
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'github',
        signature: 'github-sig',
        eventType: 'push',
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.meta.provider).toBe('github');

      delete process.env.GITHUB_WEBHOOK_SECRET;
    });

    it('genericWebhookValidation() should use database for secret', async () => {
      const middleware = genericWebhookValidation(server);

      server.post('/webhook/:orgId', { preHandler: middleware }, async (request: any) => ({
        meta: request.webhookMeta,
      }));

      await server.ready();

      mockExtractWebhookMetadata.mockReturnValue({
        provider: 'custom',
        signature: 'custom-sig',
        eventType: 'custom.event',
      });

      // Mock secret from database
      mockPgQuery.mockResolvedValue({
        rows: [{ signing_secret: 'db-secret' }],
      });

      mockValidateWebhookSignature.mockReturnValue({
        valid: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/webhook/org-generic-123',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
