/**
 * @file services/redis.ts
 * @description Redis client for caching and pub/sub
 *
 * Provides a standalone Redis client for use in services that need caching
 */

import Redis from 'ioredis'
import { logger } from '../utils/logger.js'

// Support REDIS_URL (Docker Compose / E2E tests) or individual env vars
const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl
  ? new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

// Connect on initialization
let isConnected = false

redisClient.on('connect', () => {
  isConnected = true
  logger.info('Redis client connected')
})

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error)
})

redisClient.on('close', () => {
  isConnected = false
  logger.warn('Redis client connection closed')
})

// Note: lazyConnect=true means connection happens on first command, not at import time
// This allows E2E tests to import modules before Docker Compose starts Redis

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  return redisClient
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping()
    return true
  } catch (error) {
    logger.error('Redis health check failed:', error)
    return false
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    await redisClient.quit()
    logger.info('Redis client connection closed gracefully')
  } catch (error) {
    logger.error('Error closing Redis connection:', error)
    throw error
  }
}

export default {
  getRedisClient,
  isRedisConnected,
  checkRedisHealth,
  closeRedis
}
