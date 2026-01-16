/**
 * Database Service for ML Service Shared Database
 * Provides methods for logging requests, tracking usage, and managing cache
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  MLServiceRequest,
  MLServiceUsage,
  MLServiceCache,
} from './entities';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly serviceName = 'nestjs';
  private readonly enableRequestLogging: boolean;
  private readonly enableUsageAnalytics: boolean;
  private readonly enableDbCache: boolean;

  constructor(
    @InjectRepository(MLServiceRequest)
    private readonly requestRepository: Repository<MLServiceRequest>,
    @InjectRepository(MLServiceUsage)
    private readonly usageRepository: Repository<MLServiceUsage>,
    @InjectRepository(MLServiceCache)
    private readonly cacheRepository: Repository<MLServiceCache>,
    private readonly configService: ConfigService,
  ) {
    this.enableRequestLogging = this.configService.get<boolean>(
      'database.enableRequestLogging',
      true,
    );
    this.enableUsageAnalytics = this.configService.get<boolean>(
      'database.enableUsageAnalytics',
      true,
    );
    this.enableDbCache = this.configService.get<boolean>(
      'database.enableDbCache',
      true,
    );
  }

  /**
   * Log an ML service request
   */
  async logRequest(params: {
    userId: string | null;
    organizationId: string | null;
    endpoint: string;
    method: string;
    requestPayload: Record<string, any> | null;
    responsePayload: Record<string, any> | null;
    statusCode: number;
    durationMs: number;
    creditsCharged?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<string | null> {
    if (!this.enableRequestLogging) {
      return null;
    }

    try {
      const request = this.requestRepository.create({
        userId: params.userId,
        organizationId: params.organizationId,
        serviceName: this.serviceName,
        endpoint: params.endpoint,
        method: params.method,
        requestPayload: params.requestPayload,
        responsePayload: params.responsePayload,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        creditsCharged: params.creditsCharged || 0,
        errorMessage: params.errorMessage || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestId: params.requestId || null,
      });

      const saved = await this.requestRepository.save(request);
      return saved.id;
    } catch (error) {
      this.logger.error(
        `Failed to log ML request: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Update daily usage analytics
   */
  async updateUsageAnalytics(params: {
    userId: string | null;
    organizationId: string | null;
    endpoint: string;
    durationMs: number;
    credits: number;
    success: boolean;
    usageDate?: Date;
  }): Promise<void> {
    if (!this.enableUsageAnalytics) {
      return;
    }

    const usageDate = params.usageDate || new Date();
    const endpointCategory = this.getEndpointCategory(params.endpoint);

    try {
      // Try to find existing usage record
      const existing = await this.usageRepository.findOne({
        where: {
          userId: (params.userId || null) as any, // TypeORM strict null check workaround
          organizationId: (params.organizationId || null) as any,
          date: usageDate,
          serviceName: this.serviceName,
          endpointCategory: endpointCategory as any,
        },
      });

      if (existing) {
        // Update existing record
        existing.totalRequests += 1;
        existing.totalCredits += params.credits;
        existing.totalDurationMs = (
          BigInt(existing.totalDurationMs) + BigInt(Math.floor(params.durationMs))
        ).toString();
        if (params.success) {
          existing.successCount += 1;
        } else {
          existing.errorCount += 1;
        }

        await this.usageRepository.save(existing);
      } else {
        // Create new record
        const usage = this.usageRepository.create({
          userId: params.userId,
          organizationId: params.organizationId,
          date: usageDate,
          serviceName: this.serviceName,
          endpointCategory,
          totalRequests: 1,
          totalCredits: params.credits,
          totalDurationMs: Math.floor(params.durationMs).toString(),
          successCount: params.success ? 1 : 0,
          errorCount: params.success ? 0 : 1,
        } as any); // TypeORM DeepPartial workaround

        await this.usageRepository.save(usage);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update usage analytics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get cached ML response
   */
  async getCachedResponse(
    cacheKey: string,
  ): Promise<Record<string, any> | null> {
    if (!this.enableDbCache) {
      return null;
    }

    try {
      const cache = await this.cacheRepository
        .createQueryBuilder('cache')
        .where('cache.cacheKey = :cacheKey', { cacheKey })
        .andWhere(
          '(cache.expiresAt IS NULL OR cache.expiresAt > :now)',
          { now: new Date() },
        )
        .getOne();

      if (cache) {
        // Update hit tracking
        await this.cacheRepository.update(cache.id, {
          hitCount: () => 'hit_count + 1',
          lastHitAt: new Date(),
        });

        return cache.responseData;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached response: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Set cached ML response
   */
  async setCachedResponse(params: {
    cacheKey: string;
    requestHash: string;
    endpoint: string;
    responseData: Record<string, any>;
    ttlSeconds?: number;
  }): Promise<boolean> {
    if (!this.enableDbCache) {
      return false;
    }

    try {
      const expiresAt = params.ttlSeconds
        ? new Date(Date.now() + params.ttlSeconds * 1000)
        : null;

      const responseJson = JSON.stringify(params.responseData);
      const sizeBytes = Buffer.byteLength(responseJson, 'utf8');

      // Upsert cache entry
      await this.cacheRepository.save({
        cacheKey: params.cacheKey,
        requestHash: params.requestHash,
        endpoint: params.endpoint,
        serviceName: this.serviceName,
        responseData: params.responseData,
        expiresAt,
        sizeBytes,
        hitCount: 0,
        lastHitAt: null,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to set cached response: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.cacheRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired cache: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get total ML requests for a user in date range
   */
  async getUserRequestCount(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const result = await this.usageRepository
        .createQueryBuilder('usage')
        .select('SUM(usage.totalRequests)', 'total')
        .where('usage.userId = :userId', { userId })
        .andWhere('usage.date >= :startDate', { startDate })
        .andWhere('usage.date <= :endDate', { endDate })
        .getRawOne();

      return parseInt(result.total || '0', 10);
    } catch (error) {
      this.logger.error(
        `Failed to get user request count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get total credits spent by user in date range
   */
  async getUserCreditsSpent(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const result = await this.usageRepository
        .createQueryBuilder('usage')
        .select('SUM(usage.totalCredits)', 'total')
        .where('usage.userId = :userId', { userId })
        .andWhere('usage.date >= :startDate', { startDate })
        .andWhere('usage.date <= :endDate', { endDate })
        .getRawOne();

      return parseInt(result.total || '0', 10);
    } catch (error) {
      this.logger.error(
        `Failed to get user credits spent: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get usage breakdown by endpoint category
   */
  async getUserUsageBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      endpointCategory: string;
      totalRequests: number;
      totalCredits: number;
      avgDurationMs: number;
    }>
  > {
    try {
      const results = await this.usageRepository
        .createQueryBuilder('usage')
        .select('usage.endpointCategory', 'endpointCategory')
        .addSelect('SUM(usage.totalRequests)', 'totalRequests')
        .addSelect('SUM(usage.totalCredits)', 'totalCredits')
        .addSelect('AVG(usage.avgDurationMs)', 'avgDurationMs')
        .where('usage.userId = :userId', { userId })
        .andWhere('usage.date >= :startDate', { startDate })
        .andWhere('usage.date <= :endDate', { endDate })
        .groupBy('usage.endpointCategory')
        .orderBy('totalRequests', 'DESC')
        .getRawMany();

      return results.map((row) => ({
        endpointCategory: row.endpointCategory,
        totalRequests: parseInt(row.totalRequests, 10),
        totalCredits: parseInt(row.totalCredits, 10),
        avgDurationMs: parseFloat(row.avgDurationMs) || 0,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get user usage breakdown: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Helper: Get endpoint category from path
   */
  private getEndpointCategory(endpoint: string): string {
    if (endpoint.includes('/embeddings')) return 'embeddings';
    if (endpoint.includes('/rag')) return 'rag';
    if (endpoint.includes('/analysis')) return 'analysis';
    if (endpoint.includes('/complexity')) return 'complexity';
    if (endpoint.includes('/transcription')) return 'transcription';
    return 'other';
  }
}
