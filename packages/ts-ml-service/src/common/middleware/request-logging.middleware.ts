/**
 * Request Logging Middleware for NestJS ML Service
 * Automatically logs all requests to the shared database
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    // Skip logging for health check and docs endpoints
    const skipPaths = ['/health', '/live', '/ready', '/api/docs'];
    if (skipPaths.some((path) => req.url.startsWith(path))) {
      return next();
    }

    // Generate request ID for distributed tracing
    const requestId = uuidv4();
    req.headers['x-request-id'] = requestId;

    // Extract user context from headers (set by API Gateway)
    const userId = req.headers['x-user-id'] as string | undefined;
    const organizationId = req.headers['x-organization-id'] as
      | string
      | undefined;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Record start time
    const startTime = Date.now();

    // Capture request body (if present)
    let requestPayload: Record<string, any> | null = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        if (req.body && typeof req.body === 'object') {
          requestPayload = req.body as Record<string, any>;
        }
      } catch (error) {
        this.logger.warn(`Failed to capture request body: ${error.message}`);
      }
    }

    // Track response
    let statusCode = 500;
    let errorMessage: string | undefined;
    let creditsCharged = 0;

    // Hook into response
    res.raw.on('finish', async () => {
      try {
        statusCode = res.statusCode;

        // Calculate duration
        const durationMs = Date.now() - startTime;

        // Extract credits charged from response headers
        const creditsHeader = res.getHeader('x-credits-charged');
        if (creditsHeader) {
          creditsCharged = parseInt(creditsHeader.toString(), 10) || 0;
        }

        // Log request to database (fire and forget)
        this.databaseService
          .logRequest({
            userId: userId || null,
            organizationId: organizationId || null,
            endpoint: req.url,
            method: req.method,
            requestPayload,
            responsePayload: null, // Skip response payload for now
            statusCode,
            durationMs,
            creditsCharged,
            errorMessage,
            ipAddress,
            userAgent,
            requestId,
          })
          .catch((error) => {
            this.logger.error(`Failed to log request: ${error.message}`);
          });

        // Update usage analytics (fire and forget)
        if (userId) {
          this.databaseService
            .updateUsageAnalytics({
              userId,
              organizationId: organizationId || null,
              endpoint: req.url,
              durationMs,
              credits: creditsCharged,
              success: statusCode < 400,
            })
            .catch((error) => {
              this.logger.error(
                `Failed to update usage analytics: ${error.message}`,
              );
            });
        }

        // Add request ID to response headers
        res.header('x-request-id', requestId);
      } catch (error) {
        this.logger.error(`Error in response logging: ${error.message}`);
      }
    });

    // Handle errors
    res.raw.on('error', (error) => {
      errorMessage = error.message;
      this.logger.error(`Request error: ${error.message}`, error.stack);
    });

    next();
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(req: FastifyRequest): string | undefined {
    // Check X-Forwarded-For header first (set by proxies)
    const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }

    // Check X-Real-IP header (set by some proxies)
    const realIp = req.headers['x-real-ip'] as string | undefined;
    if (realIp) {
      return realIp;
    }

    // Fall back to socket IP
    return req.ip;
  }
}
